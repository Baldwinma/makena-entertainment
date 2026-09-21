const { getSupabase } = require('./lib/supabase');
const { requireAdmin } = require('./lib/admin-auth');
const { sendBalanceConfirmationEmail } = require('./lib/trip-emails');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Invalid request body.' });
    }

    const { bookingId } = payload;
    if (!bookingId) return json(400, { error: 'bookingId is required.' });

    const { data: booking, error: fetchError } = await supabase
        .from('trip_bookings')
        .select('id, booking_ref, balance_payment_status')
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking) return json(404, { error: 'Booking not found.' });
    if (booking.balance_payment_status !== 'paid') return json(400, { error: 'Balance has not been paid for this booking.' });

    try {
        await sendBalanceConfirmationEmail(supabase, bookingId);
    } catch (err) {
        console.error('admin-resend-balance-confirmation: email error:', err);
        return json(500, { error: 'Failed to send email: ' + (err.message || 'Unknown error') });
    }

    console.log('admin-resend-balance-confirmation:', booking.booking_ref, 'sent by admin', admin.username);
    return json(200, { sent: true, bookingRef: booking.booking_ref });
};
