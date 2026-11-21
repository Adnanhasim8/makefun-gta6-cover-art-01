# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Adnanhasim8/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Adnanhasim8/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

A free, offline web app that turns any photo and a caption into GTA-style
poster cover art, exported as a PNG to share.

## What it does

- **Any photo** — add your own photos from your machine (never uploaded),
  or try the three built-in sample scenes. Click a photo, then a panel, to
  place it; drag a panel to pan, scroll to zoom, or use the zoom slider.
- **Multi-panel covers** — three layouts: Vice Grid (hero photo + three
  stacked panels), Four Up (2×2), and Full Bleed (one photo edge to edge
  with two tilted snapshots).
- **Post sizes** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, one click to
  switch, one click to export.
- **Grades** — Vice Sunset, Neon Night, Teal Coast and Noir colour grades,
  plus film grain and a white poster frame.
- **Lettering** — a big gradient title, a neon script subtitle, a badge
  ribbon and a star heat meter, all editable.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the kit's vendored `vendor/makefun-app.ts`.

## Originality

Everything here is original: the art, layouts and code were made for this
entry. The fonts (Anton and Pacifico) are under the SIL Open Font License —
see `app/fonts/OFL.txt`. The sample scenes under `app/samples/` are
illustrations drawn for this entry. No Rockstar Games logo, artwork,
character or font is used.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vev5ehp3&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
