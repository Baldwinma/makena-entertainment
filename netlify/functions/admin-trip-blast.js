const { requireAdmin } = require('./lib/admin-auth');
const { getSupabase } = require('./lib/supabase');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function buildEmail(firstName, siteUrl) {
    const deckUrl = `${siteUrl}/punta-cana-deck.html`;
    const bookUrl = `${siteUrl}/trips.html`;
    const waUrl   = 'https://chat.whatsapp.com/JNc6URa4lsh5qwROm2Inxn?mode=gi_t';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:580px;margin:0 auto;padding:32px 16px 48px">

  <!-- Brand -->
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:22px;font-weight:900;color:#86EFA9;letter-spacing:-0.5px">MAKENA</span>
    <span style="font-size:22px;font-weight:300;color:#fff;letter-spacing:-0.5px"> ENTERTAINMENT</span>
  </div>

  <!-- Hero -->
  <div style="background:linear-gradient(135deg,#0b2a1a,#0a1612);border:1px solid rgba(134,239,172,0.25);border-radius:16px;padding:36px 28px;text-align:center;margin-bottom:20px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#86EFA9;margin-bottom:14px">✈ Makena Group Travel · 2026</div>
    <h1 style="color:#fff;font-size:28px;font-weight:900;margin:0 0 12px;line-height:1.2">
      Hey ${firstName}, <span style="color:#86EFA9">bookings are open.</span>
    </h1>
    <p style="color:rgba(255,255,255,0.65);font-size:15px;line-height:1.75;margin:0 0 10px">
      Punta Cana 2026 is officially live — 5 days, 5 themed events, zero planning on your end.
    </p>
    <p style="color:rgba(255,255,255,0.45);font-size:13px;line-height:1.65;margin:0 0 26px">
      We've upgraded the full itinerary. Boat party, three themed pool parties,<br>adventure day, group dinner, and more — all included in the price.
    </p>
    <a href="${bookUrl}" style="display:inline-block;background:#86EFA9;color:#060d07;font-size:15px;font-weight:800;padding:14px 32px;border-radius:50px;text-decoration:none">
      Reserve My Spot →
    </a>
  </div>

  <!-- Itinerary -->
  <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#86EFA9;margin-bottom:18px">The Itinerary</div>
    <table style="width:100%;border-collapse:collapse">
      <tr style="border-bottom:1px solid #1e1e1e">
        <td style="padding:11px 0;vertical-align:top;width:60px">
          <span style="display:inline-block;background:rgba(134,239,172,0.1);border:1px solid rgba(134,239,172,0.2);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:#86EFA9;letter-spacing:0.05em">WED</span>
        </td>
        <td style="padding:11px 0 11px 8px">
          <div style="color:#fff;font-size:13px;font-weight:700">Arrival + Welcome Mixer + All White Pool Party</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:3px">Private transfers · Check-in · Welcome gift bag · All white pool party to kick things off</div>
        </td>
      </tr>
      <tr style="border-bottom:1px solid #1e1e1e">
        <td style="padding:11px 0;vertical-align:top">
          <span style="display:inline-block;background:rgba(134,239,172,0.1);border:1px solid rgba(134,239,172,0.2);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:#86EFA9;letter-spacing:0.05em">THU</span>
        </td>
        <td style="padding:11px 0 11px 8px">
          <div style="color:#fff;font-size:13px;font-weight:700">Boat Party + Group Dinner</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:3px">Full-day boat party · Open bar · DJ · Group dinner & fun activities in the evening</div>
        </td>
      </tr>
      <tr style="border-bottom:1px solid #1e1e1e">
        <td style="padding:11px 0;vertical-align:top">
          <span style="display:inline-block;background:rgba(134,239,172,0.1);border:1px solid rgba(134,239,172,0.2);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:#86EFA9;letter-spacing:0.05em">FRI</span>
        </td>
        <td style="padding:11px 0 11px 8px">
          <div style="color:#fff;font-size:13px;font-weight:700">Pink Pool Party + Interactive Games</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:3px">Daytime pink pool party · Evening interactive group games & activities</div>
        </td>
      </tr>
      <tr style="border-bottom:1px solid #1e1e1e">
        <td style="padding:11px 0;vertical-align:top">
          <span style="display:inline-block;background:rgba(134,239,172,0.1);border:1px solid rgba(134,239,172,0.2);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:#86EFA9;letter-spacing:0.05em">SAT</span>
        </td>
        <td style="padding:11px 0 11px 8px">
          <div style="color:#fff;font-size:13px;font-weight:700">Adventure Day + Neon Pool Party</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:3px">Morning dune buggies & zip-lining · Finish the night with a neon pool party</div>
        </td>
      </tr>
      <tr>
        <td style="padding:11px 0;vertical-align:top">
          <span style="display:inline-block;background:rgba(134,239,172,0.1);border:1px solid rgba(134,239,172,0.2);border-radius:6px;padding:3px 8px;font-size:10px;font-weight:800;color:#86EFA9;letter-spacing:0.05em">SUN</span>
        </td>
        <td style="padding:11px 0 11px 8px">
          <div style="color:#fff;font-size:13px;font-weight:700">Group Breakfast + Goodbye Drinks</div>
          <div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:3px">Last morning together · Group breakfast · Goodbye drinks · Group photo · Airport transfers</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Pricing -->
  <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#86EFA9;margin-bottom:16px">Pricing Per Person</div>
    <table style="width:100%;border-collapse:collapse">
      <tr style="border-bottom:1px solid #1e1e1e">
        <td style="padding:10px 0;color:rgba(255,255,255,0.55);font-size:13px">Triple Share <span style="color:#f87171;font-size:11px;font-weight:700">⚠ Very Limited</span></td>
        <td style="padding:10px 0;color:#fff;font-size:15px;font-weight:800;text-align:right">$650</td>
      </tr>
      <tr style="border-bottom:1px solid #1e1e1e;background:rgba(134,239,172,0.03)">
        <td style="padding:10px 0;color:rgba(255,255,255,0.55);font-size:13px">Double Share <span style="color:#86EFA9;font-size:11px;font-weight:700">★ Most Popular</span></td>
        <td style="padding:10px 0;color:#86EFA9;font-size:15px;font-weight:800;text-align:right">$799</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:rgba(255,255,255,0.55);font-size:13px">Single Room</td>
        <td style="padding:10px 0;color:#fff;font-size:15px;font-weight:800;text-align:right">$1,399</td>
      </tr>
    </table>
    <p style="font-size:11px;color:rgba(255,255,255,0.3);margin:12px 0 0;line-height:1.6">
      $250 non-refundable deposit per person to secure your spot · Flights not included · Balance due date TBC
    </p>
  </div>

  <!-- What's included -->
  <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px;margin-bottom:20px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#86EFA9;margin-bottom:14px">Everything's Included</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      ${[
        'Boat Party (Open Bar + DJ)',
        'All White Pool Party',
        'Pink Pool Party',
        'Neon Pool Party',
        'Adventure Day (Buggies + Zip-line)',
        'Private Group Dinner',
        'All Meals & Drinks at Resort',
        'Round-Trip Airport Transfers',
        'Makena Welcome Gift Bag',
        '5-Star All-Inclusive Resort'
      ].map(item =>
        `<div style="font-size:12px;color:rgba(255,255,255,0.65);padding:4px 0;display:flex;align-items:flex-start;gap:6px">
          <span style="color:#86EFA9;font-weight:700;flex-shrink:0">✓</span><span>${item}</span>
        </div>`
      ).join('')}
    </div>
  </div>

  <!-- CTAs -->
  <div style="text-align:center;margin-bottom:16px">
    <a href="${bookUrl}" style="display:inline-block;background:#86EFA9;color:#060d07;font-size:15px;font-weight:800;padding:15px 28px;border-radius:50px;text-decoration:none;margin-bottom:12px;width:80%;box-sizing:border-box">
      Reserve My Spot →
    </a>
    <br>
    <a href="${deckUrl}" style="display:inline-block;background:transparent;color:#86EFA9;font-size:13px;font-weight:700;padding:12px 28px;border-radius:50px;text-decoration:none;border:1px solid rgba(134,239,172,0.3);margin-bottom:12px;width:80%;box-sizing:border-box">
      ▶ View the Full Trip Deck
    </a>
    <br>
    <a href="${waUrl}" style="display:inline-block;background:transparent;color:rgba(255,255,255,0.5);font-size:13px;font-weight:600;padding:12px 28px;border-radius:50px;text-decoration:none;border:1px solid rgba(255,255,255,0.1);width:80%;box-sizing:border-box">
      Join the WhatsApp Group
    </a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.8">
    <p style="margin:0">© 2026 Makena Entertainment · makenaevents.com</p>
    <p style="margin:4px 0 0">You're receiving this because you expressed interest in a Makena group trip.</p>
  </div>

