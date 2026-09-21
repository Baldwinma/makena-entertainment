async function sendTripConfirmationEmail(supabase, bookingId) {
    if (!process.env.RESEND_API_KEY || !process.env.TICKET_FROM_EMAIL) return;

    // Fetch booking + guests
    const { data: booking } = await supabase
        .from('trip_bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

    if (!booking) return;

    const bookingRef = booking.booking_ref;

    const { data: guests } = await supabase
        .from('trip_booking_guests')
        .select('*')
        .eq('booking_id', bookingId)
        .order('guest_number');

    const isRoommate = booking.needs_roommate === true;

    const ROOM_LABELS = {
        triple: isRoommate ? 'Triple Share Room (Roommate Matching)' : 'Triple Share Room (3 guests)',
        double: isRoommate ? 'Double Share Room (Roommate Matching)' : 'Double Share Room (2 guests)',
        single: 'Single Private Room'
    };
    const PROCESSING_FEE_PP = 7.77;
    const depositPerPerson = (booking.deposit_per_person || 25000) / 100;
    const chargedPerPerson = depositPerPerson + PROCESSING_FEE_PP;
    const chargedTotal = (chargedPerPerson * booking.guest_count).toFixed(2);
    const roomLabel = ROOM_LABELS[booking.room_type] || booking.room_type;

    const guestRows = (guests || []).map((g, i) =>
        `<tr style="border-bottom:1px solid #2a2a2a">
            <td style="padding:10px 12px;color:#aaa;font-size:13px">Guest ${i + 1}${i === 0 ? ' (You)' : ''}</td>
            <td style="padding:10px 12px;color:#fff;font-size:13px">${g.first_name}${g.last_name ? ' ' + g.last_name : ''}</td>
            <td style="padding:10px 12px;color:#aaa;font-size:13px">${g.email}</td>
        </tr>`
    ).join('');

    const roommateRow = isRoommate
        ? `<tr>
            <td style="padding:10px 12px;color:#aaa;font-size:13px">Roommate(s)</td>
            <td colspan="2" style="padding:10px 12px;color:rgba(134,239,172,0.7);font-size:13px;font-style:italic">To be matched by Makena — we'll introduce you before the trip</td>
           </tr>`
        : '';

    const heroEmoji   = isRoommate ? '🤝' : '🎉';
    const heroTitle   = isRoommate ? "You're on the List!" : 'Deposit Confirmed!';
    const heroSubtext = isRoommate
        ? `Your deposit is confirmed for <strong style="color:#fff">Punta Cana 2026</strong>.<br>Makena will personally match you with compatible roommate(s) and make introductions before the trip.`
        : `You're locked in for <strong style="color:#fff">Punta Cana 2026</strong>.<br>Your spot is secured — here's everything you need.`;

    const whatsappSubtext = isRoommate
        ? 'Join the official group chat now. This is where your roommate intro will happen, plus all trip updates, logistics, and balance payment info.'
        : 'Join the official Makena Punta Cana group chat. All trip updates, logistics, balance payment info, and coordination happen here.';

    const legalText = isRoommate
        ? `<strong style="color:rgba(251,191,36,0.9)">Reminder:</strong> Your $${chargedTotal} deposit is <strong>non-refundable and non-transferable</strong>. Makena will match you with compatible roommate(s) — if no match is possible we will contact you directly. The remaining balance will be communicated closer to the travel date. Flights not included. Keep your reference <strong style="color:#fff">${bookingRef}</strong> for your records.`
        : `<strong style="color:rgba(251,191,36,0.9)">Reminder:</strong> Your $${(depositPerPerson * booking.guest_count).toFixed(0)} deposit is <strong>non-refundable and non-transferable</strong>. The remaining balance will be communicated by Makena Entertainment closer to the travel date. Flights are not included. Keep your booking reference <strong style="color:#fff">${bookingRef}</strong> for your records.`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { background-color: #0a0a0a !important; color: #ffffff !important; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0a0a0a !important; color: #ffffff !important; }
      .email-outer { background-color: #0a0a0a !important; }
    }
    @media (prefers-color-scheme: light) {
      body { background-color: #0a0a0a !important; color: #ffffff !important; }
      .email-outer { background-color: #0a0a0a !important; }
    }
  </style>
</head>
<body bgcolor="#0a0a0a" style="margin:0;padding:0;background:#0a0a0a;background-color:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
<div class="email-outer" style="background-color:#0a0a0a">
<div style="max-width:580px;margin:0 auto;padding:32px 16px 48px">

  <!-- Logo / brand -->
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:22px;font-weight:900;color:#86EFA9;letter-spacing:-0.5px">MAKENA</span>
    <span style="font-size:22px;font-weight:300;color:#fff;letter-spacing:-0.5px"> ENTERTAINMENT</span>
  </div>

  <!-- Hero -->
  <div style="background:linear-gradient(135deg,#0b2a1a,#0a1612);border:1px solid rgba(134,239,172,0.2);border-radius:16px;padding:32px 28px;text-align:center;margin-bottom:24px">
    <div style="font-size:36px;margin-bottom:12px">${heroEmoji}</div>
    <h1 style="color:#86EFA9;font-size:22px;font-weight:800;margin:0 0 8px">${heroTitle}</h1>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;margin:0 0 20px;line-height:1.6">${heroSubtext}</p>
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
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">Nov 11–15, 2026 · 5 Days</td>
      </tr>
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Deposit paid</td>
        <td style="padding:10px 0;color:#86EFA9;font-size:13px;text-align:right;font-weight:800">$${chargedTotal}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Trip price / person</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">$${(booking.price_per_person / 100).toLocaleString()}</td>
      </tr>
    </table>
  </div>

  <!-- Guest / roommate section -->
  <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px 24px 8px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#86EFA9;margin-bottom:16px">${isRoommate ? 'Your Booking' : 'Your Group'}</div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:1px solid #2a2a2a">
          <th style="padding:6px 12px 10px;color:rgba(255,255,255,0.35);font-size:11px;font-weight:600;text-align:left">Role</th>
          <th style="padding:6px 12px 10px;color:rgba(255,255,255,0.35);font-size:11px;font-weight:600;text-align:left">Name</th>
          <th style="padding:6px 12px 10px;color:rgba(255,255,255,0.35);font-size:11px;font-weight:600;text-align:left">Email</th>
        </tr>
      </thead>
      <tbody>${guestRows}${roommateRow}</tbody>
    </table>
  </div>

  <!-- WhatsApp CTA -->
  <div style="background:linear-gradient(135deg,#0b2a1a,#0a1612);border:1px solid rgba(134,239,172,0.2);border-radius:14px;padding:24px;text-align:center;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#86EFA9;margin-bottom:10px">Next Step</div>
    <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:0 0 18px;line-height:1.65">${whatsappSubtext}</p>
    <a href="https://chat.whatsapp.com/JNc6URa4lsh5qwROm2Inxn?mode=gi_t"
       style="display:inline-block;background:#86EFA9;color:#060d07;font-size:14px;font-weight:800;padding:13px 28px;border-radius:10px;text-decoration:none">
      Join the WhatsApp Group
    </a>
  </div>

  <!-- Legal reminder -->
  <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:16px 18px;margin-bottom:24px">
    <p style="color:rgba(255,255,255,0.5);font-size:11px;line-height:1.7;margin:0">${legalText}</p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.8">
    <p style="margin:0">© 2026 Makena Entertainment · makenaevents.com</p>
    <p style="margin:4px 0 0">Questions? Message us on WhatsApp or reply to this email.</p>
  </div>

</div>
</div>
</body>
</html>`;

    const subject = isRoommate
        ? `🤝 You're on the List — Punta Cana 2026 · ${bookingRef}`
        : `🎉 Deposit Confirmed — Punta Cana 2026 · ${bookingRef}`;

    // Collect all unique guest emails so every person in the group gets a copy
    const allEmails = [...new Set(
        [booking.primary_email, ...(guests || []).map(g => g.email)]
            .filter(Boolean)
            .map(e => e.toLowerCase().trim())
    )];

    for (const recipientEmail of allEmails) {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.TICKET_FROM_EMAIL,
                to: recipientEmail,
                subject,
                html
            })
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            throw new Error(`Resend API error ${res.status} (${recipientEmail}): ${errBody}`);
        }
    }

    console.log('trip-emails: trip confirmation email sent to', allEmails.join(', '));
}

async function sendAbandonedBookingEmail(booking) {
    if (!process.env.RESEND_API_KEY || !process.env.TICKET_FROM_EMAIL) return;

    const firstName = booking.primary_first_name || booking.first_name || 'there';
    const siteUrl = process.env.SITE_URL || 'https://makenaevents.com';

    const ROOM_LABELS = {
        triple: 'Triple Share Room',
        double: 'Double Share Room',
        single: 'Single Private Room'
    };
    const roomLabel = ROOM_LABELS[booking.room_type] || booking.room_type || 'N/A';
    const pricePerPerson = booking.price_per_person
        ? `$${(booking.price_per_person / 100).toLocaleString()}`
        : 'Contact us';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { background-color: #0a0a0a !important; color: #ffffff !important; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0a0a0a !important; color: #ffffff !important; }
      .email-outer { background-color: #0a0a0a !important; }
    }
    @media (prefers-color-scheme: light) {
      body { background-color: #0a0a0a !important; color: #ffffff !important; }
      .email-outer { background-color: #0a0a0a !important; }
    }
  </style>
</head>
<body bgcolor="#0a0a0a" style="margin:0;padding:0;background:#0a0a0a;background-color:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
<div class="email-outer" style="background-color:#0a0a0a">
<div style="max-width:580px;margin:0 auto;padding:32px 16px 48px">

  <!-- Logo / brand -->
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:22px;font-weight:900;color:#86EFA9;letter-spacing:-0.5px">MAKENA</span>
    <span style="font-size:22px;font-weight:300;color:#fff;letter-spacing:-0.5px"> ENTERTAINMENT</span>
  </div>

  <!-- Hero -->
  <div style="background:linear-gradient(135deg,#0b2a1a,#0a1612);border:1px solid rgba(134,239,172,0.2);border-radius:16px;padding:32px 28px;text-align:center;margin-bottom:24px">
    <div style="font-size:36px;margin-bottom:12px">👀</div>
    <h1 style="color:#86EFA9;font-size:22px;font-weight:800;margin:0 0 12px">Hey ${firstName}, you left something behind</h1>
    <p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0;line-height:1.65">You started booking <strong style="color:#fff">Punta Cana 2026</strong> but never completed your deposit.<br>Your spot is <strong style="color:#ff6b6b">NOT</strong> reserved yet.</p>
  </div>

  <!-- Details card -->
  <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px 24px 8px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#86EFA9;margin-bottom:16px">Your Trip Details</div>
    <table style="width:100%;border-collapse:collapse">
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Room Type</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">${roomLabel}</td>
      </tr>
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Trip price / person</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">${pricePerPerson}</td>
      </tr>
      <tr style="border-bottom:1px solid #222">
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Deposit needed</td>
        <td style="padding:10px 0;color:#86EFA9;font-size:13px;text-align:right;font-weight:800">$250 + $7.77 fee = $257.77</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Travel Dates</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">Nov 11–15, 2026</td>
      </tr>
    </table>
  </div>

  <!-- Urgency note -->
  <div style="background:rgba(251,191,36,0.06);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:16px 18px;margin-bottom:24px">
    <p style="color:rgba(255,255,255,0.65);font-size:13px;line-height:1.7;margin:0">
      <strong style="color:rgba(251,191,36,0.9)">Heads up:</strong> Spots are filling up fast — especially Triple Share rooms.
    </p>
  </div>

  <!-- Primary CTA -->
  <div style="text-align:center;margin-bottom:16px">
    <a href="${siteUrl}/trips.html"
       style="display:inline-block;background:#86EFA9;color:#060d07;font-size:15px;font-weight:800;padding:15px 36px;border-radius:10px;text-decoration:none;letter-spacing:-0.2px">
      Complete My Booking →
    </a>
  </div>

  <!-- Secondary CTAs -->
  <div style="text-align:center;margin-bottom:24px">
    <a href="${siteUrl}/punta-cana-deck.html"
       style="color:#86EFA9;font-size:13px;text-decoration:underline">
      View the Trip Deck
    </a>
    <span style="color:rgba(255,255,255,0.2);margin:0 10px">·</span>
    <a href="https://chat.whatsapp.com/JNc6URa4lsh5qwROm2Inxn?mode=gi_t"
       style="color:#86EFA9;font-size:13px;text-decoration:underline">
      Message us on WhatsApp
    </a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.8">
    <p style="margin:0">© 2026 Makena Entertainment</p>
  </div>

</div>
</div>
</body>
</html>`;

    const subject = `${firstName}, your Punta Cana 2026 spot isn't reserved yet ✈`;

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.TICKET_FROM_EMAIL,
            to: booking.primary_email,
            subject,
            html
        })
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Resend API error ${res.status}: ${errBody}`);
    }

    console.log('trip-emails: abandoned booking reminder sent to', booking.primary_email);
}

async function sendBalanceConfirmationEmail(supabase, bookingId) {
    if (!process.env.RESEND_API_KEY || !process.env.TICKET_FROM_EMAIL) return;

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
    const roomLabel = ROOM_LABELS[booking.room_type] || booking.room_type;
    const totalPaid = (booking.price_per_person * booking.guest_count) / 100;
    const bookingRef = booking.booking_ref;

    const guestRows = (guests || []).map((g, i) =>
        `<tr style="border-bottom:1px solid #2a2a2a">
            <td style="padding:10px 12px;color:#aaa;font-size:13px">Guest ${i + 1}${i === 0 ? ' (You)' : ''}</td>
            <td style="padding:10px 12px;color:#fff;font-size:13px">${g.first_name}${g.last_name ? ' ' + g.last_name : ''}</td>
            <td style="padding:10px 12px;color:#aaa;font-size:13px">${g.email}</td>
        </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <style>
    :root { color-scheme: light dark; }
    body { background-color: #0a0a0a !important; color: #ffffff !important; }
    @media (prefers-color-scheme: dark) {
      body { background-color: #0a0a0a !important; }
      .email-outer { background-color: #0a0a0a !important; }
    }
    @media (prefers-color-scheme: light) {
      body { background-color: #0a0a0a !important; }
      .email-outer { background-color: #0a0a0a !important; }
    }
  </style>
</head>
<body bgcolor="#0a0a0a" style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif">
<div class="email-outer" style="background-color:#0a0a0a">
<div style="max-width:580px;margin:0 auto;padding:32px 16px 48px">

  <!-- Logo -->
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:22px;font-weight:900;color:#86EFA9;letter-spacing:-0.5px">MAKENA</span>
    <span style="font-size:22px;font-weight:300;color:#fff;letter-spacing:-0.5px"> ENTERTAINMENT</span>
  </div>

  <!-- Hero -->
  <div style="background:linear-gradient(135deg,#0b2a1a,#0a1612);border:1px solid rgba(134,239,172,0.25);border-radius:16px;padding:32px 28px;text-align:center;margin-bottom:24px">
    <div style="font-size:40px;margin-bottom:12px">🎊</div>
    <h1 style="color:#86EFA9;font-size:24px;font-weight:900;margin:0 0 10px;letter-spacing:-0.5px">You're Fully Paid!</h1>
    <p style="color:rgba(255,255,255,0.65);font-size:14px;margin:0 0 22px;line-height:1.65">
      Your payment is complete — you are <strong style="color:#fff">100% confirmed</strong> for<br>
      <strong style="color:#fff">Punta Cana 2026</strong>. We can't wait to see you there.
    </p>
    <div style="display:inline-block;background:rgba(134,239,172,0.1);border:1px solid rgba(134,239,172,0.3);border-radius:10px;padding:10px 24px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:rgba(134,239,172,0.7);margin-bottom:4px">Booking Reference</div>
      <div style="font-size:20px;font-weight:900;color:#86EFA9;letter-spacing:0.08em">${bookingRef}</div>
    </div>
  </div>

  <!-- Booking summary -->
  <div style="background:#141414;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:24px 24px 8px;margin-bottom:16px">
    <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#86EFA9;margin-bottom:16px">Booking Summary</div>
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
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Travel Dates</td>
        <td style="padding:10px 0;color:#fff;font-size:13px;text-align:right;font-weight:600">Nov 11–15, 2026 · 5 Days</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:rgba(255,255,255,0.45);font-size:13px">Total Paid</td>
        <td style="padding:10px 0;color:#86EFA9;font-size:14px;text-align:right;font-weight:900">$${totalPaid.toLocaleString()}</td>
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
    <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#86EFA9;margin-bottom:10px">Stay Connected</div>
    <p style="color:rgba(255,255,255,0.65);font-size:13px;margin:0 0 18px;line-height:1.65">All trip updates, itinerary details, and logistics will be shared in the WhatsApp group. Make sure you're in there.</p>
    <a href="https://chat.whatsapp.com/JNc6URa4lsh5qwROm2Inxn?mode=gi_t"
       style="display:inline-block;background:#86EFA9;color:#060d07;font-size:14px;font-weight:800;padding:13px 28px;border-radius:10px;text-decoration:none">
      Join the WhatsApp Group
    </a>
  </div>

  <!-- Thank you note -->
  <div style="background:rgba(134,239,172,0.05);border:1px solid rgba(134,239,172,0.15);border-radius:10px;padding:18px 20px;margin-bottom:24px;text-align:center">
    <p style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.75;margin:0">
      Thank you for trusting Makena Entertainment to curate this experience.<br>
      We've put everything into making this trip unforgettable — and it's going to be exactly that.<br>
      <strong style="color:#86EFA9">See you in Punta Cana. 🌴</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;color:rgba(255,255,255,0.2);font-size:11px;line-height:1.8">
    <p style="margin:0">© 2026 Makena Entertainment · makenaevents.com</p>
    <p style="margin:4px 0 0">Questions? Message us on WhatsApp or reply to this email.</p>
  </div>

</div>
</div>
</body>
</html>`;

    const subject = `🎊 You're Fully Paid — Punta Cana 2026 · ${bookingRef}`;

    const allEmails = [...new Set(
        [booking.primary_email, ...(guests || []).map(g => g.email)]
            .filter(Boolean)
            .map(e => e.toLowerCase().trim())
    )];

    for (const recipientEmail of allEmails) {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: process.env.TICKET_FROM_EMAIL,
                to: recipientEmail,
                subject,
                html
            })
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            throw new Error(`Resend API error ${res.status} (${recipientEmail}): ${errBody}`);
        }
    }

    console.log('trip-emails: balance confirmation email sent to', allEmails.join(', '));
}

module.exports = {
    sendTripConfirmationEmail,
    sendAbandonedBookingEmail,
    sendBalanceConfirmationEmail
};
