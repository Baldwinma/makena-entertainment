from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import copy

# ── Brand colours ──────────────────────────────────────────────────────────
BLACK      = RGBColor(0x0A, 0x0A, 0x0A)
DARK_CARD  = RGBColor(0x14, 0x14, 0x14)
GREEN      = RGBColor(0x86, 0xEF, 0xA9)
WHITE      = RGBColor(0xFF, 0xFF, 0xFF)
GREY       = RGBColor(0xA0, 0xA0, 0xA0)
DARK_GREEN = RGBColor(0x0B, 0x2A, 0x1A)
RED_LIGHT  = RGBColor(0xF8, 0x71, 0x71)

prs = Presentation()
prs.slide_width  = Inches(13.33)
prs.slide_height = Inches(7.5)

BLANK_LAYOUT = prs.slide_layouts[6]  # completely blank


# ── Helper: solid background ───────────────────────────────────────────────
def set_bg(slide, color: RGBColor):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


# ── Helper: add text box ───────────────────────────────────────────────────
def add_text(slide, text, left, top, width, height,
             font_size=18, bold=False, color=WHITE,
             align=PP_ALIGN.LEFT, italic=False, wrap=True):
    txBox = slide.shapes.add_textbox(
        Inches(left), Inches(top), Inches(width), Inches(height))
    tf = txBox.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    return txBox


# ── Helper: add rectangle ─────────────────────────────────────────────────
def add_rect(slide, left, top, width, height, fill_color, line_color=None):
    shape = slide.shapes.add_shape(
        1,  # MSO_SHAPE_TYPE.RECTANGLE
        Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if line_color:
        shape.line.color.rgb = line_color
        shape.line.width = Pt(1)
    else:
        shape.line.fill.background()
    return shape


# ── Helper: green accent line ──────────────────────────────────────────────
def accent_line(slide, top):
    add_rect(slide, 0.5, top, 1.2, 0.04, GREEN)


# ── Helper: section label pill ────────────────────────────────────────────
def label_pill(slide, text, left, top):
    add_rect(slide, left, top, len(text) * 0.11 + 0.5, 0.28, DARK_GREEN, GREEN)
    add_text(slide, text, left + 0.1, top + 0.01, 2.5, 0.26,
             font_size=8, bold=True, color=GREEN)


# ── Helper: bullet block ──────────────────────────────────────────────────
def bullet_block(slide, title, items, left, top, width=5.6,
                 title_color=GREEN, dot_color=GREEN, item_font=11):
    add_text(slide, title, left, top, width, 0.35,
             font_size=12, bold=True, color=title_color)
    y = top + 0.38
    for item in items:
        # dot
        add_rect(slide, left, y + 0.07, 0.1, 0.1, dot_color)
        add_text(slide, item, left + 0.2, y, width - 0.2, 0.38,
                 font_size=item_font, color=WHITE)
        y += 0.4
    return y


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 1 — COVER
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)

# Dark green gradient panel (left half)
add_rect(slide, 0, 0, 6.5, 7.5, DARK_GREEN)
# Accent bar
add_rect(slide, 0, 0, 0.08, 7.5, GREEN)

add_text(slide, "MAKENA ENTERTAINMENT", 0.5, 1.2, 5.5, 0.5,
         font_size=10, bold=True, color=GREEN, italic=True)
add_text(slide, "PUNTA CANA\nGROUP TRIP 2026", 0.5, 1.8, 5.8, 2.2,
         font_size=44, bold=True, color=WHITE)
add_text(slide, "Dominican Republic  •  November 2026", 0.5, 3.9, 5.5, 0.5,
         font_size=14, color=GREY)
accent_line(slide, 4.55)
add_text(slide, "TRIP MANAGER'S PLAYBOOK", 0.5, 4.7, 5.5, 0.4,
         font_size=11, bold=True, color=GREEN)
add_text(slide, "Your complete delegation & operations guide\nfrom the moment guests land to the moment they fly home.",
         0.5, 5.2, 5.5, 0.9, font_size=11, color=GREY)

# Right panel — palm emoji + tagline
add_text(slide, "🌴", 8.5, 2.0, 3.5, 2.0, font_size=90, align=PP_ALIGN.CENTER)
add_text(slide, "One Life.\nGood Vibe.\nParty Hard.", 7.0, 4.5, 5.8, 2.2,
         font_size=24, bold=True, color=WHITE, align=PP_ALIGN.CENTER)


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 2 — YOUR ROLE: MANAGER, NOT LABORER
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.0, DARK_GREEN)
add_text(slide, "YOUR ROLE ON THIS TRIP", 0.5, 0.18, 12, 0.65,
         font_size=28, bold=True, color=WHITE)
add_text(slide, "MANAGER · DELEGATOR · VISIONARY", 0.5, 0.72, 12, 0.28,
         font_size=10, bold=True, color=GREEN)

add_text(slide, "You are not lifting boxes. You are not driving vans. You are not setting up tables.\nYou show up, you oversee, you make decisions, and you make people feel like royalty.",
         0.5, 1.2, 12.3, 0.8, font_size=13, color=GREY)

accent_line(slide, 2.1)

# Three role pillars
pillars = [
    ("👑", "VISION", "You set the standard. Every detail of this trip reflects your brand. Your team executes — you approve."),
    ("📋", "DELEGATION", "Every activity, every logistics task, every creative element is owned by a specific person or vendor. You assign, they deliver."),
    ("🎯", "ACCOUNTABILITY", "You hold daily check-ins with your delegate team. Nothing surprises you because you built the system in advance."),
]
for i, (icon, title, desc) in enumerate(pillars):
    x = 0.4 + i * 4.3
    add_rect(slide, x, 2.3, 3.9, 4.5, DARK_CARD, GREEN)
    add_text(slide, icon, x + 1.5, 2.5, 1.0, 0.9, font_size=32, align=PP_ALIGN.CENTER)
    add_text(slide, title, x + 0.2, 3.5, 3.5, 0.4,
             font_size=14, bold=True, color=GREEN, align=PP_ALIGN.CENTER)
    add_text(slide, desc, x + 0.2, 4.0, 3.5, 2.5,
             font_size=10, color=GREY, align=PP_ALIGN.CENTER)


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 3 — DELEGATE TEAM STRUCTURE
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.0, DARK_GREEN)
add_text(slide, "BUILD YOUR DELEGATE TEAM", 0.5, 0.18, 12, 0.65,
         font_size=28, bold=True, color=WHITE)
