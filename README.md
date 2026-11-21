# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Adnanhasim8/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Adnanhasim8/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn any photo and a caption into GTA-style cover art, exported as a PNG to
share. An offline web app: your photos never leave your machine.

## What it does

- **Any photo** — add up to three photos from your machine (or try the two
  free sample photos). Click a panel on the preview to pick which photo fills
  it, drag to reposition it inside the panel, and zoom it.
- **Multi-panel poster layouts** — Poster grid (hero + three), Full bleed,
  Triptych, and Nine panel.
- **Bold lettering** — a big condensed title, a neon script subtitle, and a
  letterspaced tagline, over a sunset disc, film grain and vignette.
- **Colour grades** — Sunset, Neon night, Vice pink, Golden hour, Teal noir.
- **Post sizes** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, exported as PNG
  in one click.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. No build step, no network
request — every file the app loads lives under `app/`.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes
`dossier.json` with the vendored make.fun library.

## Fonts and photos

- Lettering uses Noto Sans Condensed Black and Noto Serif Display Black
  Italic, both under the SIL Open Font License 1.1 (see
  `app/fonts/OFL.txt`).
- The two sample photos under `app/samples/` were made with an image model
  for make.fun and are free to use.

## Originality

Original art and lettering made for this app. Not affiliated with Rockstar
Games; no Rockstar logo, artwork, character or font is used.

## License

MIT — see `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=vev5ehp3&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
