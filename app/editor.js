// Vice Coast Cover Studio — editor.
// Owns the page state, photo loading, panel picking, drag-to-pan, zoom and PNG
// export. All drawing goes through renderCover() in cover.js. Photos are read
// on this machine only and never uploaded anywhere.

import { SIZES, LAYOUTS, GRADES, renderCover, panelRects } from './cover.js';

const SAMPLE_PHOTOS = [
  'samples/sample-sunset.jpg',
  'samples/sample-neon.jpg',
  'samples/sample-pier.jpg',
];

const PANEL_NAMES = {
  vice: ['Hero', 'Top', 'Middle', 'Bottom'],
  quad: ['Top left', 'Top right', 'Bottom left', 'Bottom right'],
  bleed: ['Backdrop', 'Snapshot 1', 'Snapshot 2'],
};

const params = new URLSearchParams(location.search);
const SHOT_MODE = params.get('shot') === 'cover';

const state = {
  size: params.get('size') in SIZES ? params.get('size') : 'wide',
  layout: params.get('layout') in LAYOUTS ? params.get('layout') : 'vice',
  grade: params.get('grade') in GRADES ? params.get('grade') : 'sunset',
  title: params.get('title') || 'NEON SHORE',
  subtitle: params.get('subtitle') || 'vice coast nights',
  badge: params.get('badge') || 'VICE COAST',
  stars: 5,
  frame: true,
  grain: 0.5,
  photos: [], // { name, img, url }
  panels: [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 2, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
  ],
  selectedPanel: 0,
  selectedPhoto: 0,
};

const $ = (id) => document.getElementById(id);
const canvas = $('previewCanvas');
const ctx = canvas.getContext('2d');

function previewSize() {
  const size = SIZES[state.size];
  const long = 960;
  if (size.w >= size.h) return { w: long, h: Math.round((long * size.h) / size.w) };
  return { w: Math.round((long * size.w) / size.h), h: long };
}

function renderPreview() {
  const { w, h } = previewSize();
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(ctx, w, h, {
    photos: state.photos.map((p) => p.img),
    panels: state.panels,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    stars: state.stars,
    frame: state.frame,
    grain: state.grain,
  });
  const size = SIZES[state.size];
  $('sizeLabel').textContent = `${size.label} · ${LAYOUTS[state.layout].label} · ${GRADES[state.grade].label}`;
  $('statusLabel').textContent =
    state.photos.length === 0
      ? 'Add a photo to begin'
      : `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — panel ${PANEL_NAMES[state.layout][state.selectedPanel] || state.selectedPanel + 1} selected`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSamples() {
  for (const src of SAMPLE_PHOTOS) {
    if (state.photos.some((p) => p.url === src)) continue;
    const img = await loadImage(src);
    state.photos.push({ name: src.split('/').pop(), img, url: src });
  }
  refreshTray();
  renderPreview();
}

function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (files.length === 0) return;
  let loaded = 0;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    loadImage(url)
      .then((img) => {
        state.photos.push({ name: file.name, img, url });
        loaded++;
        if (loaded === files.length) {
          refreshTray();
          renderPreview();
        }
      })
      .catch(() => URL.revokeObjectURL(url));
  }
}

function refreshTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'thumb';
    thumb.src = photo.url;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    if (i === state.selectedPhoto) thumb.classList.add('selected');
    const used = state.panels.some((p) => p.photo === i);
    if (used) thumb.classList.add('assigned');
    thumb.addEventListener('click', () => {
      state.selectedPhoto = i;
      state.panels[state.selectedPanel].photo = i;
      refreshTray();
      renderPreview();
    });
    tray.appendChild(thumb);
  });
}

function buildButtons(container, entries, current, onPick) {
  const box = $(container);
  box.innerHTML = '';
  for (const [key, value] of Object.entries(entries)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill' + (key === current ? ' active' : '');
    btn.textContent = value.label;
    if (value.hint) {
      const hint = document.createElement('small');
      hint.textContent = value.hint;
      btn.appendChild(hint);
    }
    btn.addEventListener('click', () => onPick(key));
    box.appendChild(btn);
  }
}

function buildPanelChips() {
  const box = $('panelChips');
  box.innerHTML = '';
  const count = LAYOUTS[state.layout].panels;
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill' + (i === state.selectedPanel ? ' active' : '');
    btn.textContent = PANEL_NAMES[state.layout][i] || `Panel ${i + 1}`;
    btn.addEventListener('click', () => {
      state.selectedPanel = i;
      syncZoomSlider();
      buildPanelChips();
      renderPreview();
    });
    box.appendChild(btn);
  }
}

function syncZoomSlider() {
  $('zoomInput').value = String(state.panels[state.selectedPanel].zoom);
}

function syncControls() {
  buildButtons('layoutBtns', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    state.selectedPanel = 0;
    syncControls();
    renderPreview();
  });
  buildButtons('sizeBtns', SIZES, state.size, (key) => {
    state.size = key;
    renderPreview();
  });
  buildButtons('gradeBtns', GRADES, state.grade, (key) => {
    state.grade = key;
    renderPreview();
  });
  buildPanelChips();
  syncZoomSlider();
}

