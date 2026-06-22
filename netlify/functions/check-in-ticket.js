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

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Supabase is not configured.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (error) {
        return json(400, { error: 'Invalid request body.' });
    }

    const code = cleanCode(payload.ticket);
    if (!code) {
        return json(400, { error: 'Missing ticket code.' });
    }

    const { data: ticket, error: lookupError } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, holder_name, holder_email, status, checked_in, checked_in_at')
        .eq('ticket_code', code)
        .maybeSingle();

    if (lookupError) {
        console.error('Ticket lookup error:', lookupError);
        return json(500, { error: 'Unable to look up ticket.' });
    }

    if (!ticket) {
        return json(404, { status: 'not_found', error: 'Ticket not found.' });
    }

    if (ticket.status !== 'valid') {
        return json(409, { status: ticket.status, error: 'Ticket is not valid.', ticket });
    }

    if (ticket.checked_in) {
        return json(409, { status: 'already_checked_in', error: 'Ticket has already been checked in.', ticket });
    }

    const checkedInAt = new Date().toISOString();
    const { data: updatedTicket, error: updateError } = await supabase
        .from('event_tickets')
        .update({
            checked_in: true,
            checked_in_at: checkedInAt,
            checked_in_by: payload.checkedInBy || 'Makena staff',
            updated_at: checkedInAt
        })
        .eq('ticket_code', code)
        .eq('checked_in', false)
        .select('ticket_code, event_name, holder_name, holder_email, status, checked_in, checked_in_at')
        .single();

    if (updateError) {
        console.error('Ticket check-in error:', updateError);
        return json(500, { error: 'Unable to check in ticket.' });
    }

    return json(200, {
        status: 'checked_in',
        message: 'Ticket checked in successfully.',
        ticket: updatedTicket
    });
};
