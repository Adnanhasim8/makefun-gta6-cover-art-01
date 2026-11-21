// Vice Coast cover renderer: draws the multi-panel GTA-style poster onto a 2D
// canvas at any export size. Pure canvas, no network, no library. Every panel
// is a photo fitted with its own pan/zoom, under a colour grade, grain and
// vignette, with a bold condensed title block, a neon script subtitle and a
// letterspaced tagline on top.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

export const LAYOUTS = ['grid', 'bleed', 'triptych', 'nine'];

/** Colour grades: washes layered over the panels with blend modes. */
export const GRADES = {
  sunset: {
    wash: ['rgba(255,122,60,0.20)', 'rgba(255,46,136,0.22)'],
    glow: 'rgba(255,140,60,0.35)',
    sky: ['#ffd76e', '#ff7a3c', '#ff2e88'],
  },
  neon: {
    wash: ['rgba(255,46,136,0.28)', 'rgba(46,196,182,0.22)'],
    glow: 'rgba(255,46,136,0.45)',
    sky: ['#ff7ad9', '#b04dff', '#2ec4b6'],
  },
  vice: {
    wash: ['rgba(255,93,162,0.30)', 'rgba(140,40,160,0.20)'],
    glow: 'rgba(255,93,162,0.45)',
    sky: ['#ffc2dd', '#ff5da2', '#7a2ea6'],
  },
  gold: {
    wash: ['rgba(255,179,71,0.22)', 'rgba(255,110,40,0.18)'],
    glow: 'rgba(255,190,90,0.40)',
    sky: ['#ffe9a8', '#ffb347', '#ff6e3c'],
  },
  noir: {
    wash: ['rgba(46,196,182,0.20)', 'rgba(10,20,40,0.30)'],
    glow: 'rgba(46,196,182,0.30)',
    sky: ['#9ff5ec', '#2ec4b6', '#123a5c'],
  },
};

/** Panel rectangles for each layout, as fractions of the cover (x, y, w, h). */
export function layoutPanels(layout) {
  if (layout === 'bleed') return [[0, 0, 1, 1]];
  if (layout === 'triptych') {
    return [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]];
  }
  if (layout === 'nine') {
    const cells = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) cells.push([c / 3, r / 3, 1 / 3, 1 / 3]);
    }
    return cells;
  }
  // grid: one hero panel over three small ones.
  return [
    [0, 0, 1, 0.62],
    [0, 0.62, 1 / 3, 0.38],
    [1 / 3, 0.62, 1 / 3, 0.38],
    [2 / 3, 0.62, 1 / 3, 0.38],
  ];
}

/** A fresh cover state: three photo slots, one panel per layout cell. */
export function defaultState() {
  return {
    size: '1080x1080',
    layout: 'grid',
    grade: 'sunset',
    title: 'NEON SHORE',
    subtitle: 'chasing the sunset',
    tagline: 'SUNSET BOULEVARD · 2026',
    grain: true,
    vignette: true,
    sun: true,
    panels: layoutPanels('grid').map((_, i) => ({ photo: i % 2, zoom: 1, ox: 0, oy: 0 })),
  };
}

/** Rebuilds the panel list when the layout changes, keeping each panel's photo. */
export function panelsForLayout(layout, oldPanels) {
  const rects = layoutPanels(layout);
  return rects.map((_, i) => {
    const old = oldPanels[i] ?? oldPanels[0] ?? { photo: i % 2, zoom: 1, ox: 0, oy: 0 };
    return { photo: old.photo, zoom: old.zoom, ox: old.ox, oy: old.oy };
  });
}

/** Draws one photo cover-fitting a rectangle, panned and zoomed by the panel. */
function drawPanelPhoto(ctx, img, rect, panel) {
  const [rx, ry, rw, rh] = rect;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rw / iw, rh / ih);
  const scale = base * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Clamp the pan so the photo always covers its panel, never exposing the
  // dark backing behind it (matters when the photo exactly fits one axis).
  const maxDx = Math.max(0, (dw - rw) / 2);
  const maxDy = Math.max(0, (dh - rh) / 2);
  const shiftX = Math.max(-maxDx, Math.min(maxDx, panel.ox * rw * 0.5));
  const shiftY = Math.max(-maxDy, Math.min(maxDy, panel.oy * rh * 0.5));
  const dx = rx + (rw - dw) / 2 + shiftX;
  const dy = ry + (rh - dh) / 2 + shiftY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rx, ry, rw, rh);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** A soft white gutter between panels, so the grid reads as a poster. */
