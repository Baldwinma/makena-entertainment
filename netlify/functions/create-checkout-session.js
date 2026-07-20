const Stripe = require('stripe');
const { getTicketDefinition, isPackageTicket } = require('./lib/ticket-catalog');
const { getSupabase } = require('./lib/supabase');
const { getAvailabilityForTicket } = require('./lib/tier-availability');

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

function getBaseUrl(event) {
    if (process.env.SITE_URL) {
        return process.env.SITE_URL.replace(/\/$/, '');
    }

    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    return host ? `${proto}://${host}` : '';
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        return json(500, { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.' });
    }

    if (!process.env.STRIPE_PUBLISHABLE_KEY) {
        return json(500, { error: 'Stripe publishable key is not configured. Add STRIPE_PUBLISHABLE_KEY to your environment.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (error) {
        return json(400, { error: 'Invalid request body.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = getBaseUrl(event);
    const supabase = getSupabase();

    if (!supabase) {
        return json(500, { error: 'Supabase is not configured. Ticket tiers require Supabase.' });
    }

    let lineItems;
    let sessionMetadata;
    let validatedItems;

    async function validateCheckoutItem(ticketId, quantity) {
        const ticket = getTicketDefinition(ticketId);
        if (!ticket) {
            return { error: `Unknown ticket: ${ticketId}` };
        }

        const availability = await getAvailabilityForTicket(supabase, ticketId);
        if (!availability || !availability.activeTier) {
            return { error: `${ticket.name} is sold out.` };
        }

        const activeTier = availability.activeTier;
        if (activeTier.remaining !== null && quantity > activeTier.remaining) {
            return {
                error: activeTier.remaining === 1
                    ? `Only 1 ticket remains for ${ticket.name} ${activeTier.name}.`
                    : `Only ${activeTier.remaining} tickets remain for ${ticket.name} ${activeTier.name}.`
            };
        }

        return {
            ticketId,
            ticket,
            tier: activeTier,
            quantity
        };
    }

    if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
        // Cart checkout — multiple ticket types
        const validated = [];
        for (const item of payload.items) {
            const qty = Number.parseInt(item.quantity, 10);
            if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
                return json(400, { error: `Invalid quantity for ${item.ticketId}.` });
            }

            const validatedItem = await validateCheckoutItem(item.ticketId, qty);
            if (validatedItem.error) {
                return json(409, { error: validatedItem.error });
            }
            validated.push(validatedItem);
        }
        validatedItems = validated;
        lineItems = validated.map(({ ticketId, ticket, tier, quantity }) => ({
            price_data: {
                currency: tier.currency || ticket.currency,
                product_data: {
                    name: ticket.name,
                    description: `${ticket.description} - ${tier.name}`,
                    metadata: {
                        ticket_id: ticketId,
                        tier_id: tier.id,
                        tier_name: tier.name,
                        tier_amount: String(tier.amount)
                    }
                },
                unit_amount: tier.amount
            },
            quantity
        }));
        sessionMetadata = {
            cart: 'true',
            quantity: String(validated.reduce((s, { quantity }) => s + quantity, 0))
        };
    } else {
        // Buy Now — single ticket
        const quantity = Number.parseInt(payload.quantity, 10);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
            return json(400, { error: 'Quantity must be between 1 and 10.' });
        }

        const validatedItem = await validateCheckoutItem(payload.ticketId, quantity);
        if (validatedItem.error) {
            return json(409, { error: validatedItem.error });
        }

        const { ticket, tier } = validatedItem;
        validatedItems = [validatedItem];
        lineItems = [{
            price_data: {
                currency: tier.currency || ticket.currency,
                product_data: {
                    name: ticket.name,
                    description: `${ticket.description} - ${tier.name}`,
                    metadata: {
                        ticket_id: payload.ticketId,
                        tier_id: tier.id,
                        tier_name: tier.name,
                        tier_amount: String(tier.amount)
                    }
                },
                unit_amount: tier.amount
            },
            quantity
        }];
        sessionMetadata = {
            ticketId: payload.ticketId,
            ticketName: ticket.name,
            tierId: tier.id,
            tierName: tier.name,
            quantity: String(quantity)
        };
    }

    const hasPackage = validatedItems.some(({ ticketId }) => isPackageTicket(ticketId));

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            ui_mode: 'embedded',
            line_items: lineItems,
            allow_promotion_codes: !hasPackage,
            billing_address_collection: 'auto',
            return_url: `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
            metadata: sessionMetadata
        });

        const reservationExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        const reservationPayloads = validatedItems.map(({ ticketId, ticket, tier, quantity }) => ({
            stripe_session_id: session.id,
            ticket_id: ticketId,
            event_name: ticket.name,
            tier_id: tier.id,
            tier_name: tier.name,
            tier_amount: tier.amount,
            quantity,
            status: 'pending',
            expires_at: reservationExpiresAt,
            updated_at: new Date().toISOString()
        }));

        const { error: reservationError } = await supabase
            .from('event_ticket_reservations')
            .insert(reservationPayloads);

        if (reservationError) {
            console.error('Ticket reservation error:', reservationError);
            return json(500, { error: 'Unable to reserve ticket tier.' });
        }

        return json(200, {
            clientSecret: session.client_secret,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        });
    } catch (error) {
        console.error('Stripe checkout error:', error);

        if (error.type === 'StripeAuthenticationError') {
            return json(500, { error: 'Stripe rejected the API key. Add a valid Stripe secret key to your environment, then restart the server.' });
        }

        return json(500, { error: 'Unable to start checkout.' });
    }
};
