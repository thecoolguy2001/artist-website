// Shared by every page. Loaded synchronously right after the background
// <video>, before three.js, so the video starts first and the render
// settings below exist before any WebGLRenderer is created.
(function () {
  /* ---------- 3D render settings ---------- */
  // Resolution comes from a pixel budget rather than a flat cap: phones have
  // small viewports so they can afford ~2x (sharp), while big desktop windows
  // get scaled down. Core counts are only trusted on desktop — iOS
  // under-reports them, which would wrongly blur phones.
  var isTouch = window.matchMedia('(pointer: coarse)').matches;
  var isLowEnd = !isTouch &&
    ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4);
  var budget = isLowEnd ? 1.5e6 : 3.5e6;
  window.SITE_DPR = Math.max(1, Math.min(
    window.devicePixelRatio || 1,
    2,
    Math.sqrt(budget / (window.innerWidth * window.innerHeight))
  ));
  // MSAA is cheap on mobile (tile-based) GPUs; skip it on weak desktops.
  window.SITE_AA = !isLowEnd;

  /* ---------- Background video ---------- */
  // Never show Safari's big play button over the background — if autoplay is
  // blocked the poster frame shows instead until the first touch.
  var css = document.createElement('style');
  css.textContent =
    '#background-video{pointer-events:none}' +
    '#background-video::-webkit-media-controls,' +
    '#background-video::-webkit-media-controls-start-playback-button,' +
    '#background-video::-webkit-media-controls-overlay-play-button' +
    '{display:none!important;-webkit-appearance:none;opacity:0!important}';
  document.head.appendChild(css);

  var v = document.getElementById('background-video');
  if (!v) return;
  v.muted = true;

  // Kick playback immediately; some browsers delay the autoplay attribute
  // while the main thread is busy compiling/uploading the 3D scene.
  function go() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  go();
  v.addEventListener('canplay', go, { once: true });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) go(); });

  // If the browser refused autoplay (e.g. iOS Low Power Mode), start on the
  // visitor's first touch anywhere — swiping or dragging a model counts.
  var events = ['touchstart', 'pointerdown', 'keydown'];
  function onFirstTouch() {
    if (v.paused) go();
    events.forEach(function (t) { window.removeEventListener(t, onFirstTouch, true); });
  }
  events.forEach(function (t) {
    window.addEventListener(t, onFirstTouch, { capture: true, passive: true });
  });
})();
