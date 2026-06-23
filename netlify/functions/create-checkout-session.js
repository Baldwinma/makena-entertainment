const Stripe = require('stripe');
const { getTicketDefinition } = require('./lib/ticket-catalog');

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

    let lineItems;
    let sessionMetadata;

    if (payload.items && Array.isArray(payload.items) && payload.items.length > 0) {
        // Cart checkout — multiple ticket types
        const validated = [];
        for (const item of payload.items) {
            const ticket = getTicketDefinition(item.ticketId);
            if (!ticket) return json(400, { error: `Unknown ticket: ${item.ticketId}` });
            const qty = Number.parseInt(item.quantity, 10);
            if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
                return json(400, { error: `Invalid quantity for ${item.ticketId}.` });
            }
            validated.push({ ticketId: item.ticketId, ticket, quantity: qty });
        }
        lineItems = validated.map(({ ticketId, ticket, quantity }) => ({
            price_data: {
                currency: ticket.currency,
                product_data: {
                    name: ticket.name,
                    description: ticket.description,
                    metadata: {
                        ticket_id: ticketId
                    }
                },
                unit_amount: ticket.amount
            },
            quantity
        }));
        sessionMetadata = {
            cart: 'true',
            quantity: String(validated.reduce((s, { quantity }) => s + quantity, 0))
        };
    } else {
        // Buy Now — single ticket
        const ticket = getTicketDefinition(payload.ticketId);
        if (!ticket) return json(400, { error: 'Unknown ticket.' });
        const quantity = Number.parseInt(payload.quantity, 10);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
            return json(400, { error: 'Quantity must be between 1 and 10.' });
        }
        lineItems = [{
            price_data: {
                currency: ticket.currency,
                product_data: {
                    name: ticket.name,
                    description: ticket.description,
                    metadata: {
                        ticket_id: payload.ticketId
                    }
                },
                unit_amount: ticket.amount
            },
            quantity
        }];
        sessionMetadata = {
            ticketId: payload.ticketId,
            ticketName: ticket.name,
            quantity: String(quantity)
        };
    }

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            ui_mode: 'embedded',
            line_items: lineItems,
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            return_url: `${baseUrl}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
            metadata: sessionMetadata
        });

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
