# Try-On Kiosk · concept prototype (v0)

Clickable mock-up of the team's IEI (EP0710) concept: an in-store kiosk where a shopper scans a display
shoe, sees every size and colour in store, and requests a pair that is brought to a try-on point.
**CA2 material**: keep it out of the CA1 deck and never show it to Wk 4 interviewees.

> Student concept. Not affiliated with, endorsed by or connected to Nike, Inc. or GMG.
> All products, prices and stock are invented; shoes are placeholder drawings.

## Run it
- **First time only:** do the [Supabase setup](#supabase-setup) below (`npm install`, then `npm run db:setup`).
  Skip it and the kiosk still runs as a guest-only demo.
- **Dev server:** from the repo root run `npm run dev`, then open http://localhost:3000.
  Needs Node 20.12+. The page reloads by itself when you save a file,
  and CSS changes apply without a reload, so you keep your place in the demo.
  If port 3000 is busy it uses the next free one and prints the URL.
- **No Node?** Double-click `index.html`. Guest mode works offline; fonts fall back to system fonts without internet.
  Accounts and live stock need internet (see below).

## What's on the page
| Area | What it does |
|---|---|
| **Left: presenter panel** | Jump to any screen, see "Why this screen" design notes (Maister, H1–H7), switch modules on/off (including **Accounts & sign-in**), change delivery mode (conveyor / staff runner), clock speed and fidelity (hi-fi / wireframe). **Kiosk only** hides the panels for a full-screen demo (Esc to exit). |
| **Centre: the kiosk** | Portrait 9:16 screen in a kiosk frame. Flow: attract → (sign in / guest) → scan → sizes & stock → (foot scan) → request → live wait → box arrived → pay at counter → thank you. |
| **Right: staff handheld** | The stockroom runner's queue. Turn on **Role-play mode** and a teammate taps each step; the kiosk waits for them (L10 "role play"). |

Settings are remembered in the browser; **Reset all settings** restores the defaults.

## Accounts and admin
Turn the **Accounts & sign-in** module on in the presenter panel. Turn it off and you get the old flow: straight from the attract screen to scanning.

**For shoppers**
- Flow: attract → **Sign in** or **Continue as guest** → scan.
- **Continue as guest** is the big first option. No account, no sign-in. This keeps the concept's "no app, no sign-in" difference.
- Members register with a name, email and password.
- A member's foot scan is saved to their profile, so they can skip it next time.
- Signing in lasts until the tab closes or someone taps **Start over**. It is a shared kiosk, so nobody stays signed in.

**For the admin**
- The admin account can open **Admin · stock**, a stock manager screen.
- Pick a product and a colour, then use **+ / −** to change the number of pairs per UK size on each floor (L1, L2, L3).
- Changes save to the database and update every open kiosk live (Supabase Realtime).
- **Reset all stock** puts back the original numbers from `js/config.js`.
- **View kiosk** jumps to the kiosk. The **Stock** button in the top bar brings you back.
- The admin email and password are `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

**Personal data:** registering collects a name and email (the handover had advised no personal data), plus the saved foot scan.
Guests share nothing. Use made-up details when testing, and don't invite real interviewees to register.

## Supabase setup
The backend is [Supabase](https://supabase.com): Auth for accounts, plus two tables.

| Table | Holds |
|---|---|
| `profiles` | name, role (`member` or `admin`), saved foot scan |
| `stock` | one row per product, colour, floor and size |

**Teammate steps** (do these once)
1. Copy `.env.example` to `.env` and fill it in. Ask Evan for the values. Never commit `.env`.
2. `npm install`. This installs the `pg` driver, which only the setup script uses.
3. `npm run db:setup`. It:
   - applies `supabase/schema.sql`,
   - creates or updates the admin account (already email-confirmed) from `ADMIN_EMAIL` / `ADMIN_PASSWORD`,
   - seeds stock from `js/config.js` without overwriting edits.
4. `npm run dev`.

`npm run db:setup -- --reset-stock` overwrites stock with the `config.js` numbers. Plain `npm run db:setup` is safe to re-run.

**Security model.** Row level security in `supabase/schema.sql` does the enforcing, not the website:
- Anyone can read stock. Only admins can change it.
- Users can read and edit only their own profile, and can't change their own role.
- The website contains only the public project URL and anon key (`supabase` block in `js/config.js`).
  All secret keys live in `.env`, which git ignores.
- The Supabase JS client loads from a CDN, so accounts and live stock need internet.
  Guests still work offline using the stock numbers in `config.js`.

**Email confirmation.** The Supabase project currently has "Confirm email" **on**. New members get a confirmation link and must click it before signing in (the app shows a "Check your inbox" screen).
Supabase's built-in email sender only allows a few emails per hour, so for demos it's easier to turn confirmation off:
Supabase dashboard → Authentication → Sign In / Providers → Email → turn off "Confirm email" → Save.
Then sign-up signs people straight in.

## Change it (L10: "Improvisation")
Everything editable is in **`js/config.js`**:
- `products`: names, prices, colours, stock per floor (arrays line up with `sizeRuns`).
  Once the database is set up, live stock is read from it. These numbers are the defaults for seeding and for **Reset all stock**, and what guests see offline.
- `supabase`: the public project URL and anon key (never put secret keys here)
- `modules`: default on/off for accounts, scan, stock per floor, request, live wait, foot scan, two sizes, similar styles, staff handheld
- `delivery.modes`: stage names, timings (seconds), "why the wait" text
- `store`: try-on points, ticket numbers, floors
- `notes`: the design rationale shown per screen
- `copy`, `meta`: headline text, disclaimer, AI note

If you add products or colours, run `npm run db:setup` again to seed the new rows.

### Swapping in real shoe pictures
The shoes are deliberately simple placeholder drawings. To use real pictures, put them in a new
`images/` folder and add an `image` to each colourway in `config.js`:
```js
{ id: "ember", name: "Ember", image: "images/halo-ember.png", upper: "#E4572E", ... }
```
The picture then replaces the drawing everywhere (hero, colour picker, scan tags, tickets). Best results: side-on,
toe pointing right, transparent background (PNG/WebP), about 2:1. Keep `upper` set: it still tints the backdrop.
If the page is ever shared beyond class, check image rights first (the handover advised against real product photos).

Other files: `js/app.js` (screens + simulation), `js/accounts.js` (sign-in, profiles, live stock), `js/art.js` (SVG shoes, QR, map, icons), `css/styles.css`.
Database and setup live in the repo root: `supabase/schema.sql`, `scripts/db-setup.js`, `.env.example`.

## Honest limits (expect these in CA2 Q&A)
- **Real (Supabase):** accounts, saved foot scans and stock numbers.
- **Still simulated:** the scan, the foot scan and the conveyor. Nothing reads a real camera, RFID or scanner.
- Stock is edited by hand in the admin screen. The real concept would read it from RFID.
- No payments. "Buy" is a hand-off to the cashier.
- Accounts collect a name and email. Guests share nothing.
- The floor map is a schematic, not the real store layout (stockroom location is UNKNOWN).

## AI-use declaration
Built with AI assistance (Claude, Anthropic) on 27 Oct 2026. Declare it on the group AI-use form (Option B):
tool, date, and that it generated the prototype code and placeholder content.

## Hosting
Live at https://nike-iei.vercel.app (Vercel project root directory: `Website`).
