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
    return host ? `${proto}://${host}` : '';
}

function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function buildEmailHtml({ ticket, ticketPageUrl, qrImageUrl }) {
    const details = [
        ticket.ticket_tier_name ? `<p style="margin: 0 0 6px;"><strong>Tier:</strong> ${escapeHtml(ticket.ticket_tier_name)}</p>` : '',
        ticket.event_date ? `<p style="margin: 0 0 6px;"><strong>Date:</strong> ${escapeHtml(ticket.event_date)}</p>` : '',
        ticket.event_time ? `<p style="margin: 0 0 6px;"><strong>Time:</strong> ${escapeHtml(ticket.event_time)}</p>` : '',
        ticket.event_location ? `<p style="margin: 0 0 6px;"><strong>Location:</strong> ${escapeHtml(ticket.event_location)}</p>` : ''
    ].join('');

    return `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h1 style="margin-bottom: 8px;">Your Makena Ticket</h1>
            <p style="margin-top: 0;">Thank you for your purchase. Keep this email ready for entry.</p>
            <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; max-width: 520px;">
                <p style="margin: 0 0 6px;"><strong>Event:</strong> ${escapeHtml(ticket.event_name)}</p>
                ${details}
                <p style="margin: 0 0 6px;"><strong>Name:</strong> ${escapeHtml(ticket.holder_name || 'Guest')}</p>
                <p style="margin: 0 0 14px;"><strong>Ticket Code:</strong> ${escapeHtml(ticket.ticket_code)}</p>
                <img src="${qrImageUrl}" alt="Ticket QR Code" width="220" height="220" style="display: block; width: 220px; height: 220px; border: 1px solid #e5e7eb; border-radius: 10px;">
                <p style="font-size: 13px; color: #6b7280;">Open your ticket page here: <a href="${ticketPageUrl}">${ticketPageUrl}</a></p>
                <p style="font-size: 13px; color: #6b7280;">If the QR code does not display, open the ticket page above or use the attached <strong>${escapeHtml(ticket.ticket_code)}.png</strong>.</p>
                <p style="font-size: 13px; color: #6b7280;">If you do not receive the QR code in your email, contact <a href="mailto:admin@makenaevents.com">admin@makenaevents.com</a>.</p>
                <p style="font-size: 13px; color: #6b7280;">You can also use this ticket code at the door: ${escapeHtml(ticket.ticket_code)}</p>
            </div>
        </div>
    `;
}

function buildBundleEmailHtml({ tickets, ticketData, holderName }) {
    const ticketBlocks = ticketData.map(({ ticket, ticketPageUrl, qrImageUrl }) => `
        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; max-width: 520px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 10px; font-size: 16px;">${escapeHtml(ticket.event_name)}</h3>
            ${ticket.event_date ? `<p style="margin: 0 0 4px; font-size: 14px;"><strong>Date:</strong> ${escapeHtml(ticket.event_date)}</p>` : ''}
            ${ticket.event_time ? `<p style="margin: 0 0 4px; font-size: 14px;"><strong>Time:</strong> ${escapeHtml(ticket.event_time)}</p>` : ''}
            ${ticket.event_location ? `<p style="margin: 0 0 4px; font-size: 14px;"><strong>Location:</strong> ${escapeHtml(ticket.event_location)}</p>` : ''}
            <p style="margin: 0 0 12px; font-size: 14px;"><strong>Ticket Code:</strong> ${escapeHtml(ticket.ticket_code)}</p>
            <img src="${qrImageUrl}" alt="QR Code for ${escapeHtml(ticket.event_name)}" width="180" height="180" style="display: block; width: 180px; height: 180px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">View ticket: <a href="${ticketPageUrl}">${ticketPageUrl}</a></p>
        </div>
    `).join('');

    return `
        <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
            <h1 style="margin-bottom: 4px;">Your AfroPlusFest DC Pass</h1>
            <p style="margin-top: 0; margin-bottom: 24px;">Hey ${escapeHtml(holderName || 'there')} — you're all set. Below are your individual tickets for each event. Show the QR code at the door for the event you're attending.</p>
            ${ticketBlocks}
            <p style="font-size: 13px; color: #6b7280;">Questions? Contact us at <a href="mailto:admin@makenaevents.com">admin@makenaevents.com</a></p>
        </div>
    `;
}

