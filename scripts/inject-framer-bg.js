const fs = require('fs');
const path = require('path');

const backgroundCss = `
/* ==========================================================================
   Framer Motion / Physics Ambient Background (Desbordante & Hi-Tech)
   ========================================================================== */
#canvasBg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  opacity: 0.9;
}

.cyber-grid-horizon {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60vh;
  background: 
    linear-gradient(to bottom, transparent, rgba(5, 8, 20, 0.96) 80%),
    linear-gradient(to right, rgba(107, 140, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(107, 140, 255, 0.08) 1px, transparent 1px);
  background-size: 100% 100%, 54px 54px, 54px 54px;
  transform: perspective(420px) rotateX(65deg);
  transform-origin: bottom center;
  pointer-events: none;
  z-index: 0;
  mask-image: linear-gradient(to top, rgba(0,0,0,1) 20%, transparent 95%);
  -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 20%, transparent 95%);
}

.aurora-orb-1, .aurora-orb-2, .aurora-orb-3 {
  position: fixed;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  z-index: 0;
  opacity: 0.55;
  mix-blend-mode: screen;
  will-change: transform;
}

.aurora-orb-1 {
  width: 650px;
  height: 650px;
  top: -150px;
  left: 10%;
  background: radial-gradient(circle, rgba(107, 140, 255, 0.65), rgba(7, 12, 45, 0.25) 60%, transparent 75%);
  animation: orb-float-1 14s ease-in-out infinite alternate;
}

.aurora-orb-2 {
  width: 550px;
  height: 550px;
  top: 180px;
  right: 8%;
  background: radial-gradient(circle, rgba(255, 207, 51, 0.45), rgba(255, 69, 96, 0.22) 50%, transparent 75%);
  animation: orb-float-2 18s ease-in-out infinite alternate;
}

.aurora-orb-3 {
  width: 700px;
  height: 500px;
  top: 40%;
  left: 25%;
  background: radial-gradient(circle, rgba(0, 240, 255, 0.35), rgba(121, 40, 202, 0.25) 55%, transparent 75%);
  animation: orb-float-3 20s ease-in-out infinite alternate;
}

@keyframes orb-float-1 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(60px, 40px) scale(1.08); }
  100% { transform: translate(-40px, 80px) scale(0.95); }
}
@keyframes orb-float-2 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-80px, 60px) scale(1.12); }
  100% { transform: translate(40px, -40px) scale(0.92); }
}
@keyframes orb-float-3 {
  0% { transform: translate(0, 0) scale(0.95); }
  50% { transform: translate(50px, -50px) scale(1.1); }
  100% { transform: translate(-60px, 30px) scale(1); }
}
`;

const backgroundHtml = `
<!-- Fondo Desbordante con Física de Resortes (Framer Motion Engine) -->
<canvas id="canvasBg" aria-hidden="true"></canvas>
<div class="cyber-grid-horizon" aria-hidden="true"></div>
<div class="aurora-orb-1" aria-hidden="true"></div>
<div class="aurora-orb-2" aria-hidden="true"></div>
<div class="aurora-orb-3" aria-hidden="true"></div>
<div class="noise-overlay" aria-hidden="true"></div>
`;

