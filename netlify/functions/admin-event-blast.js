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

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function buildBlastEmailHtml({ name, subject, body }) {
    const lines = body.split('\n').map(line => line.trim() === '' ? '<br>' : `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`).join('');
    return `
        <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:560px">
            <h2 style="margin-bottom:4px">${escapeHtml(subject)}</h2>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0 20px">
            ${lines}
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px">
            <p style="font-size:12px;color:#9ca3af;margin:0">You received this email because you purchased a ticket through Makena Events. Questions? Email <a href="mailto:admin@makenaevents.com">admin@makenaevents.com</a></p>
        </div>
    `;
}

async function getBuyers(supabase, ticketId) {
    const ticketDef = listTicketDefinitions().find(t => t.id === ticketId);
    if (!ticketDef) return [];

    const [{ data: tickets }, { data: ebImports }] = await Promise.all([
        supabase
            .from('event_tickets')
            .select('holder_name, holder_email, ticket_code, ticket_tier_name, status')
            .eq('event_name', ticketDef.name)
            .eq('status', 'valid'),
        supabase
            .from('eventbrite_imports')
            .select('holder_name, holder_email, event_id, quantity')
            .eq('event_id', ticketId)
    ]);

    const buyers = [];
    const seen = new Set();

    (tickets || []).forEach(t => {
        if (!t.holder_email) return;
        const key = t.holder_email.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        buyers.push({ name: t.holder_name || 'Guest', email: t.holder_email, source: 'makena', ticketCode: t.ticket_code });
    });

    (ebImports || []).forEach(row => {
        if (!row.holder_email) return;
        const key = row.holder_email.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        buyers.push({ name: row.holder_name || 'Guest', email: row.holder_email, source: 'eventbrite', ticketCode: null });
    });

    return buyers;
}

exports.handler = async function(event) {
    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    const params = new URLSearchParams(event.queryStringParameters || {});
    const ticketId = params.get('eventId') || (event.body && JSON.parse(event.body || '{}').eventId);

    if (!ticketId) return json(400, { error: 'eventId is required.' });

    // GET — return buyer list
    if (event.httpMethod === 'GET') {
        const buyers = await getBuyers(supabase, ticketId);
        return json(200, { buyers });
    }

    // POST — send blast email to all buyers
    if (event.httpMethod === 'POST') {
        if (!process.env.RESEND_API_KEY) return json(500, { error: 'RESEND_API_KEY is not set.' });
        if (!process.env.TICKET_FROM_EMAIL) return json(500, { error: 'TICKET_FROM_EMAIL is not set.' });

        let payload;
        try { payload = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid JSON.' }); }

        const { subject, body } = payload;
        if (!subject || !body) return json(400, { error: 'subject and body are required.' });

        const buyers = await getBuyers(supabase, ticketId);
        if (!buyers.length) return json(200, { sent: 0, message: 'No buyers found for this event.' });

        const results = [];
        for (const buyer of buyers) {
            // Personalise the body: replace {name} with their first name
            const firstName = (buyer.name || 'Guest').split(' ')[0];
            const personalBody = body.replace(/\{name\}/g, firstName);

            try {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: process.env.TICKET_FROM_EMAIL,
                        to: buyer.email,
                        subject,
                        html: buildBlastEmailHtml({ name: firstName, subject, body: personalBody })
                    })
                });
                const data = await res.json();
                results.push({ email: buyer.email, ok: res.ok, error: res.ok ? null : (data.message || 'Failed') });
            } catch (err) {
                results.push({ email: buyer.email, ok: false, error: err.message });
            }
        }

        const sent = results.filter(r => r.ok).length;
        const failed = results.filter(r => !r.ok);
        return json(200, { sent, failed, total: buyers.length });
    }

    return json(405, { error: 'Method not allowed' });
};
