const Stripe = require('stripe');
const {
    saveTicketsToSupabase,
    markOrderEmailStatus,
    sendTicketsAutomatically,
    recordAmbassadorSale
} = require('./lib/process-checkout-session');
const { sendTripConfirmationEmail, sendBalanceConfirmationEmail } = require('./lib/trip-emails');

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

    // Handle trip balance payments
    if (session.metadata && session.metadata.booking_type === 'trip_balance') {
        const supabase = require('./lib/supabase').getSupabase();
        if (supabase && session.metadata.booking_id) {
            const { data: booking } = await supabase
                .from('trip_bookings')
                .select('price_per_person, guest_count, deposit_total, balance_paid_total')
                .eq('id', session.metadata.booking_id)
                .single();

            const amountPaid = session.amount_total || 0;
            const newBalancePaidTotal = (booking?.balance_paid_total || 0) + amountPaid;
            const totalTripCost = booking ? (booking.price_per_person * booking.guest_count) : 0;
            const isFullyPaid = booking && newBalancePaidTotal >= (totalTripCost - (booking.deposit_total || 0));

            const updatePayload = {
                balance_paid_total: newBalancePaidTotal,
                balance_stripe_payment_intent_id: typeof session.payment_intent === 'object'
                    ? session.payment_intent?.id
                    : session.payment_intent,
                updated_at: new Date().toISOString()
            };

            if (isFullyPaid) {
                updatePayload.balance_payment_status = 'paid';
                updatePayload.balance_paid_at = new Date().toISOString();
            }

            const { error: balanceUpdateError } = await supabase
                .from('trip_bookings')
                .update(updatePayload)
                .eq('id', session.metadata.booking_id);

            if (balanceUpdateError) {
                console.error('stripe-webhook: trip balance update error:', balanceUpdateError);
            } else {
                console.log('stripe-webhook: trip balance payment recorded:', session.metadata.booking_ref, `$${(amountPaid/100).toFixed(2)}`);
                if (isFullyPaid) {
                    try {
                        await sendBalanceConfirmationEmail(supabase, session.metadata.booking_id);
                    } catch (err) {
                        console.error('stripe-webhook: balance confirmation email error:', err);
                    }
                }
            }
        }
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Handle trip payments (deposit or full)
    if (session.metadata && session.metadata.booking_type === 'trip') {
        const supabase = require('./lib/supabase').getSupabase();
        if (supabase && session.metadata.booking_id) {
            const isFullPayment = session.metadata.payment_type === 'full';
            const updatePayload = {
                payment_status: 'paid',
                stripe_payment_intent_id: typeof session.payment_intent === 'object'
                    ? session.payment_intent?.id
                    : session.payment_intent,
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            if (isFullPayment) {
                // Mark balance as paid too — no separate balance collection needed
                updatePayload.balance_payment_status = 'paid';
                updatePayload.balance_paid_total = session.amount_total || 0;
                updatePayload.balance_paid_at = new Date().toISOString();
            }
            const { error: tripUpdateError } = await supabase
                .from('trip_bookings')
                .update(updatePayload)
                .eq('id', session.metadata.booking_id);

            if (tripUpdateError) {
                console.error('stripe-webhook: trip booking update error:', tripUpdateError);
            } else {
                console.log('stripe-webhook: trip booking confirmed:', session.metadata.booking_ref);
                try {
                    await sendTripConfirmationEmail(supabase, session.metadata.booking_id);
                } catch (err) {
                    console.error('stripe-webhook: trip confirmation email error:', err);
                }
            }
        }
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

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

