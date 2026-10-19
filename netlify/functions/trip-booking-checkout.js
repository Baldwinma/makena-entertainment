const Stripe = require('stripe');
const { getSupabase } = require('./lib/supabase');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function getBaseUrl(event) {
    if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '');
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    return host ? `${proto}://${host}` : '';
}

const TRIP_CONFIGS = {
    PC2026: {
        refPrefix: 'PC2026',
        depositPerPerson: 25000,
        returnPage: 'trips.html',
        productName: 'Punta Cana 2026',
        rooms: {
            triple: { label: 'Triple Share Room (3 guests)', guestCount: 3, pricePerPerson: 65000 },
            double: { label: 'Double Share Room (2 guests)', guestCount: 2, pricePerPerson: 79900 },
            single: { label: 'Single Private Room', guestCount: 1, pricePerPerson: 139900 }
        }
    },
    AS2027: {
        refPrefix: 'AS2027',
        depositPerPerson: 20000,
        returnPage: 'afriskii-snow-escape.html',
        productName: 'Makena Snow Escape 2027',
        rooms: {
            shared:  { label: 'Stay & Slay — Shared King Room',  guestCount: null, pricePerPerson: 80000 },
            private: { label: 'Stay & Slay Solo — Private Room', guestCount: 1,    pricePerPerson: 120000 }
        }
    }
};

