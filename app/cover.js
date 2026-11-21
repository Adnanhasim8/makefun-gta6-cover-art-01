// Vice Coast Cover Studio — cover render engine.
// Draws a multi-panel GTA-poster-style cover onto any 2D canvas context.
// Pure rendering: no DOM reads, no network. Deterministic: the grain uses a
// seeded generator, so the same state always paints the same pixels.

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = {
  vice: { label: 'Vice Grid', panels: 4, hint: 'Hero photo left, three stacked right' },
  quad: { label: 'Four Up', panels: 4, hint: 'Four equal panels' },
  bleed: { label: 'Full Bleed', panels: 3, hint: 'One photo edge to edge, two snapshots' },
};

export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    filter: 'saturate(1.25) contrast(1.08) brightness(1.02)',
    stops: [[0, 'rgba(255,122,26,0.20)'], [0.55, 'rgba(255,64,120,0.10)'], [1, 'rgba(64,32,120,0.22)']],
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.35) contrast(1.12) brightness(0.96)',
    stops: [[0, 'rgba(255,0,160,0.22)'], [0.5, 'rgba(120,0,180,0.10)'], [1, 'rgba(0,220,255,0.20)']],
  },
  teal: {
    label: 'Teal Coast',
    filter: 'saturate(1.15) contrast(1.05)',
    stops: [[0, 'rgba(0,200,190,0.16)'], [1, 'rgba(0,60,110,0.24)']],
  },
  noir: {
    label: 'Noir',
    filter: 'saturate(0.15) contrast(1.18) brightness(1.0)',
    stops: [[0, 'rgba(255,255,255,0.05)'], [1, 'rgba(0,0,0,0.30)']],
  },
};

/** Small seeded generator so the grain is identical on every render. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Panel rectangles for a layout, in fractions of the cover size. */
export function panelRects(layout, w, h) {
  const f = Math.round(Math.min(w, h) * 0.028); // outer frame
  const g = Math.round(Math.min(w, h) * 0.014); // gutter
  const inner = { x: f, y: f, w: w - 2 * f, h: h - 2 * f };
  if (layout === 'quad') {
    const pw = (inner.w - g) / 2;
    const ph = (inner.h - g) / 2;
    return [
      { x: inner.x, y: inner.y, w: pw, h: ph },
      { x: inner.x + pw + g, y: inner.y, w: pw, h: ph },
      { x: inner.x, y: inner.y + ph + g, w: pw, h: ph },
      { x: inner.x + pw + g, y: inner.y + ph + g, w: pw, h: ph },
    ];
  }
  if (layout === 'bleed') {
    const sw = w * 0.30;
    const sh = sw * 0.78;
    return [
      { x: 0, y: 0, w, h, full: true },
      { x: w * 0.055, y: h * 0.055, w: sw, h: sh, tilt: -0.045 },
      { x: w * 0.645, y: h * 0.10, w: sw, h: sh, tilt: 0.05 },
    ];
  }
  // vice: hero left, three stacked right
  const heroW = inner.w * 0.60;
  const sideX = inner.x + heroW + g;
  const sideW = inner.w - heroW - g;
  const ph = (inner.h - 2 * g) / 3;
  return [
    { x: inner.x, y: inner.y, w: heroW, h: inner.h },
    { x: sideX, y: inner.y, w: sideW, h: ph },
    { x: sideX, y: inner.y + ph + g, w: sideW, h: ph },
    { x: sideX, y: inner.y + 2 * (ph + g), w: sideW, h: ph },
  ];
}

/** Paint one photo into a panel rect with cover-fit, zoom and pan offsets. */
export function paintPanel(ctx, img, rect, zoom, ox, oy) {
  ctx.save();
  if (rect.tilt) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.tilt);
    ctx.translate(-rect.w / 2, -rect.h / 2);
    ctx.translate(-rect.x, -rect.y);
  }
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (!img) {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, '#2b1d3a');
    grad.addColorStop(1, '#120a1e');
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
    return;
  }
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  const dx = rect.x + (rect.w - dw) / 2 + ox * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + oy * rect.h;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

