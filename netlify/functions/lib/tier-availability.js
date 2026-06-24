const { getTicketDefinition, getTicketTiers, listTicketDefinitions } = require('./ticket-catalog');

function getNowIso() {
    return new Date().toISOString();
}

function buildAvailability(ticketId, ticket, soldTickets = [], reservations = []) {
    const tiers = getTicketTiers(ticket);
    const soldByTier = new Map();
    const reservedByTier = new Map();
    const firstTierId = tiers[0] && tiers[0].id;

    soldTickets.forEach(ticketRecord => {
        const tierId = ticketRecord.ticket_tier_id || firstTierId;
        soldByTier.set(tierId, (soldByTier.get(tierId) || 0) + 1);
    });

    reservations.forEach(reservation => {
        const tierId = reservation.tier_id || firstTierId;
        reservedByTier.set(tierId, (reservedByTier.get(tierId) || 0) + Number(reservation.quantity || 0));
    });

    let activeTierId = null;
    const tierAvailability = tiers.map(tier => {
        const sold = soldByTier.get(tier.id) || 0;
        const reserved = reservedByTier.get(tier.id) || 0;
        const used = sold + reserved;
        const remaining = Number.isInteger(tier.capacity) ? Math.max(tier.capacity - used, 0) : null;
        const soldOut = remaining === 0;
        const lowInventory = remaining !== null && remaining > 0 && remaining <= tier.lowInventoryThreshold;

        if (!activeTierId && !soldOut) {
            activeTierId = tier.id;
        }

        return {
            id: tier.id,
            name: tier.name,
            amount: tier.amount,
            currency: tier.currency || ticket.currency,
            capacity: tier.capacity,
            sold,
            reserved,
            remaining,
            soldOut,
            lowInventory,
            active: false
        };
    });

    return {
        ticketId,
        name: ticket.name,
        date: ticket.date,
        time: ticket.time,
        location: ticket.location,
        tiers: tierAvailability.map(tier => ({
            ...tier,
            active: tier.id === activeTierId
        })),
        activeTier: tierAvailability.find(tier => tier.id === activeTierId) || null,
        soldOut: !activeTierId
    };
}

async function getAvailabilityForTicket(supabase, ticketId) {
    const ticket = getTicketDefinition(ticketId);
    if (!ticket) {
        return null;
    }

    const [{ data: soldTickets, error: ticketsError }, { data: reservations, error: reservationsError }] = await Promise.all([
        supabase
            .from('event_tickets')
            .select('ticket_tier_id')
            .eq('event_name', ticket.name)
            .eq('status', 'valid'),
        supabase
            .from('event_ticket_reservations')
            .select('tier_id, quantity')
            .eq('ticket_id', ticketId)
            .eq('status', 'pending')
            .gt('expires_at', getNowIso())
    ]);

    if (ticketsError) {
        throw ticketsError;
    }

    if (reservationsError) {
        throw reservationsError;
    }

    return buildAvailability(ticketId, ticket, soldTickets || [], reservations || []);
}

async function listAvailability(supabase) {
    const ticketIds = listTicketDefinitions().map(ticket => ticket.id);
    return Promise.all(ticketIds.map(ticketId => getAvailabilityForTicket(supabase, ticketId)));
}

module.exports = {
    getAvailabilityForTicket,
    listAvailability
};