add_text(slide, "Assign these roles before the trip. Each person owns their lane.", 0.5, 0.72, 12, 0.28,
         font_size=10, color=GREEN)

roles = [
    ("🚐", "Ground Coordinator\n(Punta Cana Local)", "Your eyes & ears on the ground.\nHandles all local vendor relationships,\non-site problem solving, and day-of\nlogistics. Must speak English & Spanish."),
    ("✈️", "Airport & Transport Lead", "Manages all arrivals & departures.\nCoordinates driver team, MAKENA signs,\nvehicle schedules, and delayed flight\nprotocol."),
    ("🏨", "Hotel Liaison", "Owns the hotel relationship.\nPre-keys rooms, manages upgrades,\nhandles guest issues, distributes\nwelcome gift bags."),
    ("⛵", "Activities Coordinator", "Books and manages all excursions:\ncatamaran, island trip, adventure day.\nConfirms headcounts, waivers, safety\nbriefs."),
    ("🎉", "Events & Nightlife Lead", "Owns all party logistics:\nvenue, DJ, decor, dress code comms,\nentry wristbands, photographer\nbooking."),
    ("📸", "Content Creator /\nPhotographer", "Captures everything. Photos, reels,\nBTS content. Delivers highlight reel\nby Day 5 farewell breakfast.\nPost-trip social content."),
    ("💬", "Guest Services Lead", "Manages guest WhatsApp group.\nFirst point of contact for questions,\ncomplaints, and special requests.\nDistributes all pre-trip info."),
    ("🛍️", "Merch & Gifting Lead", "Sources, designs, and fulfills all\nMakena branded items: gift bags,\nwristbands, hats, beach towels,\nand farewell gifts."),
]

cols = 4
for i, (icon, role, desc) in enumerate(roles):
    col = i % cols
    row = i // cols
    x = 0.3 + col * 3.25
    y = 1.15 + row * 2.9
    add_rect(slide, x, y, 3.05, 2.65, DARK_CARD, GREEN)
    add_text(slide, icon, x + 0.15, y + 0.1, 0.5, 0.4, font_size=16)
    add_text(slide, role, x + 0.15, y + 0.1, 2.8, 0.55,
             font_size=10, bold=True, color=GREEN)
    add_text(slide, desc, x + 0.15, y + 0.7, 2.75, 1.8,
             font_size=8.5, color=GREY)


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 4 — PRE-TRIP MASTER CHECKLIST
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.0, DARK_GREEN)
add_text(slide, "PRE-TRIP MASTER CHECKLIST", 0.5, 0.18, 12, 0.65,
         font_size=28, bold=True, color=WHITE)
add_text(slide, "Everything that must be locked in BEFORE a single guest lands.", 0.5, 0.72, 12, 0.28,
         font_size=10, color=GREEN)

col1 = [
    ("CONTRACTS & BOOKINGS", [
        "Transportation company — airport fleet, MAKENA signs",
        "Hotel block contract — room categories, rates, upgrades",
        "Catamaran company — capacity, open bar, DJ, menu",
        "Island day trip operator — speedboat, beach lunch",
        "Adventure day vendor — dune buggies / ATVs / zip-line",
        "Private dinner venue — menu, service, decor",
        "Night party venue — DJ, sound, lighting, capacity",
        "Professional photographer + videographer",
    ]),
    ("BRANDING & GIFTING", [
        "Design & order Makena welcome gift bags (see Slide 6)",
        "Branded wristbands (color-coded by event/day)",
        "Makena bucket hats for island day trip",
        "Custom matching jerseys for adventure day",
        "Branded beach towels for resort days",
        "Farewell keepsake gift (keychain / photo print)",
        "MAKENA airport pickup signs (laminated, professional)",
        "All White party entry arch / step-and-repeat backdrop",
    ]),
]

col2 = [
    ("GUEST COMMUNICATIONS", [
        "Send full trip itinerary PDF to all guests (2 weeks before)",
        "Create group WhatsApp with all guests",
        "Collect all flight details & arrival times",
        "Send All White dress code reminder (1 week + 1 day before)",
        "Share packing list & weather advisory",
        "Send hotel address, check-in time, room info",
        "Build emergency contact sheet (local hospital, embassy)",
        "Share adventure day waiver forms in advance",
    ]),
    ("MONEY & ADMIN", [
        "Confirm all vendor deposits paid",
        "Set up trip petty cash / on-the-ground fund",
        "Arrange group travel insurance for all guests",
        "Create a vendor contact sheet for each delegate",
        "Build daily budget tracker",
        "Confirm all Makena branded items have arrived",
        "Create delegate briefing doc — each role's daily tasks",
        "Schedule pre-trip team call (1 week before departure)",
    ]),
]

for col_idx, col_data in enumerate([col1, col2]):
    x = 0.4 + col_idx * 6.5
    y = 1.2
    for title, items in col_data:
        add_text(slide, title, x, y, 6.0, 0.3,
                 font_size=9, bold=True, color=GREEN)
        y += 0.32
        for item in items:
            add_rect(slide, x, y + 0.08, 0.08, 0.08, GREEN)
            add_text(slide, item, x + 0.2, y, 5.8, 0.3,
                     font_size=8.5, color=WHITE)
            y += 0.3
        y += 0.18


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 5 — AIRPORT ARRIVALS & TRANSPORTATION
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.0, DARK_GREEN)
add_text(slide, "✈️  AIRPORT ARRIVALS & TRANSPORTATION", 0.5, 0.18, 12, 0.65,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "Delegate: Airport & Transport Lead  |  First impression of the whole trip — make it count.",
         0.5, 0.72, 12, 0.28, font_size=10, color=GREEN)

