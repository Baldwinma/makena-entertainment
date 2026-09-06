const Stripe = require('stripe');
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

// Packages that include dc_all_white_boat_party and how many events they cover
const PACKAGE_REFUND_RULES = {
    'AfroPlusFest DC - Full Fest Pass': { totalEvents: 9 }
};

async function enrichWithRefundStatus(orders, stripe) {
    return Promise.all(orders.map(async o => {
        if (!o.stripe_payment_intent_id) return { ...o, amountRefunded: 0 };
        try {
            const pi = await stripe.paymentIntents.retrieve(o.stripe_payment_intent_id);
            return { ...o, amountRefunded: pi.amount_received > 0 ? (pi.amount - pi.amount_received + (pi.amount_refunded || 0)) : (pi.amount_refunded || 0) };
        } catch {
            return { ...o, amountRefunded: 0 };
        }
    }));
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: 'Stripe is not configured.' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    const params = new URLSearchParams(event.queryStringParameters || {});
    const ticketId = params.get('eventId');
    if (!ticketId) return json(400, { error: 'eventId is required.' });

    const ticketDef = listTicketDefinitions().find(t => t.id === ticketId);
    if (!ticketDef) return json(400, { error: 'Unknown event.' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Full refund orders — bought the cancelled event directly
    const { data: directOrders, error: directError } = await supabase
        .from('event_orders')
        .select('id, stripe_payment_intent_id, customer_name, customer_email, amount_total, currency, quantity, ticket_tier_summary, payment_status, purchased_at')
        .eq('event_name', ticketDef.name)
        .eq('payment_status', 'paid')
        .order('purchased_at', { ascending: false });

    if (directError) {
        console.error('admin-event-orders direct error:', directError);
        return json(500, { error: 'Failed to load orders.' });
    }

    // Partial refund orders — bought a package that includes this event
    const packageNames = Object.keys(PACKAGE_REFUND_RULES);
    const { data: packageOrders, error: packageError } = await supabase
        .from('event_orders')
        .select('id, stripe_payment_intent_id, customer_name, customer_email, amount_total, currency, quantity, ticket_tier_summary, event_name, payment_status, purchased_at')
        .in('event_name', packageNames)
        .eq('payment_status', 'paid')
        .order('purchased_at', { ascending: false });

    if (packageError) {
        console.error('admin-event-orders package error:', packageError);
        return json(500, { error: 'Failed to load package orders.' });
    }

    const rawFull = (directOrders || []).map(o => ({
        ...o, refundType: 'full', refundAmount: o.amount_total, packageName: null
    }));

    const rawPartial = (packageOrders || []).map(o => {
        const rule = PACKAGE_REFUND_RULES[o.event_name];
        return {
            ...o, refundType: 'partial',
            refundAmount: rule ? Math.round(o.amount_total / rule.totalEvents) : null,
            packageName: o.event_name
        };
    });

    // Fetch real-time refund status from Stripe for all orders in parallel
    const [fullRefundOrders, partialRefundOrders] = await Promise.all([
        enrichWithRefundStatus(rawFull, stripe),
        enrichWithRefundStatus(rawPartial, stripe)
    ]);

    return json(200, {
        eventName: ticketDef.name,
        fullRefundOrders,
        partialRefundOrders
    });
};