</div>
</body>
</html>`;
}

exports.handler = async function (event) {
    const admin = requireAdmin(event);
    if (!admin) return json(401, { error: 'Unauthorized' });

    const supabase = getSupabase();
    if (!supabase) return json(500, { error: 'Database not configured.' });

    // GET — return interest list
    if (event.httpMethod === 'GET') {
        const { data, error } = await supabase
            .from('trip_interests')
            .select('id, first_name, last_name, email, phone, country, guests, submitted_at')
            .order('submitted_at', { ascending: false });

        if (error) return json(500, { error: 'Unable to load interest list.' });
        return json(200, { contacts: data || [] });
    }

    // POST — send blast
    if (event.httpMethod === 'POST') {
        if (!process.env.RESEND_API_KEY)    return json(500, { error: 'RESEND_API_KEY not set.' });
        if (!process.env.TICKET_FROM_EMAIL) return json(500, { error: 'TICKET_FROM_EMAIL not set.' });

        const siteUrl = (process.env.SITE_URL || 'https://makenaevents.com').replace(/\/$/, '');

        // If specific emails are provided in the body, only send to those
        let targetEmails = null;
        try {
            const body = event.body ? JSON.parse(event.body) : {};
            if (Array.isArray(body.emails) && body.emails.length > 0) {
                targetEmails = body.emails.map(e => e.toLowerCase().trim());
            }
        } catch (_) {}

        const { data: allContacts, error } = await supabase
            .from('trip_interests')
            .select('first_name, last_name, email')
            .order('submitted_at', { ascending: false });

        if (error) return json(500, { error: 'Unable to load contacts.' });
        if (!allContacts || allContacts.length === 0) return json(200, { sent: 0, message: 'No contacts found.' });

        let contacts;
        if (targetEmails) {
            // Match from DB where possible, fall back to bare email for any not in the list
            const dbMap = {};
            allContacts.forEach(c => { dbMap[c.email.toLowerCase().trim()] = c; });
            contacts = targetEmails.map(e => dbMap[e.toLowerCase().trim()] || { first_name: null, last_name: null, email: e });
        } else {
            contacts = allContacts;
        }

        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

        const results = [];
        for (const contact of contacts) {
            const firstName = contact.first_name || 'Hey';
            try {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: process.env.TICKET_FROM_EMAIL,
                        to: contact.email,
                        subject: `${firstName}, Punta Cana 2026 is Live 🌴 — Boat Party, 3 Pool Parties & More`,
                        html: buildEmail(firstName, siteUrl)
                    })
                });
                const data = await res.json();
                results.push({ email: contact.email, ok: res.ok, error: res.ok ? null : (data.message || 'Failed') });
            } catch (err) {
                results.push({ email: contact.email, ok: false, error: err.message });
            }
            // Stay well under Resend's 10 req/sec rate limit
            await sleep(150);
        }

        const sent = results.filter(r => r.ok).length;
        const failed = results.filter(r => !r.ok);
        return json(200, { sent, failed, total: contacts.length });
    }

    return json(405, { error: 'Method not allowed' });
};
