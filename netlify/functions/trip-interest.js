const { getSupabase } = require('./lib/supabase');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

exports.handler = async function (event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Database not configured.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Invalid request body.' });
    }

    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const phone = String(payload.phone || '').trim();
    const country = String(payload.country || '').trim();
    const guests = String(payload.guests || '1').trim();

    if (!firstName || !email || !phone || !country) {
        return json(400, { error: 'First name, email, phone, and country are required.' });
    }

    if (!email.includes('@')) {
        return json(400, { error: 'Enter a valid email address.' });
    }

    const { error } = await supabase
        .from('trip_interests')
        .insert({
            first_name: firstName,
            last_name: lastName || null,
            email,
            phone,
            country,
            guests,
            submitted_at: new Date().toISOString()
        });

    if (error) {
        console.error('Trip interest insert error:', error);
        return json(500, { error: 'Unable to save your interest. Please try again.' });
    }

    return json(200, { message: 'Interest recorded.' });
};
