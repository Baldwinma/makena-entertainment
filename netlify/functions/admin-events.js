const { getSupabase } = require('./lib/supabase');
const { requireAdmin } = require('./lib/admin-auth');
const { listTicketDefinitions } = require('./lib/ticket-catalog');

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

function normalizeEventName(name) {
    return String(name || '').trim().toLowerCase();
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'GET') {
        return json(405, { error: 'Method not allowed' });
    }

    const admin = requireAdmin(event);
    if (!admin) {
        return json(401, { error: 'Admin login required.' });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Supabase is not configured.' });
    }

    const { data: tickets, error } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, holder_name, holder_email, ticket_tier_name, ticket_tier_amount, status, checked_in, checked_in_at, created_at')
        .order('created_at', { ascending: false });

    const { data: recentScans, error: recentError } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, holder_name, holder_email, checked_in_at, checked_in_by')
        .eq('checked_in', true)
        .order('checked_in_at', { ascending: false })
        .limit(25);

    if (error) {
        console.error('Admin event summary error:', error);
        return json(500, { error: 'Unable to load events.' });
    }

    if (recentError) {
        console.error('Admin recent scans error:', recentError);
        return json(500, { error: 'Unable to load recent scans.' });
    }

    const counts = new Map();
    (tickets || []).forEach(ticket => {
        const key = normalizeEventName(ticket.event_name);
        if (!key) {
            return;
        }

        const current = counts.get(key) || {
            totalTickets: 0,
            validTickets: 0,
            checkedInTickets: 0
        };
        current.totalTickets += 1;
        if (ticket.status === 'valid') {
            current.validTickets += 1;
        }
        if (ticket.checked_in) {
            current.checkedInTickets += 1;
        }
        counts.set(key, current);
    });

    const events = listTicketDefinitions().filter(ticket => ticket.id.startsWith('dc_')).map(ticket => {
        const eventCounts = counts.get(normalizeEventName(ticket.name)) || {
            totalTickets: 0,
            validTickets: 0,
            checkedInTickets: 0
        };

        return {
            id: ticket.id,
            name: ticket.name,
            date: ticket.date,
            time: ticket.time,
            location: ticket.location,
            totalTickets: eventCounts.totalTickets,
            validTickets: eventCounts.validTickets,
            checkedInTickets: eventCounts.checkedInTickets
        };
    });

    return json(200, {
        admin: {
            username: admin.username || 'Makena admin'
        },
        events,
        attendees: (tickets || []).map(ticket => ({
            ticketCode: ticket.ticket_code,
            eventName: ticket.event_name,
            holderName: ticket.holder_name || 'Guest',
            holderEmail: ticket.holder_email || '',
            tierName: ticket.ticket_tier_name || 'General Admission',
            tierAmount: ticket.ticket_tier_amount,
            status: ticket.status,
            checkedIn: Boolean(ticket.checked_in),
            checkedInAt: ticket.checked_in_at,
            purchasedAt: ticket.created_at
        })),
        recentScans: recentScans || []
    });
};
