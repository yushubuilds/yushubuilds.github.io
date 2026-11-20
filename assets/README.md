# assets/

## Portrait slot

Drop a photo here named exactly **`yushu.jpg`** and the site picks it up automatically —
no code change needed. The About section probes for it on load: if it's there, the photo
renders inside the gold corner-bracket frame; if it isn't, the engraved **YS** monogram
medallion stays in its place.

Guidelines for the file:

| | |
|---|---|
| Name | `yushu.jpg` (exact) |
| Shape | Square (1:1) — it's cropped with `object-fit: cover` |
| Size | 800×800 px or larger |
| Weight | Keep under ~300 KB so the page stays fast |
| Look | The site applies a light grayscale + contrast treatment that lifts on hover, so a plain, evenly-lit background works best |

To use a different filename or a `.png`, change the one `probe.src` line in the
portrait-slot block of `index.html`.

## Everything else is drawn, not photographed

All other imagery is original inline SVG authored in `index.html` — the engraved guilloche
medallions, the pillar emblems, the hand-built PC rig (with spinning fans), the barbell, and
the credentials seal. That's deliberate: it keeps the page a single self-contained file, stays
crisp at any resolution, matches the gold palette exactly, and avoids the game logos and box
art the brief rules out. Adding stock photography would mean new HTTP requests, licensing to
track, and colours that fight the palette.
