const { requireAdmin } = require('./lib/admin-auth');
const { getSupabase } = require('./lib/supabase');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

exports.handler = async function(event) {
    const admin = requireAdmin(event);
    if (!admin) {
        return json(401, { error: 'Unauthorized' });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Database not configured.' });
    }

    if (event.httpMethod === 'GET') {
        const { data, error } = await supabase
            .from('app_settings')
            .select('key, value, updated_at, updated_by');

        if (error) {
            console.error('admin-settings GET error:', error);
            return json(500, { error: 'Failed to load settings.' });
        }

        return json(200, { settings: data || [] });
    }

    if (event.httpMethod === 'POST') {
        let payload;
        try {
            payload = JSON.parse(event.body || '{}');
        } catch {
            return json(400, { error: 'Invalid request body.' });
        }

        const { key, value } = payload;
        if (!key) {
            return json(400, { error: 'key is required.' });
        }
        if (value === undefined || value === null) {
            return json(400, { error: 'value is required.' });
        }

        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key,
                value: String(value),
                updated_at: new Date().toISOString(),
                updated_by: admin.username
            }, { onConflict: 'key' });

        if (error) {
            console.error('admin-settings POST error:', error);
            return json(500, { error: 'Failed to save setting.' });
        }

        return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
};
