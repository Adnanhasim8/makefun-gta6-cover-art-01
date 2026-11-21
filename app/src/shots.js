// Fixed scenes for screenshots: ?shot=editor shows the page with sample photos
// loaded and the controls visible; ?shot=cover shows the exported cover alone,
// full frame. Query params pick the scene: layout, size, grade, photo (a sample
// name), title, subtitle and tagline. window.__shotReady is set once painted.
export async function runShot(shot, query, app) {
  const { state, setPhoto, setLayout, setSize, setGrade, redraw } = app;
  if (shot === 'cover') document.body.classList.add('shot-cover');

  const layout = query.get('layout') ?? 'grid';
  const size = query.get('size') ?? '1080x1080';
  const grade = query.get('grade') ?? 'sunset';
  const photo = query.get('photo') ?? 'boulevard';
  const photo2 = query.get('photo2') ?? 'pier';
  const title = query.get('title') ?? 'NEON SHORE';
  const subtitle = query.get('subtitle') ?? 'chasing the sunset';
  const tagline = query.get('tagline') ?? 'SUNSET BOULEVARD · 2026';

  setSize(size);
  setLayout(layout);
  setGrade(grade);
  state.title = title;
  state.subtitle = subtitle;
  state.tagline = tagline;
  document.getElementById('title').value = title;
  document.getElementById('subtitle').value = subtitle;
  document.getElementById('tagline').value = tagline;
  document.querySelector(`[data-layout="${layout}"]`)?.classList.add('active');
  document.querySelector(`[data-size="${size}"]`)?.classList.add('active');
  document.querySelector(`[data-grade="${grade}"]`)?.classList.add('active');

  // Fill the slots with the free samples so every panel has a real photo.
  await setPhoto(0, `samples/${photo}.jpg`);
  await setPhoto(1, `samples/${photo2}.jpg`);
  await setPhoto(2, `samples/${photo}.jpg`);
  // Vary the panels a little so the grid does not repeat one crop.
  state.panels.forEach((panel, i) => {
    panel.photo = i % 2;
    panel.zoom = 1 + (i % 3) * 0.12;
    panel.ox = (i % 2 === 0 ? -0.08 : 0.08) * (i + 1) * 0.4;
    panel.oy = i === 0 ? 0.12 : 0.04;
  });
  redraw();
  // Two frames so fonts, images and the canvas paint have all landed.
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
