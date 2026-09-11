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
    if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    const { data: bookings, error: bookingsError } = await supabase
        .from('trip_bookings')
        .select('*')
        .order('created_at', { ascending: false });

    if (bookingsError) {
        console.error('Trip bookings fetch error:', bookingsError);
        return json(500, { error: 'Unable to load bookings.' });
    }

    const bookingIds = (bookings || []).map(b => b.id);
    let guests = [];

    if (bookingIds.length > 0) {
        const { data: guestsData, error: guestsError } = await supabase
            .from('trip_booking_guests')
            .select('*')
            .in('booking_id', bookingIds)
            .order('guest_number');

        if (!guestsError) guests = guestsData || [];
    }

    const guestsByBooking = {};
    for (const g of guests) {
        if (!guestsByBooking[g.booking_id]) guestsByBooking[g.booking_id] = [];
        guestsByBooking[g.booking_id].push(g);
    }

    const result = (bookings || []).map(b => ({
        ...b,
        guests: guestsByBooking[b.id] || []
    }));

    return json(200, { bookings: result });
};