/** A thin white inner border around a panel, poster style. */
function panelBorder(ctx, rect, width, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (rect.tilt) {
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.rotate(rect.tilt);
    ctx.strokeRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
  } else {
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

function applyGrade(ctx, w, h, grade) {
  const grad = ctx.createLinearGradient(0, 0, w * 0.25, h);
  for (const [stop, color] of grade.stops) grad.addColorStop(stop, color);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function addGrain(ctx, w, h, amount, seed) {
  if (amount <= 0) return;
  const rand = mulberry32(seed);
  const count = Math.floor(w * h * amount * 0.00012);
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.globalAlpha = 0.05 + rand() * 0.10;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

function addVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.42,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(10,4,20,0.42)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (px > 24 && ctx.measureText(text).width > maxWidth) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

function drawTitleBlock(ctx, w, h, opts) {
  const pad = Math.round(w * 0.045);
  const bandH = Math.round(h * 0.30);
  const bandY = h - bandH;
  // dark scrim so the lettering reads over any photo
  const scrim = ctx.createLinearGradient(0, bandY - bandH * 0.35, 0, h);
  scrim.addColorStop(0, 'rgba(12,4,24,0)');
  scrim.addColorStop(0.45, 'rgba(12,4,24,0.55)');
  scrim.addColorStop(1, 'rgba(12,4,24,0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - bandH * 0.35, w, h - (bandY - bandH * 0.35));

  const title = (opts.title || 'VICE COAST').toUpperCase();
  const titlePx = fitFont(ctx, title, w - 2 * pad, Math.round(w * 0.115), 'Anton, sans-serif', 400);
  const titleY = h - Math.round(h * 0.085);
  // sunset gradient fill with a dark outline
  const fill = ctx.createLinearGradient(0, titleY - titlePx, 0, titleY + titlePx * 0.12);
  fill.addColorStop(0, '#fff7d6');
  fill.addColorStop(0.45, '#ffb347');
  fill.addColorStop(1, '#ff4d8d');
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(16,4,28,0.92)';
  ctx.lineWidth = Math.max(3, titlePx * 0.09);
  ctx.strokeText(title, pad, titleY);
  ctx.fillStyle = fill;
  ctx.fillText(title, pad, titleY);
  ctx.restore();

  // script subtitle in neon pink
  if (opts.subtitle) {
    const subPx = Math.round(w * 0.042);
    ctx.save();
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.fillStyle = '#ff7ad9';
    ctx.shadowColor = 'rgba(255,0,160,0.9)';
    ctx.shadowBlur = Math.round(w * 0.012);
    ctx.fillText(opts.subtitle, pad + 4, titleY - titlePx * 1.02);
    ctx.restore();
  }

  // badge ribbon, top right of the band
  if (opts.badge) {
    const badgePx = Math.round(w * 0.026);
    ctx.save();
    ctx.font = `400 ${badgePx}px Anton, sans-serif`;
    const bw = ctx.measureText(opts.badge).width + badgePx * 1.6;
    const bh = badgePx * 1.9;
    const bx = w - pad - bw;
    const by = bandY + Math.round(h * 0.02);
    ctx.fillStyle = '#ff2e88';
    roundRectPath(ctx, bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.badge, bx + badgePx * 0.8, by + bh / 2 + badgePx * 0.06);
    ctx.restore();
  }

  // star heat meter under the title
  if (opts.stars > 0) {
    const starPx = Math.round(w * 0.032);
    ctx.save();
    ctx.font = `${starPx}px sans-serif`;
    ctx.fillStyle = '#ffd94d';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < opts.stars ? '★' : '☆';
    ctx.fillText(stars, pad + 2, titleY + starPx * 1.15);
    ctx.restore();
  }
  ctx.textBaseline = 'alphabetic';
}

/**
 * Render a full cover. `opts`:
 *   photos: array of HTMLImageElement | null (indexed by panel photo slot)
 *   panels: [{ photo, zoom, ox, oy }] — one per layout panel
 *   layout, grade, title, subtitle, badge, stars, frame, grain
 * The canvas must already be sized to the target cover size.
 */
export function renderCover(ctx, w, h, opts) {
  const grade = GRADES[opts.grade] || GRADES.sunset;
  const rects = panelRects(opts.layout, w, h);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0e0716';
  ctx.fillRect(0, 0, w, h);

  const savedFilter = ctx.filter;
  ctx.filter = grade.filter;
  rects.forEach((rect, i) => {
    const panel = opts.panels[i] || { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const img = opts.photos[panel.photo] ?? null;
    paintPanel(ctx, img, rect, panel.zoom, panel.ox, panel.oy);
  });
  ctx.filter = savedFilter;

  applyGrade(ctx, w, h, grade);

  // white gutters + frame
  if (opts.frame) {
    const fw = Math.round(Math.min(w, h) * 0.028);
    ctx.strokeStyle = '#f7f2ea';
    ctx.lineWidth = fw;
    ctx.strokeRect(fw / 2, fw / 2, w - fw, h - fw);
    const gw = Math.max(2, Math.round(Math.min(w, h) * 0.014));
    rects.forEach((rect) => {
      if (!rect.full) panelBorder(ctx, rect, gw, '#f7f2ea');
    });
  }

  drawTitleBlock(ctx, w, h, opts);
  addVignette(ctx, w, h);
  addGrain(ctx, w, h, opts.grain ?? 0.5, 1337);
}
