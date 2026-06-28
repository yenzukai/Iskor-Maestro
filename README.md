# Iskor Maestro
### Competition Scoring System

A browser-based scoring system built for live competitions — dance groups, solo performances, talent shows, and pageants. No backend, no install, no internet required after first load. Just open `index.html` and score.

---

## Features

- **Three Competition Formats** — Group, Solo, and Pageant (multi-segment)
- **Configurable Judging Criteria** — Add, rename, and weight criteria freely; must total 100%
- **Multiple Judges** — Supports up to 6 judges with custom names
- **Two Scoring Methods** — Point Method (direct) or Percent Method
- **Pageant Mode**
  - Multi-segment scoring with per-segment sub-criteria
  - Back-to-zero segments (scored independently)
  - Progressive elimination/cut system — define Top N cutoffs after any segment
  - Tied candidates at the cutoff boundary are automatically included
- **Competition Rules** — Define rules with optional score deductions; toggle per-rule violations per candidate
- **Live Results** — Auto-ranked leaderboard with full score breakdown per candidate/group
- **Autosave** — Session auto-saved to `localStorage` every 2.5 minutes and on page close
- **Session Recovery** — Banner prompt to restore unsaved progress on next load
- **Save / Open Session** — Export and import `.json` session files
- **Printable Scoresheets**
  - Group/Solo: one sheet per judge per contestant
  - Pageant: one consolidated sheet per judge per segment (all candidates on a single horizontal table)
- **Print Results** — Clean print-ready rankings page

---

## Getting Started

No installation or build step needed.

```bash
git clone https://github.com/yenzukai/iskor-maestro.git
cd iskor-maestro
```

Then open `index.html` in any modern browser.

> **Tip:** For the best experience use **Chrome** or **Edge**. Firefox and Safari are supported but some print layouts may vary.

---

## File Structure

```
iskor-maestro/
├── .icon           # Used free icons
├── .json           # Save files for test development
├── .logo           # Unofficial logo
├── index.html      # Main app shell
├── iskrip.js       # All app logic (state, scoring, rendering, print)
└── istilo.css      # Styles (dark UI + print-optimized scoresheet layouts)
```

---

## Usage Guide

### 1. Setup
- Fill in event name, date, and venue
- Select number of judges and enter their names
- Choose competition format: **Group**, **Solo**, or **Pageant**
- Choose scoring method: **Point** or **Percent**
- For Pageant: define segments, sub-criteria weights, and elimination cuts
- Add judging criteria (non-pageant) or configure segment sub-criteria (pageant)
- Optionally define competition rules with deductions

### 2. Add Contestants
- Navigate to the **Contestant** tab
- Enter name, representing area, and performance order
- For group competitions, include member count

### 3. Score
- Navigate to the **Scoring** tab
- Click a contestant card to open the scoring modal
- Enter scores per criteria per judge
- For pageant, navigate between segments using the segment tabs

### 4. Results
- Navigate to the **Results** tab to view live rankings
- Full score breakdown per contestant is shown

### 5. Print
- **Scoresheets** — Print blank judge scoresheets before or during the event
- **Results** — Print the final rankings page

---

## Session Management

| Action | How |
|---|---|
| Save session | Click **Save** in the header — downloads a `.json` file |
| Load session | Click **Open** in the header — drag or browse for the `.json` file |
| Autosave | Happens automatically; a dot indicator in the header shows status |
| Restore | On next load, a banner appears if unsaved progress is found |

---

## Browser Compatibility

| Browser | Supported |
|---|---|
| Chrome 90+ | ✅ Full support |
| Edge 90+ | ✅ Full support |
| Firefox | ✅ Supported (print layout may vary) |
| Safari | ✅ Supported (print layout may vary) |

---

## License

MIT License — free to use, modify, and distribute.

---

<div align="center">
  Made with ❤️ for Filipino competitions
</div>
