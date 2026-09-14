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

const ROOM_CONFIG = {
    triple: { label: 'Triple Share Room (3 guests)', guestCount: 3, pricePerPerson: 65000 },
    double: { label: 'Double Share Room (2 guests)', guestCount: 2, pricePerPerson: 79900 },
    single: { label: 'Single Private Room', guestCount: 1, pricePerPerson: 139900 }
};

const DEPOSIT_PER_PERSON = 25000;
// Gross up so we net exactly $250 after Stripe's 2.9% + $0.30 flat fee
const PROCESSING_FEE_PER_PERSON = Math.ceil((DEPOSIT_PER_PERSON + 30) / (1 - 0.029)) - DEPOSIT_PER_PERSON; // $7.77

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

    const { roomType, guests, needsRoommate } = payload;
    const roomConfig = ROOM_CONFIG[roomType];
    if (!roomConfig) return json(400, { error: 'Invalid room type. Must be triple, double, or single.' });

    // Roommate requests only need the single person booking themselves
    const effectiveGuestCount = needsRoommate ? 1 : roomConfig.guestCount;

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

    const depositTotal = DEPOSIT_PER_PERSON * effectiveGuestCount;
    const processingFeeTotal = PROCESSING_FEE_PER_PERSON * effectiveGuestCount;
    const chargedTotal = depositTotal + processingFeeTotal;
    const bookingRef = 'PC2026-' + Date.now().toString(36).toUpperCase().slice(-6);

    const { data: booking, error: bookingError } = await supabase
        .from('trip_bookings')
        .insert({
            booking_ref: bookingRef,
            room_type: roomType,
            price_per_person: roomConfig.pricePerPerson,
            guest_count: effectiveGuestCount,
            deposit_per_person: DEPOSIT_PER_PERSON,
            deposit_total: depositTotal,
            needs_roommate: needsRoommate ? true : false,
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
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            ui_mode: 'embedded',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Punta Cana 2026 — ${roomConfig.label}`,
                            description: `Non-refundable deposit per person. Balance due as communicated by Makena Entertainment.`
                        },
                        unit_amount: DEPOSIT_PER_PERSON
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
                        unit_amount: PROCESSING_FEE_PER_PERSON
                    },
                    quantity: effectiveGuestCount
                }
            ],
            return_url: `${baseUrl}/trips.html?booking=success&ref=${bookingRef}&session_id={CHECKOUT_SESSION_ID}`,
            metadata: {
                booking_type: 'trip',
                booking_id: booking.id,
                booking_ref: bookingRef,
                room_type: roomType,
                guest_count: String(effectiveGuestCount),
                needs_roommate: needsRoommate ? 'true' : 'false'
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
