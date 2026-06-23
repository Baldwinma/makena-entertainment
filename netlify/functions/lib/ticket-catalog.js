const ticketCatalog = {
    wet_dreams_test: {
        name: 'Wet Dreams Pool Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 1, 2026',
        time: '12 PM - 9 PM',
        location: 'Portimao, Portugal'
    },
    welcome_party: {
        name: 'Welcome Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 100,
        currency: 'usd',
        date: 'June 30, 2026',
        time: '10 PM',
        location: 'Secret Villa, Portimao, Portugal'
    },
    wet_dreams_pool_party: {
        name: 'Wet Dreams Pool Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 1, 2026',
        time: '12 PM - 9 PM',
        location: 'Portimao, Portugal'
    },
    french_connection: {
        name: 'French Connection',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 1, 2026',
        time: '10 PM',
        location: 'Portimao, Portugal'
    },
    festival_kick_off: {
        name: 'Festival Kick OFF',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 2, 2026',
        time: '12 PM - 6 PM',
        location: 'Portimao, Portugal'
    },
    makena_boat_party: {
        name: 'Makena Boat Party',
        description: 'Makena Afronation Portimao boat party ticket',
        amount: 7000,
        currency: 'usd',
        date: 'July 2, 2026',
        time: '12 PM - 4 PM',
        location: 'Portimao, Portugal'
    },
    all_white_party: {
        name: 'All White Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 2, 2026',
        time: '10 PM',
        location: 'Portimao, Portugal'
    },
    rep_your_flag: {
        name: 'Rep Your Flag',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 3, 2026',
        time: '12 PM - 6 PM',
        location: 'Portimao, Portugal'
    },
    afro_beats_vs_amapiano: {
        name: 'Afro Beats vs Amapiano',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 3, 2026',
        time: '10 PM',
        location: 'Portimao, Portugal'
    },
    rnb_old_school_day_party: {
        name: 'RnB & Old School Day Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 4, 2026',
        time: '12 PM - 6 PM',
        location: 'Portimao, Portugal'
    },
    caribbean_energy: {
        name: 'Soca X Reggaeton X Kompa Caribbean Energy',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 4, 2026',
        time: '10 PM',
        location: 'Portimao, Portugal'
    },
    where_tall_people_meet: {
        name: 'Where Tall People Meet',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 5, 2026',
        time: '12 PM - 6 PM',
        location: 'Portimao, Portugal'
    },
    red_flag_party: {
        name: 'Red Flag Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 5, 2026',
        time: '10 PM',
        location: 'Portimao, Portugal'
    },
    all_orange_day_party: {
        name: 'All Orange Day Party',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 6, 2026',
        time: '12 PM - 6 PM',
        location: 'Portimao, Portugal'
    },
    closing_party_in_style: {
        name: 'Makena Closing Party in Style',
        description: 'Makena Afronation Portimao ticket',
        amount: 2500,
        currency: 'usd',
        date: 'July 6, 2026',
        time: '10 PM',
        location: 'Portimao, Portugal'
    }
};

function getTicketDefinition(ticketId) {
    return ticketCatalog[ticketId] || null;
}

function getTicketDefinitionByName(name) {
    const normalized = String(name || '').trim().toLowerCase();
    if (!normalized) {
        return null;
    }

    return Object.values(ticketCatalog).find(ticket => ticket.name.trim().toLowerCase() === normalized) || null;
}

function listTicketDefinitions() {
    return Object.entries(ticketCatalog).map(([id, ticket]) => ({
        id,
        ...ticket
    }));
}

function summarizePurchasedItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return '';
    }

    return items.map(item => {
        const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
        return `${item.name}${quantity}`;
    }).join(', ');
}

module.exports = {
    getTicketDefinition,
    getTicketDefinitionByName,
    listTicketDefinitions,
    summarizePurchasedItems
};