function drawGutters(ctx, w, h, layout) {
  const g = Math.max(3, Math.round(Math.min(w, h) * 0.006));
  ctx.fillStyle = '#f5efe8';
  if (layout === 'grid') {
    ctx.fillRect(0, h * 0.62 - g / 2, w, g);
    for (const x of [1 / 3, 2 / 3]) ctx.fillRect(w * x - g / 2, h * 0.62, g, h * 0.38);
  } else if (layout === 'triptych') {
    for (const x of [1 / 3, 2 / 3]) ctx.fillRect(w * x - g / 2, 0, g, h);
  } else if (layout === 'nine') {
    for (const x of [1 / 3, 2 / 3]) ctx.fillRect(w * x - g / 2, 0, g, h);
    for (const y of [1 / 3, 2 / 3]) ctx.fillRect(0, h * y - g / 2, w, g);
  }
}

/** The big striped sunset disc that sits in the hero panel's sky. */
function drawSun(ctx, w, h, grade, heroRect) {
  const [hx, hy, hw, hh] = heroRect;
  const r = Math.min(hw, hh) * 0.34;
  const cx = hx + hw * 0.72;
  const cy = hy + hh * 0.42;
  const disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  grade.sky.forEach((c, i) => disc.addColorStop(i / (grade.sky.length - 1), c));
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = disc;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Retro slats cut across the lower half of the disc.
  ctx.fillStyle = 'rgba(20,8,24,0.55)';
  let y = cy + r * 0.08;
  let thick = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, thick);
    y += thick * 2.6;
    thick *= 1.35;
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = r * 0.9;
  ctx.strokeStyle = grade.sky[0];
  ctx.lineWidth = Math.max(2, r * 0.03);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Fits a one-line title to the width, shrinking until it fits. */
function fitTitleFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = `900 ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 16) {
    size -= 2;
    ctx.font = `900 ${size}px ${family}`;
  }
  return size;
}

/** The title block: scrim, bold condensed title, neon script subtitle, tagline. */
function drawTitleBlock(ctx, w, h, state, grade) {
  const title = state.title.trim().toUpperCase() || 'UNTITLED';
  const sub = state.subtitle.trim();
  const tag = state.tagline.trim().toUpperCase();
  const bandH = h * (state.layout === 'bleed' ? 0.34 : 0.30);
  const bandY = h - bandH;

  // Scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  scrim.addColorStop(0, 'rgba(16,6,22,0)');
  scrim.addColorStop(0.35, 'rgba(16,6,22,0.62)');
  scrim.addColorStop(1, 'rgba(16,6,22,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - h * 0.06, w, bandH + h * 0.06);

  const pad = w * 0.055;
  const maxW = w - pad * 2;
  const display = '"CoverDisplay", "Arial Black", sans-serif';

  // Title: white fill, dark outline, warm drop shadow.
  let size = fitTitleFont(ctx, title, maxW, h * 0.115, display);
  const titleY = h - h * 0.135;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255,46,136,0.55)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeStyle = '#160818';
  ctx.lineWidth = size * 0.09;
  ctx.strokeText(title, pad, titleY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, pad, titleY);

  // Subtitle: italic serif in neon pink with a glow, tucked under the title.
  if (sub) {
    const subSize = Math.max(18, size * 0.42);
    ctx.font = `italic 900 ${subSize}px "CoverScript", Georgia, serif`;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = subSize * 0.9;
    ctx.fillStyle = '#ffd7ec';
    ctx.fillText(sub, pad + size * 0.03, titleY + subSize * 1.15);
    ctx.shadowBlur = 0;
  }

  // Tagline: small letterspaced caps with a rule, along the foot.
  if (tag) {
    const tagSize = Math.max(13, h * 0.016);
    ctx.font = `700 ${tagSize}px system-ui, sans-serif`;
    const gap = tagSize * 0.35;
    let tx = pad;
    const tagY = h - h * 0.028;
    ctx.fillStyle = 'rgba(245,239,232,0.92)';
    for (const ch of tag) {
      ctx.fillText(ch, tx, tagY);
      tx += ctx.measureText(ch).width + gap;
    }
    const ruleY = tagY - tagSize * 1.9;
    ctx.fillStyle = grade.sky[0];
    ctx.fillRect(pad, ruleY, Math.min(w * 0.22, tx - pad), Math.max(2, h * 0.004));
  }
}

/** A small star badge stamped in the top corner, like a poster sticker. */
function drawBadge(ctx, w, h, state) {
  const r = Math.min(w, h) * 0.052;
  const cx = w - r * 1.25;
  const cy = r * 1.25;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.12);
  ctx.fillStyle = '#ffb347';
  ctx.strokeStyle = '#160818';
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.62;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#160818';
  ctx.font = `900 ${r * 0.42}px "CoverDisplay", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', 0, -r * 0.22);
  ctx.font = `900 ${r * 0.30}px "CoverDisplay", "Arial Black", sans-serif`;
  ctx.fillText('2026', 0, r * 0.32);
  ctx.restore();
}

