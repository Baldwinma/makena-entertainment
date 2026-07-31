const { getSupabase } = require('./lib/supabase');

function json(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function generateReferralCode(firstName, lastName) {
    const clean = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `MKNA-${clean(firstName)}${clean(lastName)}-${rand}`;
}

async function sendAdminNotification({ firstName, lastName, email, instagram, city, why, howHeard, referralCode }) {
    if (!process.env.RESEND_API_KEY || !process.env.TICKET_FROM_EMAIL) return;

    const adminEmail = 'admin@makenaevents.com';

    const howHeardLabel = {
        instagram: 'Instagram',
        tiktok: 'TikTok',
        friend: 'A friend',
        attended: 'Attended a Makena event',
        flyer: 'Flyer / poster',
        other: 'Other'
    }[howHeard] || howHeard || '—';

    const html = `
        <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.6;max-width:600px">
            <h2 style="margin:0 0 4px">New Ambassador Application</h2>
            <p style="margin:0 0 20px;color:#6b7280">Submitted via makenaevents.com/ambassador</p>
            <table style="width:100%;border-collapse:collapse">
                <tr style="background:#f9fafb"><td style="padding:10px 12px;font-weight:600;width:140px;border:1px solid #e5e7eb">Name</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${escapeHtml(firstName)} ${escapeHtml(lastName)}</td></tr>
                <tr><td style="padding:10px 12px;font-weight:600;border:1px solid #e5e7eb">Email</td><td style="padding:10px 12px;border:1px solid #e5e7eb"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
                <tr style="background:#f9fafb"><td style="padding:10px 12px;font-weight:600;border:1px solid #e5e7eb">Instagram</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${instagram ? '@' + escapeHtml(instagram) : '—'}</td></tr>
                <tr><td style="padding:10px 12px;font-weight:600;border:1px solid #e5e7eb">City</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${escapeHtml(city)}</td></tr>
                <tr style="background:#f9fafb"><td style="padding:10px 12px;font-weight:600;border:1px solid #e5e7eb">How they heard</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${escapeHtml(howHeardLabel)}</td></tr>
                <tr><td style="padding:10px 12px;font-weight:600;border:1px solid #e5e7eb;vertical-align:top">Why they want in</td><td style="padding:10px 12px;border:1px solid #e5e7eb">${escapeHtml(why)}</td></tr>
                <tr style="background:#f9fafb"><td style="padding:10px 12px;font-weight:600;border:1px solid #e5e7eb">Referral code</td><td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace">${escapeHtml(referralCode)}</td></tr>
            </table>
            <p style="margin:20px 0 4px;font-size:13px;color:#6b7280">Review and approve at <a href="https://makenaevents.com/admin">makenaevents.com/admin</a> → Ambassadors tab.</p>
        </div>
    `;

    await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.TICKET_FROM_EMAIL,
            to: adminEmail,
            subject: `New Ambassador Application — ${firstName} ${lastName}`,
            html
        })
    });
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Database not configured.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Invalid request body.' });
    }

    const firstName = String(payload.firstName || '').trim();
    const lastName  = String(payload.lastName  || '').trim();
    const email     = String(payload.email     || '').trim().toLowerCase();
    const instagram = String(payload.instagram || '').trim().replace(/^@/, '');
    const city      = String(payload.city      || '').trim();
    const why       = String(payload.why       || '').trim();
    const howHeard  = String(payload.howHeard  || '').trim();

    if (!firstName)                     return json(400, { error: 'First name is required.' });
    if (!lastName)                      return json(400, { error: 'Last name is required.' });
    if (!email || !email.includes('@')) return json(400, { error: 'A valid email address is required.' });
    if (!city)                          return json(400, { error: 'City is required.' });
    if (!why || why.length < 20)        return json(400, { error: 'Please tell us a bit more about why you want to be an ambassador (at least 20 characters).' });

    const { data: existing } = await supabase
        .from('ambassador_applications')
        .select('id, status')
        .eq('email', email)
        .maybeSingle();

    if (existing) {
        if (existing.status === 'pending')  return json(409, { error: 'You have already applied. We will be in touch within 2–3 business days.' });
        if (existing.status === 'approved') return json(409, { error: 'You are already an approved Makena Ambassador!' });
        return json(409, { error: 'An application with this email already exists.' });
    }

    const referralCode = generateReferralCode(firstName, lastName);

    const { error } = await supabase
        .from('ambassador_applications')
        .insert({
            first_name: firstName,
            last_name: lastName,
            email,
            instagram_handle: instagram || null,
            city,
            why,
            how_heard: howHeard || null,
            referral_code: referralCode,
            status: 'pending',
            tier: 'scout',
            tickets_sold: 0,
            commission_earned_cents: 0
        });

    if (error) {
        console.error('ambassador apply error:', error);
        if (error.code === '23505') {
            return json(409, { error: 'An application with this email already exists.' });
        }
        return json(500, { error: 'Unable to submit application. Please try again.' });
    }

    // Notify admin — fire and forget, don't block the response
    sendAdminNotification({ firstName, lastName, email, instagram, city, why, howHeard, referralCode })
        .catch(err => console.error('Ambassador admin notification error:', err));

    return json(200, {
        ok: true,
        message: 'Application received! We will review it and reach out within 2–3 business days.'
    });
};