# Left: action items
add_rect(slide, 0.4, 1.1, 6.0, 5.8, DARK_CARD)
add_text(slide, "📋  ACTION ITEMS", 0.6, 1.2, 5.6, 0.35,
         font_size=12, bold=True, color=GREEN)
actions = [
    "Find & contract a reputable Punta Cana transportation company (vans/SUVs)",
    "Collect every guest's flight number, airline & arrival time",
    "Create 3–4 designated pickup windows (e.g. 10AM, 2PM, 6PM, 10PM)",
    "Design laminated MAKENA branded pickup signs — bold, clean, on-brand",
    "Brief every driver: dress code (black attire), behaviour, no phone use",
    "Set up a driver group chat — Airport Lead manages this in real time",
    "Create delayed-flight protocol: driver waits up to 90 min, then re-deploys",
    "Map out route from Punta Cana Int'l Airport (PUJ) to resort",
    "Arrange backup vehicle in case of no-shows or large group arrivals",
    "Confirm vehicle capacity vs. max guests per window",
]
y = 1.65
for item in actions:
    add_rect(slide, 0.55, y + 0.09, 0.09, 0.09, GREEN)
    add_text(slide, item, 0.75, y, 5.5, 0.35, font_size=9, color=WHITE)
    y += 0.38

# Right: creative ideas
add_rect(slide, 6.8, 1.1, 6.1, 5.8, DARK_CARD)
add_text(slide, "✨  CREATIVE IDEAS (OUTSIDE THE BOX)", 7.0, 1.2, 5.7, 0.35,
         font_size=12, bold=True, color=GREEN)
ideas = [
    ("🎵  Makena Playlist in Every Vehicle",
     "The moment guests get in the van, the Makena playlist is already playing. First vibe check — passed."),
    ("🥤  In-Van Welcome Pack on the Seat",
     "Each seat has a small branded paper bag: cold water, Makena branded snack, a handwritten welcome card from Baldwin, and a wristband for the welcome mixer."),
    ("📸  Airport Sign Photo Moment",
     "Design the MAKENA sign as a photo-worthy prop. Guests will post it. Free organic marketing for the brand."),
    ("💬  WhatsApp 'You've Landed' Ping",
     "Guest Services Lead sends a personal WhatsApp to each guest the moment they confirm pickup: 'Welcome to DR! Your driver [Name] is waiting at door X.'"),
    ("🚐  Branded Vehicle Wrap (Premium Option)",
     "If budget allows, wrap at least one vehicle in Makena branding. It's a moving billboard at PUJ and on the road."),
    ("🎁  Surprise Upgrade Announcement",
     "For VIP guests or upsells — driver discreetly hands them a card in the van: 'You've been upgraded to an ocean-view room. Welcome.'"),
]
y = 1.65
for icon_title, desc in ideas:
    add_text(slide, icon_title, 7.0, y, 5.7, 0.28, font_size=10, bold=True, color=WHITE)
    add_text(slide, desc, 7.0, y + 0.28, 5.7, 0.42, font_size=8.5, color=GREY)
    y += 0.82


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 6 — HOTEL CHECK-IN & WELCOME GIFT BAG
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.0, DARK_GREEN)
add_text(slide, "🏨  HOTEL CHECK-IN & WELCOME EXPERIENCE", 0.5, 0.18, 12, 0.65,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "Delegate: Hotel Liaison  |  The first hour at the resort sets the tone for everything that follows.",
         0.5, 0.72, 12, 0.28, font_size=10, color=GREEN)

# Left col
add_rect(slide, 0.4, 1.1, 5.8, 5.8, DARK_CARD)
add_text(slide, "📋  ACTION ITEMS", 0.6, 1.2, 5.4, 0.35,
         font_size=12, bold=True, color=GREEN)
hotel_actions = [
    "Negotiate group block rate — confirm room categories (standard, deluxe, suite)",
    "Pre-assign every guest to their room before they land — no waiting at front desk",
    "Pre-key all rooms — envelopes with guest name + room number ready at check-in desk",
    "Arrange early check-in for first arrival window guests (or holding lounge if unavailable)",
    "Book Baldwin's suite as Trip HQ — spacious, central for team meetings",
    "Confirm hotel has a welcome area for group arrival (lobby, terrace, or pool bar)",
    "Arrange birthday / anniversary room decorations for any guest with a milestone",
    "Brief hotel concierge on the full week's schedule so they can support guests",
    "Confirm resort wristbands or room key system — integrate with Makena wristbands",
    "Walk the hotel 24hr before first arrival — fix any issues before guests see them",
]
y = 1.65
for item in hotel_actions:
    add_rect(slide, 0.55, y + 0.09, 0.09, 0.09, GREEN)
    add_text(slide, item, 0.75, y, 5.35, 0.35, font_size=9, color=WHITE)
    y += 0.38

# Right col — Gift Bag
add_rect(slide, 6.6, 1.1, 6.3, 5.8, DARK_CARD)
add_text(slide, "🎁  MAKENA WELCOME GIFT BAG", 6.8, 1.2, 5.9, 0.35,
         font_size=12, bold=True, color=GREEN)
add_text(slide, "Sitting in every room when guests arrive. Unboxing is the moment.", 6.8, 1.58, 5.9, 0.3,
         font_size=9, italic=True, color=GREY)

