const { getSupabase } = require('./lib/supabase');
const { requireAdmin } = require('./lib/admin-auth');

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

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return json(405, { error: 'Method not allowed' });
    }

    if (!requireAdmin(event)) {
        return json(401, { error: 'Admin login required.' });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Supabase is not configured.' });
    }

    const code = cleanCode(event.queryStringParameters && event.queryStringParameters.ticket);
    if (!code) {
        return json(400, { error: 'Missing ticket code.' });
    }

    const { data, error } = await supabase
        .from('event_tickets')
        .select(`
            ticket_code,
            event_name,
            holder_name,
            holder_email,
            status,
            checked_in,
            checked_in_at,
            event_orders (
                stripe_session_id,
                amount_total,
                currency,
                payment_status,
                purchased_at
            )
        `)
        .eq('ticket_code', code)
        .maybeSingle();

    if (error) {
        console.error('Ticket validation error:', error);
        return json(500, { error: 'Unable to validate ticket.' });
    }

    if (!data) {
        return json(404, { valid: false, status: 'not_found', message: 'Ticket not found.' });
    }

    return json(200, {
        valid: data.status === 'valid',
        status: data.checked_in ? 'already_checked_in' : data.status,
        ticket: data
    });
};
