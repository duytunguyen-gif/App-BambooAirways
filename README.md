# Bamboo Fuel & MEL Tool

A mobile-first **Progressive Web App (PWA)** for two quick flight-ops calculations:

- **Fuel Calc** – fuel uplift cross-check (REMAIN / UPLIFT / SUM grid + discrepancy vs. browser figure).
- **Fuel Est** – block fuel and fuel-to-uplift estimate from individual fuel components.
- **MEL** – MEL / defect interval due dates with a realtime UTC clock and overdue / within-24h warnings.

It installs to the home screen on **Android and iOS** and works offline.

> ⚠️ **Internal calculation aid only. Always verify with approved company documents and procedures.**

---

## Tech stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 (dark mode) |
| PWA | `vite-plugin-pwa` (manifest + service worker, auto-update) |
| Dates | `date-fns` |
| Storage | `localStorage` (threshold, settings, last inputs) |
| Tests | Vitest |

No backend in this version.

---

## Run locally

Requires **Node.js 18+**.

```bash
npm install      # install dependencies
npm run dev      # start dev server (http://localhost:5173)
```

Open the printed URL on your computer, or on your phone using your computer's
LAN IP (e.g. `http://192.168.1.20:5173`) while both are on the same Wi-Fi.

### Other scripts

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
npm test           # run unit tests once
npm run test:watch # run tests in watch mode
```

---

## Tests

Unit tests cover the pure calculation functions:

- `src/lib/fuel.test.ts` – `computeFuelCalc` (sums, x100, discrepancy, threshold) and `computeFuelEst` (block fuel, fuel-to-uplift, no negative).
- `src/lib/mel.test.ts` – `computeDueDate` (matches the reference intervals), `melStatus` (overdue / within-24h), date parsing/formatting.

```bash
npm test
```

---

## How the calculations work

### Fuel Calc
- You enter the **REMAIN** and **SUM** columns; **UPLIFT** is auto-calculated as `UPLIFT = SUM − REMAIN` (per row).
- The multiplier button cycles **×1 → ×10 → ×100** and scales the entered REMAIN and SUM values (and the derived UPLIFT and totals).
- `Total = Left + Center + Right` (per column). The UPLIFT total auto-fills **Total Uplift**.
- `Discrepancy = Browser Uplift − Total Uplift` — calculated **live** as soon as Browser Uplift is entered.
- **Threshold %** (default `2.0`) is a percentage. Pressing **Delta** compares the discrepancy against `Threshold% × Total Uplift`:
  - `|Discrepancy| ≥ limit` → **red** warning.
  - `|Discrepancy| < limit` → **green** OK.
- **Reset** clears the entered figures (keeps your threshold / multiplier preference).

### Fuel Est
- `Block Fuel = Taxi + Trip + Contingency + Alternate + Final Reserve + Extra`.
- `Fuel To Uplift = max(0, Block Fuel − Remain Fuel)` (never negative).

### MEL
- **Today (UTC)** clock updates every second.
- Intervals: **A** custom, **B** 3 days, **C** 10 days, **D** 120 days, **C Defect** 180 days.
- Default (**Exclude day of discovery** = ON): `due = defect date + interval days`.
  This matches the convention where the day of discovery is day 0.
- With the setting OFF: `due = defect date + interval days − 1` (day of discovery counts as day 1).
- Toggle it in **Settings** (gear icon, top-right).
- Rows turn **amber** within 24h of expiry and **red** when overdue (end of the due UTC day).
- All dates are UTC, formatted **DD/MM/YYYY**.

---

## Brand assets

The official Bamboo Airways logo and the branded background are used directly:

- `public/bamboo-logo.png` – full official logo (leaf + "BAMBOO AIRWAYS").
- `public/bamboo-logo-mark.png` – just the leaf mark, shown in the app header and used as the favicon.
- `public/app-background.jpg` – branded background image, fixed behind the UI with a dark scrim for readability.
- Source artwork is kept in `brand-source/` (original PNG/PDF), outside the deployed bundle.

PNG app icons are generated from the logo mark by `scripts/make_icons.py`
(requires Python + Pillow):

```bash
python scripts/make_icons.py
```

This composites `bamboo-logo-mark.png` onto a navy tile and writes
`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, and
`apple-touch-icon.png` in `public/`.

---

## Install on a phone (PWA)

After deploying (or while running the dev server over HTTPS/LAN):

- **Android (Chrome):** open the URL → **⋮** menu → **Add to Home screen**.
- **iOS (Safari):** open the URL → **Share** → **Add to Home Screen**.

These instructions are also shown inside the app under **Settings**.

---

## Deploy to Vercel

This is a static Vite build — Vercel detects it automatically.

### Option A – Git (recommended)

1. Push this folder to a GitHub repository.
2. In [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo.
3. Framework preset: **Vite** (auto). Build command `npm run build`, output `dist`.
4. **Deploy.** Every `git push` redeploys automatically.

### Option B – Vercel CLI

```bash
npm i -g vercel
vercel          # first run: link/create the project
vercel --prod   # deploy to production
```

> PWA note: the service worker only fully works over **HTTPS** (Vercel provides
> this automatically) or on `localhost`.

---

## Project structure

```
App-Bamboo/
├── index.html
├── vite.config.ts          # Vite + vite-plugin-pwa (manifest, SW)
├── tailwind.config.js       # dark theme tokens (brand colors)
├── scripts/make_icons.py    # generates PWA PNG icons
├── public/                  # favicon, bamboo-mark, PWA icons
└── src/
    ├── main.tsx
    ├── App.tsx              # shell: header, tabs, settings, footer
    ├── index.css            # Tailwind + faded-logo background
    ├── components/          # NumberInput, BottomTabs, Toggle, buttons, SettingsSheet
    ├── tabs/                # FuelCalc, FuelEst, Mel
    └── lib/                 # fuel.ts, mel.ts, num.ts, storage.ts (+ *.test.ts)
```

---

## Disclaimer

This application is an **internal calculation aid only**. It does not replace
official documentation. Always verify every figure and date with approved
company documents and procedures before operational use.