bag_items = [
    ("Makena Branded Tote Bag", "The bag itself is the gift bag — reusable, branded, premium feel."),
    ("Custom Itinerary Card", "A beautifully designed card with the week's schedule — nights, excursions, dress codes."),
    ("Handwritten Welcome Letter", "Personal note from Baldwin. Short, warm, sets the tone. This will be photographed."),
    ("Makena Beach Towel", "Oversized, thick, embroidered Makena logo. For the pool and the 'gram."),
    ("Branded Event Wristbands", "Color-coded by event — guests wear to gain entry to each Makena event."),
    ("Sunscreen SPF 50 (Branded Label)", "Custom Makena label on the bottle. Useful AND on-brand."),
    ("Mini First Aid Kit", "Travel-size kit. Guests will appreciate the thoughtfulness."),
    ("Local Snack Box", "Curated selection of DR snacks + a mini bottle of Mamajuana local liqueur."),
    ("Surprise QR Code Card", "Links to a private Spotify playlist 'Makena Punta Cana 2026' — curated by Baldwin."),
]
y = 1.95
for title, desc in bag_items:
    add_rect(slide, 6.75, y + 0.08, 0.08, 0.08, GREEN)
    add_text(slide, title, 6.95, y, 2.5, 0.28, font_size=9, bold=True, color=WHITE)
    add_text(slide, desc, 6.95, y + 0.28, 5.75, 0.28, font_size=8, color=GREY)
    y += 0.58


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 7 — DAY 1: ARRIVAL & WELCOME MIXER
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.05, DARK_GREEN)
label_pill(slide, "DAY 1", 0.5, 0.15)
add_text(slide, "ARRIVAL & WELCOME MIXER", 0.5, 0.52, 12, 0.55,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "Delegate: Hotel Liaison + Events Lead  |  Vibe: Casual, warm, get-to-know-you energy  |  Time: Sunset (6PM – 9PM)",
         0.5, 0.85, 12.5, 0.22, font_size=9, color=GREEN)

add_rect(slide, 0.4, 1.15, 5.9, 5.75, DARK_CARD)
add_text(slide, "📋  ACTION ITEMS", 0.6, 1.28, 5.5, 0.32, font_size=11, bold=True, color=GREEN)
items_d1 = [
    "Reserve pool terrace or beach area exclusively for the group at sunset",
    "Contract a mixologist or bartender — signature welcome cocktail on arrival",
    "Arrange light bites: charcuterie, tropical fruit boards, finger foods",
    "Set up a wireless Bluetooth sound system or hire a DJ for ambient background music",
    "Prepare name tags or wristbands so guests can mingle with context",
    "Brief hotel on setup: lighting, table arrangement, branded signage at entrance",
    "Ensure Baldwin arrives last — 'grand entrance' moment to set the tone",
    "Have Guest Services Lead manage the WhatsApp group with real-time location of mixer",
    "Set up a guest book / Polaroid camera station for instant memories",
    "Photographer in place 30 min before guests arrive — captures candid arrivals",
]
y = 1.65
for item in items_d1:
    add_rect(slide, 0.55, y + 0.08, 0.08, 0.08, GREEN)
    add_text(slide, item, 0.75, y, 5.45, 0.34, font_size=9, color=WHITE)
    y += 0.37

add_rect(slide, 6.7, 1.15, 6.25, 5.75, DARK_CARD)
add_text(slide, "✨  CREATIVE IDEAS", 6.9, 1.28, 5.85, 0.32, font_size=11, bold=True, color=GREEN)
ideas_d1 = [
    ("🍹  The 'Makena Mule' Signature Cocktail",
     "Create a custom cocktail named after the brand. Recipe card on each table. Guests post it. Marketing."),
    ("🎙️  Live Percussionist",
     "A local bongo or steel drum player alongside the playlist for the first hour. Sets an elevated, tropical vibe."),
    ("📓  Trip Intentions Wall",
     "A large card or blackboard where guests write one word or intention for the trip. Photographed and shared."),
    ("🏆  'Who Are You?' Ice Breaker Game",
     "Hosted by Guest Services Lead. Fun group game that breaks the ice without feeling forced. Prizes for winners."),
    ("🌅  Sunset Group Photo",
     "At golden hour, photographer positions the whole group for THE group shot of the trip. Posted immediately."),
    ("💡  Glow-Up Hour",
     "As the sun goes down, distribute glow sticks, LED bracelets and UV accessories. The energy shifts from day to night."),
    ("🎤  Welcome Speech by Baldwin",
     "Short, personal, grateful. Sets the emotional tone. This is the moment that makes people feel like they're part of something."),
]
y = 1.65
for icon_title, desc in ideas_d1:
    add_text(slide, icon_title, 6.9, y, 5.85, 0.26, font_size=10, bold=True, color=WHITE)
    add_text(slide, desc, 6.9, y + 0.27, 5.85, 0.38, font_size=8.5, color=GREY)
    y += 0.74


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 8 — DAY 2: PRIVATE CATAMARAN BOAT PARTY
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.05, DARK_GREEN)
label_pill(slide, "DAY 2", 0.5, 0.15)
add_text(slide, "PRIVATE CATAMARAN BOAT PARTY", 0.5, 0.52, 12, 0.55,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "Delegate: Activities Coordinator + Events Lead  |  Vibe: Peak energy, open ocean, all day  |  Time: 9AM – 6PM",
         0.5, 0.85, 12.5, 0.22, font_size=9, color=GREEN)

add_rect(slide, 0.4, 1.15, 5.9, 5.75, DARK_CARD)
add_text(slide, "📋  ACTION ITEMS", 0.6, 1.28, 5.5, 0.32, font_size=11, bold=True, color=GREEN)
items_d2 = [
    "Confirm catamaran booking: capacity, hours, open bar spec, crew count",
    "Book a DJ experienced in Afrobeats / Amapiano — provide genre brief",
    "Confirm departure marina location and arrange hotel-to-marina transport",
    "Arrange snorkeling gear for all guests + underwater photographer",
    "Confirm lunch menu on board — dietary requirements collected from guests in advance",
    "Brief captain on planned stops: snorkeling reef, sandbar, open ocean cruise",
    "Ensure safety briefing is prepared and delivered to guests before departure",
    "Provide each guest with a waterproof bag for phones and valuables",
    "Book an additional videographer for aerial drone footage if budget allows",
    "Create day-of schedule and share with guests the night before",
]
y = 1.65
for item in items_d2:
    add_rect(slide, 0.55, y + 0.08, 0.08, 0.08, GREEN)
    add_text(slide, item, 0.75, y, 5.45, 0.34, font_size=9, color=WHITE)
    y += 0.37