async function sendTicketEmail({ event, ticket, to }) {
    const baseUrl = getBaseUrl(event);
    const checkInUrl = `${baseUrl}/admin?ticket=${encodeURIComponent(ticket.ticket_code)}`;
    const ticketPageUrl = `${baseUrl}/ticket?ticket=${encodeURIComponent(ticket.ticket_code)}`;
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
            from: process.env.TICKET_FROM_EMAIL,
            to,
            subject: `Your Makena ticket: ${ticket.event_name}`,
            html: buildEmailHtml({ ticket, ticketPageUrl, qrImageUrl }),
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
        const message = data && data.message ? data.message : 'Unable to send ticket email.';
        const error = new Error(message);
        error.responseData = data;
        throw error;
    }

    return data;
}

async function sendBundleTicketEmail({ event, tickets, to }) {
    const baseUrl = getBaseUrl(event);

    const ticketData = await Promise.all(tickets.map(async ticket => {
        const checkInUrl = `${baseUrl}/admin?ticket=${encodeURIComponent(ticket.ticket_code)}`;
        const ticketPageUrl = `${baseUrl}/ticket?ticket=${encodeURIComponent(ticket.ticket_code)}`;
        const qrImageUrl = `${baseUrl}/.netlify/functions/ticket-qr?ticket=${encodeURIComponent(ticket.ticket_code)}`;
        const qrPng = await QRCode.toBuffer(checkInUrl, { margin: 1, width: 280 });
        return { ticket, ticketPageUrl, qrImageUrl, qrPng };
    }));

    const holderName = tickets[0] && tickets[0].holder_name;
    const attachments = ticketData.map(({ ticket, qrPng }) => ({
        filename: `${ticket.ticket_code}.png`,
        content: qrPng.toString('base64')
    }));

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.TICKET_FROM_EMAIL,
            to,
            subject: `Your AfroPlusFest DC tickets — ${tickets.length} events`,
            html: buildBundleEmailHtml({ ticketData, holderName }),
            attachments
        })
    });

    const data = await response.json();
    if (!response.ok) {
        const message = data && data.message ? data.message : 'Unable to send bundle ticket email.';
        const error = new Error(message);
        error.responseData = data;
        throw error;
    }

    return data;
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return json(405, { error: 'Method not allowed' });
    }

    if (!process.env.RESEND_API_KEY) {
        return json(500, { error: 'Email is not configured. Add RESEND_API_KEY to .env, then restart Netlify Dev.' });
    }

    if (!process.env.TICKET_FROM_EMAIL) {
        return json(500, { error: 'Ticket sender email is not configured. Add TICKET_FROM_EMAIL to your environment.' });
    }

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
        .select('ticket_code, event_name, event_date, event_time, event_location, ticket_tier_name, holder_name, holder_email, status, checked_in')
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

    if (ticket.holder_email && ticket.holder_email.trim().toLowerCase() !== to.toLowerCase()) {
        return json(403, { error: 'Tickets can only be sent to the purchaser email address.' });
    }

    const { data: contentOverride } = await supabase
        .from('event_content_overrides')
        .select('location, description')
        .eq('event_name', ticket.event_name)
        .maybeSingle();

    if (contentOverride) {
        if (contentOverride.location) ticket = { ...ticket, event_location: contentOverride.location };
        if (contentOverride.description) ticket = { ...ticket, event_description: contentOverride.description };
    }

    try {
        const data = await sendTicketEmail({ event, ticket, to });
        return json(200, {
            message: 'Ticket email sent.',
            id: data.id
        });
    } catch (error) {
        console.error('Resend email error:', error.responseData || error);
        return json(500, { error: error.message || 'Unable to send ticket email.' });
    }
};

module.exports.sendTicketEmail = sendTicketEmail;
module.exports.sendBundleTicketEmail = sendBundleTicketEmail;
