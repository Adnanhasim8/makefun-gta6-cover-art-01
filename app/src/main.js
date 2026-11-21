// Vice Coast Cover Studio — wires the editor: photo slots, layout/size/grade
// pickers, per-panel crop and position, caption fields, PNG export and the
// ?shot= scenes the screenshots are taken from. Photos stay on the machine:
// they are read with FileReader/Object URLs and never uploaded anywhere.
import { drawCover, defaultState, panelsForLayout, SIZES, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const sizeLabel = document.getElementById('sizeLabel');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const taglineInput = document.getElementById('tagline');
const zoomInput = document.getElementById('panelZoom');
const photoSelect = document.getElementById('panelPhoto');
const panelHint = document.getElementById('panelHint');

const state = defaultState();
const photos = [null, null, null];
let selectedPanel = 0;
let fontsReady = false;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function resizeCanvas() {
  const [w, h] = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
  sizeLabel.textContent = `${w} × ${h}`;
}

function redraw() {
  drawCover(canvas, photos, state);
}

/** Refreshes the panel editor (zoom slider, photo picker) for the selection. */
function syncPanelControls() {
  const panel = state.panels[selectedPanel];
  if (!panel) return;
  zoomInput.value = String(panel.zoom);
  photoSelect.value = String(panel.photo);
  panelHint.textContent = `Panel ${selectedPanel + 1} of ${state.panels.length} selected — drag it to move the photo, or change its photo and zoom below.`;
}

/** Marks one pick-button active inside its group and clears the others. */
function markActive(container, button) {
  container.querySelectorAll('.pick').forEach((b) => b.classList.toggle('active', b === button));
}

function setLayout(layout) {
  if (!LAYOUTS.includes(layout)) return;
  state.layout = layout;
  state.panels = panelsForLayout(layout, state.panels);
  selectedPanel = 0;
  syncPanelControls();
  redraw();
}

function setSize(size) {
  if (!SIZES[size]) return;
  state.size = size;
  resizeCanvas();
  redraw();
}

function setGrade(grade) {
  if (!GRADES[grade]) return;
  state.grade = grade;
  redraw();
}

// --- Photo slots -----------------------------------------------------------
function showThumb(slot, img) {
  const thumb = document.getElementById(`thumb${slot}`);
  const empty = document.getElementById(`empty${slot}`);
  const label = document.querySelector(`.slot[data-slot="${slot}"]`);
  if (img) {
    thumb.src = img.src;
    thumb.hidden = false;
    empty.hidden = true;
    label.classList.add('has-photo');
  } else {
    thumb.hidden = true;
    empty.hidden = false;
    label.classList.remove('has-photo');
  }
}

async function setPhoto(slot, fileOrUrl) {
  try {
    const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
    const img = await loadImage(url);
    photos[slot] = img;
    showThumb(slot, img);
    redraw();
    return true;
  } catch {
    status.textContent = 'That photo could not be read — try another file.';
    return false;
  }
}

for (let slot = 0; slot < 3; slot++) {
  document.getElementById(`file${slot}`).addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) setPhoto(slot, file);
    e.target.value = '';
  });
}

async function loadSample(name, slot) {
  const ok = await setPhoto(slot, `samples/${name}.jpg`);
  if (ok) status.textContent = `Sample photo loaded into Photo ${slot + 1}.`;
}
document.getElementById('sampleBoulevard').addEventListener('click', () => loadSample('boulevard', 0));
document.getElementById('samplePier').addEventListener('click', () => loadSample('pier', 1));

// --- Layout, size, grade pickers -------------------------------------------
document.getElementById('layouts').addEventListener('click', (e) => {
  const button = e.target.closest('[data-layout]');
  if (!button) return;
  markActive(document.getElementById('layouts'), button);
  setLayout(button.dataset.layout);
});
document.getElementById('sizes').addEventListener('click', (e) => {
  const button = e.target.closest('[data-size]');
  if (!button) return;
  markActive(document.getElementById('sizes'), button);
  setSize(button.dataset.size);
});
document.getElementById('grades').addEventListener('click', (e) => {
  const button = e.target.closest('[data-grade]');
  if (!button) return;
  markActive(document.getElementById('grades'), button);
  setGrade(button.dataset.grade);
});

