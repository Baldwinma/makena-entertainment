const Stripe = require('stripe');
const { requireAdmin } = require('./lib/admin-auth');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: 'Stripe is not configured.' });

    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }

    const { paymentIntentId, amount } = payload;

    if (!paymentIntentId) return json(400, { error: 'paymentIntentId is required.' });
    if (!Number.isInteger(amount) || amount <= 0) return json(400, { error: 'amount must be a positive integer (cents).' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount,
            reason: 'requested_by_customer'
        });
        return json(200, { ok: true, refundId: refund.id, status: refund.status, amount: refund.amount });
    } catch (err) {
        console.error('Stripe refund error:', err);
        return json(500, { error: err.message || 'Refund failed.' });
    }
};
