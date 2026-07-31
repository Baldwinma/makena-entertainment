const { requireAdmin } = require('./lib/admin-auth');
const { getSupabase } = require('./lib/supabase');
const { listTicketDefinitions } = require('./lib/ticket-catalog');

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

    if (event.httpMethod === 'GET') {
        const { data: overrides, error } = await supabase
            .from('event_content_overrides')
            .select('ticket_id, description, location, updated_at, updated_by');

        if (error) {
            console.error('event content GET error:', error);
            return json(500, { error: 'Failed to load event content.' });
        }

        const overrideMap = new Map();
        (overrides || []).forEach(o => overrideMap.set(o.ticket_id, o));

        const events = listTicketDefinitions().map(ticket => {
            const override = overrideMap.get(ticket.id);
            return {
                id: ticket.id,
                name: ticket.name,
                date: ticket.date,
                defaultDescription: ticket.description || '',
                defaultLocation: ticket.location || '',
                effectiveDescription: (override && override.description) || ticket.description || '',
                effectiveLocation: (override && override.location) || ticket.location || '',
                hasOverride: !!override,
                updatedAt: override ? override.updated_at : null,
                updatedBy: override ? override.updated_by : null
            };
        });

        return json(200, { events });
    }

    if (event.httpMethod === 'POST') {
        let payload;
        try {
            payload = JSON.parse(event.body || '{}');
        } catch {
            return json(400, { error: 'Invalid request body.' });
        }

        const { ticketId, description, location } = payload;

        if (!ticketId) return json(400, { error: 'ticketId is required.' });

        const ticketDef = listTicketDefinitions().find(t => t.id === ticketId);
        if (!ticketDef) return json(400, { error: `Unknown ticket: ${ticketId}` });

        const { error } = await supabase
            .from('event_content_overrides')
            .upsert({
                ticket_id: ticketId,
                event_name: ticketDef.name,
                description: description !== undefined ? (description || null) : undefined,
                location: location !== undefined ? (location || null) : undefined,
                updated_at: new Date().toISOString(),
                updated_by: admin.username
            }, { onConflict: 'ticket_id' });

        if (error) {
            console.error('event content POST error:', error);
            return json(500, { error: 'Failed to save event content.' });
        }

        return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
};
