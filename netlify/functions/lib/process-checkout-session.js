const { getSupabase } = require('./supabase');
const { sendTicketEmail, sendBundleTicketEmail } = require('../send-ticket-email');
const {
    getTicketDefinition,
    getTicketDefinitionByName,
    getTierDefinition,
    getPackageEventDefinitions,
    isPackageTicket
} = require('./ticket-catalog');

function buildTicketCode(sessionId, index) {
    const suffix = sessionId.slice(-8).toUpperCase();
    return `MKN-${suffix}-${String(index + 1).padStart(2, '0')}`;
}

async function saveTicketsToSupabase(session, lineItems) {
    const supabase = getSupabase();
    if (!supabase) return { stored: false, reason: 'Supabase is not configured.' };

    const totalQuantity = lineItems.reduce((s, li) => s + li.quantity, 0);
    const orderPayload = {
        stripe_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent && session.payment_intent.id),
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
            ? lineItem.price.product : null;
        const metadata = product && product.metadata ? product.metadata : {};
        const ticketDefinition = getTicketDefinition(metadata.ticket_id) || getTicketDefinitionByName(lineItem.description);
        const tierDefinition = metadata.tier_id ? getTierDefinition(metadata.ticket_id, metadata.tier_id) : null;
        const eventName = (ticketDefinition && ticketDefinition.name) || lineItem.description || 'Event';
        const tierName = metadata.tier_name || (tierDefinition && tierDefinition.name) || 'General Admission';
        return [{
            name: eventName,
            tierName,
            tierId: metadata.tier_id || (tierDefinition && tierDefinition.id) || null,
            tierAmount: Number(
                metadata.tier_amount ||
                (tierDefinition && tierDefinition.amount) ||
                lineItem.amount_subtotal / lineItem.quantity
            ),
            quantity: lineItem.quantity,
            date: (ticketDefinition && ticketDefinition.date) || null,
            time: (ticketDefinition && ticketDefinition.time) || null,
            location: (ticketDefinition && ticketDefinition.location) || null
        }];
    }).flat();

    orderPayload.event_name = purchasedItems.map(item => item.name).join(', ');
    orderPayload.ticket_tier_summary = purchasedItems
        .map(item => `${item.name} ${item.tierName} x${item.quantity}`)
        .join(', ');

    const { data: order, error: orderError } = await supabase
        .from('event_orders')
        .upsert(orderPayload, { onConflict: 'stripe_session_id' })
        .select('id, customer_email, customer_name, ticket_email_sent_at')
        .single();

    if (orderError) throw orderError;

    let ticketIndex = 0;
    const holderName = (session.customer_details && session.customer_details.name) || 'Guest';
    const holderEmail = session.customer_details && session.customer_details.email;

    const ticketPayloads = lineItems.flatMap(lineItem => (() => {
        const product = lineItem.price && lineItem.price.product && typeof lineItem.price.product === 'object'
            ? lineItem.price.product : null;
        const metadata = product && product.metadata ? product.metadata : {};
        const ticketDefinition = getTicketDefinition(metadata.ticket_id) || getTicketDefinitionByName(lineItem.description);
        const tierDefinition = metadata.tier_id ? getTierDefinition(metadata.ticket_id, metadata.tier_id) : null;
        const tierName = metadata.tier_name || (tierDefinition && tierDefinition.name) || 'General Admission';
        const tierAmount = Number(
            metadata.tier_amount ||
            (tierDefinition && tierDefinition.amount) ||
            lineItem.amount_subtotal / lineItem.quantity
        );
        const ticketId = metadata.ticket_id;

        // Group mode: N people all attend the same single event
        const groupModeKey = `group_mode_${ticketId}`;
        if (ticketId && session.metadata && session.metadata[groupModeKey] === 'true') {
            const groupEventId = session.metadata[`group_event_${ticketId}`];
            const groupCount = parseInt(session.metadata[`group_count_${ticketId}`], 10) || 1;
            const groupEventDef = groupEventId ? getTicketDefinition(groupEventId) : null;
            return Array.from({ length: groupCount }, () => ({
                order_id: order.id,
                ticket_code: buildTicketCode(session.id, ticketIndex++),
                event_name: (groupEventDef && groupEventDef.name) || groupEventId || 'Event',
                event_date: (groupEventDef && groupEventDef.date) || null,
                event_time: (groupEventDef && groupEventDef.time) || null,
                event_location: (groupEventDef && groupEventDef.location) || null,
                ticket_id: groupEventId || ticketId,
                ticket_tier_id: metadata.tier_id || null,
                ticket_tier_name: tierName,
                ticket_tier_amount: tierAmount,
                holder_name: holderName,
                holder_email: holderEmail,
                status: 'valid',
                updated_at: new Date().toISOString()
            }));
        }

        // Solo mode: use the events the buyer actually selected in the picker
        const pkgEventsKey = `pkg_events_${String(ticketId).slice(0, 30)}`;
        if (ticketId && session.metadata && session.metadata[pkgEventsKey]) {
            try {
                const selectedIds = JSON.parse(session.metadata[pkgEventsKey]);
                if (Array.isArray(selectedIds) && selectedIds.length > 0) {
                    const selectedEventDefs = selectedIds
                        .map(id => ({ id, ...getTicketDefinition(id) }))
                        .filter(def => def && def.name);
                    if (selectedEventDefs.length > 0) {
                        return Array.from({ length: lineItem.quantity }).flatMap(() =>
                            selectedEventDefs.map(eventDef => ({
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
                }
            } catch (e) {}
        }

        const packageEvents = ticketId ? getPackageEventDefinitions(ticketId) : null;

        if (packageEvents && packageEvents.length > 0) {
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

        return Array.from({ length: lineItem.quantity }, () => ({
            order_id: order.id,
            ticket_code: buildTicketCode(session.id, ticketIndex++),
            event_name: (ticketDefinition && ticketDefinition.name) || lineItem.description || 'Event',
            event_date: (ticketDefinition && ticketDefinition.date) || null,
            event_time: (ticketDefinition && ticketDefinition.time) || null,
            event_location: (ticketDefinition && ticketDefinition.location) || null,
            ticket_id: metadata.ticket_id || null,
            ticket_tier_id: metadata.tier_id || null,
            ticket_tier_name: tierName,
            ticket_tier_amount: tierAmount,
            holder_name: holderName,
            holder_email: holderEmail,
            status: 'valid',
            updated_at: new Date().toISOString()
        }));
    })());

    const { error: ticketsError } = await supabase
        .from('event_tickets')
        .upsert(ticketPayloads, { onConflict: 'ticket_code' });

    if (ticketsError) throw ticketsError;

    await supabase
        .from('event_ticket_reservations')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('stripe_session_id', session.id);

    const { data: tickets, error: readError } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, event_date, event_time, event_location, ticket_tier_name, ticket_tier_amount, holder_name, holder_email, status, checked_in, checked_in_at')
        .eq('order_id', order.id)
        .order('ticket_code', { ascending: true });

    if (readError) throw readError;

    return { stored: true, order, tickets, purchasedItems };
}

async function markOrderEmailStatus(orderId, values) {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase
        .from('event_orders')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', orderId);
}

async function sendTicketsAutomatically(netlifyEvent, order, tickets) {
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
        await sendBundleTicketEmail({ event: netlifyEvent, tickets, to: order.customer_email });
    } else {
        for (const ticket of tickets) {
            await sendTicketEmail({ event: netlifyEvent, ticket, to: order.customer_email });
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

    // Path 1: Stripe promotion code was applied (standard ambassador discount)
    if (discountList.length) {
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
        return;
    }

    // Path 2: Package purchase with a referral code (no Stripe discount applied)
    const referralCode = session.metadata && session.metadata.referral_code;
    if (!referralCode) return;

    const { data: ambassador } = await supabase
        .from('ambassador_applications')
        .select('id')
        .eq('status', 'approved')
        .ilike('discount_code', referralCode)
        .maybeSingle();

    if (!ambassador) return;

    const ticketsCount = (storage.tickets || []).length || 1;
    const amountPaid = session.amount_total || 0;
    const eventNames = [...new Set((storage.tickets || []).map(t => t.event_name).filter(Boolean))].join(', ');

    await supabase
        .from('ambassador_sales')
        .upsert({
            ambassador_id: ambassador.id,
            discount_code: referralCode.toUpperCase(),
            stripe_session_id: session.id,
            customer_email: session.customer_details && session.customer_details.email,
            customer_name: session.customer_details && session.customer_details.name,
            event_names: eventNames,
            tickets_count: ticketsCount,
            amount_paid_cents: amountPaid,
            amount_before_discount_cents: amountPaid,
            discount_amount_cents: 0,
            purchased_at: new Date(session.created * 1000).toISOString()
        }, { onConflict: 'stripe_session_id,discount_code' });
}

module.exports = {
    buildTicketCode,
    saveTicketsToSupabase,
    markOrderEmailStatus,
    sendTicketsAutomatically,
    recordAmbassadorSale
};