// Legacy alias kept for backwards compat with existing PC2026 bookings
const ROOM_CONFIG = TRIP_CONFIGS.PC2026.rooms;
const DEPOSIT_PER_PERSON = 25000;
const PROCESSING_FEE_PER_PERSON = Math.ceil((DEPOSIT_PER_PERSON + 30) / (1 - 0.029)) - DEPOSIT_PER_PERSON;

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: 'Stripe not configured.' });
    if (!process.env.STRIPE_PUBLISHABLE_KEY) return json(500, { error: 'Stripe publishable key not configured.' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Invalid request body.' });
    }

    const { tripId, roomType, guestCount: explicitGuestCount, guests, needsRoommate, paymentType } = payload;
    const isFullPayment = paymentType === 'full';

    // Select the right trip config — default to PC2026 for backwards compat
    const tripKey = tripId === 'AS2027' ? 'AS2027' : 'PC2026';
    const tripConfig = TRIP_CONFIGS[tripKey];

    const roomConfig = tripConfig.rooms[roomType];
    if (!roomConfig) {
        const valid = Object.keys(tripConfig.rooms).join(', ');
        return json(400, { error: `Invalid room type for ${tripKey}. Must be: ${valid}.` });
    }

    // AS2027 Snow Escape: guest count is sent explicitly (1-4 people)
    const effectiveGuestCount = tripKey === 'AS2027'
        ? Math.max(1, Math.min(4, parseInt(explicitGuestCount) || 1))
        : (needsRoommate ? 1 : roomConfig.guestCount);

    if (!Array.isArray(guests) || guests.length !== effectiveGuestCount) {
        return json(400, { error: `${effectiveGuestCount} guest(s) required for this booking.` });
    }

    for (const [i, g] of guests.entries()) {
        if (!String(g.firstName || '').trim()) return json(400, { error: `Guest ${i + 1}: first name is required.` });
        if (!String(g.email || '').trim().includes('@')) return json(400, { error: `Guest ${i + 1}: valid email is required.` });
    }

    const primaryGuest = guests[0];
    if (!String(primaryGuest.phone || '').trim()) return json(400, { error: 'Primary guest phone is required.' });
    if (!String(primaryGuest.country || '').trim()) return json(400, { error: 'Primary guest country is required.' });

    const depositAmountPerPerson = tripConfig.depositPerPerson;
    const depositTotal = depositAmountPerPerson * effectiveGuestCount;

    const processingFeePerPerson = Math.ceil((depositAmountPerPerson + 30) / (1 - 0.029)) - depositAmountPerPerson;

    const fullProcessingFeePerPerson = isFullPayment
        ? Math.ceil((roomConfig.pricePerPerson + 30) / (1 - 0.029)) - roomConfig.pricePerPerson
        : 0;

    const bookingRef = tripConfig.refPrefix + '-' + Date.now().toString(36).toUpperCase().slice(-6);

    const balanceTotal = roomConfig.pricePerPerson * effectiveGuestCount - depositTotal;

    const { data: booking, error: bookingError } = await supabase
        .from('trip_bookings')
        .insert({
            booking_ref: bookingRef,
            trip_id: tripKey,
            room_type: roomType,
            price_per_person: roomConfig.pricePerPerson,
            guest_count: effectiveGuestCount,
            deposit_per_person: depositAmountPerPerson,
            deposit_total: depositTotal,
            balance_total: isFullPayment ? 0 : balanceTotal,
            needs_roommate: tripKey === 'PC2026' && needsRoommate ? true : false,
            payment_type: isFullPayment ? 'full' : 'deposit',
            payment_status: 'pending',
            primary_first_name: String(primaryGuest.firstName).trim(),
            primary_last_name: String(primaryGuest.lastName || '').trim() || null,
            primary_email: String(primaryGuest.email).trim().toLowerCase(),
            primary_phone: String(primaryGuest.phone).trim(),
            primary_country: String(primaryGuest.country).trim()
        })
        .select()
        .single();

    if (bookingError || !booking) {
        console.error('Trip booking insert error:', bookingError);
        return json(500, { error: 'Unable to create booking. Please try again.' });
    }

    const guestRows = guests.map((g, i) => ({
        booking_id: booking.id,
        guest_number: i + 1,
        first_name: String(g.firstName).trim(),
        last_name: String(g.lastName || '').trim() || null,
        email: String(g.email).trim().toLowerCase(),
        phone: String(g.phone || '').trim() || null,
        country: String(g.country || '').trim() || null
    }));

    const { error: guestError } = await supabase
        .from('trip_booking_guests')
        .insert(guestRows);

    if (guestError) {
        console.error('Trip guests insert error:', guestError);
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = getBaseUrl(event);

    try {
        const lineItems = isFullPayment
            ? [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${tripConfig.productName} — ${roomConfig.label}`,
                            description: `Full cost per person. No balance due after this payment.`
                        },
                        unit_amount: roomConfig.pricePerPerson
                    },
                    quantity: effectiveGuestCount
                },
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Processing fee',
                            description: 'Card processing fee (2.9% + $0.30 per person)'
                        },
                        unit_amount: fullProcessingFeePerPerson
                    },
                    quantity: effectiveGuestCount
                }
            ]
            : [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${tripConfig.productName} — ${roomConfig.label}`,
                            description: `Non-refundable deposit per person. Balance due as communicated by Makena Entertainment.`
                        },
                        unit_amount: depositAmountPerPerson
                    },
                    quantity: effectiveGuestCount
                },
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Processing fee',
                            description: 'Card processing fee (2.9% + $0.30 per person)'
                        },
                        unit_amount: processingFeePerPerson
                    },
                    quantity: effectiveGuestCount
                }
            ];

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            ui_mode: 'embedded',
            line_items: lineItems,
            return_url: `${baseUrl}/${tripConfig.returnPage}?booking=success&ref=${bookingRef}&session_id={CHECKOUT_SESSION_ID}`,
            metadata: {
                booking_type: 'trip',
                booking_id: booking.id,
                booking_ref: bookingRef,
                room_type: roomType,
                guest_count: String(effectiveGuestCount),
                needs_roommate: needsRoommate ? 'true' : 'false',
                payment_type: isFullPayment ? 'full' : 'deposit'
            }
        });

        await supabase
            .from('trip_bookings')
            .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
            .eq('id', booking.id);

        return json(200, {
            clientSecret: session.client_secret,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            bookingRef,
            bookingId: booking.id
        });
    } catch (err) {
        console.error('Stripe session error:', err);
        if (err.type === 'StripeAuthenticationError') {
            return json(500, { error: 'Stripe API key is invalid.' });
        }
        return json(500, { error: 'Unable to start checkout. Please try again.' });
    }
};
