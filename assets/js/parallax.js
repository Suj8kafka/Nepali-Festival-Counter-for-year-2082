/* Pronounced distant parallax; the near ridge stays locked to the grounded city. */
(() => {
  'use strict';
  const scene = document.getElementById('home');
  if (!scene) return;
  const toggle = document.getElementById('motion-toggle');
  const label = document.getElementById('motion-label');
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const planes = [...scene.querySelectorAll('[data-depth]')].map(element => ({
    element, depth: Number(element.dataset.depth),
  }));
  let visiblePlanes = [];
  let paused = preference.matches;
  let ready = false;
  let inView = true;
  let frame = 0;
  let lastTime = 0;
  let height = 0;
  let origin = 0;
  let camera = 0;
  let target = 0;
  let displayed = 0;

  function readTarget() {
    camera = window.scrollY - origin;
    const next = Math.max(0, Math.min(camera, height));
    // Large anchor or scrollbar jumps should land immediately, without a long drift.
    if (Math.abs(next - target) > height * .55) { displayed = next; lastTime = 0; }
    target = next;
  }
  function draw() {
    // Give distant scenery a clear depth separation. The near ridge has its own
    // low depth value so the city never overtakes the terrain supporting it.
    const travel = displayed * .8;
    for (const { element, depth } of visiblePlanes) {
      element.style.transform = `translate3d(0, ${-camera + travel * depth}px, 0)`;
    }
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }
  function tick(time) {
    frame = 0;
    if (paused || !ready || !inView || document.hidden) { lastTime = 0; return; }
    const elapsed = lastTime ? Math.min(time - lastTime, 48) : 1000 / 60;
    lastTime = time;
    // Time-based easing behaves consistently at 60, 90, 120, and 144 Hz.
    displayed += (target - displayed) * (1 - Math.exp(-elapsed / 72));
    const settled = Math.abs(target - displayed) < .025;
    if (settled) displayed = target;
    draw();
    if (!settled) frame = requestAnimationFrame(tick);
    else lastTime = 0;
  }
  function schedule() {
    if (!frame && ready && !paused && inView && !document.hidden) {
      frame = requestAnimationFrame(tick);
    }
  }
  function measure() {
    // Layout and visibility reads happen only at setup or viewport changes.
    height = scene.offsetHeight;
    origin = scene.getBoundingClientRect().top + window.scrollY;
    scene.style.setProperty('--scene-height', `${height}px`);
    visiblePlanes = planes.filter(({ element }) => getComputedStyle(element).display !== 'none');
    for (const { element } of planes) element.style.transform = '';
    readTarget();
    displayed = target;
    if (ready && !paused) draw();
  }
  function setPaused(value) {
    paused = value;
    stop();
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Enable landscape motion' : 'Pause landscape motion');
    label.textContent = paused ? 'Enable motion' : 'Pause motion';
    toggle.querySelector('.pause-mark').textContent = paused ? '\u25b7' : '\u2161';
    scene.classList.toggle('motion-active', ready && !paused);
    if (paused) {
      for (const { element } of planes) element.style.transform = '';
    } else {
      readTarget();
      displayed = target;
      if (ready) draw();
    }
  }
  toggle.addEventListener('click', () => setPaused(!paused));
  preference.addEventListener('change', event => setPaused(event.matches));
  window.addEventListener('scroll', () => { readTarget(); schedule(); }, { passive: true });
  window.addEventListener('resize', () => { stop(); measure(); schedule(); }, { passive: true });
  window.addEventListener('pageshow', () => { measure(); schedule(); });
  document.addEventListener('visibilitychange', () => {
    stop();
    if (!document.hidden) { readTarget(); displayed = target; if (!paused && ready) draw(); }
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      scene.classList.toggle('scene-visible', inView);
      stop();
      if (inView) { readTarget(); displayed = target; if (!paused && ready) draw(); }
    }).observe(scene);
  }
  scene.classList.add('scene-visible');
  measure();
  setPaused(paused);
  // Decode the vector layers before promoting them, avoiding first-scroll raster work.
  Promise.allSettled([...scene.querySelectorAll('img')].map(image => image.decode())).then(() => {
    ready = true;
    measure();
    setPaused(paused);
  });
})();
