const Stripe = require('stripe');
const QRCode = require('qrcode');
const { getSupabase } = require('./lib/supabase');
const { sendTicketEmail, sendBundleTicketEmail } = require('./send-ticket-email');
const { getTicketDefinition, getTicketDefinitionByName, getTierDefinition, summarizePurchasedItems, getPackageEventDefinitions } = require('./lib/ticket-catalog');

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
    if (process.env.SITE_URL) {
        return process.env.SITE_URL.replace(/\/$/, '');
    }

    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    return host ? `${proto}://${host}` : '';
}

async function saveTicketsToSupabase(session, lineItems) {
    const supabase = getSupabase();
    if (!supabase) {
        return { stored: false, reason: 'Supabase is not configured.' };
    }

    const totalQuantity = lineItems.reduce((s, li) => s + li.quantity, 0);
    const orderPayload = {
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent && session.payment_intent.id,
        customer_name: session.customer_details && session.customer_details.name,
        customer_email: session.customer_details && session.customer_details.email,
        amount_total: session.amount_total,
        currency: session.currency,
        payment_status: session.payment_status,
        quantity: totalQuantity,
        purchased_at: new Date(session.created * 1000).toISOString(),
        updated_at: new Date().toISOString()
    };

    const purchasedItems = lineItems.map(lineItem => {
        const product = lineItem.price && lineItem.price.product && typeof lineItem.price.product === 'object'
            ? lineItem.price.product
            : null;
        const metadata = product && product.metadata ? product.metadata : {};
        const ticketDefinition = getTicketDefinition(metadata.ticket_id) || getTicketDefinitionByName(lineItem.description);
        const tierDefinition = metadata.tier_id ? getTierDefinition(metadata.ticket_id, metadata.tier_id) : null;
        const eventName = (ticketDefinition && ticketDefinition.name) || lineItem.description || 'Event';
        const tierName = metadata.tier_name || (tierDefinition && tierDefinition.name) || 'General Admission';
        return [{
            name: eventName,
            tierName,
            tierId: metadata.tier_id || (tierDefinition && tierDefinition.id) || null,
            tierAmount: Number(metadata.tier_amount || (tierDefinition && tierDefinition.amount) || lineItem.amount_subtotal / lineItem.quantity),
            quantity: lineItem.quantity,
            date: (ticketDefinition && ticketDefinition.date) || null,
            time: (ticketDefinition && ticketDefinition.time) || null,
            location: (ticketDefinition && ticketDefinition.location) || null
        }];
    }).flat();

    orderPayload.event_name = purchasedItems.map(item => item.name).join(', ');
    orderPayload.ticket_tier_summary = purchasedItems.map(item => `${item.name} ${item.tierName} x${item.quantity}`).join(', ');

    const { data: order, error: orderError } = await supabase
        .from('event_orders')
        .upsert(orderPayload, { onConflict: 'stripe_session_id' })
        .select('id, customer_email, customer_name, ticket_email_sent_at')
        .single();

    if (orderError) {
        throw orderError;
    }

    let ticketIndex = 0;
    const holderName = (session.customer_details && session.customer_details.name) || 'Guest';
    const holderEmail = session.customer_details && session.customer_details.email;

    const ticketPayloads = lineItems.flatMap(lineItem =>
        (() => {
            const product = lineItem.price && lineItem.price.product && typeof lineItem.price.product === 'object'
                ? lineItem.price.product
                : null;
            const metadata = product && product.metadata ? product.metadata : {};
            const ticketDefinition = getTicketDefinition(metadata.ticket_id) || getTicketDefinitionByName(lineItem.description);
            const tierDefinition = metadata.tier_id ? getTierDefinition(metadata.ticket_id, metadata.tier_id) : null;
            const tierName = metadata.tier_name || (tierDefinition && tierDefinition.name) || 'General Admission';
            const tierAmount = Number(metadata.tier_amount || (tierDefinition && tierDefinition.amount) || lineItem.amount_subtotal / lineItem.quantity);

            const packageEvents = metadata.ticket_id ? getPackageEventDefinitions(metadata.ticket_id) : null;

            if (packageEvents && packageEvents.length > 0) {
                // Package purchase — generate one ticket per included event per quantity
                return Array.from({ length: lineItem.quantity }).flatMap(() =>
                    packageEvents.map(eventDef => ({
                        order_id: order.id,
                        ticket_code: buildTicketCode(session.id, ticketIndex++),
                        event_name: eventDef.name,
                        event_date: eventDef.date || null,
                        event_time: eventDef.time || null,
                        event_location: eventDef.location || null,
                        ticket_id: eventDef.id,
                        ticket_tier_id: metadata.tier_id || null,
                        ticket_tier_name: tierName,
                        ticket_tier_amount: tierAmount,
                        holder_name: holderName,
                        holder_email: holderEmail,
                        status: 'valid',
                        updated_at: new Date().toISOString()
                    }))
                );
            }

            // Single event purchase — one ticket per quantity
            return Array.from({ length: lineItem.quantity }, () => ({
                order_id: order.id,
                ticket_code: buildTicketCode(session.id, ticketIndex++),
                event_name: (ticketDefinition && ticketDefinition.name) || lineItem.description || 'Event',
                event_date: ticketDefinition && ticketDefinition.date || null,
                event_time: ticketDefinition && ticketDefinition.time || null,
                event_location: ticketDefinition && ticketDefinition.location || null,
                ticket_id: metadata.ticket_id || null,
                ticket_tier_id: metadata.tier_id || null,
                ticket_tier_name: tierName,
                ticket_tier_amount: tierAmount,
                holder_name: holderName,
                holder_email: holderEmail,
                status: 'valid',
                updated_at: new Date().toISOString()
            }));
        })()
    );

    const { error: ticketsError } = await supabase
        .from('event_tickets')
        .upsert(ticketPayloads, { onConflict: 'ticket_code' });

    if (ticketsError) {
        throw ticketsError;
    }

    await supabase
        .from('event_ticket_reservations')
        .update({
            status: 'paid',
            updated_at: new Date().toISOString()
        })
        .eq('stripe_session_id', session.id);

    const { data: tickets, error: readError } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, event_date, event_time, event_location, ticket_tier_name, ticket_tier_amount, holder_name, holder_email, status, checked_in, checked_in_at')
        .eq('order_id', order.id)
        .order('ticket_code', { ascending: true });

    if (readError) {
        throw readError;
    }

    return { stored: true, order, tickets, purchasedItems };
}

