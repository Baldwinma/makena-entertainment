const Stripe = require('stripe');
const QRCode = require('qrcode');
const { summarizePurchasedItems } = require('./lib/ticket-catalog');
const {
    buildTicketCode,
    saveTicketsToSupabase,
    markOrderEmailStatus,
    sendTicketsAutomatically,
    recordAmbassadorSale
} = require('./lib/process-checkout-session');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function formatAmount(amount, currency) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
    }).format(amount / 100);
}

function getBaseUrl(event) {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    return host ? `${proto}://${host}` : '';
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
    if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: 'Stripe is not configured.' });

    const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
    if (!sessionId || !sessionId.startsWith('cs_')) return json(400, { error: 'Missing checkout session.' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: [
                'line_items.data.price.product',
                'payment_intent',
                'total_details.breakdown'
            ]
        });

        if (session.payment_status !== 'paid') {
            return json(402, { error: 'Payment is not complete yet.' });
        }

        const lineItems = session.line_items.data;
        const totalQuantity = lineItems.reduce((s, li) => s + li.quantity, 0);
        const storage = await saveTicketsToSupabase(session, lineItems);

        try { await recordAmbassadorSale(stripe, session, storage); } catch (e) {
            console.error('Ambassador sale record error:', e);
        }

        const baseUrl = getBaseUrl(event);
        const order = storage.order || {
            customer_email: session.customer_details && session.customer_details.email,
            ticket_email_sent_at: null
        };

        let fallbackIndex = 0;
        const sourceTickets = storage.stored ? storage.tickets : lineItems.flatMap(lineItem =>
            Array.from({ length: lineItem.quantity }, () => ({
                ticket_code: buildTicketCode(session.id, fallbackIndex++),
                holder_name: (session.customer_details && session.customer_details.name) || 'Guest',
                holder_email: session.customer_details && session.customer_details.email,
                event_name: lineItem.description || (session.metadata && session.metadata.ticketName) || 'Event',
                event_date: null,
                event_time: null,
                event_location: null,
                ticket_tier_name: (session.metadata && session.metadata.tierName) || 'General Admission',
                ticket_tier_amount: null,
                status: 'valid',
                checked_in: false
            }))
        );

        let emailDelivery = { sent: false };
        try {
            emailDelivery = await sendTicketsAutomatically(event, order, sourceTickets);
        } catch (emailError) {
            console.error('Automatic ticket email error:', emailError);
            if (order.id) {
                await markOrderEmailStatus(order.id, {
                    ticket_email_error: emailError.message || 'Unable to send ticket email.'
                });
            }
            emailDelivery = { sent: false, reason: emailError.message || 'Unable to send ticket email.' };
        }

        const tickets = await Promise.all(sourceTickets.map(async ticket => {
            const checkInUrl = `${baseUrl}/admin?ticket=${encodeURIComponent(ticket.ticket_code)}`;
            const ticketPageUrl = `${baseUrl}/ticket?ticket=${encodeURIComponent(ticket.ticket_code)}`;
            return {
                code: ticket.ticket_code,
                holderName: ticket.holder_name || 'Guest',
                holderEmail: ticket.holder_email,
                eventName: ticket.event_name,
                eventDate: ticket.event_date,
                eventTime: ticket.event_time,
                eventLocation: ticket.event_location,
                tierName: ticket.ticket_tier_name,
                tierAmount: ticket.ticket_tier_amount,
                status: ticket.checked_in ? 'Already Checked In' : 'Valid',
                checkInUrl,
                ticketPageUrl,
                qrCode: await QRCode.toDataURL(checkInUrl, { margin: 1, width: 220 })
            };
        }));

        return json(200, {
            order: {
                id: session.id,
                paymentStatus: session.payment_status,
                customerName: session.customer_details && session.customer_details.name,
                customerEmail: session.customer_details && session.customer_details.email,
                amountPaid: formatAmount(session.amount_total, session.currency),
                quantity: totalQuantity,
                purchasedAt: new Date(session.created * 1000).toISOString(),
                storedInSupabase: storage.stored,
                storageNote: storage.reason,
                emailDelivery,
                itemsPurchased: storage.purchasedItems || [],
                itemsPurchasedSummary: summarizePurchasedItems(storage.purchasedItems || [])
            },
            tickets
        });
    } catch (error) {
        console.error('Stripe session lookup error:', error);
        if (error.type === 'StripeAuthenticationError') {
            return json(500, { error: 'Stripe rejected the API key.' });
        }
        return json(500, { error: 'Unable to load ticket information.' });
    }
};
