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

function normalizeEventName(name) {
    return String(name || '').trim().toLowerCase();
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

    const params = event.queryStringParameters || {};
    const code = cleanCode(params.ticket);
    const selectedEventName = String(params.eventName || '').trim();
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

    if (selectedEventName && normalizeEventName(data.event_name) !== normalizeEventName(selectedEventName)) {
        return json(409, {
            valid: false,
            status: 'wrong_event',
            message: `Wrong event ticket. This ticket is for ${data.event_name}, not ${selectedEventName}.`,
            ticket: data
        });
    }

    return json(200, {
        valid: data.status === 'valid',
        status: data.checked_in ? 'already_checked_in' : data.status,
        ticket: data
    });
};
