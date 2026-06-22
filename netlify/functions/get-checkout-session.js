const Stripe = require('stripe');
const QRCode = require('qrcode');
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

function formatAmount(amount, currency) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase()
    }).format(amount / 100);
}

function buildTicketCode(sessionId, index) {
    const suffix = sessionId.slice(-8).toUpperCase();
    return `MKN-${suffix}-${String(index + 1).padStart(2, '0')}`;
}

function getBaseUrl(event) {
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    return host ? `${proto}://${host}` : (process.env.SITE_URL || '').replace(/\/$/, '');
}

async function saveTicketsToSupabase(session, lineItem, quantity) {
    const supabase = getSupabase();
    if (!supabase) {
        return { stored: false, reason: 'Supabase is not configured.' };
    }

    const orderPayload = {
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent && session.payment_intent.id,
        customer_name: session.customer_details && session.customer_details.name,
        customer_email: session.customer_details && session.customer_details.email,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        event_name: session.metadata.ticketName || lineItem.description,
        quantity,
        purchased_at: new Date(session.created * 1000).toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data: order, error: orderError } = await supabase
        .from('event_orders')
        .upsert(orderPayload, { onConflict: 'stripe_session_id' })
        .select('id')
        .single();

    if (orderError) {
        throw orderError;
    }

    const ticketPayloads = Array.from({ length: quantity }, (_, index) => ({
        order_id: order.id,
        ticket_code: buildTicketCode(session.id, index),
        event_name: orderPayload.event_name,
        holder_name: orderPayload.customer_name || 'Guest',
        holder_email: orderPayload.customer_email,
        status: 'valid',
        updated_at: new Date().toISOString()
    }));

    const { error: ticketsError } = await supabase
        .from('event_tickets')
        .upsert(ticketPayloads, { onConflict: 'ticket_code' });

    if (ticketsError) {
        throw ticketsError;
    }

    const { data: tickets, error: readError } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, holder_name, holder_email, status, checked_in, checked_in_at')
        .eq('order_id', order.id)
        .order('ticket_code', { ascending: true });

    if (readError) {
        throw readError;
    }

    return { stored: true, tickets };
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return json(405, { error: 'Method not allowed' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        return json(500, { error: 'Stripe is not configured.' });
    }

    const sessionId = event.queryStringParameters && event.queryStringParameters.session_id;
    if (!sessionId || !sessionId.startsWith('cs_')) {
        return json(400, { error: 'Missing checkout session.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items', 'payment_intent']
        });

        if (session.payment_status !== 'paid') {
            return json(402, { error: 'Payment is not complete yet.' });
        }

        const lineItem = session.line_items.data[0];
        const quantity = lineItem.quantity || Number.parseInt(session.metadata.quantity, 10) || 1;
        const storage = await saveTicketsToSupabase(session, lineItem, quantity);
        const baseUrl = getBaseUrl(event);
        const sourceTickets = storage.stored ? storage.tickets : Array.from({ length: quantity }, (_, index) => ({
            ticket_code: buildTicketCode(session.id, index),
            holder_name: session.customer_details && session.customer_details.name ? session.customer_details.name : 'Guest',
            holder_email: session.customer_details && session.customer_details.email,
            event_name: session.metadata.ticketName || lineItem.description || lineItem.price.product.name,
            status: 'valid',
            checked_in: false
        }));

        const tickets = await Promise.all(sourceTickets.map(async ticket => {
            const checkInUrl = `${baseUrl}/admin?ticket=${encodeURIComponent(ticket.ticket_code)}`;
            const ticketPageUrl = `${baseUrl}/ticket?ticket=${encodeURIComponent(ticket.ticket_code)}`;
            return {
                code: ticket.ticket_code,
                holderName: ticket.holder_name || 'Guest',
                holderEmail: ticket.holder_email,
                eventName: ticket.event_name,
                status: ticket.checked_in ? 'Already Checked In' : 'Valid',
                checkInUrl,
                ticketPageUrl,
                qrCode: await QRCode.toDataURL(checkInUrl, {
                    margin: 1,
                    width: 220
                })
            };
        }));

        return json(200, {
            order: {
                id: session.id,
                paymentStatus: session.payment_status,
                customerName: session.customer_details && session.customer_details.name,
                customerEmail: session.customer_details && session.customer_details.email,
                amountPaid: formatAmount(session.amount_total, session.currency),
                eventName: session.metadata.ticketName || lineItem.description,
                quantity,
                purchasedAt: new Date(session.created * 1000).toISOString(),
                storedInSupabase: storage.stored,
                storageNote: storage.reason
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
