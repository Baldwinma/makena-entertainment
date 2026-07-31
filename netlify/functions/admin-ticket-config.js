const { requireAdmin } = require('./lib/admin-auth');
const { getSupabase } = require('./lib/supabase');
const { listTicketDefinitions, getTicketDefinition, getTicketTiers } = require('./lib/ticket-catalog');

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
        const { data: overrides, error } = await supabase
            .from('ticket_config_overrides')
            .select('ticket_id, tier_id, price_cents, capacity, updated_at, updated_by');

        if (error) {
            console.error('ticket config GET error:', error);
            return json(500, { error: 'Failed to load ticket config.' });
        }

        const overrideMap = new Map();
        (overrides || []).forEach(o => {
            overrideMap.set(`${o.ticket_id}:${o.tier_id}`, o);
        });

        const tickets = listTicketDefinitions().map(ticket => ({
            id: ticket.id,
            name: ticket.name,
            date: ticket.date,
            currency: ticket.currency,
            tiers: getTicketTiers(ticket).map(tier => {
                const key = `${ticket.id}:${tier.id}`;
                const override = overrideMap.get(key);
                return {
                    id: tier.id,
                    name: tier.name,
                    defaultPrice: tier.amount,
                    defaultCapacity: tier.capacity,
                    effectivePrice: override ? override.price_cents : tier.amount,
                    effectiveCapacity: override ? override.capacity : tier.capacity,
                    hasOverride: !!override,
                    updatedAt: override ? override.updated_at : null,
                    updatedBy: override ? override.updated_by : null
                };
            })
        }));

        return json(200, { tickets });
    }

    if (event.httpMethod === 'POST') {
        let payload;
        try {
            payload = JSON.parse(event.body || '{}');
        } catch {
            return json(400, { error: 'Invalid request body.' });
        }

        const { ticketId, tierId, priceCents, capacity } = payload;

        if (!ticketId || !tierId) {
            return json(400, { error: 'ticketId and tierId are required.' });
        }

        if (!Number.isInteger(priceCents) || priceCents < 0) {
            return json(400, { error: 'priceCents must be a non-negative integer.' });
        }

        if (capacity !== null && capacity !== undefined) {
            if (!Number.isInteger(capacity) || capacity < 0) {
                return json(400, { error: 'capacity must be a non-negative integer or null.' });
            }
        }

        const ticketDef = getTicketDefinition(ticketId);
        if (!ticketDef) {
            return json(400, { error: `Unknown ticket: ${ticketId}` });
        }

        const tierExists = getTicketTiers(ticketDef).some(t => t.id === tierId);
        if (!tierExists) {
            return json(400, { error: `Unknown tier: ${tierId}` });
        }

        const { error } = await supabase
            .from('ticket_config_overrides')
            .upsert({
                ticket_id: ticketId,
                tier_id: tierId,
                price_cents: priceCents,
                capacity: capacity !== undefined ? capacity : null,
                updated_at: new Date().toISOString(),
                updated_by: admin.username
            }, { onConflict: 'ticket_id,tier_id' });

        if (error) {
            console.error('ticket config POST error:', error);
            return json(500, { error: 'Failed to save config.' });
        }

        return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
};