let grainTile = null;
/** A reusable noise tile for the film grain pass. */
function grainCanvas() {
  if (grainTile) return grainTile;
  const t = document.createElement('canvas');
  t.width = 160;
  t.height = 160;
  const c = t.getContext('2d');
  const img = c.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  grainTile = t;
  return t;
}

/**
 * Draws the whole cover. `photos` is an array of images (or null slots);
 * missing photos fall back to a painted sunset so the cover is never blank.
 */
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = layoutPanels(state.layout);
  const gutter = state.layout === 'bleed' ? 0 : Math.max(3, Math.round(Math.min(w, h) * 0.006));

  ctx.fillStyle = '#160818';
  ctx.fillRect(0, 0, w, h);

  rects.forEach((frac, i) => {
    const rect = [
      frac[0] * w + (frac[0] > 0 ? gutter / 2 : 0),
      frac[1] * h + (frac[1] > 0 ? gutter / 2 : 0),
      frac[2] * w - (frac[0] > 0 ? gutter / 2 : 0) - (frac[0] + frac[2] < 1 ? gutter / 2 : 0),
      frac[3] * h - (frac[1] > 0 ? gutter / 2 : 0) - (frac[1] + frac[3] < 1 ? gutter / 2 : 0),
    ];
    const panel = state.panels[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = photos[panel.photo];
    if (img) {
      drawPanelPhoto(ctx, img, rect, panel);
    } else {
      // Painted sunset placeholder: gradient sky, sun and palms silhouette.
      const sky = ctx.createLinearGradient(0, rect[1], 0, rect[1] + rect[3]);
      grade.sky.forEach((c, j) => sky.addColorStop(j / (grade.sky.length - 1), c));
      ctx.fillStyle = sky;
      ctx.fillRect(rect[0], rect[1], rect[2], rect[3]);
      ctx.fillStyle = 'rgba(22,8,24,0.85)';
      ctx.beginPath();
      ctx.arc(rect[0] + rect[2] * 0.5, rect[1] + rect[3] * 0.55, rect[2] * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  drawGutters(ctx, w, h, state.layout);

  // Colour grade: two soft washes over everything.
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, grade.wash[0]);
  wash.addColorStop(1, grade.wash[1]);
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'soft-light';
  const warm = ctx.createLinearGradient(0, h, 0, 0);
  warm.addColorStop(0, 'rgba(255,110,60,0.35)');
  warm.addColorStop(1, 'rgba(60,20,120,0.18)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Sunset disc in the hero panel, behind the title block.
  if (state.sun && state.layout !== 'nine' && state.layout !== 'triptych') {
    const hero = [0, 0, w, h * 0.62];
    if (state.layout === 'bleed') hero[3] = h * 0.55;
    drawSun(ctx, w, h, grade, hero);
  }

  drawTitleBlock(ctx, w, h, state, grade);
  drawBadge(ctx, w, h, state);

  if (state.vignette) {
    const v = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10,2,14,0.42)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  if (state.grain) {
    const tile = grainCanvas();
    const pattern = ctx.createPattern(tile, 'repeat');
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