async function markOrderEmailStatus(orderId, values) {
    const supabase = getSupabase();
    if (!supabase) {
        return;
    }

    await supabase
        .from('event_orders')
        .update({
            ...values,
            updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
}

async function sendTicketsAutomatically(event, order, tickets) {
    if (!order || !order.id) {
        return { sent: false, reason: 'Ticket records are not available for automatic delivery.' };
    }

    if (!order.customer_email) {
        return { sent: false, reason: 'No customer email available for automatic delivery.' };
    }

    if (order.ticket_email_sent_at) {
        return { sent: true, reason: 'Tickets were already emailed.' };
    }

    const uniqueEvents = new Set(tickets.map(t => t.event_name));
    const isPackage = uniqueEvents.size > 1;

    if (isPackage) {
        await sendBundleTicketEmail({
            event,
            tickets,
            to: order.customer_email
        });
    } else {
        for (const ticket of tickets) {
            await sendTicketEmail({
                event,
                ticket,
                to: order.customer_email
            });
        }
    }

    await markOrderEmailStatus(order.id, {
        ticket_email_sent_at: new Date().toISOString(),
        ticket_email_error: null
    });

    return { sent: true };
}

async function recordAmbassadorSale(stripe, session, storage) {
    const supabase = getSupabase();
    if (!supabase) return;

    const discountList = (
        session.total_details &&
        session.total_details.breakdown &&
        session.total_details.breakdown.discounts
    ) || [];
    if (!discountList.length) return;

    const firstDiscount = discountList[0];
    const promoRef = firstDiscount && firstDiscount.discount && firstDiscount.discount.promotion_code;
    if (!promoRef) return;

    let codeString;
    if (typeof promoRef === 'object' && promoRef.code) {
        codeString = promoRef.code;
    } else if (typeof promoRef === 'string') {
        const promoCode = await stripe.promotionCodes.retrieve(promoRef);
        codeString = promoCode.code;
    }
    if (!codeString) return;

    const { data: ambassador } = await supabase
        .from('ambassador_applications')
        .select('id')
        .eq('status', 'approved')
        .ilike('discount_code', codeString)
        .maybeSingle();

    if (!ambassador) return;

    const ticketsCount = (storage.tickets || []).length || 1;
    const amountPaid = session.amount_total || 0;
    const discountAmount = discountList.reduce((s, d) => s + (d.amount || 0), 0);
    const amountBeforeDiscount = amountPaid + discountAmount;
    const eventNames = [...new Set((storage.tickets || []).map(t => t.event_name).filter(Boolean))].join(', ');

    await supabase
        .from('ambassador_sales')
        .upsert({
            ambassador_id: ambassador.id,
            discount_code: codeString.toUpperCase(),
            stripe_session_id: session.id,
            customer_email: session.customer_details && session.customer_details.email,
            customer_name: session.customer_details && session.customer_details.name,
            event_names: eventNames,
            tickets_count: ticketsCount,
            amount_paid_cents: amountPaid,
            amount_before_discount_cents: amountBeforeDiscount,
            discount_amount_cents: discountAmount,
            purchased_at: new Date(session.created * 1000).toISOString()
        }, { onConflict: 'stripe_session_id,discount_code' });
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
            expand: [
                'line_items.data.price.product',
                'payment_intent'
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
                event_name: lineItem.description || session.metadata.ticketName || 'Event',
                event_date: null,
                event_time: null,
                event_location: null,
                ticket_tier_name: session.metadata.tierName || 'General Admission',
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
            emailDelivery = {
                sent: false,
                reason: emailError.message || 'Unable to send ticket email.'
            };
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