add_rect(slide, 6.7, 1.15, 6.25, 5.75, DARK_CARD)
add_text(slide, "✨  CREATIVE IDEAS", 6.9, 1.28, 5.85, 0.32, font_size=11, bold=True, color=GREEN)
ideas_d2 = [
    ("🚩  Makena Flag Flying on the Catamaran",
     "Custom Makena flag on the mast. Every photo guests take has it. Every passing boat sees it. Content gold."),
    ("🍾  Floating Charcuterie Moment",
     "A floating tray of fruits, snacks and drinks passed around while guests are in the water at the sandbar. Instagrammable."),
    ("🌅  Sunset Champagne Toast",
     "At the sandbar stop as the sun sets — Baldwin gives a toast. Champagne handed to every guest. Photographer captures the clink."),
    ("🎷  Live Saxophonist for One Hour",
     "A saxophonist joins for the first hour playing over the DJ set. Elevated, unexpected. Guests go wild."),
    ("🎨  Boat Party Dress Code: Tropical Vibes",
     "Assign a fun dress code (bright colors, florals) — different from the All White party. Group visual identity."),
    ("📸  Content Drop That Night",
     "Content Creator delivers a 30-second boat party reel to the WhatsApp group same evening. Guests share it."),
    ("🏆  'Best Photo from the Water' Contest",
     "Guests submit their underwater / sandbar shot to the group. Baldwin picks the winner. Small prize."),
]
y = 1.65
for icon_title, desc in ideas_d2:
    add_text(slide, icon_title, 6.9, y, 5.85, 0.26, font_size=10, bold=True, color=WHITE)
    add_text(slide, desc, 6.9, y + 0.27, 5.85, 0.38, font_size=8.5, color=GREY)
    y += 0.74


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 9 — DAY 3: ISLAND DAY TRIP
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.05, DARK_GREEN)
label_pill(slide, "DAY 3", 0.5, 0.15)
add_text(slide, "ISLAND DAY TRIP", 0.5, 0.52, 12, 0.55,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "Delegate: Activities Coordinator  |  Vibe: Explorer, relaxed, scenic  |  Time: 8AM – 5PM (early start to beat crowds)",
         0.5, 0.85, 12.5, 0.22, font_size=9, color=GREEN)

add_rect(slide, 0.4, 1.15, 5.9, 5.75, DARK_CARD)
add_text(slide, "📋  ACTION ITEMS", 0.6, 1.28, 5.5, 0.32, font_size=11, bold=True, color=GREEN)
items_d3 = [
    "Book speedboat / private ferry to island (Saona or Catalina Island recommended)",
    "Secure EARLY departure (8AM) — arrive before the public tours overrun the beach",
    "Confirm private beach lunch with open bar — pre-select menu, confirm dietary needs",
    "Brief tour guide on group energy: we want fun, not a museum tour",
    "Arrange kayaks, paddleboards or beach volleyball for free time activities",
    "Provide Makena branded bucket hats to every guest for the day",
    "Confirm return speedboat timing — sunset return preferred",
    "Have Activities Coordinator on the speedboat both ways — point of contact for group",
    "Pack a group first aid kit and sunscreen station on the beach",
    "Arrange hotel dinner reservation for the evening — guests will be tired but hungry",
]
y = 1.65
for item in items_d3:
    add_rect(slide, 0.55, y + 0.08, 0.08, 0.08, GREEN)
    add_text(slide, item, 0.75, y, 5.45, 0.34, font_size=9, color=WHITE)
    y += 0.37

add_rect(slide, 6.7, 1.15, 6.25, 5.75, DARK_CARD)
add_text(slide, "✨  CREATIVE IDEAS", 6.9, 1.28, 5.85, 0.32, font_size=11, bold=True, color=GREEN)
ideas_d3 = [
    ("🎵  Local Musician on the Beach",
     "Hire a Dominican musician (guitar or merengue) to perform during beach lunch. Authentically local. Unexpected."),
    ("📸  'Best Shot of the Day' Photo Contest",
     "Guests submit their best island photo by 8PM. Content Creator judges. Winner gets a Makena prize pack."),
    ("🍹  Custom Island Cocktail",
     "Work with the beach bar to create a cocktail named after the group. 'The Makena Special' — on the menu for the day."),
    ("🏐  Beach Olympics",
     "Organize quick team games: volleyball, sandcastle contest, relay race. Teams named after Makena event nights."),
    ("🐠  Marine Life Guide",
     "Print or post a QR code linking to a fun 'what you might see snorkeling' card. Educational & engaging."),
    ("🌺  Cultural Moment",
     "Brief the guide to share 3 surprising facts about the Dominican Republic during the boat ride. Guests love a story."),
    ("🎥  Drone Shot at Natural Pools",
     "If Activities Coordinator arranges drone access, the natural pools aerial shot will be THE content piece of the trip."),
]
y = 1.65
for icon_title, desc in ideas_d3:
    add_text(slide, icon_title, 6.9, y, 5.85, 0.26, font_size=10, bold=True, color=WHITE)
    add_text(slide, desc, 6.9, y + 0.27, 5.85, 0.38, font_size=8.5, color=GREY)
    y += 0.74


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 10 — DAY 4: ADVENTURE DAY + ALL WHITE NIGHT PARTY
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.05, DARK_GREEN)
label_pill(slide, "DAY 4", 0.5, 0.15)
add_text(slide, "ADVENTURE DAY  +  ALL WHITE MAKENA NIGHT PARTY", 0.5, 0.52, 12.5, 0.55,
         font_size=24, bold=True, color=WHITE)
