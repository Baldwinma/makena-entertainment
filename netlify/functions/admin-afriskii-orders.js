const { getSupabase } = require('./lib/supabase');
const { requireAdmin } = require('./lib/admin-auth');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(body)
    };
}

function checkAuth(event) {
    // Accept either the partner token or a valid admin session
    const partnerToken = (event.queryStringParameters || {}).token
        || event.headers['x-partner-token'];
    const expectedToken = process.env.AFRISKII_PARTNER_TOKEN;

    if (expectedToken && partnerToken === expectedToken) {
        return { role: 'partner' };
    }

    const admin = requireAdmin(event);
    if (admin) {
        return { role: 'admin' };
    }

    return null;
}

exports.handler = async function(event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'x-partner-token' }, body: '' };
    }

    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

    const auth = checkAuth(event);
    if (!auth) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    // All Afriskii event ticket orders (All White Affair + All Access Pass)
    const { data: eventOrders, error: eventError } = await supabase
        .from('event_orders')
        .select('id, customer_name, customer_email, amount_total, currency, payment_status, event_name, quantity, ticket_tier_summary, purchased_at')
        .ilike('event_name', 'Afriskii%')
        .eq('payment_status', 'paid')
        .order('purchased_at', { ascending: false });

    if (eventError) {
        console.error('admin-afriskii-orders event error:', eventError);
        return json(500, { error: 'Failed to load event orders.' });
    }

    // Individual tickets for breakdown
    const { data: tickets, error: ticketError } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, ticket_tier_name, ticket_tier_amount, holder_name, holder_email, status, checked_in, checked_in_at, created_at')
        .ilike('event_name', 'Afriskii%')
        .order('created_at', { ascending: false });

    if (ticketError) {
        console.error('admin-afriskii-orders ticket error:', ticketError);
    }

    // Snow Escape trip bookings (booking_ref prefix AS2027-)
    const { data: snowEscapeBookings, error: tripError } = await supabase
        .from('trip_bookings')
        .select('booking_ref, primary_first_name, primary_last_name, primary_email, primary_phone, room_type, guest_count, deposit_total, balance_total, payment_status, balance_payment_status, payment_type, paid_at, created_at')
        .like('booking_ref', 'AS2027-%')
        .order('created_at', { ascending: false });

    if (tripError) {
        console.error('admin-afriskii-orders trip error:', tripError);
    }

    const orders = eventOrders || [];
    const escapes = snowEscapeBookings || [];

    const eventRevenueCents = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
    const escapeRevenueCents = escapes
        .filter(b => b.payment_status === 'paid')
        .reduce((sum, b) => sum + (b.deposit_total || 0), 0);

    // Per-ticket-type breakdown
    const byTicketType = {};
    for (const o of orders) {
        const key = o.event_name;
        if (!byTicketType[key]) {
            byTicketType[key] = { eventName: key, orderCount: 0, ticketCount: 0, revenueCents: 0 };
        }
        byTicketType[key].orderCount++;
        byTicketType[key].ticketCount += o.quantity || 0;
        byTicketType[key].revenueCents += o.amount_total || 0;
    }

    return json(200, {
        generatedAt: new Date().toISOString(),
        summary: {
            totalEventOrders: orders.length,
            totalTicketsSold: orders.reduce((sum, o) => sum + (o.quantity || 0), 0),
            totalEventRevenueCents: eventRevenueCents,
            totalEventRevenueUsd: (eventRevenueCents / 100).toFixed(2),
            snowEscapeBookings: escapes.length,
            snowEscapeRevenueCents: escapeRevenueCents,
            snowEscapeRevenueUsd: (escapeRevenueCents / 100).toFixed(2),
            combinedRevenueUsd: ((eventRevenueCents + escapeRevenueCents) / 100).toFixed(2)
        },
        byTicketType: Object.values(byTicketType),
        eventOrders: orders,
        tickets: tickets || [],
        snowEscapeBookings: escapes
    });
};
