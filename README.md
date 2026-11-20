# Yushu Singh

**AI Agentic Developer · Gamer · Bodybuilder · PC Builder**

Personal website: **https://yushubuilds.github.io**

A single-page site with a black-and-gold luxury design, built with plain HTML, CSS and
JavaScript — no frameworks, no build step, no dependencies — and hosted free on GitHub Pages.

## Connect

- LinkedIn: [yushu-singh-817420222](https://www.linkedin.com/in/yushu-singh-817420222)
- Instagram: [@the_only_yushu](https://www.instagram.com/the_only_yushu)
- GitHub: [@yushubuilds](https://github.com/yushubuilds)
- Email: ysyushusingh@gmail.com

---

## For developers

### Files

| File | Purpose |
|---|---|
| `index.html` | The whole site — markup, styles, scripts and all artwork |
| `404.html` | Custom not-found page, served automatically by GitHub Pages |
| `assets/` | Portrait slot: drop in `yushu.jpg` and About switches from monogram to photo |
| `tools/` | Dev-only: `serve.js` (local preview) and `review.js` (headless screenshots + checks) |

`PROJECT_BRIEF.md`, `CLAUDE.md` and `LAUNCH_CHECKLIST.md` stay local — they're in `.gitignore`.

### Preview locally

- **`node tools/serve.js`** → http://localhost:5173 (no install, no caching)
- **VS Code + Live Server:** right-click `index.html` → *Open with Live Server*
- Or just double-click `index.html` — it works straight from the filesystem

Prefer the localhost server when a browser-automation tool is driving the page: browser
extensions need a separate *"Allow access to file URLs"* permission to touch a `file://`
page, and `http://localhost` sidesteps that entirely.

### Checking a change

```bash
node tools/review.js
```

Launches headless Chrome over the DevTools Protocol (no npm install) and writes
section-by-section screenshots to `tools/shots/` at desktop, mobile and reduced-motion
settings — scrolling as it goes, since the reveals are IntersectionObserver-driven and a
single full-page capture would catch them mid-fade. It prints a report and exits non-zero
on: horizontal overflow, an element that never faded in, a mobile menu stuck open behind a
hidden nav bar, a stalled preloader, content hidden under reduced-motion, console errors,
or failed requests.

```bash
node tools/review.js --url http://localhost:5173   # review the served copy
node tools/review.js --only desktop                # skip mobile + reduced-motion
```

### Artwork

Every image is original inline SVG authored in `index.html` — no stock photos, no game
logos or box art, no external image requests:

- **Engraved guilloche medallions** — watch-dial lathe work from rotated ellipses, behind the hero name and around the About monogram
- **Pillar emblems** — a node graph (Builder), a reticle (Gamer), a dumbbell (Athlete)
- **The Rig** — a hand-built tower in The Arena whose CPU, GPU and exhaust fans actually spin
- **Barbell** and a rotating **credentials seal**

### Motion

A drawing-monogram intro curtain; the hero name revealed letter by letter and headings word
by word; a level badge counting up; pointer parallax, a trailing cursor halo, a magnetic
button and per-card cursor spotlights; a scroll progress bar, a nav that hides and returns,
drifting Roman watermarks, and a timeline spine that draws itself as its dots light up.
All of it switches off under `prefers-reduced-motion: reduce`.

### Deploy

GitHub Pages from `main` / root — push and it's live in about a minute.

```bash
git add . && git commit -m "Update" && git push
```

### Open items

- [x] GitHub username → `yushu`, wired into this README and the **IX — Contact** link
- [ ] Profile photo (optional) → drop `assets/yushu.jpg` in; About swaps automatically (see `assets/README.md`)
- [ ] Bodybuilding details: years training, split, PRs, goals (`TODO` in **IV — The Discipline**)
- [ ] PC build specs → "The Rig" in **III — The Arena**, where it says *Full specs — coming soon*
- [ ] Gaming handles: Discord / Steam / Epic / Twitch (optional)

---
© Yushu Singh. All rights reserved.
