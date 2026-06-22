const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        return null;
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            persistSession: false
        },
        realtime: {
            transport: WebSocket
        }
    });
}

module.exports = {
    getSupabase
};
