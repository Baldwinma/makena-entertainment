const { getSupabase } = require('./lib/supabase');

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

function cleanCode(code) {
    return String(code || '').trim().toUpperCase();
}

function getBaseUrl(event) {
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    return host ? `${proto}://${host}` : (process.env.SITE_URL || '').replace(/\/$/, '');
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return json(405, { error: 'Method not allowed' });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Supabase is not configured.' });
    }

    const ticketCode = cleanCode(event.queryStringParameters && event.queryStringParameters.ticket);
    if (!ticketCode) {
        return json(400, { error: 'Missing ticket code.' });
    }

    const { data: ticket, error } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, holder_name, holder_email, status, checked_in, checked_in_at')
        .eq('ticket_code', ticketCode)
        .maybeSingle();

    if (error) {
        console.error('Public ticket lookup error:', error);
        return json(500, { error: 'Unable to load ticket.' });
    }

    if (!ticket || ticket.status !== 'valid') {
        return json(404, { error: 'Ticket not found.' });
    }

    const baseUrl = getBaseUrl(event);

    return json(200, {
        ticket: {
            code: ticket.ticket_code,
            eventName: ticket.event_name,
            holderName: ticket.holder_name || 'Guest',
            holderEmail: ticket.holder_email,
            status: ticket.checked_in ? 'Already Checked In' : 'Valid',
            checkedInAt: ticket.checked_in_at,
            qrImageUrl: `${baseUrl}/.netlify/functions/ticket-qr?ticket=${encodeURIComponent(ticket.ticket_code)}`,
            ticketPageUrl: `${baseUrl}/ticket?ticket=${encodeURIComponent(ticket.ticket_code)}`
        }
    });
};
