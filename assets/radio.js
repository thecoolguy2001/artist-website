/*
 * Shared 3D radio widget — Deshaun Walker site.
 *
 * Renders a small procedural Three.js radio in the bottom-right corner of every
 * page (replacing the old static cd.png image). The radio has a full-width LCD
 * screen across the front that scrolls the title of the currently playing song
 * and shows an ON / OFF state; knobs and buttons sit below the screen.
 *
 * Clicking the radio toggles playback of the playlist. Self-contained: injects
 * its own markup + CSS, so a page only needs:  <script src="/assets/radio.js"></script>
 * (Three.js must already be loaded on the page — it is on every page here.)
 *
 * To rename songs, edit TRACKS below.
 */
(function () {
  'use strict';

  if (window.__radioWidgetInit) return;        // guard against double-include
  window.__radioWidgetInit = true;

  // ---- Force the background video to autoplay (runs on every page) ----------
  // Some browsers block autoplay or leave a play-button overlay; nudge it.
  (function ensureBgVideo() {
    function kick() {
      var v = document.getElementById('background-video');
      if (!v) return;
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.removeAttribute('controls');
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    if (document.readyState !== 'loading') kick();
    else document.addEventListener('DOMContentLoaded', kick);
    // retry on the first user interaction in case autoplay was blocked
    var once = { once: true, passive: true };
    ['touchstart', 'pointerdown', 'click', 'scroll'].forEach(function (ev) {
      window.addEventListener(ev, kick, once);
    });
  })();

  if (typeof THREE === 'undefined') {
    console.error('[radio] THREE.js not found — include three.min.js before radio.js');
    return;
  }

  // ---- Playlist -------------------------------------------------------------
  // Add/remove file paths here. The screen label is derived from the file name,
  // so renaming an mp3 to its real song title updates the radio automatically.
  var FILES = [
    '/music/song1.mp3',
    '/music/song2.mp3',
    '/music/song3.mp3'
  ];

  function nameFromFile(src) {
    var stem = src.split('/').pop().replace(/\.[^.]+$/, '');           // strip path + extension
    stem = stem.replace(/[_-]+/g, ' ').replace(/([A-Za-z])(\d)/g, '$1 $2').trim();
    return stem.replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || 'Untitled';
  }

  var TRACKS = FILES.map(function (src) { return { src: src, title: nameFromFile(src) }; });

  var current = 0;
  var isOn = false;
  var announcement = null;   // when set, the screen shows this title (e.g. easter-egg)

  var audio = new Audio();
  audio.src = TRACKS[current].src;
  audio.loop = false;
  audio.preload = 'none';

  audio.addEventListener('ended', function () {
    var next = Math.floor(Math.random() * TRACKS.length);
    if (TRACKS.length > 1) {
      while (next === current) next = Math.floor(Math.random() * TRACKS.length);
    }
    current = next;
    audio.src = TRACKS[current].src;
    audio.play().catch(function (e) { console.error('[radio] play error', e); });
    resetScroll();
  });

  // ---- Styles + container element ------------------------------------------
  var style = document.createElement('style');
  style.textContent =
    '#radio-widget{position:fixed;right:14px;bottom:10px;z-index:5;width:150px;height:120px;' +
    'cursor:pointer;-webkit-tap-highlight-color:transparent;filter:drop-shadow(0 10px 18px rgba(0,0,0,.45));' +
    'transition:transform .25s ease}' +
    '#radio-widget:hover{transform:translateY(-2px) scale(1.03)}' +
    '#radio-widget canvas{width:100%!important;height:100%!important;display:block}' +
    '@media (max-width:768px){#radio-widget{width:108px;height:88px;right:14px;bottom:14px}}' +
    // styled hover tooltip (same look as the old CD tooltip)
    '#radio-tooltip{position:fixed;padding:8px 12px;background:rgba(0,0,0,.8);color:#fff;' +
    'border-radius:4px;font-family:sans-serif;font-size:.9em;pointer-events:none;opacity:0;' +
    'white-space:nowrap;z-index:10;transition:opacity .2s ease-in-out}' +
    '@media (max-width:768px){#radio-tooltip{display:none}}';
  document.head.appendChild(style);

  var container = document.createElement('div');
  container.id = 'radio-widget';
  container.setAttribute('role', 'button');
  container.setAttribute('aria-label', 'Toggle radio');

  // Styled hover tooltip ("Radio On" / "Radio Off"), replacing the old CD tooltip.
  var tooltip = document.createElement('div');
  tooltip.id = 'radio-tooltip';
  tooltip.textContent = 'Radio Off';

  function tooltipLabel() { return isOn ? 'Radio On' : 'Radio Off'; }
  function positionTooltip(e) {
    var tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
    var x = e.clientX + 12, y = e.clientY - th - 10;
    if (x + tw > window.innerWidth) x = e.clientX - tw - 12;
    if (y < 0) y = e.clientY + 12;
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
  function showTooltip(e) { tooltip.textContent = tooltipLabel(); tooltip.style.opacity = '1'; positionTooltip(e); }
  function moveTooltip(e) { if (tooltip.style.opacity === '1') positionTooltip(e); }
  function hideTooltip() { tooltip.style.opacity = '0'; }

  // ---- LCD screen (canvas texture) -----------------------------------------
  var SCREEN_W = 320, SCREEN_H = 96;
  var screenCanvas = document.createElement('canvas');
  screenCanvas.width = SCREEN_W;
  screenCanvas.height = SCREEN_H;
  var sctx = screenCanvas.getContext('2d');
  var screenTexture = new THREE.CanvasTexture(screenCanvas);
  screenTexture.minFilter = THREE.LinearFilter;
  screenTexture.generateMipmaps = false;

  var scrollX = SCREEN_W;        // marquee position
  var GAP = 60;                  // px gap between repeated marquee copies

  function resetScroll() { scrollX = SCREEN_W; }

  function drawScreen() {
    var on = isOn || !!announcement;
    // LCD backing
    sctx.fillStyle = on ? '#0c1f12' : '#0a140d';
    sctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    // inner bezel glow
    sctx.strokeStyle = on ? 'rgba(124,252,0,.25)' : 'rgba(124,252,0,.06)';
    sctx.lineWidth = 4;
    sctx.strokeRect(2, 2, SCREEN_W - 4, SCREEN_H - 4);

    var lit = on ? '#8dff5a' : '#274d31';

    // top status row
    sctx.fillStyle = on ? '#39ff14' : '#274d31';
    sctx.beginPath();
    sctx.arc(20, 22, 7, 0, Math.PI * 2);
    sctx.fill();
    sctx.fillStyle = lit;
    sctx.font = 'bold 22px "Courier New", monospace';
    sctx.textBaseline = 'middle';
    sctx.textAlign = 'left';
    sctx.fillText(on ? 'ON' : 'OFF', 36, 23);
    sctx.textAlign = 'right';
    sctx.fillText('FM', SCREEN_W - 16, 23);
    sctx.textAlign = 'left';

    // scrolling marquee of the song title
    var label = announcement
      ? ('NOW PLAYING  ' + announcement)
      : (isOn ? ('NOW PLAYING  ' + TRACKS[current].title) : 'RADIO  OFF');
    sctx.font = 'bold 30px "Courier New", monospace';
    var textW = sctx.measureText(label).width;
    var y = 66;
    sctx.fillStyle = lit;
    if (on) {
      var x = scrollX;
      while (x < SCREEN_W) {
        sctx.fillText(label, x, y);
        x += textW + GAP;
      }
      scrollX -= 1.4;
      if (scrollX <= -(textW + GAP)) scrollX += textW + GAP;
    } else {
      sctx.fillText(label, (SCREEN_W - textW) / 2, y);   // static, centered
    }
    screenTexture.needsUpdate = true;
  }

  // ---- Radio model ---------------------------------------------------------
  function buildRadio() {
    var g = new THREE.Group();

    var FRONT = 0.31;   // z of the body's front face

    var bodyMat   = new THREE.MeshStandardMaterial({ color: 0x26282c, roughness: 0.55, metalness: 0.35 });
    var darkMat   = new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.75, metalness: 0.2 });
    var panelMat  = new THREE.MeshStandardMaterial({ color: 0x1b1d20, roughness: 0.8, metalness: 0.15 });
    var metalMat  = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.85 });
    var btnMat    = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.45, metalness: 0.5 });
    var accentMat = new THREE.MeshStandardMaterial({ color: 0xe0762f, roughness: 0.5, metalness: 0.3 });
    var liteMat   = new THREE.MeshStandardMaterial({ color: 0xff5a3c, roughness: 0.4, metalness: 0.2, emissive: 0x551500 });

    // body (taller so screen + control panel both have room)
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2.7, 2.2, 0.6), bodyMat));

    // ---- screen: full-width LCD across the top ----
    var bezel = new THREE.Mesh(new THREE.BoxGeometry(2.46, 0.8, 0.06), darkMat);
    bezel.position.set(0, 0.62, FRONT);
    g.add(bezel);
    var screenMat = new THREE.MeshBasicMaterial({ map: screenTexture });
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(2.34, 0.68), screenMat);
    screen.position.set(0, 0.62, FRONT + 0.035);
    g.add(screen);

    // ---- recessed control panel below the screen ----
    var panel = new THREE.Mesh(new THREE.BoxGeometry(2.46, 1.0, 0.05), panelMat);
    panel.position.set(0, -0.42, FRONT - 0.01);
    g.add(panel);

    // grid of buttons on the left (a couple accented like a real keypad)
    var btnGeo = new THREE.BoxGeometry(0.24, 0.16, 0.09);
    var cols = [-1.02, -0.66, -0.30];
    var rows = [-0.08, -0.42, -0.76];
    for (var r = 0; r < rows.length; r++) {
      for (var c = 0; c < cols.length; c++) {
        var mat = (r === 0 && c === 2) ? accentMat : btnMat;
        var btn = new THREE.Mesh(btnGeo, mat);
        btn.position.set(cols[c], rows[r], FRONT + 0.04);
        g.add(btn);
      }
    }

    // big tuning dial on the right with an indicator notch + centre cap
    var dial = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 32), metalMat);
    dial.rotation.x = Math.PI / 2;           // circular face toward the viewer
    dial.position.set(0.66, -0.30, FRONT + 0.02);
    g.add(dial);
    var dialCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 24), darkMat);
    dialCap.rotation.x = Math.PI / 2;
    dialCap.position.set(0.66, -0.30, FRONT + 0.06);
    g.add(dialCap);
    var notch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.06), liteMat);
    notch.position.set(0.66, -0.06, FRONT + 0.12);
    g.add(notch);

    // smaller volume knob bottom-right + a power LED
    var vol = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 24), metalMat);
    vol.rotation.x = Math.PI / 2;
    vol.position.set(0.66, -0.82, FRONT + 0.02);
    g.add(vol);
    var led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 16), liteMat);
    led.position.set(0.15, -0.1, FRONT + 0.05);
    g.add(led);

    // telescoping antenna (top-left, tilted)
    var antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.03, 1.5, 12), metalMat);
    antenna.position.set(-0.95, 1.6, -0.1);
    antenna.rotation.z = 0.32;
    g.add(antenna);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), metalMat);
    tip.position.set(-1.41, 2.28, -0.1);
    g.add(tip);

    return g;
  }

  // ---- Three.js scene ------------------------------------------------------
  var scene, camera, renderer, radio, baseTime = 0;

  function init() {
    var w = container.clientWidth, h = container.clientHeight;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(0, 0.1, 7.4);
    camera.lookAt(0, 0.05, 0);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    var key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(2, 3, 4);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x88aaff, 0.5);
    rim.position.set(-3, 1, -2);
    scene.add(rim);

    radio = buildRadio();
    scene.add(radio);

    container.addEventListener('click', toggle);
    container.addEventListener('mouseenter', showTooltip);
    container.addEventListener('mousemove', moveTooltip);
    container.addEventListener('mouseleave', hideTooltip);
    window.addEventListener('resize', onResize);

    animate();
  }

  function onResize() {
    if (!renderer) return;
    var w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    requestAnimationFrame(animate);
    baseTime += 0.016;
    if (radio) {
      if (isOn || announcement) {
        // playing: the radio actively rocks on its axis + bobs to the beat
        radio.rotation.y = Math.sin(baseTime * 1.7) * 0.45;
        radio.rotation.z = Math.sin(baseTime * 1.3) * 0.07;
        radio.position.y = Math.abs(Math.sin(baseTime * 3.2)) * 0.08;
      } else {
        // idle: settle upright with a gentle sway
        radio.rotation.y += (Math.sin(baseTime * 0.5) * 0.14 - radio.rotation.y) * 0.06;
        radio.rotation.z += (0 - radio.rotation.z) * 0.06;
        radio.position.y = Math.sin(baseTime * 1.0) * 0.04;
      }
    }
    drawScreen();
    if (renderer) renderer.render(scene, camera);
  }

  // ---- Playback toggle ------------------------------------------------------
  function toggle() {
    if (isOn) {
      audio.pause();
      isOn = false;
      if (tooltip.style.opacity === '1') tooltip.textContent = tooltipLabel();
    } else {
      audio.play().then(function () {
        isOn = true;
        if (tooltip.style.opacity === '1') tooltip.textContent = tooltipLabel();
        resetScroll();
      }).catch(function (e) {
        console.error('[radio] play error', e);
      });
    }
  }

  // ---- Public API (used by the home-page easter egg) -----------------------
  // announce(): light the screen up as "NOW PLAYING <title>" without using the
  // radio's own playlist (audio comes from the easter-egg video). clear() reverts.
  window.RadioWidget = {
    announce: function (title) {
      announcement = String(title || '');
      isOn = false;
      try { audio.pause(); } catch (e) {}
      resetScroll();
    },
    clear: function () {
      announcement = null;
      resetScroll();
    }
  };

  // ---- Mount (everything above is now defined/assigned) --------------------
  function mount() {
    document.body.appendChild(container);
    document.body.appendChild(tooltip);
    init();
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