add_text(slide, "Delegate: Activities Coordinator (AM) + Events Lead (PM/Night)  |  The biggest night of the trip.",
         0.5, 0.85, 12.5, 0.22, font_size=9, color=GREEN)

add_rect(slide, 0.4, 1.15, 5.9, 5.75, DARK_CARD)
add_text(slide, "📋  ACTION ITEMS", 0.6, 1.28, 5.5, 0.32, font_size=11, bold=True, color=GREEN)
items_d4 = [
    "Book adventure activity (dune buggies preferred — most photogenic)",
    "Arrange transport to adventure site (7:30AM departure from hotel)",
    "Communicate adventure dress code: old clothes you don't mind getting dirty",
    "Confirm safety waivers distributed and signed the night before",
    "Arrange group matching Makena jerseys/shirts for adventure day (worn over swimwear)",
    "Book private dinner venue for 7PM — atmosphere, candles, curated menu",
    "Send ALL WHITE reminder to every guest on WhatsApp the morning of",
    "Brief Events Lead on party timeline: doors, DJ set, peak, close",
    "Arrange All White entrance setup: arch, step-and-repeat, velvet rope",
    "Confirm entry wristbands printed and distributed by Hotel Liaison at dinner",
    "Book professional photographer + second shooter for party",
    "Arrange sparklers and light-up accessories for midnight moment",
]
y = 1.65
for item in items_d4:
    add_rect(slide, 0.55, y + 0.08, 0.08, 0.08, GREEN)
    add_text(slide, item, 0.75, y, 5.45, 0.3, font_size=8.8, color=WHITE)
    y += 0.33

add_rect(slide, 6.7, 1.15, 6.25, 5.75, DARK_CARD)
add_text(slide, "✨  CREATIVE IDEAS", 6.9, 1.28, 5.85, 0.32, font_size=11, bold=True, color=GREEN)
ideas_d4 = [
    ("🏆  Adventure Day Race Challenge",
     "Split into teams for the buggy race. Winning team gets bragging rights trophy (a mini golden buggy or printed certificate)."),
    ("🍽️  Private Dinner: Makena Menu Card",
     "Printed, branded menu card at each place setting. Multilingual. Live acoustic performer during dinner."),
    ("🏛️  All White Entrance Experience",
     "Red carpet energy: step-and-repeat with Makena logo, velvet rope, bouncer, photographer at the door. Feel like a celebrity."),
    ("💡  UV Light Activation",
     "Install UV lights at the party — all-white outfits GLOW. Hand out UV body paint pens at the entrance."),
    ("🥂  Makena Awards Ceremony",
     "'Best Dressed All White,' 'Most Vibes,' 'MVP of the Trip' — Baldwin announces mid-party. Custom mini trophies."),
    ("🎆  Sparkler Grand Finale",
     "At 1AM: everyone gets a sparkler. DJ drops the hardest song of the night. Photographer captures the wall of light."),
    ("🛍️  White Outfit Shop Referral",
     "In the WhatsApp group 2 days before: a curated list of nearby shops for guests who forgot their white outfit."),
]
y = 1.65
for icon_title, desc in ideas_d4:
    add_text(slide, icon_title, 6.9, y, 5.85, 0.26, font_size=10, bold=True, color=WHITE)
    add_text(slide, desc, 6.9, y + 0.27, 5.85, 0.38, font_size=8.5, color=GREY)
    y += 0.74


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 11 — DAY 5: FAREWELL & DEPARTURE
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.05, DARK_GREEN)
label_pill(slide, "DAY 5", 0.5, 0.15)
add_text(slide, "FAREWELL BREAKFAST & DEPARTURE", 0.5, 0.52, 12, 0.55,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "Delegate: Guest Services Lead + Airport Lead  |  Leave them wanting to book the next trip before they even land home.",
         0.5, 0.85, 12.5, 0.22, font_size=9, color=GREEN)

add_rect(slide, 0.4, 1.15, 5.9, 5.75, DARK_CARD)
add_text(slide, "📋  ACTION ITEMS", 0.6, 1.28, 5.5, 0.32, font_size=11, bold=True, color=GREEN)
items_d5 = [
    "Communicate checkout times to all guests the night before (via WhatsApp)",
    "Arrange staggered departure transfers to PUJ airport — no guest left scrambling",
    "Reserve a private group breakfast area at the resort (7AM – 10AM)",
    "Arrange Content Creator to compile trip highlight reel overnight (from Day 1–4 footage)",
    "Set up a screen or TV at breakfast to play the highlight reel on loop",
    "Prepare farewell gift for each guest (in room or handed at breakfast)",
    "Collect and review guest feedback forms — digital link shared in WhatsApp",
    "Final group photo in Makena gear before first departure",
    "Settle all outstanding hotel charges before guests check out",
    "Personally thank each delegate — recognition matters",
    "Share post-trip social post from Makena official account same day",
    "Send 'Thank You + Next Trip Teaser' email to all guests within 48 hours",
]
y = 1.65
for item in items_d5:
    add_rect(slide, 0.55, y + 0.08, 0.08, 0.08, GREEN)
    add_text(slide, item, 0.75, y, 5.45, 0.3, font_size=8.8, color=WHITE)
    y += 0.33

