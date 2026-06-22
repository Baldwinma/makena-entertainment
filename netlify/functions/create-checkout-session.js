const Stripe = require('stripe');

const tickets = {
    wet_dreams_test: {
        name: 'Wet Dreams Pool Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    welcome_party: {
        name: 'Welcome Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    wet_dreams_pool_party: {
        name: 'Wet Dreams Pool Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    french_connection: {
        name: 'French Connection',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    festival_kick_off: {
        name: 'Festival Kick OFF',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    makena_boat_party: {
        name: 'Makena Boat Party',
        description: 'Makena Afronation Portimao boat party ticket',
        amount: 7000,
        currency: 'usd'
    },
    all_white_party: {
        name: 'All White Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    rep_your_flag: {
        name: 'Rep Your Flag',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    afro_beats_vs_amapiano: {
        name: 'Afro Beats vs Amapiano',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    rnb_old_school_day_party: {
        name: 'RnB & Old School Day Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    caribbean_energy: {
        name: 'Soca X Reggaeton X Kompa Caribbean Energy',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    where_tall_people_meet: {
        name: 'Where Tall People Meet',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    red_flag_party: {
        name: 'Red Flag Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    all_orange_day_party: {
        name: 'All Orange Day Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    },
    closing_party_in_style: {
        name: 'Makena Closing Party in Style',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd'
    }
};

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
    return `${proto}://${host}`;
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        return json(500, { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (error) {
        return json(400, { error: 'Invalid request body.' });
    }

    const ticket = tickets[payload.ticketId];
    if (!ticket) {
        return json(400, { error: 'Unknown ticket.' });
    }

    const quantity = Number.parseInt(payload.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return json(400, { error: 'Quantity must be between 1 and 10.' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = getBaseUrl(event);

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: ticket.currency,
                        product_data: {
                            name: ticket.name,
                            description: ticket.description
                        },
                        unit_amount: ticket.amount
                    },
                    quantity
                }
            ],
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            success_url: `${baseUrl}/checkout-test?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/checkout-test?canceled=true`,
            metadata: {
                ticketId: payload.ticketId,
                ticketName: ticket.name,
                quantity: String(quantity)
            }
        });

        return json(200, { url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);

        if (error.type === 'StripeAuthenticationError') {
            return json(500, { error: 'Stripe rejected the API key. Add a valid test secret key that starts with sk_test_ to your .env file, then restart Netlify Dev.' });
        }

        return json(500, { error: 'Unable to start checkout.' });
    }
};
