const { requireAdmin } = require('./lib/admin-auth');
const { getSupabase } = require('./lib/supabase');
const { sendAbandonedBookingEmail } = require('./lib/trip-emails');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

exports.handler = async function(event) {
    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    // GET — list all pending bookings older than 1 hour
    if (event.httpMethod === 'GET') {
        const { data: bookings, error } = await supabase
            .from('trip_bookings')
            .select('*')
            .eq('payment_status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('admin-send-reminder: fetch error:', error);
            return json(500, { error: 'Unable to load pending bookings.' });
        }

        return json(200, { bookings: bookings || [] });
    }

    // POST — send reminders
    if (event.httpMethod === 'POST') {
        let payload;
        try { payload = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        let bookingsToSend;

        if (payload.bookingIds && Array.isArray(payload.bookingIds) && payload.bookingIds.length > 0) {
            // Send only to specified bookings
            const { data, error } = await supabase
                .from('trip_bookings')
                .select('*')
                .in('id', payload.bookingIds)
                .eq('payment_status', 'pending');

            if (error) {
                console.error('admin-send-reminder: fetch error:', error);
                return json(500, { error: 'Unable to load specified bookings.' });
            }
            bookingsToSend = data || [];
        } else {
            // Send to all eligible: pending, older than 1 hour, reminder not yet sent
            const { data, error } = await supabase
                .from('trip_bookings')
                .select('*')
                .eq('payment_status', 'pending')
                .lt('created_at', oneHourAgo)
                .is('reminder_sent_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('admin-send-reminder: fetch error:', error);
                return json(500, { error: 'Unable to load eligible bookings.' });
            }
            bookingsToSend = data || [];
        }

        let sent = 0;
        const failed = [];

        for (const booking of bookingsToSend) {
            try {
                await sendAbandonedBookingEmail(booking);

                await supabase
                    .from('trip_bookings')
                    .update({ reminder_sent_at: new Date().toISOString() })
                    .eq('id', booking.id);

                sent++;
            } catch (err) {
                console.error('admin-send-reminder: failed to send to', booking.primary_email, err);
                failed.push({ id: booking.id, email: booking.primary_email, error: err.message });
            }

            // Rate limiting — 200ms between sends
            if (bookingsToSend.indexOf(booking) < bookingsToSend.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        return json(200, { sent, failed, total: bookingsToSend.length });
    }

    return json(405, { error: 'Method not allowed' });
};
