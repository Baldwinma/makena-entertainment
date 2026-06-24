const { getSupabase } = require('./lib/supabase');
const { listAvailability } = require('./lib/tier-availability');

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        },
        body: JSON.stringify(body)
    };
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return json(405, { error: 'Method not allowed' });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Supabase is not configured.' });
    }

    try {
        const events = await listAvailability(supabase);
        return json(200, { events: events.filter(Boolean) });
    } catch (error) {
        console.error('Ticket availability error:', error);
        return json(500, { error: 'Unable to load ticket availability.' });
    }
};
