const QRCode = require('qrcode');
const { getSupabase } = require('./lib/supabase');

function cleanCode(code) {
    return String(code || '').trim().toUpperCase();
}

function getBaseUrl(event) {
    if (process.env.SITE_URL) {
        return process.env.SITE_URL.replace(/\/$/, '');
    }

    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    return `${proto}://${host}`;
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            body: 'Method not allowed'
        };
    }

    const supabase = getSupabase();
    if (!supabase) {
        return {
            statusCode: 500,
            body: 'Supabase is not configured.'
        };
    }

    const ticketCode = cleanCode(event.queryStringParameters && event.queryStringParameters.ticket);
    if (!ticketCode) {
        return {
            statusCode: 400,
            body: 'Missing ticket code.'
        };
    }

    const { data: ticket, error } = await supabase
        .from('event_tickets')
        .select('ticket_code, status')
        .eq('ticket_code', ticketCode)
        .maybeSingle();

    if (error) {
        console.error('Ticket QR lookup error:', error);
        return {
            statusCode: 500,
            body: 'Unable to load ticket.'
        };
    }

    if (!ticket || ticket.status !== 'valid') {
        return {
            statusCode: 404,
            body: 'Ticket not found.'
        };
    }

    const checkInUrl = `${getBaseUrl(event)}/check-in?ticket=${encodeURIComponent(ticket.ticket_code)}`;
    const png = await QRCode.toBuffer(checkInUrl, {
        margin: 1,
        width: 320
    });

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'private, max-age=300'
        },
        isBase64Encoded: true,
        body: png.toString('base64')
    };
};
