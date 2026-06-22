const QRCode = require('qrcode');
const { getSupabase } = require('./lib/supabase');

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

function cleanCode(code) {
    return String(code || '').trim().toUpperCase();
}

function getBaseUrl(event) {
    if (process.env.SITE_URL) {
        return process.env.SITE_URL.replace(/\/$/, '');
    }

    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host = event.headers.host;
    return `${proto}://${host}`;
}

function buildEmailHtml({ ticket, checkInUrl, qrImageUrl }) {
    return `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h1 style="margin-bottom: 8px;">Your Makena Ticket</h1>
            <p style="margin-top: 0;">Thank you for your purchase. Keep this email ready for entry.</p>
            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; max-width: 520px;">
                <p style="margin: 0 0 6px;"><strong>Event:</strong> ${ticket.event_name}</p>
                <p style="margin: 0 0 6px;"><strong>Name:</strong> ${ticket.holder_name || 'Guest'}</p>
                <p style="margin: 0 0 14px;"><strong>Ticket Code:</strong> ${ticket.ticket_code}</p>
                <img src="${qrImageUrl}" alt="Ticket QR Code" width="220" height="220" style="display: block; width: 220px; height: 220px; border: 1px solid #e5e7eb; border-radius: 10px;">
                <p style="font-size: 13px; color: #6b7280;">If the QR code does not display, open it here: <a href="${qrImageUrl}">${qrImageUrl}</a></p>
                <p style="font-size: 13px; color: #6b7280;">For local testing, the QR code is also attached to this email as <strong>${ticket.ticket_code}.png</strong>.</p>
                <p style="font-size: 13px; color: #6b7280;">You can also use this ticket code at the door: ${ticket.ticket_code}</p>
                <p style="font-size: 13px; color: #6b7280;">Check-in link: <a href="${checkInUrl}">${checkInUrl}</a></p>
            </div>
        </div>
    `;
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    if (!process.env.RESEND_API_KEY) {
        return json(500, { error: 'Email is not configured. Add RESEND_API_KEY to .env, then restart Netlify Dev.' });
    }

    const fromEmail = process.env.TICKET_FROM_EMAIL || 'Makena Tickets <onboarding@resend.dev>';

    const supabase = getSupabase();
    if (!supabase) {
        return json(500, { error: 'Supabase is not configured.' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (error) {
        return json(400, { error: 'Invalid request body.' });
    }

    const to = String(payload.email || '').trim();
    const ticketCode = cleanCode(payload.ticketCode);

    if (!to || !to.includes('@')) {
        return json(400, { error: 'Enter a valid email address.' });
    }

    if (!ticketCode) {
        return json(400, { error: 'Missing ticket code.' });
    }

    const { data: ticket, error: ticketError } = await supabase
        .from('event_tickets')
        .select('ticket_code, event_name, holder_name, holder_email, status, checked_in')
        .eq('ticket_code', ticketCode)
        .maybeSingle();

    if (ticketError) {
        console.error('Ticket email lookup error:', ticketError);
        return json(500, { error: 'Unable to find ticket.' });
    }

    if (!ticket) {
        return json(404, { error: 'Ticket not found.' });
    }

    if (ticket.status !== 'valid') {
        return json(409, { error: 'Ticket is not valid.' });
    }

    const baseUrl = getBaseUrl(event);
    const checkInUrl = `${baseUrl}/check-in?ticket=${encodeURIComponent(ticket.ticket_code)}`;
    const qrImageUrl = `${baseUrl}/.netlify/functions/ticket-qr?ticket=${encodeURIComponent(ticket.ticket_code)}`;
    const qrPng = await QRCode.toBuffer(checkInUrl, {
        margin: 1,
        width: 320
    });

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: fromEmail,
            to,
            subject: `Your Makena ticket: ${ticket.event_name}`,
            html: buildEmailHtml({ ticket, checkInUrl, qrImageUrl }),
            attachments: [
                {
                    filename: `${ticket.ticket_code}.png`,
                    content: qrPng.toString('base64')
                }
            ]
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Resend email error:', data);
        return json(500, { error: data.message || 'Unable to send ticket email.' });
    }

    return json(200, {
        message: 'Ticket email sent.',
        id: data.id
    });
};
