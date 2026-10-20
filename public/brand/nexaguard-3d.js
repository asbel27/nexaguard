/* =====================================================
   NexaGuard 3D WebGL Holographic Engine (Three.js)
   Exact clone of nexaguards.com 3D Cyber Shield
   ===================================================== */
(function() {
  'use strict';

  var $ = function(s) { return document.querySelector(s); };
  var $$ = function(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var clamp = function(v, min, max) { return Math.max(min !== undefined ? min : 0, Math.min(max !== undefined ? max : 1, v)); };
  var lerp = function(a, b, t) { return a + (b - a) * t; };
  var ease = function(t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; };

  var VW = window.innerWidth, VH = window.innerHeight;
  var mouse = { x: 0, y: 0 };
  var vel = 0, lastY = window.scrollY || 0;

  window.addEventListener('resize', function() {
    VW = window.innerWidth;
    VH = window.innerHeight;
    if (scene && scene.resize) scene.resize(VW, VH);
  });

  window.addEventListener('mousemove', function(e) {
    mouse.x = (e.clientX / VW) * 2 - 1;
    mouse.y = -(e.clientY / VH) * 2 + 1;
  });

  function curSec() {
    var y = window.scrollY || 0;
    if (y < 400) return 'hero';
    if (y < 1200) return 'sintomas';
    if (y < 2200) return 'servicios';
    return 'planes';
  }

  function makeScene() {
  var T = window.THREE;
  if (!T) return null;
  var canvas = $('#gl'), renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  renderer.setClearColor(0x000000, 0);

  var scene = new T.Scene();
  var cam = new T.PerspectiveCamera(42, 1, .1, 120);
  cam.position.set(0, 0, 8.6);

  var RED = 0xff4560, YEL = 0xffcf33, BLU = 0x7d9dff, GRN = 0x3de8a4;
  scene.add(new T.AmbientLight(0x9fb2ff, .75));
  var keyL = new T.PointLight(0xbfd0ff, 2.4, 40); keyL.position.set(4, 4, 7); scene.add(keyL);
  var rimL = new T.PointLight(RED, 2.8, 40); rimL.position.set(-5, -2, 3); scene.add(rimL);
  var fillL = new T.DirectionalLight(0x6b8cff, .7); fillL.position.set(0, -3, 4); scene.add(fillL);

  /* Aspecto "holograma": cuerpo oscuro + aristas luminosas + malla tenue */
  function holo(geo, col, o) {
    o = o || {};
    var g = new T.Group();
    var body = new T.Mesh(geo, new T.MeshStandardMaterial({
      color: o.body || 0x0b1233, metalness: .55, roughness: .38, flatShading: true,
      emissive: col, emissiveIntensity: o.em !== undefined ? o.em : .1,
      polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
    }));
    var edges = new T.LineSegments(new T.EdgesGeometry(geo, o.thr || 20), new T.LineBasicMaterial({ color: col, transparent: true, opacity: .95 }));
    var wire = new T.Mesh(geo, new T.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: o.wire !== undefined ? o.wire : .09, depthWrite: false }));
    g.add(body); g.add(edges); g.add(wire);
    return g;
  }
  function rr(w, h, r) {
    var s = new T.Shape(), x = -w / 2, yy = -h / 2;
    s.moveTo(x + r, yy); s.lineTo(x + w - r, yy); s.quadraticCurveTo(x + w, yy, x + w, yy + r);
    s.lineTo(x + w, yy + h - r); s.quadraticCurveTo(x + w, yy + h, x + w - r, yy + h);
    s.lineTo(x + r, yy + h); s.quadraticCurveTo(x, yy + h, x, yy + h - r);
    s.lineTo(x, yy + r); s.quadraticCurveTo(x, yy, x + r, yy);
    return s;
  }
  function gearGeo(teeth, ro, ri, hole, depth) {
    var s = new T.Shape(), step = Math.PI * 2 / teeth;
    function p(a, r) { return [Math.cos(a) * r, Math.sin(a) * r]; }
    for (var i = 0; i < teeth; i++) {
      var a = i * step;
      var q = [p(a - step * .28, ri), p(a - step * .15, ro), p(a + step * .15, ro), p(a + step * .28, ri)];
      if (i === 0) s.moveTo(q[0][0], q[0][1]); else s.lineTo(q[0][0], q[0][1]);
      s.lineTo(q[1][0], q[1][1]); s.lineTo(q[2][0], q[2][1]); s.lineTo(q[3][0], q[3][1]);
    }
    s.closePath();
    var h = new T.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h);
    var g = new T.ExtrudeGeometry(s, { depth: depth, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 1, curveSegments: 24 });
    g.center();
    return g;
  }

  /* ---- NEXAGUARD 3D LOGO (marca oficial) ---- */
  var logo = new T.Group();
  var nxgSc = 1 / 18;
  var nxgSh = new T.Shape();
  nxgSh.moveTo(0, (32 - 4) * nxgSc);
  nxgSh.lineTo((54 - 32) * nxgSc, (32 - 12) * nxgSc);
  nxgSh.lineTo((54 - 32) * nxgSc, (32 - 31) * nxgSc);
  nxgSh.bezierCurveTo((54 - 32) * nxgSc, (32 - 45.5) * nxgSc, (44.5 - 32) * nxgSc, (32 - 55.5) * nxgSc, 0, (32 - 60) * nxgSc);
  nxgSh.bezierCurveTo((19.5 - 32) * nxgSc, (32 - 55.5) * nxgSc, (10 - 32) * nxgSc, (32 - 45.5) * nxgSc, (10 - 32) * nxgSc, (32 - 31) * nxgSc);
  nxgSh.lineTo((10 - 32) * nxgSc, (32 - 12) * nxgSc);
  nxgSh.closePath();

  var logoShieldGeo = new T.ExtrudeGeometry(nxgSh, { depth: .3, bevelEnabled: true, bevelSize: .07, bevelThickness: .06, bevelSegments: 3, curveSegments: 32 });
  logoShieldGeo.center();
  logo.add(holo(logoShieldGeo, YEL, { body: 0x0c173d, em: .22, thr: 16, wire: .08 }));

  var innerSh = new T.Shape();
  var scIn = nxgSc * .86;
  innerSh.moveTo(0, (32 - 4) * scIn);
  innerSh.lineTo((54 - 32) * scIn, (32 - 12) * scIn);
  innerSh.lineTo((54 - 32) * scIn, (32 - 31) * scIn);
  innerSh.bezierCurveTo((54 - 32) * scIn, (32 - 45.5) * scIn, (44.5 - 32) * scIn, (32 - 55.5) * scIn, 0, (32 - 60) * scIn);
  innerSh.bezierCurveTo((19.5 - 32) * scIn, (32 - 55.5) * scIn, (10 - 32) * scIn, (32 - 45.5) * scIn, (10 - 32) * scIn, (32 - 31) * scIn);
  innerSh.lineTo((10 - 32) * scIn, (32 - 12) * scIn);
  innerSh.closePath();
  var innerGeo = new T.ExtrudeGeometry(innerSh, { depth: .09, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 1, curveSegments: 24 });
  innerGeo.center();
  var innerMesh = new T.Mesh(innerGeo, new T.MeshStandardMaterial({
    color: 0x111e4f, metalness: .85, roughness: .25, emissive: BLU, emissiveIntensity: .18
  }));
  innerMesh.position.z = .16;
  logo.add(innerMesh);

  /* Circuito "N" en 3D con reflejo metálico y brillo cian */
  var nMat = new T.MeshStandardMaterial({ color: 0xffffff, metalness: .9, roughness: .15, emissive: BLU, emissiveIntensity: .4 });
  var barL = new T.Mesh(new T.CylinderGeometry(.055, .055, 1.11, 16), nMat);
  barL.position.set(-10 * nxgSc, 0, .26);
  logo.add(barL);
  var barR = new T.Mesh(new T.CylinderGeometry(.055, .055, 1.11, 16), nMat);
  barR.position.set(10 * nxgSc, 0, .26);
  logo.add(barR);
  var barDiag = new T.Mesh(new T.CylinderGeometry(.055, .055, 1.571, 16), nMat);
  barDiag.position.set(0, 0, .26);
  barDiag.rotation.z = Math.PI / 4;
  logo.add(barDiag);

  /* 4 Nodos dorados interconectados */
  var logoNodes = [];
  var nodeGeo = new T.SphereGeometry(.11, 16, 16);
  var nodeMat = new T.MeshStandardMaterial({ color: YEL, metalness: .65, roughness: .2, emissive: YEL, emissiveIntensity: .8 });
  var nodeRingGeo = new T.TorusGeometry(.16, .014, 8, 24);
  var nodeRingMat = new T.MeshBasicMaterial({ color: YEL, transparent: true, opacity: .9 });

  [[-10 * nxgSc, -10 * nxgSc], [-10 * nxgSc, 10 * nxgSc], [10 * nxgSc, -10 * nxgSc], [10 * nxgSc, 10 * nxgSc]].forEach(function (pt) {
    var nodeG = new T.Group();
    var sph = new T.Mesh(nodeGeo, nodeMat);
    var nr = new T.Mesh(nodeRingGeo, nodeRingMat);
    nodeG.add(sph); nodeG.add(nr);
    nodeG.position.set(pt[0], pt[1], .27);
    logo.add(nodeG);
    logoNodes.push(nodeG);
  });

  /* Anillos orbitales de ciberseguridad */
  var logoRings = new T.Group();
  var ringA = new T.Mesh(new T.TorusGeometry(2.1, .014, 8, 90), new T.MeshBasicMaterial({ color: YEL, transparent: true, opacity: .7 }));
  var ringB = new T.Mesh(new T.TorusGeometry(2.5, .009, 8, 90), new T.MeshBasicMaterial({ color: BLU, transparent: true, opacity: .5 }));
  ringB.rotation.x = 1.15; ringB.rotation.y = .35;
  ringA.rotation.x = .8; ringA.rotation.y = -.25;
  logoRings.add(ringA); logoRings.add(ringB);
  logo.add(logoRings);

  /* ---- VIRUS (infección) ---- */
  var virus = new T.Group();
  virus.add(holo(new T.IcosahedronGeometry(1.05, 1), RED, { body: 0x1c0811, em: .18, thr: 5 }));
  var ico = new T.IcosahedronGeometry(1.05, 1), pa = ico.attributes.position, seen = {}, vs = [];
  for (var i = 0; i < pa.count; i++) {
    var v = new T.Vector3().fromBufferAttribute(pa, i);
    var k = v.x.toFixed(3) + '|' + v.y.toFixed(3) + '|' + v.z.toFixed(3);
    if (!seen[k]) { seen[k] = 1; vs.push(v); }
  }
  var spGeo = new T.CylinderGeometry(.018, .055, .55, 6); spGeo.translate(0, .275, 0);
  var spikes = new T.InstancedMesh(spGeo, new T.MeshStandardMaterial({ color: 0x2a0c16, metalness: .4, roughness: .5, emissive: RED, emissiveIntensity: .3 }), vs.length);
  var tips = new T.InstancedMesh(new T.SphereGeometry(.085, 10, 10), new T.MeshBasicMaterial({ color: RED }), vs.length);
  var m4 = new T.Matrix4(), qq = new T.Quaternion(), up = new T.Vector3(0, 1, 0), one = new T.Vector3(1, 1, 1), tp = new T.Vector3();
  vs.forEach(function (vv, idx) {
    var n = vv.clone().normalize(); qq.setFromUnitVectors(up, n);
    var sy = .8 + ((idx * 37) % 10) / 25;
    m4.compose(vv.clone().multiplyScalar(.97), qq, new T.Vector3(1, sy, 1)); spikes.setMatrixAt(idx, m4);
    tp.copy(n).multiplyScalar(1.05 * .97 + .55 * sy); m4.compose(tp, qq, one); tips.setMatrixAt(idx, m4);
  });
  virus.add(spikes); virus.add(tips);
  var orbit = new T.Group();
  for (var b = 0; b < 7; b++) {
    var bug = holo(new T.OctahedronGeometry(.12), RED, { body: 0x200a10, em: .3, thr: 5 });
    var an = b / 7 * Math.PI * 2; bug.position.set(Math.cos(an) * 2.05, Math.sin(an * 2) * .25, Math.sin(an) * 2.05);
    orbit.add(bug);
  }
  orbit.rotation.z = .35; virus.add(orbit);

  /* ---- LLAVE INGLESA + ENGRANAJES (reparación) ---- */
  var wrench = new T.Group();
  wrench.add(holo(new T.CylinderGeometry(.17, .21, 2.3, 20), YEL, { thr: 6, wire: .16 }));
  var head = holo(new T.TorusGeometry(.56, .24, 12, 30, Math.PI * 2 - 1.05), YEL, { thr: 6, wire: .16 });
  head.position.y = 1.5; head.rotation.z = Math.PI / 2 + .525; wrench.add(head);
  var tail = holo(new T.TorusGeometry(.44, .2, 12, 26), YEL, { thr: 6, wire: .16 });
  tail.position.y = -1.5; wrench.add(tail);
  var gearA = holo(gearGeo(10, .62, .5, .2, .22), BLU, { thr: 15, body: 0x0c1640, wire: .12 });
  gearA.position.set(-1.7, -1.0, .4); wrench.add(gearA);
  var gearB = holo(gearGeo(8, .46, .36, .14, .18), BLU, { thr: 15, body: 0x0c1640, wire: .12 });
  gearB.position.set(1.6, 1.15, -.2); wrench.add(gearB);
  wrench.rotation.z = -.55;

  /* ---- CANDADO (bloqueo) ---- */
  var lock = new T.Group();
  lock.add(holo(new T.ExtrudeGeometry(rr(1.9, 1.5, .28), { depth: .6, bevelEnabled: true, bevelSize: .05, bevelThickness: .05, bevelSegments: 2, curveSegments: 10 }).center(), BLU, { thr: 25 }));
  var shackle = new T.Group();
  shackle.add(holo(new T.TorusGeometry(.5, .11, 12, 28, Math.PI), BLU, { thr: 6, wire: .16 }));
  var legL = holo(new T.CylinderGeometry(.11, .11, .5, 12), BLU, { thr: 6, wire: .16 }); legL.position.set(-.5, -.25, 0);
  var legR = holo(new T.CylinderGeometry(.11, .11, .5, 12), BLU, { thr: 6, wire: .16 }); legR.position.set(.5, -.25, 0);
  shackle.add(legL); shackle.add(legR); shackle.position.y = 1.45; lock.add(shackle);
  var khMat = new T.MeshBasicMaterial({ color: GRN });
  var kh = new T.Mesh(new T.CircleGeometry(.13, 20), khMat); kh.position.set(0, .12, .37); lock.add(kh);
  var slot = new T.Mesh(new T.PlaneGeometry(.07, .32), khMat); slot.position.set(0, -.12, .37); lock.add(slot);
  lock.position.y = -.45;

  /* ---- ESCUDO (protegido) ---- */
  var sh = new T.Shape();
  sh.moveTo(0, 1.5);
  sh.bezierCurveTo(.35, 1.25, .85, 1.15, 1.25, 1.15);
  sh.lineTo(1.25, .25);
  sh.bezierCurveTo(1.25, -.6, .7, -1.15, 0, -1.55);
  sh.bezierCurveTo(-.7, -1.15, -1.25, -.6, -1.25, .25);
  sh.lineTo(-1.25, 1.15);
  sh.bezierCurveTo(-.85, 1.15, -.35, 1.25, 0, 1.5);
  var shield = new T.Group();
  shield.add(holo(new T.ExtrudeGeometry(sh, { depth: .32, bevelEnabled: true, bevelSize: .07, bevelThickness: .06, bevelSegments: 2, curveSegments: 24 }).center(), GRN, { thr: 14, wire: .06, em: .16 }));
  var ckM = new T.MeshBasicMaterial({ color: GRN });
  var c1 = new T.Mesh(new T.BoxGeometry(.44, .17, .1), ckM); c1.position.set(-.3, -.12, .28); c1.rotation.z = -Math.PI / 4;
  var c2 = new T.Mesh(new T.BoxGeometry(.95, .17, .1), ckM); c2.position.set(.18, .06, .28); c2.rotation.z = .808;
  shield.add(c1); shield.add(c2);
  var ring1 = new T.Mesh(new T.TorusGeometry(2.05, .012, 8, 90), new T.MeshBasicMaterial({ color: GRN, transparent: true, opacity: .6 }));
  var ring2 = new T.Mesh(new T.TorusGeometry(2.4, .008, 8, 90), new T.MeshBasicMaterial({ color: BLU, transparent: true, opacity: .45 }));
  ring2.rotation.x = 1.1; shield.add(ring1); shield.add(ring2);

  /* Registro de objetos: g = posición/escala, m = rotación */
  var defs = { logo: logo, virus: virus, wrench: wrench, lock: lock, shield: shield };
  var objs = {};
  Object.keys(defs).forEach(function (key) {
    var g = new T.Group(), m = new T.Group();
    m.add(defs[key]); g.add(m); g.visible = false; g.scale.setScalar(1e-4);
    scene.add(g);
    objs[key] = { g: g, m: m, s: 1e-4 };
  });

  /* Partículas */
  var N = 1100, pg = new T.BufferGeometry(), arr = new Float32Array(N * 3);
  for (var n = 0; n < N; n++) {
    var r = 5 + Math.random() * 16, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
    arr[n * 3] = r * Math.sin(ph) * Math.cos(th);
    arr[n * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * .7;
    arr[n * 3 + 2] = r * Math.cos(ph) - 6;
  }
  pg.setAttribute('position', new T.BufferAttribute(arr, 3));
  var pm = new T.PointsMaterial({ color: BLU, size: .045, transparent: true, opacity: .75, depthWrite: false, blending: T.AdditiveBlending });
  var pts = new T.Points(pg, pm); scene.add(pts);

  var themes = { logo: [YEL, BLU], virus: [RED, RED], wrench: [YEL, BLU], lock: [BLU, BLU], shield: [GRN, BLU] };
  var tmp = new T.Color();
  var cur = null, burst = 0, boost = 0, glitchT = 2, glitchFor = 0, shackleY = 1.45, shieldSpin = 0, logoSpin = 0;

  function resize(w, h) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 820 ? 1.5 : 1.75));
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  }

  function render(dt, s, vl, ms, vw, vh) {
    if (!s) return;
    var mobile = vw < 820, aspect = vw / vh;
    var key = objs[s.obj] ? s.obj : null;
    if (key !== cur) { cur = key; burst = 1; }
    var t = performance.now() * .001;
    var ax = clamp(aspect / 1.78, .55, 1.15);

    Object.keys(objs).forEach(function (k) {
      var o = objs[k], on = k === key;
      var tx = mobile ? 0 : s.x * ax, ty = mobile ? 1.5 : s.y, tsc = on ? s.s * (mobile ? .55 : 1) : 1e-4;
      if (on && o.s < .03) o.g.position.set(tx, ty, 0);
      o.s += (tsc - o.s) * Math.min(1, dt * (on ? 4 : 6));
      if (on) {
        o.g.position.x += (tx - o.g.position.x) * Math.min(1, dt * 3);
        o.g.position.y += (ty - o.g.position.y) * Math.min(1, dt * 3);
      }
      o.g.visible = o.s > .02;
      o.g.scale.setScalar(Math.max(o.s, 1e-4));
    });

    var spin = boost * 4 + Math.abs(vl) * .03;
    boost *= Math.max(0, 1 - dt * 1.4);
    var mx = ms.x, my = ms.y;

    if (objs.logo && objs.logo.g.visible) {
      var lm = objs.logo.m;
      logoSpin += dt * boost * 6;
      lm.rotation.y = Math.sin(t * .6) * .45 + mx * .35 + logoSpin;
      lm.rotation.x = Math.sin(t * .4) * .15 + my * .2;
      lm.scale.setScalar(1 + Math.sin(t * 2.2) * .025);
      logoRings.rotation.z += dt * .35;
      logoNodes.forEach(function (nd, idx) {
        nd.scale.setScalar(1 + Math.sin(t * 3.5 + idx * 1.5) * .12);
      });
    }
    if (objs.virus.g.visible) {
      var vm = objs.virus.m;
      vm.rotation.y += dt * (.28 + spin);
      vm.rotation.x = Math.sin(t * .4) * .25 + my * .25;
      vm.scale.setScalar(1 + Math.sin(t * 3) * .03);
      orbit.rotation.y += dt * .9;
      glitchT -= dt;
      if (glitchT < 0) { glitchT = 1.6 + Math.random() * 2.6; glitchFor = .1; }
      if (glitchFor > 0) { glitchFor -= dt; vm.position.set((Math.random() - .5) * .3, (Math.random() - .5) * .1, 0); }
      else vm.position.set(0, 0, 0);
    }
    if (objs.wrench.g.visible) {
      var wm = objs.wrench.m;
      wm.rotation.y += dt * (.35 + spin);
      wm.rotation.x = my * .2;
      wrench.rotation.z = -.55 + Math.sin(t * 1.6) * .22;
      gearA.rotation.z += dt * (.9 + spin);
      gearB.rotation.z -= dt * (1.3 + spin);
    }
    if (objs.lock.g.visible) {
      var lm = objs.lock.m;
      lm.rotation.y = Math.sin(t * .6) * .55 + mx * .4;
      lm.rotation.x = my * .15;
      shackleY += ((key === 'lock' ? 1.1 : 1.45) - shackleY) * Math.min(1, dt * 2.2);
      shackle.position.y = shackleY;
    }
    if (objs.shield.g.visible) {
      var sm = objs.shield.m;
      shieldSpin += dt * boost * 6;
      sm.rotation.y = Math.sin(t * .55) * .6 + mx * .4 + shieldSpin;
      sm.rotation.x = my * .15;
      ring1.rotation.z += dt * .5; ring2.rotation.z -= dt * .35;
    }

    var th2 = themes[key] || [BLU, BLU], k2 = Math.min(1, dt * 2.5);
    tmp.setHex(th2[0]); pm.color.lerp(tmp, k2);
    tmp.setHex(th2[1]); rimL.color.lerp(tmp, k2);
    burst *= Math.max(0, 1 - dt * 2.2);
    pts.scale.setScalar(1 + burst * .35);
    pts.rotation.y += dt * .02 + vl * .0006;
    pts.rotation.x = Math.sin(t * .1) * .05;

    cam.position.x += (mx * .35 - cam.position.x) * Math.min(1, dt * 2);
    cam.position.y += (-my * .25 - cam.position.y) * Math.min(1, dt * 2);
    cam.lookAt(0, 0, 0);
    renderer.render(scene, cam);
  }

  return { render: render, resize: resize, boost: function (v) { boost = Math.max(boost, v); } };
}

var scene = null;
try { scene = makeScene(); } catch (e) { scene = null; }
if (!scene) { var cv = $('#gl'); if (cv) cv.style.display = 'none'; }



  var scene = null;
  try { scene = makeScene(); } catch (e) { scene = null; }
  if (!scene) {
    var cv = $('#gl');
    if (cv) cv.style.display = 'none';
  }

  var tPrev = performance.now();
  function frame(now) {
    var dt = Math.min(.05, (now - tPrev) / 1000 || .016);
    tPrev = now;
    var y = window.scrollY || 0;
    vel += ((y - lastY) - vel) * .25;
    lastY = y;

    if (scene) {
      try {
        scene.render(dt, curSec(), vel, mouse, VW, VH);
      } catch (e) {
        scene = null;
        var c = $('#gl');
        if (c) c.style.display = 'none';
      }
    }
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(function(t) {
    tPrev = t;
    frame(t);
  });
})();