// --- Selected panel ---------------------------------------------------------
photoSelect.addEventListener('change', () => {
  state.panels[selectedPanel].photo = Number(photoSelect.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[selectedPanel].zoom = Number(zoomInput.value);
  redraw();
});
document.getElementById('panelReset').addEventListener('click', () => {
  state.panels[selectedPanel] = { photo: selectedPanel % 2, zoom: 1, ox: 0, oy: 0 };
  syncPanelControls();
  redraw();
});
document.getElementById('fillAll').addEventListener('click', () => {
  state.panels.forEach((p) => { p.photo = 0; });
  syncPanelControls();
  redraw();
  status.textContent = 'Every panel now uses Photo 1.';
});

function panelIndexAt(x, y) {
  // Recompute the layout rectangles the renderer uses, in canvas pixels.
  const w = canvas.width;
  const h = canvas.height;
  const rects = [];
  if (state.layout === 'bleed') rects.push([0, 0, w, h]);
  else if (state.layout === 'triptych') {
    for (let c = 0; c < 3; c++) rects.push([c * w / 3, 0, w / 3, h]);
  } else if (state.layout === 'nine') {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) rects.push([c * w / 3, r * h / 3, w / 3, h / 3]);
    }
  } else {
    rects.push([0, 0, w, h * 0.62]);
    for (let c = 0; c < 3; c++) rects.push([c * w / 3, h * 0.62, w / 3, h * 0.38]);
  }
  for (let i = 0; i < rects.length; i++) {
    const [rx, ry, rw, rh] = rects[i];
    if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) return i;
  }
  return 0;
}

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const box = canvas.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * canvas.width;
  const y = ((e.clientY - box.top) / box.height) * canvas.height;
  selectedPanel = panelIndexAt(x, y);
  syncPanelControls();
  dragging = { x, y, ox: state.panels[selectedPanel].ox, oy: state.panels[selectedPanel].oy };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const box = canvas.getBoundingClientRect();
  const x = ((e.clientX - box.left) / box.width) * canvas.width;
  const y = ((e.clientY - box.top) / box.height) * canvas.height;
  const panel = state.panels[selectedPanel];
  panel.ox = Math.max(-1, Math.min(1, dragging.ox + ((x - dragging.x) / canvas.width) * 2));
  panel.oy = Math.max(-1, Math.min(1, dragging.oy + ((y - dragging.y) / canvas.height) * 2));
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = null; });
canvas.addEventListener('pointercancel', () => { dragging = null; });

// --- Caption, effects --------------------------------------------------------
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });
document.getElementById('grain').addEventListener('change', (e) => { state.grain = e.target.checked; redraw(); });
document.getElementById('vignette').addEventListener('change', (e) => { state.vignette = e.target.checked; redraw(); });
document.getElementById('sun').addEventListener('change', (e) => { state.sun = e.target.checked; redraw(); });

// --- Shuffle: a random grade + layout, for a one-click fresh cover. ----------
document.getElementById('shuffle').addEventListener('click', () => {
  const grades = Object.keys(GRADES);
  const layouts = LAYOUTS;
  const grade = grades[Math.floor(Math.random() * grades.length)];
  const layout = layouts[Math.floor(Math.random() * layouts.length)];
  document.querySelector(`[data-grade="${grade}"]`).click();
  document.querySelector(`[data-layout="${layout}"]`).click();
  status.textContent = `Shuffled to ${layout} layout with the ${grade} grade.`;
});

// --- Export ------------------------------------------------------------------
document.getElementById('export').addEventListener('click', () => {
  redraw();
  canvas.toBlob((blob) => {
    if (!blob) {
      status.textContent = 'Export failed — try again.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-coast-cover-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-coast-cover-${state.size}.png (${canvas.width} × ${canvas.height}).`;
  }, 'image/png');
});

// --- Boot ----------------------------------------------------------------------
async function boot() {
  resizeCanvas();
  // Load the vendored display fonts, then draw once they are ready so the
  // lettering renders in the right faces instead of a fallback.
  try {
    await Promise.all([
      document.fonts.load('900 100px "CoverDisplay"'),
      document.fonts.load('italic 900 60px "CoverScript"'),
    ]);
    fontsReady = true;
  } catch {
    fontsReady = false;
  }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, { state, photos, setPhoto, setLayout, setSize, setGrade, redraw, loadImage });
  } else {
    // Start with the two free samples so the first paint already looks like a cover.
    await Promise.allSettled([loadSample('boulevard', 0), loadSample('pier', 1)]);
    redraw();
  }
  syncPanelControls();
}

boot();