add_rect(slide, 6.7, 1.15, 6.25, 5.75, DARK_CARD)
add_text(slide, "✨  CREATIVE IDEAS", 6.9, 1.28, 5.85, 0.32, font_size=11, bold=True, color=GREEN)
ideas_d5 = [
    ("🎬  Trip Highlight Reel at Breakfast",
     "A 60–90 second video of every day plays on a screen. Guests see themselves. Emotional moment. Everyone shares it."),
    ("📦  Farewell Gift in the Room",
     "Guests wake up to a final Makena gift on the bed: a photo print from the trip, branded keychain, and a card that says 'See you at the next one.'"),
    ("✍️  Guest Book Signing",
     "A Makena trip journal passed around at breakfast — every guest signs a page. Baldwin keeps it as a brand artifact."),
    ("🏅  'Makena Alumni' WhatsApp Group",
     "Create a new group at breakfast: 'Makena Punta Cana Alumni.' Keeps the community alive. Seeds the next trip's audience."),
    ("📢  Next Trip Teaser Announcement",
     "Baldwin announces the NEXT Makena group trip at breakfast. Creates immediate FOMO and early interest."),
    ("✈️  In-Airport Surprise",
     "Airport Lead hands each guest a small sealed envelope to open on the plane: a discount code or priority access for the next trip."),
    ("📱  Real-Time Social Takeover",
     "Content Creator posts the reel to @makena_entertainment during breakfast. Tag the guests. The algorithm loves it."),
]
y = 1.65
for icon_title, desc in ideas_d5:
    add_text(slide, icon_title, 6.9, y, 5.85, 0.26, font_size=10, bold=True, color=WHITE)
    add_text(slide, desc, 6.9, y + 0.27, 5.85, 0.38, font_size=8.5, color=GREY)
    y += 0.74


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 12 — MARKETING: SELLING THE TRIP ONLINE
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.05, DARK_GREEN)
add_text(slide, "📣  MARKETING — SELLING THE TRIP ONLINE", 0.5, 0.18, 12, 0.65,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "How to fill every spot before the trip and create a waitlist for the next one.", 0.5, 0.78, 12, 0.25,
         font_size=10, color=GREEN)

channels = [
    ("🌐  Website (makenaevents.com/trips)", [
        "Dedicated Punta Cana trip landing page with full itinerary",
        "Interest form live NOW — collect leads immediately",
        "Countdown timer to booking deadline",
        "FAQ section addressing price, flights, roommate matching",
        "Testimonials section (use quotes from DC event attendees)",
    ]),
    ("📱  Instagram Strategy", [
        "Launch a 'Punta Cana Trip' Story Highlight — keep it updated",
        "Post a teaser reel: tropical footage + Makena music",
        "Weekly countdown posts ('X weeks until we're in DR')",
        "DM all previous event attendees personally — warm leads convert",
        "Collaborate with Afrobeats/Amapiano influencers for reach",
    ]),
    ("💬  WhatsApp & Community", [
        "Create a 'Punta Cana Interest List' WhatsApp broadcast",
        "Send regular voice notes from Baldwin — personal touch drives sign-ups",
        "Leverage DC event attendee list — they know Makena already",
        "Offer a referral incentive: bring 2 friends, get $50 off",
        "Weekly updates to keep the community warm",
    ]),
    ("💰  Pricing & Packages", [
        "Create 2–3 tiers: Standard Room, Deluxe, VIP Suite",
        "Offer an Early Bird rate — creates urgency and locks in cash early",
        "Payment plan option: deposit + 2 installments",
        "All-inclusive price — guests love knowing the total upfront",
        "Clear 'What's Included' vs 'Not Included' breakdown",
    ]),
]

for i, (title, pts) in enumerate(channels):
    col = i % 2
    row = i // 2
    x = 0.4 + col * 6.45
    y = 1.18 + row * 3.05
    add_rect(slide, x, y, 6.2, 2.85, DARK_CARD)
    add_text(slide, title, x + 0.2, y + 0.1, 5.8, 0.32, font_size=11, bold=True, color=GREEN)
    py = y + 0.48
    for pt in pts:
        add_rect(slide, x + 0.2, py + 0.08, 0.08, 0.08, GREEN)
        add_text(slide, pt, x + 0.38, py, 5.65, 0.3, font_size=9, color=WHITE)
        py += 0.38


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 13 — REVENUE & NUMBERS
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.05, DARK_GREEN)
add_text(slide, "💰  REVENUE MODEL & TRIP ECONOMICS", 0.5, 0.18, 12, 0.65,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "Know your numbers. Run this like a business.", 0.5, 0.78, 12, 0.25,
         font_size=10, color=GREEN)

add_text(slide, "These are illustrative figures — refine with your actual vendor quotes.",
         0.4, 1.12, 12.5, 0.25, font_size=9, italic=True, color=GREY)

# Cost table
cost_headers = ["COST CATEGORY", "EST. COST PER PERSON", "NOTES"]
cost_rows = [
    ["4-Night All-Inclusive Resort", "$350 – $600", "Negotiate group rate — target 20–30 guests"],
    ["Private Catamaran (Boat Party)", "$80 – $120", "Split across group — private charter"],
    ["Island Day Trip (Saona)", "$60 – $90", "Private vs. shared — go private"],
    ["Adventure Day (Dune Buggies)", "$70 – $100", "Per person incl. transfer"],
    ["Private Group Dinner", "$40 – $70", "Set menu + drinks per head"],
    ["All White Night Party (Venue + DJ)", "$50 – $80", "Per person share of venue cost"],
    ["Airport Transfers (Round Trip)", "$30 – $50", "Group van — split cost"],
    ["Welcome Gift Bag (Makena Branded)", "$40 – $60", "Tote, towel, wristband, snacks, etc."],
    ["Content Creator / Photographer", "$15 – $25", "Split across group"],
    ["Ground Coordinator", "$10 – $20", "Local hire for the week"],
    ["TOTAL COST PER PERSON", "$745 – $1,215", "Target retail: $1,500 – $2,000+"],
]
header_y = 1.45
for j, h in enumerate(cost_headers):
    x_pos = [0.4, 5.5, 9.5][j]
    w = [5.0, 3.8, 3.5][j]
    add_rect(slide, x_pos, header_y, w, 0.3, DARK_GREEN)
    add_text(slide, h, x_pos + 0.1, header_y + 0.04, w - 0.1, 0.24,
             font_size=9, bold=True, color=GREEN)

