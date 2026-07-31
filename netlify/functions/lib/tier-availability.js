const { getTicketDefinition, getTicketTiers, listTicketDefinitions } = require('./ticket-catalog');

const ACTIVE_TICKET_IDS = new Set([
    'dc_trio_pass',
    'dc_five_event_pass',
    'dc_full_fest_pass',
    'dc_party_pass',
    'dc_welcome_party',
    'dc_rnb_day_party',
    'dc_amapiano_vs_afrobeat',
    'dc_brunch_day_party',
    'dc_dancehall_soca_party',
    'dc_group_chat_linkup',
    'dc_last_last_after_party',
    'dc_all_white_boat_party',
    'dc_all_white_closing_party'
]);

function getNowIso() {
    return new Date().toISOString();
}

function getLisbonDateKey(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Lisbon',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const lookup = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function getTicketDateKey(dateText) {
    if (!dateText) {
        return null;
    }

    const match = String(dateText).trim().match(/^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
    if (!match) {
        return null;
    }

    const monthLookup = {
        january: '01',
        february: '02',
        march: '03',
        april: '04',
        may: '05',
        june: '06',
        july: '07',
        august: '08',
        september: '09',
        october: '10',
        november: '11',
        december: '12'
    };

    const month = monthLookup[match[1].toLowerCase()];
    if (!month) {
        return null;
    }

    return `${match[3]}-${month}-${match[2].padStart(2, '0')}`;
}

function buildAvailability(ticketId, ticket, soldTickets = [], reservations = [], overrideMap = new Map()) {
    const tiers = getTicketTiers(ticket);
    const isWhitelistedEvent = ACTIVE_TICKET_IDS.has(ticketId);
    const ticketDateKey = getTicketDateKey(ticket.date);
    const todayKey = getLisbonDateKey();
    const isPastEvent = ticketDateKey ? ticketDateKey < todayKey : false;

    if (!isWhitelistedEvent || isPastEvent) {
        return {
            ticketId,
            name: ticket.name,
            date: ticket.date,
            time: ticket.time,
            location: ticket.location,
            tiers: tiers.map(tier => ({
                id: tier.id,
                name: tier.name,
                amount: tier.amount,
                currency: tier.currency || ticket.currency,
                capacity: tier.capacity,
                sold: tier.capacity || 0,
                reserved: 0,
                remaining: 0,
                soldOut: true,
                lowInventory: false,
                active: false
            })),
            activeTier: null,
            soldOut: true
        };
    }

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
        const override = overrideMap.get(tier.id);
        const effectiveCapacity = override ? override.capacity : tier.capacity;
        const effectiveAmount = override && override.price_cents !== null ? override.price_cents : tier.amount;

        const sold = soldByTier.get(tier.id) || 0;
        const reserved = reservedByTier.get(tier.id) || 0;
        const used = sold + reserved;
        const remaining = Number.isInteger(effectiveCapacity) ? Math.max(effectiveCapacity - used, 0) : null;
        const soldOut = remaining === 0;
        const lowInventory = remaining !== null && remaining > 0 && remaining <= tier.lowInventoryThreshold;

        if (!activeTierId && !soldOut) {
            activeTierId = tier.id;
        }

        return {
            id: tier.id,
            name: tier.name,
            amount: effectiveAmount,
            currency: tier.currency || ticket.currency,
            capacity: effectiveCapacity,
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

async function getAvailabilityForTicket(supabase, ticketId, preloadedOverrides = null) {
    const ticket = getTicketDefinition(ticketId);
    if (!ticket) {
        return null;
    }

    let overridesPromise;
    if (preloadedOverrides !== null) {
        overridesPromise = Promise.resolve(preloadedOverrides);
    } else {
        overridesPromise = supabase
            .from('ticket_config_overrides')
            .select('tier_id, price_cents, capacity')
            .eq('ticket_id', ticketId)
            .then(({ data }) => {
                const map = new Map();
                (data || []).forEach(o => map.set(o.tier_id, o));
                return map;
            });
    }

    const [{ data: soldTickets, error: ticketsError }, { data: reservations, error: reservationsError }, overrideMap] = await Promise.all([
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
            .gt('expires_at', getNowIso()),
        overridesPromise
    ]);

    if (ticketsError) {
        throw ticketsError;
    }

    if (reservationsError) {
        throw reservationsError;
    }

    return buildAvailability(ticketId, ticket, soldTickets || [], reservations || [], overrideMap);
}

async function listAvailability(supabase) {
    const ticketIds = listTicketDefinitions().map(ticket => ticket.id);

    const { data: allOverrides } = await supabase
        .from('ticket_config_overrides')
        .select('ticket_id, tier_id, price_cents, capacity');

    const overridesByTicket = new Map();
    (allOverrides || []).forEach(o => {
        if (!overridesByTicket.has(o.ticket_id)) {
            overridesByTicket.set(o.ticket_id, new Map());
        }
        overridesByTicket.get(o.ticket_id).set(o.tier_id, o);
    });

    return Promise.all(ticketIds.map(ticketId =>
        getAvailabilityForTicket(supabase, ticketId, overridesByTicket.get(ticketId) || new Map())
    ));
}

module.exports = {
    getAvailabilityForTicket,
    listAvailability
};