const backgroundJs = `
  // 1. Motor de Fondo Interactivo con Física de Resortes (Framer Motion / Spring Dynamics)
  var canvas = document.getElementById('canvasBg');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var W = 0, H = 0;

  var springCursor = {
    targetX: window.innerWidth * 0.5,
    targetY: window.innerHeight * 0.35,
    currentX: window.innerWidth * 0.5,
    currentY: window.innerHeight * 0.35,
    vx: 0,
    vy: 0,
    stiffness: 0.05,
    damping: 0.82,
    update: function() {
      var fx = (this.targetX - this.currentX) * this.stiffness;
      var fy = (this.targetY - this.currentY) * this.stiffness;
      this.vx = (this.vx + fx) * this.damping;
      this.vy = (this.vy + fy) * this.damping;
      this.currentX += this.vx;
      this.currentY += this.vy;
    }
  };

  window.addEventListener('pointermove', function(e) {
    springCursor.targetX = e.clientX;
    springCursor.targetY = e.clientY;
  });

  var shockwaves = [];
  window.addEventListener('pointerdown', function(e) {
    shockwaves.push({
      x: e.clientX,
      y: e.clientY,
      radius: 5,
      maxRadius: Math.min(window.innerWidth, window.innerHeight) * 0.45,
      alpha: 0.75,
      speed: 7
    });
  });

  var particles = [];
  var radarRings = [];

  function resize() {
    if (!canvas) return;
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  if (ctx) {
    var pCount = Math.min(65, Math.floor((window.innerWidth * window.innerHeight) / 16000));
    for (var i = 0; i < pCount; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        baseX: Math.random() * W,
        baseY: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2.2 + 0.8,
        color: Math.random() > 0.65 ? 'rgba(255, 207, 51, ' : (Math.random() > 0.4 ? 'rgba(0, 240, 255, ' : 'rgba(107, 140, 255, '),
        alpha: Math.random() * 0.6 + 0.3,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    for (var r = 0; r < 3; r++) {
      radarRings.push({
        radius: r * 140,
        maxRadius: 480,
        alpha: 0.35 - r * 0.08
      });
    }

    var time = 0;

    function renderEngine() {
      time++;
      springCursor.update();

      ctx.clearRect(0, 0, W, H);

      // A. Halo de luz volumétrico magnético centrado en el resorte
      var auraGrad = ctx.createRadialGradient(
        springCursor.currentX, springCursor.currentY, 0,
        springCursor.currentX, springCursor.currentY, 380
      );
      auraGrad.addColorStop(0, 'rgba(0, 240, 255, 0.14)');
      auraGrad.addColorStop(0.4, 'rgba(107, 140, 255, 0.08)');
      auraGrad.addColorStop(0.7, 'rgba(255, 207, 51, 0.03)');
      auraGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(0, 0, W, H);

      // B. Anillos pulsantes de radar cibernético centrados en el foco
      for (var k = 0; k < radarRings.length; k++) {
        var ring = radarRings[k];
        ring.radius += 0.85;
        if (ring.radius > ring.maxRadius) {
          ring.radius = 10;
        }
        var ringFade = 1 - (ring.radius / ring.maxRadius);
        ctx.beginPath();
        ctx.arc(springCursor.currentX, springCursor.currentY, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 240, 255, ' + (ringFade * 0.18) + ')';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // C. Renderizado de ondas de choque gravitacionales (Clicks)
      for (var s = shockwaves.length - 1; s >= 0; s--) {
        var sw = shockwaves[s];
        sw.radius += sw.speed;
        sw.alpha *= 0.94;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 207, 51, ' + (sw.alpha * 0.6) + ')';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        if (sw.alpha < 0.02 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(s, 1);
        }
      }

      // D. Partículas con física de atracción/repulsión elástica
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

        var dx = springCursor.currentX - p.x;
        var dy = springCursor.currentY - p.y;
        var dist = Math.hypot(dx, dy);

        if (dist < 180) {
          var force = (1 - dist / 180) * 2.5;
          p.x -= (dx / dist) * force;
          p.y -= (dy / dist) * force;
        }

        var pPulse = Math.sin(time * p.pulseSpeed + p.pulsePhase);
        var currentAlpha = Math.max(0.1, p.alpha + pPulse * 0.25);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + currentAlpha + ')';
        ctx.shadowColor = p.color + '0.8)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        for (var j = i + 1; j < particles.length; j++) {
          var p2 = particles[j];
          var dNodes = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dNodes < 115) {
            var lineAlpha = (1 - dNodes / 115) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(150, 180, 255, ' + lineAlpha + ')';
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(renderEngine);
    }
    requestAnimationFrame(renderEngine);
  }
`;

function injectStunningBackground(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let html = fs.readFileSync(fullPath, 'utf8');

  // 1. Inyectar CSS
  if (!html.includes('Framer Motion / Physics Ambient Background')) {
    html = html.replace('</style>', `${backgroundCss}\n</style>`);
  }

  // 2. Inyectar HTML de fondo
  const oldElementsRegex = /<!-- Fondo de animación sutil y ruido -->[\s\S]*?<div class="ambient-aura" aria-hidden="true"><\/div>/;
  if (oldElementsRegex.test(html)) {
    html = html.replace(oldElementsRegex, backgroundHtml.trim());
  } else {
    const fallbackRegex = /<canvas id="canvasBg" aria-hidden="true"><\/canvas>[\s\S]*?<div class="ambient-aura" aria-hidden="true"><\/div>/;
    if (fallbackRegex.test(html)) {
      html = html.replace(fallbackRegex, backgroundHtml.trim());
    }
  }

  // 3. Inyectar motor JS
  const oldJsRegex = /\/\/ 1\. Malla visual interactiva en Canvas[\s\S]*?requestAnimationFrame\(renderMesh\);\s*\}/;
  if (oldJsRegex.test(html)) {
    html = html.replace(oldJsRegex, backgroundJs.trim());
  }

  fs.writeFileSync(fullPath, html, 'utf8');
  console.log(`[OK] Successfully injected stunning Framer Motion background into ${relPath}`);
}

injectStunningBackground('public/reparar-wordpress-hackeado/index.html');
injectStunningBackground('public/japanese-keyword-hack/index.html');
