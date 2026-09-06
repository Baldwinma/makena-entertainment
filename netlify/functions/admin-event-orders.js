const { requireAdmin } = require('./lib/admin-auth');
const { getSupabase } = require('./lib/supabase');
const { listTicketDefinitions } = require('./lib/ticket-catalog');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    const params = new URLSearchParams(event.queryStringParameters || {});
    const ticketId = params.get('eventId');
    if (!ticketId) return json(400, { error: 'eventId is required.' });

    const ticketDef = listTicketDefinitions().find(t => t.id === ticketId);
    if (!ticketDef) return json(400, { error: 'Unknown event.' });

    const { data: orders, error } = await supabase
        .from('event_orders')
        .select('id, stripe_payment_intent_id, stripe_session_id, customer_name, customer_email, amount_total, currency, quantity, ticket_tier_summary, payment_status, purchased_at')
        .eq('event_name', ticketDef.name)
        .eq('payment_status', 'paid')
        .order('purchased_at', { ascending: false });

    if (error) {
        console.error('admin-event-orders error:', error);
        return json(500, { error: 'Failed to load orders.' });
    }

    return json(200, { orders: orders || [], eventName: ticketDef.name });
};
