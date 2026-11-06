/*
 * Try-On Kiosk — every piece of content, data and every switch lives here.
 * Edit this file to change the prototype; app.js only reads it.
 *
 * Products, prices, stock and names are invented. Stock arrays line up with
 * the product's size run (see sizeRuns): index 0 = the first size in the run.
 *
 * Real shoe pictures: give any colourway an `image` (e.g. image: "images/halo-ember.png").
 * It replaces the placeholder drawing everywhere. Side-on, toe pointing right, on a
 * transparent background (PNG/WebP), roughly 2:1, looks best.
 */
window.KIOSK_CONFIG = {
  meta: {
    kioskName: "Try·On",
    title: "Try-On Kiosk",
    subtitle: "Student concept for Nike Orchard Road · EP0710 IEI",
    version: "v0 · 27 Oct 2026",
    currency: "S$",
    disclaimer:
      "Student concept for EP0710 Introduction to Enterprise Innovation. Not affiliated with, endorsed by or connected to Nike, Inc. or GMG. All products, prices and stock are invented.",
    aiNote:
      "Built with AI assistance (Claude, Anthropic), 27 Oct 2026. Declare it on the group AI-use form (Option B).",
  },

  // Each module can be switched off in the presenter panel (L10: "Improvisation").
  modules: {
    scan:         { on: true,  label: "QR scan",            desc: "Scan a display shoe's tag. Off = browse a catalogue." },
    manualCode:   { on: true,  label: "Manual code entry",  desc: "Keypad fallback when a tag won't scan." },
    stockByFloor: { on: true,  label: "Stock per floor",    desc: "Pair counts and where they're kept." },
    request:      { on: true,  label: "Request a pair",     desc: "Off = info kiosk; ask staff yourself." },
    waitStatus:   { on: true,  label: "Live wait status",   desc: "ETA, progress and 'why the wait' (Maister)." },
    footScan:     { on: true,  label: "Foot scanner",       desc: "Simulated scan that recommends a size." },
    pairUp:       { on: true,  label: "Bring two sizes",    desc: "Offer the next half size in the same box run." },
    similar:      { on: true,  label: "Similar styles",     desc: "Something to browse while waiting." },
    staffQueue:   { on: true,  label: "Staff handheld",     desc: "The runner's request queue." },
  },

  demo: {
    speed: 5,              // simulated seconds per real second
    speeds: [1, 5, 15],
    fidelity: "hifi",      // "hifi" | "lofi"
    showNotes: true,
  },

  delivery: {
    mode: "conveyor",
    runners: ["Aisha", "Wei Jie", "Priya", "Daniel"],
    modes: {
      conveyor: {
        label: "Conveyor (concept)",
        short: "Conveyor",
        why: "Sizes are kept in the {floor} stockroom so the shop floor stays clear. Your box rides a conveyor straight to Try-on Point {point}. No one has to go looking for it.",
        stages: [
          { id: "received", at: 0,   label: "Request received",  kiosk: "Got it. Your request is in.",             detail: "Ticket {ticket}",            staffAction: "Locate" },
          { id: "located",  at: 12,  label: "Found in stockroom", kiosk: "We've found your size.",                detail: "{floor} stockroom · Bay {bay}", staffAction: "Mark picked" },
          { id: "picked",   at: 38,  label: "Picked",             kiosk: "Your box is off the shelf.",            detail: "Checked: {size}",            staffAction: "Send on conveyor" },
          { id: "conveyor", at: 52,  label: "On the conveyor",    kiosk: "Your box is on its way.",               detail: "Heading to Try-on Point {point}", staffAction: "Confirm arrival" },
          { id: "arrived",  at: 100, label: "At your seat",       kiosk: "Your box has arrived.",                 detail: "Try-on Point {point}" },
        ],
      },
      runner: {
        label: "Staff runner",
        short: "Runner",
        why: "Sizes are kept in the {floor} stockroom, about 40 m away. {runner} got your request on their handheld, so you don't need to find anyone. They'll bring it to Try-on Point {point}.",
        stages: [
          { id: "received", at: 0,   label: "Request received", kiosk: "Got it. Your request is in.",           detail: "Ticket {ticket}",             staffAction: "Accept" },
          { id: "assigned", at: 15,  label: "Runner assigned",  kiosk: "{runner} is on it.",                     detail: "Sent to {runner}'s handheld", staffAction: "Mark picked" },
          { id: "picked",   at: 62,  label: "Picked",           kiosk: "Your box is off the shelf.",             detail: "{floor} stockroom · Bay {bay}", staffAction: "On my way" },
          { id: "onway",    at: 80,  label: "On the way",       kiosk: "{runner} is walking it over.",           detail: "Heading to Try-on Point {point}", staffAction: "Delivered" },
          { id: "arrived",  at: 120, label: "At your seat",     kiosk: "Your box has arrived.",                  detail: "Try-on Point {point}" },
        ],
      },
    },
  },

  store: {
    name: "Orchard Road",
    kioskFloor: "L2",
    floors: { L1: "L1 · Women's & kids'", L2: "L2 · Men's", L3: "L3 · Customisation" },
    tryOnPoints: [
      { n: 1, busy: true,  dist: "18 m" },
      { n: 2, busy: false, dist: "15 m" },
      { n: 3, busy: true,  dist: "12 m" },
      { n: 4, busy: false, dist: "9 m"  },
      { n: 5, busy: false, dist: "11 m" },
      { n: 6, busy: true,  dist: "16 m" },
    ],
    defaultPoint: 4,
    firstTicket: 27,
    servedToday: 143,
    avgToSeat: "1:52",
    // Other shoppers' requests, so the staff queue isn't empty at the start.
    seedRequests: [
      { ticket: "A25", code: "0233", colour: "chalk", sizes: [10],  point: 1, elapsed: 64 },
      { ticket: "A26", code: "0581", colour: "moss",  sizes: [8.5], point: 3, elapsed: 18 },
    ],
  },

  sizeRuns: {
    mens: {
      label: "Men's",
      sizes: [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11],
      us: (uk) => uk + 1,
      eu: { 6: 40, 6.5: 40.5, 7: 41, 7.5: 42, 8: 42.5, 8.5: 43, 9: 44, 9.5: 44.5, 10: 45, 10.5: 45.5, 11: 46 },
      demoSize: 9,
    },
    womens: {
      label: "Women's",
      sizes: [3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5],
      us: (uk) => uk + 2.5,
      eu: { 3.5: 36.5, 4: 37.5, 4.5: 38, 5: 38.5, 5.5: 39, 6: 40, 6.5: 40.5, 7: 41, 7.5: 42 },
      demoSize: 5.5,
    },
  },

  footScan: {
    seconds: 30,
    result: {
      left: { length: 268, width: 101 },
      right: { length: 271, width: 102 },
      width: "Regular",
      arch: "Medium",
      recommend: { mens: 9, womens: 6 }, // before each model's fitOffset
    },
  },

  outReason:
    "Sold out in this store today. The next delivery is expected on Thursday.",

  products: [
    {
      code: "0417",
      name: "Halo Runner 2",
      tagline: "Daily road running",
      category: "Road running",
      sizeRun: "mens",
      price: 189,
      variant: "runner",
      fitOffset: 0,
      fitNote: "True to size.",
      features: ["Soft foam midsole", "Breathable mesh", "10 mm drop"],
      similar: ["0352", "0581", "0796"],
      colours: [
        { id: "ember",    name: "Ember",    upper: "#E4572E", overlay: "#F4EFE8", sole: "#F6F3EE", outsole: "#2A2A2A", accent: "#151515", laces: "#F6F3EE", lining: "#1A1A1A",
          stock: { L2: [1, 2, 3, 2, 4, 3, 5, 2, 1, 0, 1], L1: [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0] } },
        { id: "midnight", name: "Midnight", upper: "#1E2638", overlay: "#33405C", sole: "#F6F3EE", outsole: "#E4572E", accent: "#E4572E", laces: "#F6F3EE", lining: "#0E121B",
          stock: { L2: [0, 1, 2, 3, 3, 2, 0, 1, 2, 1, 0], L1: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0] } },
        { id: "glacier",  name: "Glacier",  upper: "#D9E4E8", overlay: "#FFFFFF", sole: "#F6F3EE", outsole: "#1F6F68", accent: "#1F6F68", laces: "#FFFFFF", lining: "#9FB3BA",
          stock: { L2: [2, 1, 0, 1, 2, 2, 3, 1, 0, 0, 1] } },
      ],
    },
    {
      code: "0233",
      name: "Kite Court Low",
      tagline: "Clean everyday court",
      category: "Lifestyle",
      sizeRun: "mens",
      price: 129,
      variant: "court",
      fitOffset: 0,
      fitNote: "True to size.",
      features: ["Leather upper", "Stitched cupsole", "All-day comfort"],
      similar: ["0904", "0352", "0417"],
      colours: [
        { id: "chalk",  name: "Chalk",  upper: "#F4F1EA", overlay: "#FFFFFF", sole: "#F4F1EA", outsole: "#C9BFAE", accent: "#1F6F68", laces: "#FFFFFF", lining: "#1F6F68",
          stock: { L2: [3, 3, 4, 4, 5, 5, 6, 4, 3, 2, 2], L1: [2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0] } },
        { id: "forest", name: "Forest", upper: "#1F6F68", overlay: "#F4F1EA", sole: "#F4F1EA", outsole: "#2A2A2A", accent: "#F4F1EA", laces: "#F4F1EA", lining: "#123F3B",
          stock: { L2: [0, 1, 1, 2, 2, 1, 1, 1, 0, 1, 0] } },
        { id: "bone",   name: "Bone / Black", upper: "#E8DFCF", overlay: "#151515", sole: "#E8DFCF", outsole: "#8A6E4B", accent: "#151515", laces: "#E8DFCF", lining: "#151515",
          stock: { L2: [1, 0, 2, 1, 1, 0, 2, 1, 1, 0, 0] } },
      ],
    },
    {
      code: "0581",
      name: "Ridge Trail 5",
      tagline: "Grippy trail runner",
      category: "Trail",
      sizeRun: "mens",
      price: 219,
      variant: "trail",
      fitOffset: 0.5,
      fitNote: "Runs small. Most people go half a size up.",
      features: ["Lugged outsole", "Toe bumper", "Water-resistant mesh"],
      similar: ["0417", "0352"],
      colours: [
        { id: "moss",  name: "Moss",  upper: "#5C6B3C", overlay: "#2C3320", sole: "#E9E3D3", outsole: "#1B1B1B", accent: "#E4572E", laces: "#E4572E", lining: "#20261A",
          stock: { L2: [1, 1, 2, 2, 1, 2, 2, 1, 1, 0, 1] } },
        { id: "rust",  name: "Rust",  upper: "#9C4A2A", overlay: "#3A2219", sole: "#E9E3D3", outsole: "#1B1B1B", accent: "#F2B544", laces: "#E9E3D3", lining: "#2A1912",
          stock: { L2: [0, 0, 1, 1, 1, 1, 0, 0, 1, 0, 0] } },
        { id: "storm", name: "Storm", upper: "#6B7378", overlay: "#2E3336", sole: "#D7DADB", outsole: "#1B1B1B", accent: "#7FD1C4", laces: "#D7DADB", lining: "#1E2224",
          stock: { L2: [1, 1, 1, 0, 2, 2, 1, 1, 0, 1, 1] } },
      ],
    },
    {
      code: "0352",
      name: "Pulse Trainer",
      tagline: "Gym and studio",
      category: "Training",
      sizeRun: "mens",
      price: 159,
      variant: "runner",
      fitOffset: 0,
      fitNote: "True to size. Snug through the midfoot.",
      features: ["Stable flat base", "Lateral support", "Gym and studio"],
      similar: ["0417", "0233"],
      colours: [
        { id: "volt",     name: "Volt",     upper: "#D4EE4F", overlay: "#1A1A1A", sole: "#F4F4F0", outsole: "#1A1A1A", accent: "#1A1A1A", laces: "#1A1A1A", lining: "#1A1A1A",
          stock: { L2: [2, 2, 3, 3, 3, 4, 4, 3, 2, 1, 1] } },
        { id: "graphite", name: "Graphite", upper: "#3A3D42", overlay: "#585C63", sole: "#2A2C30", outsole: "#E4572E", accent: "#E4572E", laces: "#BFC3C8", lining: "#17181A",
          stock: { L2: [1, 1, 2, 2, 2, 2, 3, 2, 1, 1, 0] } },
      ],
    },
    {
      code: "0796",
      name: "Aria Runner",
      tagline: "Light and cushioned",
      category: "Road running",
      sizeRun: "womens",
      price: 179,
      variant: "runner",
      fitOffset: 0,
      fitNote: "True to size.",
      features: ["Lightweight foam", "Knit upper", "8 mm drop"],
      similar: ["0417", "0904"],
      colours: [
        { id: "blush", name: "Blush", upper: "#F2C6C2", overlay: "#FFF6F3", sole: "#FFF6F3", outsole: "#C96F64", accent: "#C24F3F", laces: "#FFF6F3", lining: "#C96F64",
          stock: { L1: [1, 2, 3, 3, 4, 3, 2, 1, 1] } },
        { id: "sky",   name: "Sky",   upper: "#A9C9E8", overlay: "#F3F8FC", sole: "#F3F8FC", outsole: "#1E2638", accent: "#1E2638", laces: "#F3F8FC", lining: "#4D6E8F",
          stock: { L1: [0, 1, 2, 2, 0, 1, 1, 0, 1] } },
        { id: "onyx",  name: "Onyx",  upper: "#202022", overlay: "#3B3B3F", sole: "#F3F1EC", outsole: "#202022", accent: "#F2C6C2", laces: "#F3F1EC", lining: "#0E0E0F",
          stock: { L1: [1, 1, 1, 2, 2, 2, 1, 1, 0] } },
      ],
    },
    {
      code: "0904",
      name: "Metro Classic",
      tagline: "Retro city sneaker",
      category: "Lifestyle",
      sizeRun: "mens",
      price: 169,
      variant: "court",
      fitOffset: 0,
      fitNote: "True to size.",
      features: ["Suede overlays", "Retro cupsole", "Padded collar"],
      similar: ["0233", "0417"],
      colours: [
        { id: "sand", name: "Sand", upper: "#D8C3A0", overlay: "#F3EBDD", sole: "#F3EBDD", outsole: "#7A5A3A", accent: "#E4572E", laces: "#F3EBDD", lining: "#7A5A3A",
          stock: { L2: [1, 2, 2, 3, 3, 2, 2, 1, 1, 1, 0], L3: [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0] } },
        { id: "ink",  name: "Ink",  upper: "#22304A", overlay: "#F3EBDD", sole: "#F3EBDD", outsole: "#22304A", accent: "#E4572E", laces: "#F3EBDD", lining: "#111827",
          stock: { L2: [0, 1, 1, 1, 2, 1, 1, 1, 0, 0, 0] } },
      ],
    },
  ],

  copy: {
    attract: {
      kicker: "Concept · In-store try-on",
      title: ["Your size,", "brought to you."],
      sub: "Scan any shoe on display. See every size we have in store. We'll bring your pair to a seat.",
      chips: ["Every size, every floor", "No app or sign-in", "Live wait time", "Free foot scan"],
    },
  },

  // Design rationale shown in the presenter panel, per screen.
  notes: {
    attract: [
      "Why it isn't Nike's 2018 'scan to try': no app and no membership, so it works for tourists and walk-ins.",
      "A shared kiosk, not the shopper's own phone.",
    ],
    scan: [
      "Tests H1: only one sample size is on display per model, so shoppers can't check sizes themselves.",
      "The scan is simulated. Real camera scanning would need a library.",
    ],
    product: [
      "Every size and colour in store, with stock per floor. Nike's RFID tagging (2019) makes live stock plausible.",
      "A sold-out size explains why and offers alternatives (Maister: explained waits feel shorter).",
    ],
    footscan: [
      "Optional module. Tests H7: the wrong size or fit causes repeat trips.",
      "Prior art: Nike Fit (2019), Volumental in-store scanners (vendor claims only).",
    ],
    confirm: [
      "Tests H3: the shopper requests a pair without having to catch a staff member's attention.",
      "'Bring two sizes' aims to cut repeat trips.",
    ],
    wait: [
      "Maister: known, finite waits feel shorter, hence the live ETA and progress.",
      "Maister: explained waits feel shorter, hence 'Why the wait?'.",
      "Maister: occupied time feels shorter, hence the foot scan and similar styles.",
    ],
    arrived: [
      "Wrong size? One tap requests the next size, with no staff hunt.",
      "The conveyor is simulated. Expect the CA2 Q&A to probe its cost and feasibility.",
    ],
    checkout: [
      "No payment in the kiosk. A purchase is a hand-off to the cashier.",
      "No accounts, logins or personal data.",
    ],
    thanks: ["Resets itself for the next shopper."],
  },
};
