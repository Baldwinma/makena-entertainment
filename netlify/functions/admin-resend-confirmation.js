const { requireAdmin } = require('./lib/admin-auth');
const { getSupabase } = require('./lib/supabase');
const { sendTripConfirmationEmail } = require('./lib/trip-emails');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    let payload;
    try { payload = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }

    const { bookingId } = payload;
    if (!bookingId) return json(400, { error: 'bookingId is required.' });

    const { data: booking, error: fetchError } = await supabase
        .from('trip_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking) return json(404, { error: 'Booking not found.' });
    if (booking.payment_status !== 'paid') return json(400, { error: 'Booking is not paid — cannot send confirmation.' });

    try {
        await sendTripConfirmationEmail(supabase, bookingId);
    } catch (err) {
        console.error('admin-resend-confirmation: email error:', err);
        return json(500, { error: 'Failed to send confirmation email.' });
    }

    return json(200, { sent: true, email: booking.primary_email });
};