row_y = header_y + 0.32
for k, row in enumerate(cost_rows):
    bg = DARK_CARD if k % 2 == 0 else RGBColor(0x1c, 0x1c, 0x1c)
    is_total = "TOTAL" in row[0]
    txt_color = GREEN if is_total else WHITE
    for j, cell in enumerate(row):
        x_pos = [0.4, 5.5, 9.5][j]
        w = [5.0, 3.8, 3.5][j]
        add_rect(slide, x_pos, row_y, w, 0.29, bg)
        add_text(slide, cell, x_pos + 0.1, row_y + 0.04, w - 0.1, 0.24,
                 font_size=9, bold=is_total, color=txt_color)
    row_y += 0.3

# Margin note
add_rect(slide, 0.4, row_y + 0.1, 12.53, 0.7, DARK_GREEN)
add_text(slide, "📈  POTENTIAL MARGIN:  At 25 guests paying $1,800 each = $45,000 revenue.  Estimated costs at $1,100/head = $27,500.  Gross margin: ~$17,500.",
         0.6, row_y + 0.2, 12.1, 0.5, font_size=10, bold=True, color=GREEN)


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 14 — DAILY MANAGER CHECK-IN PROTOCOL
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)
add_rect(slide, 0, 0, 13.33, 1.05, DARK_GREEN)
add_text(slide, "📋  DAILY MANAGER CHECK-IN PROTOCOL", 0.5, 0.18, 12, 0.65,
         font_size=26, bold=True, color=WHITE)
add_text(slide, "You run the team, not the tasks. These daily rituals keep you in control without doing the work yourself.",
         0.5, 0.78, 12, 0.25, font_size=10, color=GREEN)

boxes = [
    ("🌅  7:00 AM — Morning Standup (15 min)",
     "Every morning: quick voice/video call with all delegates. Each person gives:\n• What they have confirmed for today\n• Any blockers or issues\n• What they need from you\n\nYou listen, make one or two decisions, and let them execute. Keep it under 15 minutes."),
    ("📱  Throughout the Day — Delegate Pings",
     "Each delegate sends you a simple status update at the start of each activity:\n'Catamaran departed. 24 guests on board. Open bar running. DJ is great.'\n\nYou reply with a thumbs up or a redirect. You are never surprised by what's happening."),
    ("🌙  9:00 PM — Evening Review (10 min)",
     "End-of-day quick chat with Ground Coordinator:\n• What went well today (celebrate it)\n• What needs fixing for tomorrow\n• Confirm next day's schedule\n\nYou update the group WhatsApp with a short 'Day X wrap' message to guests."),
    ("🚨  Issue Escalation Protocol",
     "Delegates handle Level 1 (minor issues) independently.\nDelegate escalates Level 2 (guest complaints, vendor fail) to you via a direct call.\nYou + Ground Coordinator handle Level 3 (medical, safety, cancellations) together immediately.\n\nNo drama. Calm, decisive, fast."),
    ("📊  Budget Check (Daily)",
     "Ground Coordinator or you reviews the daily spend against budget.\nAny unplanned spend over $200 requires your approval.\nAll receipts collected daily — no chasing at the end of the trip."),
    ("🎯  Guest Pulse Check",
     "Guest Services Lead reports guest sentiment daily:\n• Any concerns raised in WhatsApp?\n• Anyone unhappy with their room?\n• Any special requests for tomorrow?\n\nProactive issue resolution = zero public complaints."),
]

for i, (title, content) in enumerate(boxes):
    col = i % 2
    row = i // 2
    x = 0.4 + col * 6.45
    y = 1.18 + row * 2.05
    add_rect(slide, x, y, 6.2, 1.95, DARK_CARD)
    add_text(slide, title, x + 0.18, y + 0.1, 5.8, 0.3, font_size=10, bold=True, color=GREEN)
    add_text(slide, content, x + 0.18, y + 0.44, 5.8, 1.4, font_size=8.5, color=WHITE)


# ══════════════════════════════════════════════════════════════════════════
# SLIDE 15 — CLOSING: NEXT STEPS
# ══════════════════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(BLANK_LAYOUT)
set_bg(slide, BLACK)

add_rect(slide, 0, 0, 13.33, 7.5, DARK_GREEN)
add_rect(slide, 0.06, 0, 0.08, 7.5, GREEN)

add_text(slide, "WHAT HAPPENS NEXT", 0.5, 1.5, 12, 0.7,
         font_size=36, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
add_text(slide, "Your immediate action items to get this trip off the ground.", 0.5, 2.3, 12, 0.4,
         font_size=13, color=GREY, align=PP_ALIGN.CENTER)

next_steps = [
    ("01", "Launch the Punta Cana interest form on makenaevents.com/trips — NOW."),
    ("02", "Post a teaser on @makena_entertainment Instagram this week."),
    ("03", "DM every AfroPlusFest DC attendee personally about the trip."),
    ("04", "Get 3 hotel quotes from Punta Cana all-inclusive resorts — pick one by end of month."),
    ("05", "Identify and reach out to a local Punta Cana Ground Coordinator."),
    ("06", "Set a booking open date and build a countdown strategy around it."),
    ("07", "Design the Makena gift bag — place order 8 weeks before trip date."),
    ("08", "Refine this plan with your team and assign every delegate role."),
]

y = 2.9
for num, step in next_steps:
    add_rect(slide, 1.0, y, 0.55, 0.38, GREEN)
    add_text(slide, num, 1.0, y + 0.04, 0.55, 0.3,
             font_size=12, bold=True, color=BLACK, align=PP_ALIGN.CENTER)
    add_text(slide, step, 1.7, y + 0.04, 10.5, 0.32, font_size=11, color=WHITE)
    y += 0.5

add_text(slide, "One Life. Good Vibe. Party Hard.", 0.5, 7.0, 12, 0.35,
         font_size=12, bold=True, color=GREEN, align=PP_ALIGN.CENTER)


# ── Save ──────────────────────────────────────────────────────────────────
output_path = "/Users/baldwinmbangwana/Documents/Makena/Makena_Punta_Cana_Playbook.pptx"
prs.save(output_path)
print(f"Saved: {output_path}")