// ---- pointer: click a panel to select it, drag to pan, wheel to zoom ----
function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function hitPanel(point) {
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (event) => {
  const point = canvasPoint(event);
  const hit = hitPanel(point);
  if (hit < 0) return;
  state.selectedPanel = hit;
  buildPanelChips();
  syncZoomSlider();
  canvas.setPointerCapture(event.pointerId);
  drag = { x: point.x, y: point.y, moved: false };
  canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', (event) => {
  if (!drag) return;
  const point = canvasPoint(event);
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  const rect = rects[state.selectedPanel];
  const panel = state.panels[state.selectedPanel];
  const dx = (point.x - drag.x) / rect.w;
  const dy = (point.y - drag.y) / rect.h;
  if (Math.abs(dx) + Math.abs(dy) > 0.002) drag.moved = true;
  panel.ox = Math.max(-0.5, Math.min(0.5, panel.ox + dx));
  panel.oy = Math.max(-0.5, Math.min(0.5, panel.oy + dy));
  drag = { x: point.x, y: point.y, moved: drag.moved };
  renderPreview();
});
canvas.addEventListener('pointerup', () => {
  drag = null;
  canvas.classList.remove('dragging');
});
canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const panel = state.panels[state.selectedPanel];
  const next = panel.zoom * (event.deltaY < 0 ? 1.08 : 0.93);
  panel.zoom = Math.max(1, Math.min(2.5, next));
  syncZoomSlider();
  renderPreview();
}, { passive: false });

// ---- export ----
async function exportPng() {
  await document.fonts.ready;
  const size = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off.getContext('2d'), size.w, size.h, {
    photos: state.photos.map((p) => p.img),
    panels: state.panels,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    stars: state.stars,
    frame: state.frame,
    grain: state.grain,
  });
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vice-coast-cover-${state.size}-${size.w}x${size.h}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  $('statusLabel').textContent = `Exported ${size.w} x ${size.h} PNG`;
}

// ---- wiring ----
$('photoInput').addEventListener('change', (event) => {
  addFiles(event.target.files);
  event.target.value = '';
});
$('sampleBtn').addEventListener('click', () => loadSamples().catch(() => {}));
$('exportBtn').addEventListener('click', () => exportPng().catch(() => {}));
$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; renderPreview(); });
$('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; renderPreview(); });
$('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; renderPreview(); });
$('starsInput').addEventListener('change', (e) => { state.stars = Number(e.target.value); renderPreview(); });
$('frameInput').addEventListener('change', (e) => { state.frame = e.target.checked; renderPreview(); });
$('grainInput').addEventListener('input', (e) => { state.grain = Number(e.target.value); renderPreview(); });
$('zoomInput').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].zoom = Number(e.target.value);
  renderPreview();
});
$('fillAllBtn').addEventListener('click', () => {
  const photo = state.panels[state.selectedPanel].photo;
  state.panels.forEach((p) => { p.photo = photo; });
  refreshTray();
  renderPreview();
});
$('resetBtn').addEventListener('click', () => {
  const panel = state.panels[state.selectedPanel];
  panel.zoom = 1;
  panel.ox = 0;
  panel.oy = 0;
  syncZoomSlider();
  renderPreview();
});

// ---- shot mode: full-frame cover render for screenshots ----
async function shotMode() {
  document.body.innerHTML = '';
  document.body.style.margin = '0';
  document.body.style.background = '#0e0716';
  const shot = document.createElement('canvas');
  shot.id = 'shotCanvas';
  // Exact pixel size from the URL (?w=1280&h=720) so a headless screenshot
  // captures the cover edge to edge, whatever the window chrome is.
  shot.width = Number(params.get('w') || innerWidth);
  shot.height = Number(params.get('h') || innerHeight);
  shot.style.display = 'block';
  document.body.appendChild(shot);
  await document.fonts.load('400 100px Anton');
  await document.fonts.load('400 60px Pacifico');
  await document.fonts.ready;
  await loadSamplesForShot();
  renderCover(shot.getContext('2d'), shot.width, shot.height, {
    photos: state.photos.map((p) => p.img),
    panels: state.panels,
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    stars: state.stars,
    frame: true,
    grain: 0.5,
  });
  document.title = 'shot-ready';
}

async function loadSamplesForShot() {
  for (const src of SAMPLE_PHOTOS) {
    const img = await loadImage(src);
    state.photos.push({ name: src.split('/').pop(), img, url: src });
  }
}

// ---- boot ----
(async function boot() {
  await document.fonts.load('400 100px Anton');
  await document.fonts.load('400 60px Pacifico');
  await document.fonts.ready;
  if (SHOT_MODE) {
    await shotMode();
    return;
  }
  syncControls();
  renderPreview();
  if (params.get('demo') === '1') {
    await loadSamples().catch(() => {});
  }
})();
