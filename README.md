# ⚜ XAUUSD Lot Size Calculator

A professional **Gold (XAUUSD) trading lot size calculator** with risk management tools. Built as a Progressive Web App (PWA) — works offline and is installable on mobile devices.

## Features

- **Managed Mode** — 3 scaled trades at 50%, 75%, and 100% of your target TP
- **Unmanaged Mode** — Identical trades with a configurable count (1–10)
- **Custom Mode** — Independent per-trade risk, SL, and TP inputs
- **Trade History** — Save and review previous calculations via localStorage
- **PWA Support** — Installable on Android and iOS home screen, works offline

## How it works

All calculations are based on XAUUSD gold pip value:
> **1 standard lot = $10 per pip**

**Lot Size formula:**
```
Lot Size = Risk ($) ÷ (Stop Loss in pips × $10)
```
Lot sizes are always **rounded down** to protect against over-risking.

## Usage

Open `index.html` in your browser or serve the directory with any static file server.

```bash
# Example using Python
python -m http.server 8080
```

Then navigate to `http://localhost:8080`.

## File Structure

```
├── index.html        # Main calculator page
├── history.html      # Saved calculations page
├── css/
│   └── styles.css    # All styles (dark theme)
├── js/
│   └── app.js        # Core calculator logic
├── icons/            # PWA icons
├── manifest.json     # PWA manifest
└── sw.js             # Service worker (offline support)
```

## License

MIT — feel free to use and adapt.
