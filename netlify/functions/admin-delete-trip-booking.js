const { getSupabase } = require('./lib/supabase');
const { requireAdmin } = require('./lib/admin-auth');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

exports.handler = async function (event) {
    if (event.httpMethod !== 'DELETE') return json(405, { error: 'Method not allowed' });

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
        .select('id, booking_ref, payment_status')
        .eq('id', bookingId)
        .single();

    if (fetchError || !booking) return json(404, { error: 'Booking not found.' });
    if (booking.payment_status === 'paid') return json(400, { error: 'Cannot delete a booking with a completed deposit payment.' });

    const { error: deleteError } = await supabase
        .from('trip_bookings')
        .delete()
        .eq('id', bookingId);

    if (deleteError) {
        console.error('admin-delete-trip-booking: delete error:', deleteError);
        return json(500, { error: 'Unable to delete booking. Please try again.' });
    }

    console.log('admin-delete-trip-booking:', booking.booking_ref, 'deleted by admin', admin.username);

    return json(200, { deleted: true, bookingRef: booking.booking_ref });
};
