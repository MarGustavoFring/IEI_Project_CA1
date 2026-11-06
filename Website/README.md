# Try-On Kiosk · concept prototype (v0)

Clickable mock-up of the team's IEI (EP0710) concept: an in-store kiosk where a shopper scans a display
shoe, sees every size and colour in store, and requests a pair that is brought to a try-on point.
**CA2 material**: keep it out of the CA1 deck and never show it to Wk 4 interviewees.

> Student concept. Not affiliated with, endorsed by or connected to Nike, Inc. or GMG.
> All products, prices and stock are invented; shoes are placeholder drawings.

## Run it
- **Dev server:** from the repo root run `npm run dev`, then open http://localhost:5173.
  Needs Node 18+; there's nothing to install. The page reloads by itself when you save a file,
  and CSS changes apply without a reload, so you keep your place in the demo.
  If port 5173 is busy it uses the next free one and prints the URL.
- **No Node?** Double-click `index.html`. It works offline; fonts fall back to system fonts without internet.

## What's on the page
| Area | What it does |
|---|---|
| **Left: presenter panel** | Jump to any screen, see "Why this screen" design notes (Maister, H1–H7), switch modules on/off, change delivery mode (conveyor / staff runner), clock speed and fidelity (hi-fi / wireframe). **Kiosk only** hides the panels for a full-screen demo (Esc to exit). |
| **Centre: the kiosk** | Portrait 9:16 screen in a kiosk frame. Flow: attract → scan → sizes & stock → (foot scan) → request → live wait → box arrived → pay at counter → thank you. |
| **Right: staff handheld** | The stockroom runner's queue. Turn on **Role-play mode** and a teammate taps each step; the kiosk waits for them (L10 "role play"). |

Settings are remembered in the browser; **Reset all settings** restores the defaults.

## Change it (L10: "Improvisation")
Everything editable is in **`js/config.js`**:
- `products`: names, prices, colours, stock per floor (arrays line up with `sizeRuns`)
- `modules`: default on/off for scan, stock per floor, request, live wait, foot scan, two sizes, similar styles, staff handheld
- `delivery.modes`: stage names, timings (seconds), "why the wait" text
- `store`: try-on points, ticket numbers, floors
- `notes`: the design rationale shown per screen
- `copy`, `meta`: headline text, disclaimer, AI note

### Swapping in real shoe pictures
The shoes are deliberately simple placeholder drawings. To use real pictures, put them in a new
`images/` folder and add an `image` to each colourway in `config.js`:
```js
{ id: "ember", name: "Ember", image: "images/halo-ember.png", upper: "#E4572E", ... }
```
The picture then replaces the drawing everywhere (hero, colour picker, scan tags, tickets). Best results: side-on,
toe pointing right, transparent background (PNG/WebP), about 2:1. Keep `upper` set: it still tints the backdrop.
If the page is ever shared beyond class, check image rights first (the handover advised against real product photos).

Other files: `js/app.js` (screens + simulation), `js/art.js` (SVG shoes, QR, map, icons), `css/styles.css`.

## Honest limits (expect these in CA2 Q&A)
- The scan, foot scan, stock and conveyor are **simulated**. Nothing reads a real camera, RFID or scanner.
- No payments, accounts or personal data. "Buy" is a hand-off to the cashier.
- The floor map is a schematic, not the real store layout (stockroom location is UNKNOWN).

## AI-use declaration
Built with AI assistance (Claude, Anthropic) on 27 Oct 2026. Declare it on the group AI-use form (Option B):
tool, date, and that it generated the prototype code and placeholder content.
