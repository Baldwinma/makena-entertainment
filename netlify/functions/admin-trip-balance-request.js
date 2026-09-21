const Stripe = require('stripe');
const { getSupabase } = require('./lib/supabase');
const { requireAdmin } = require('./lib/admin-auth');

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

const ROOM_LABELS = {
    triple: 'Triple Share Room',
    double: 'Double Share Room',
    single: 'Single Private Room'
};

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    if (!process.env.STRIPE_SECRET_KEY) return json(500, { error: 'Stripe not configured.' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Invalid request body.' });
    }

    const { bookingRef } = payload;
    if (!bookingRef) return json(400, { error: 'bookingRef is required.' });

    const { data: booking, error: fetchError } = await supabase
        .from('trip_bookings')
        .select('*')
        .eq('booking_ref', bookingRef.trim().toUpperCase())
        .single();

    if (fetchError || !booking) return json(404, { error: 'Booking not found.' });
    if (booking.payment_status !== 'paid') return json(400, { error: 'Deposit has not been paid for this booking.' });

    const fullBalance = (booking.price_per_person * booking.guest_count) - booking.deposit_total;
    const customAmountDollars = parseFloat(payload.customAmount);
    const balanceTotal = (!isNaN(customAmountDollars) && customAmountDollars > 0)
        ? Math.round(customAmountDollars * 100)
        : fullBalance;

    if (balanceTotal <= 0) return json(400, { error: 'Amount must be greater than $0.' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const baseUrl = getBaseUrl(event);
    const roomLabel = ROOM_LABELS[booking.room_type] || booking.room_type;
    const guestName = [booking.primary_first_name, booking.primary_last_name].filter(Boolean).join(' ');

    let session;
    try {
        session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: booking.primary_email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Punta Cana 2026 — ${roomLabel} (Balance)`,
                            description: `Remaining balance for booking ${booking.booking_ref}. $${(booking.deposit_total / 100).toFixed(0)} deposit already paid.`
                        },
                        unit_amount: balanceTotal
                    },
                    quantity: 1
                }
            ],
            success_url: `${baseUrl}/trips.html?balance=success&ref=${booking.booking_ref}`,
            cancel_url: `${baseUrl}/trips.html`,
            metadata: {
                booking_type: 'trip_balance',
                booking_id: booking.id,
                booking_ref: booking.booking_ref
            }
        });
    } catch (err) {
        console.error('admin-trip-balance-request: Stripe error:', err);
        return json(500, { error: 'Unable to create payment link. Please try again.' });
    }

    await supabase
        .from('trip_bookings')
        .update({
            balance_total: balanceTotal,
            balance_stripe_session_id: session.id,
            updated_at: new Date().toISOString()
        })
        .eq('id', booking.id);

    console.log('admin-trip-balance-request: link generated for', booking.booking_ref, 'by admin', admin.username);

    return json(200, {
        checkoutUrl: session.url,
        bookingRef: booking.booking_ref,
        guestName,
        email: booking.primary_email,
        balanceTotal,
        balanceTotalFormatted: `$${(balanceTotal / 100).toFixed(2)}`
    });
};
