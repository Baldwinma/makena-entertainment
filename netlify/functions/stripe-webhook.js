const Stripe = require('stripe');
const {
    saveTicketsToSupabase,
    markOrderEmailStatus,
    sendTicketsAutomatically,
    recordAmbassadorSale
} = require('./lib/process-checkout-session');

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('stripe-webhook: missing environment variables');
        return { statusCode: 500, body: 'Server configuration error' };
    }

    const sig = event.headers['stripe-signature'];
    if (!sig) {
        return { statusCode: 400, body: 'Missing stripe-signature header' };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let stripeEvent;
    try {
        const rawBody = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    if (stripeEvent.type !== 'checkout.session.completed') {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const sessionSnap = stripeEvent.data.object;

    if (sessionSnap.payment_status !== 'paid') {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Retrieve the full session with all fields we need (the webhook payload is minimal)
    let session;
    try {
        session = await stripe.checkout.sessions.retrieve(sessionSnap.id, {
            expand: [
                'line_items.data.price.product',
                'payment_intent',
                'total_details.breakdown'
            ]
        });
    } catch (err) {
        console.error('stripe-webhook: failed to retrieve full session:', err);
        return { statusCode: 500, body: 'Failed to retrieve session' };
    }

    const lineItems = session.line_items.data;

    // Save order + tickets to Supabase
    let storage;
    try {
        storage = await saveTicketsToSupabase(session, lineItems);
    } catch (err) {
        console.error('stripe-webhook: saveTicketsToSupabase error:', err);
        // Return 500 so Stripe retries the webhook
        return { statusCode: 500, body: 'Failed to save tickets' };
    }

    // Record ambassador sale (fire and forget — don't block or retry on failure)
    try {
        await recordAmbassadorSale(stripe, session, storage);
    } catch (err) {
        console.error('stripe-webhook: recordAmbassadorSale error:', err);
    }

    // Send ticket emails
    const order = storage.order || {
        customer_email: session.customer_details && session.customer_details.email,
        ticket_email_sent_at: null
    };
    const sourceTickets = storage.stored ? storage.tickets : [];

    // getBaseUrl in send-ticket-email falls back to SITE_URL when headers are empty,
    // which is always set on Netlify — so this minimal event object is safe
    const netlifyEvent = { headers: {} };

    try {
        await sendTicketsAutomatically(netlifyEvent, order, sourceTickets);
    } catch (emailError) {
        console.error('stripe-webhook: ticket email error:', emailError);
        if (order.id) {
            await markOrderEmailStatus(order.id, {
                ticket_email_error: emailError.message || 'Unable to send ticket email.'
            });
        }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
