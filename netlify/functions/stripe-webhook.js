const Stripe = require('stripe');
const {
    saveTicketsToSupabase,
    markOrderEmailStatus,
    sendTicketsAutomatically,
    recordAmbassadorSale
} = require('./lib/process-checkout-session');

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('stripe-webhook: missing environment variables');
        return { statusCode: 500, body: 'Server configuration error' };
    }

    const sig = event.headers['stripe-signature'];
    if (!sig) {
        return { statusCode: 400, body: 'Missing stripe-signature header' };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let stripeEvent;
    try {
        const rawBody = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf8')
            : event.body;
        stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    if (stripeEvent.type !== 'checkout.session.completed') {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    const sessionSnap = stripeEvent.data.object;

    if (sessionSnap.payment_status !== 'paid') {
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Retrieve the full session with all fields we need (the webhook payload is minimal)
    let session;
    try {
        session = await stripe.checkout.sessions.retrieve(sessionSnap.id, {
            expand: [
                'line_items.data.price.product',
                'payment_intent',
                'total_details.breakdown'
            ]
        });
    } catch (err) {
        console.error('stripe-webhook: failed to retrieve full session:', err);
        return { statusCode: 500, body: 'Failed to retrieve session' };
    }

    const lineItems = session.line_items.data;

    // Handle trip deposit payments
    if (session.metadata && session.metadata.booking_type === 'trip') {
        const supabase = require('./lib/supabase').getSupabase();
        if (supabase && session.metadata.booking_id) {
            const { error: tripUpdateError } = await supabase
                .from('trip_bookings')
                .update({
                    payment_status: 'paid',
                    stripe_payment_intent_id: typeof session.payment_intent === 'object'
                        ? session.payment_intent?.id
                        : session.payment_intent,
                    paid_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', session.metadata.booking_id);

            if (tripUpdateError) {
                console.error('stripe-webhook: trip booking update error:', tripUpdateError);
            } else {
                console.log('stripe-webhook: trip booking confirmed:', session.metadata.booking_ref);
                // Send confirmation email (fire and forget — don't block webhook response)
                sendTripConfirmationEmail(supabase, session.metadata).catch(err =>
                    console.error('stripe-webhook: trip confirmation email error:', err)
                );
            }
        }
        return { statusCode: 200, body: JSON.stringify({ received: true }) };
    }

    // Save order + tickets to Supabase
    let storage;
    try {
        storage = await saveTicketsToSupabase(session, lineItems);
    } catch (err) {
        console.error('stripe-webhook: saveTicketsToSupabase error:', err);
        // Return 500 so Stripe retries the webhook
        return { statusCode: 500, body: 'Failed to save tickets' };
    }

    // Record ambassador sale (fire and forget — don't block or retry on failure)
    try {
        await recordAmbassadorSale(stripe, session, storage);
    } catch (err) {
        console.error('stripe-webhook: recordAmbassadorSale error:', err);
    }

    // Send ticket emails
    const order = storage.order || {
        customer_email: session.customer_details && session.customer_details.email,
        ticket_email_sent_at: null
    };
    const sourceTickets = storage.stored ? storage.tickets : [];

    // getBaseUrl in send-ticket-email falls back to SITE_URL when headers are empty,
    // which is always set on Netlify — so this minimal event object is safe
    const netlifyEvent = { headers: {} };

    try {
        await sendTicketsAutomatically(netlifyEvent, order, sourceTickets);
    } catch (emailError) {
        console.error('stripe-webhook: ticket email error:', emailError);
        if (order.id) {
            await markOrderEmailStatus(order.id, {
                ticket_email_error: emailError.message || 'Unable to send ticket email.'
            });
        }
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function sendTripConfirmationEmail(supabase, metadata) {
    if (!process.env.RESEND_API_KEY || !process.env.TICKET_FROM_EMAIL) return;

    const bookingId = metadata.booking_id;
    const bookingRef = metadata.booking_ref;

    // Fetch booking + guests
    const { data: booking } = await supabase
        .from('trip_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (!booking) return;

    const { data: guests } = await supabase
        .from('trip_booking_guests')
        .select('*')
        .eq('booking_id', bookingId)
        .order('guest_number');

    const ROOM_LABELS = {
        triple: 'Triple Share Room (3 guests)',
        double: 'Double Share Room (2 guests)',
        single: 'Single Private Room'
    };
    const PROCESSING_FEE_PP = 7.77;
    const depositPerPerson = (booking.deposit_per_person || 25000) / 100;
    const chargedPerPerson = depositPerPerson + PROCESSING_FEE_PP;
    const chargedTotal = (chargedPerPerson * booking.guest_count).toFixed(2);
    const roomLabel = ROOM_LABELS[booking.room_type] || booking.room_type;

    const guestRows = (guests || []).map((g, i) =>
        `<tr style="border-bottom:1px solid #2a2a2a">
            <td style="padding:10px 12px;color:#aaa;font-size:13px">Guest ${i + 1}${i === 0 ? ' (Primary)' : ''}</td>
            <td style="padding:10px 12px;color:#fff;font-size:13px">${g.first_name}${g.last_name ? ' ' + g.last_name : ''}</td>
            <td style="padding:10px 12px;color:#aaa;font-size:13px">${g.email}</td>
        </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:580px;margin:0 auto;padding:32px 16px 48px">

  <!-- Logo / brand -->
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:22px;font-weight:900;color:#86EFA9;letter-spacing:-0.5px">MAKENA</span>
    <span style="font-size:22px;font-weight:300;color:#fff;letter-spacing:-0.5px"> ENTERTAINMENT</span>
  </div>

  <!-- Hero -->
  <div style="background:linear-gradient(135deg,#0b2a1a,#0a1612);border:1px solid rgba(134,239,172,0.2);border-radius:16px;padding:32px 28px;text-align:center;margin-bottom:24px">
    <div style="font-size:36px;margin-bottom:12px">🎉</div>
    <h1 style="color:#86EFA9;font-size:22px;font-weight:800;margin:0 0 8px">Deposit Confirmed!</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px;line-height:1.6">
      You're locked in for <strong style="color:#fff">Punta Cana 2026</strong>.<br>
      Your spot is secured — here's everything you need.
    </p>
    <div style="display:inline-block;background:rgba(134,239,172,0.1);border:1px solid rgba(134,239,172,0.3);border-radius:10px;padding:10px 24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(134,239,172,0.7);margin-bottom:4px">Booking Reference</div>
      <div style="font-size:20px;font-weight:900;color:#86EFA9;letter-spacing:0.08em">${bookingRef}</div>
    </div>
  </div>

  <!-- Booking details -->
  <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px 24px 8px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#86EFA9;margin-bottom:16px">Booking Details</div>
    <table style="width:100%;border-collapse:collapse">
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Room Type</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">${roomLabel}</td>
      </tr>
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Destination</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">Punta Cana, Dominican Republic</td>
      </tr>
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Resort</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">Adults-Only 5-Star All-Inclusive</td>
      </tr>
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Travel Dates</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">November 2026 · 5 Days</td>
      </tr>
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Deposit paid</td>
        <td style="padding:10px 0;color:#86EFA9;font-size:13px;text-align:right;font-weight:800">$${chargedTotal}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Total trip price</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">$${(booking.price_per_person / 100).toLocaleString()} × ${booking.guest_count} guest(s)</td>
      </tr>
    </table>
  </div>

  <!-- Guest list -->
  <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px 24px 8px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#86EFA9;margin-bottom:16px">Your Group</div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:1px solid #2a2a2a">
          <th style="padding:6px 12px 10px;color:rgba(255,255,255,0.35);font-size:11px;font-weight:600;text-align:left">Role</th>
          <th style="padding:6px 12px 10px;color:rgba(255,255,255,0.35);font-size:11px;font-weight:600;text-align:left">Name</th>
          <th style="padding:6px 12px 10px;color:rgba(255,255,255,0.35);font-size:11px;font-weight:600;text-align:left">Email</th>
        </tr>
      </thead>
      <tbody>${guestRows}</tbody>
    </table>
  </div>

  <!-- WhatsApp CTA -->
  <div style="background:linear-gradient(135deg,#0b2a1a,#0a1612);border:1px solid rgba(134,239,172,0.2);border-radius:14px;padding:24px;text-align:center;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#86EFA9;margin-bottom:10px">Next Step</div>
    <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:0 0 18px;line-height:1.65">
      Join the official Makena Punta Cana group chat. All trip updates, logistics, balance payment info, and coordination happen here.
    </p>
    <a href="https://chat.whatsapp.com/JNc6URa4lsh5qwROm2Inxn?mode=gi_t"
       style="display:inline-block;background:#86EFA9;color:#060d07;font-size:14px;font-weight:800;padding:13px 28px;border-radius:10px;text-decoration:none">
      Join the WhatsApp Group
    </a>
  </div>

  <!-- Legal reminder -->
  <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:16px 18px;margin-bottom:24px">
    <p style="color:rgba(255,255,255,0.5);font-size:11px;line-height:1.7;margin:0">
      <strong style="color:rgba(251,191,36,0.9)">Reminder:</strong> Your $${(depositPerPerson * booking.guest_count).toFixed(0)} deposit is <strong>non-refundable and non-transferable</strong>.
      The remaining balance will be communicated by Makena Entertainment closer to the travel date.
      Flights are not included. Keep your booking reference <strong style="color:#fff">${bookingRef}</strong> for your records.
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.8">
    <p style="margin:0">© 2026 Makena Entertainment · makenaevents.com</p>
    <p style="margin:4px 0 0">Questions? Message us on WhatsApp or reply to this email.</p>
  </div>

</div>
</body>
</html>`;

    await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.TICKET_FROM_EMAIL,
            to: booking.primary_email,
            subject: `🎉 Deposit Confirmed — Punta Cana 2026 · ${bookingRef}`,
            html
        })
    });

    console.log('stripe-webhook: trip confirmation email sent to', booking.primary_email);
}
