/* =====================================================================
   NexaGuard Cyber Threat World Map & Ballistic Attack Stream
   - Mapa Mundi Táctico en Tiempo Real con Detección Geográfica del Usuario
   - Haces de Luz Balísticos de Ataque Interceptados por Escudo WAF
   - Flujo de Amenazas con Flechas Animadas y Veredictos en Vivo
   - Motor Gráfico Canvas Retina 60FPS sin dependencias externas
   ===================================================================== */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NexaThreatMap = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 1. Diccionario Geográfico de Países y Coordenadas Tácticas
  var COUNTRY_DB = {
    'RU': { name: 'Rusia', flag: '🇷🇺', lat: 55.75, lon: 37.61, city: 'Moscú' },
    'CN': { name: 'China', flag: '🇨🇳', lat: 39.90, lon: 116.40, city: 'Pekín' },
    'US': { name: 'Estados Unidos', flag: '🇺🇸', lat: 38.90, lon: -77.03, city: 'Washington' },
    'NL': { name: 'Países Bajos', flag: '🇳🇱', lat: 52.36, lon: 4.90, city: 'Ámsterdam' },
    'DE': { name: 'Alemania', flag: '🇩🇪', lat: 52.52, lon: 13.40, city: 'Fráncfort' },
    'BR': { name: 'Brasil', flag: '🇧🇷', lat: -15.79, lon: -47.88, city: 'Brasilia' },
    'FR': { name: 'Francia', flag: '🇫🇷', lat: 48.85, lon: 2.35, city: 'París' },
    'UA': { name: 'Ucrania', flag: '🇺🇦', lat: 50.45, lon: 30.52, city: 'Kiev' },
    'RO': { name: 'Rumania', flag: '🇷🇴', lat: 44.42, lon: 26.10, city: 'Bucarest' },
    'IR': { name: 'Irán', flag: '🇮🇷', lat: 35.68, lon: 51.38, city: 'Teherán' },
    'KP': { name: 'Corea del Norte', flag: '🇰🇵', lat: 39.03, lon: 125.76, city: 'Pyongyang' },
    'VN': { name: 'Vietnam', flag: '🇻🇳', lat: 21.02, lon: 105.83, city: 'Hanói' },
    'IN': { name: 'India', flag: '🇮🇳', lat: 28.61, lon: 77.20, city: 'Nueva Delhi' },
    'GB': { name: 'Reino Unido', flag: '🇬🇧', lat: 51.50, lon: -0.12, city: 'Londres' },
    'ES': { name: 'España', flag: '🇪🇸', lat: 40.41, lon: -3.70, city: 'Madrid' },
    'MX': { name: 'México', flag: '🇲🇽', lat: 19.43, lon: -99.13, city: 'Ciudad de México' },
    'CO': { name: 'Colombia', flag: '🇨🇴', lat: 4.71, lon: -74.07, city: 'Bogotá' },
    'VE': { name: 'Venezuela', flag: '🇻🇪', lat: 10.48, lon: -66.90, city: 'Caracas' },
    'AR': { name: 'Argentina', flag: '🇦🇷', lat: -34.60, lon: -58.38, city: 'Buenos Aires' },
    'CL': { name: 'Chile', flag: '🇨🇱', lat: -33.44, lon: -70.66, city: 'Santiago' },
    'PE': { name: 'Perú', flag: '🇵🇪', lat: -12.04, lon: -77.04, city: 'Lima' },
    'EC': { name: 'Ecuador', flag: '🇪🇨', lat: -0.18, lon: -78.46, city: 'Quito' },
    'CA': { name: 'Canadá', flag: '🇨🇦', lat: 45.42, lon: -75.69, city: 'Ottawa' },
    'AU': { name: 'Australia', flag: '🇦🇺', lat: -35.28, lon: 149.13, city: 'Canberra' },
    'JP': { name: 'Japón', flag: '🇯🇵', lat: 35.67, lon: 139.65, city: 'Tokio' },
    'KR': { name: 'Corea del Sur', flag: '🇰🇷', lat: 37.56, lon: 126.97, city: 'Seúl' },
    'SG': { name: 'Singapur', flag: '🇸🇬', lat: 1.35, lon: 103.82, city: 'Singapur' },
    'TR': { name: 'Turquía', flag: '🇹🇷', lat: 39.93, lon: 32.85, city: 'Ankara' },
    'PL': { name: 'Polonia', flag: '🇵🇱', lat: 52.22, lon: 21.01, city: 'Varsovia' },
    'IT': { name: 'Italia', flag: '🇮🇹', lat: 41.90, lon: 12.49, city: 'Roma' },
    'SE': { name: 'Suecia', flag: '🇸🇪', lat: 59.32, lon: 18.06, city: 'Estocolmo' },
    'ZA': { name: 'Sudáfrica', flag: '🇿🇦', lat: -25.74, lon: 28.18, city: 'Pretoria' }
  };

  // 2. Siluetas Poligonales de Continentes (Lon [-180, 180], Lat [-85, 85])
  var CONTINENTS = [
    // Norteamérica
    [[-168,66],[-165,71],[-140,70],[-125,70],[-105,75],[-80,73],[-65,60],[-55,50],[-65,44],[-75,35],[-80,25],[-97,20],[-85,15],[-77,8],[-82,8],[-90,14],[-105,20],[-115,30],[-124,38],[-125,49],[-136,58],[-165,60],[-168,66]],
    // Sudamérica
    [[-77,8],[-60,10],[-50,0],[-35,-5],[-38,-15],[-45,-23],[-55,-35],[-65,-55],[-75,-50],[-72,-35],[-80,-10],[-80,0],[-77,8]],
    // Europa
    [[-10,36],[0,43],[5,44],[15,40],[25,37],[30,42],[40,42],[45,45],[60,55],[60,70],[30,71],[20,70],[10,60],[0,50],[-5,48],[-10,44],[-10,36]],
    // África
    [[-17,32],[10,37],[32,32],[35,28],[42,12],[51,12],[40,-10],[35,-25],[28,-34],[18,-34],[12,-15],[0,5],[-15,10],[-17,20],[-17,32]],
    // Asia
    [[40,42],[50,40],[60,40],[70,30],[80,20],[80,10],[88,22],[100,10],[105,20],[120,23],[122,30],[120,40],[130,45],[140,50],[160,55],[170,65],[180,70],[100,77],[60,70],[45,45],[40,42]],
    // Australia
    [[114,-22],[125,-15],[135,-12],[145,-15],[153,-28],[150,-38],[138,-35],[130,-32],[115,-34],[114,-22]],
    // Groenlandia
    [[-70,75],[-50,83],[-20,83],[-20,70],[-45,60],[-60,65],[-70,75]],
    // Reino Unido / Irlanda
    [[-10,51],[-6,58],[0,58],[2,51],[-5,50],[-10,51]],
    // Japón
    [[130,32],[133,35],[141,43],[145,44],[140,36],[130,32]],
    // Madagascar
    [[44,-12],[50,-15],[47,-25],[43,-25],[44,-12]]
  ];

  // 3. Proyección Equirrectangular
  function project(lon, lat, width, height) {
    var x = ((lon + 180) / 360) * width;
    var clampedLat = Math.max(-82, Math.min(82, lat));
    var y = ((85 - clampedLat) / 170) * height;
    return { x: x, y: y };
  }

  function unproject(x, y, width, height) {
    var lon = (x / width) * 360 - 180;
    var lat = 85 - (y / height) * 170;
    return { lon: lon, lat: Math.max(-85, Math.min(85, lat)) };
  }

  // 4. Sintetizador de Audio Táctico (Web Audio API nativo, cero latencia)
  var audioCtx = null;
  function getAudioContext() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function playDefendSound() {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  function playSonarPing() {
    try {
      var ctx = getAudioContext();
      if (!ctx) return;
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.45);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.52);
    } catch (e) {}
  }

  // 5. Clase Principal del Mapa de Amenazas
  function CyberThreatMap(container, options) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.opts = Object.assign({
      autoDetectLocation: true,
      defaultLocation: { lat: 10.48, lon: -66.90, city: 'Caracas', country: 'VE', flag: '🇻🇪' },
      audioEnabled: false,
      isLiveStream: true,
      onDeflected: null,
      onLocationChanged: null
    }, options);

    this.userLocation = Object.assign({}, this.opts.defaultLocation);
    this.audioEnabled = this.opts.audioEnabled;
    this.isLiveStream = this.opts.isLiveStream;
    this.beams = [];
    this.deflections = [];
    this.floatingAlerts = [];
    this.particles = [];
    this.recentHotspots = [];
    this.isDestroyed = false;
    this.animFrameId = null;
    this.lastSimTime = Date.now();

    this.initDOM();
    this.initEvents();
    if (this.opts.autoDetectLocation) {
      this.detectUserLocation();
    }
    this.startLoop();
  }

  CyberThreatMap.prototype.initDOM = function () {
    this.container.innerHTML = '';
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'threat-map-canvas';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
  };

  CyberThreatMap.prototype.resizeCanvas = function () {
    if (!this.canvas) return;
    var rect = this.container.getBoundingClientRect();
    var width = Math.floor(rect.width) || 800;
    var autoHeight = Math.min(520, Math.max(240, Math.floor(width * 0.52)));
    var height = (rect.height && rect.height > 100) ? Math.floor(rect.height) : autoHeight;
    var dpr = window.devicePixelRatio || 1;

    this.width = width;
    this.height = height;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  };

  CyberThreatMap.prototype.initEvents = function () {
    var self = this;
    window.addEventListener('resize', function () {
      if (!self.isDestroyed) self.resizeCanvas();
    });

    // Permitir clic para reubicar nodo protegido
    this.canvas.addEventListener('click', function (e) {
      var rect = self.canvas.getBoundingClientRect();
      var clickX = e.clientX - rect.left;
      var clickY = e.clientY - rect.top;
      var coords = unproject(clickX, clickY, self.width, self.height);
      
      self.userLocation.lat = Math.round(coords.lat * 100) / 100;
      self.userLocation.lon = Math.round(coords.lon * 100) / 100;
      self.userLocation.city = 'Nodo Personalizado';
      self.userLocation.country = 'Tu Servidor';
      self.userLocation.flag = '🎯';

      self.deflections.push({
        x: clickX,
        y: clickY,
        r: 6,
        maxR: 45,
        color: 'rgba(255, 207, 51, 0.9)',
        born: Date.now()
      });

      if (self.audioEnabled) playDefendSound();
      if (typeof self.opts.onLocationChanged === 'function') {
        self.opts.onLocationChanged(self.userLocation);
      }
    });
  };

  CyberThreatMap.prototype.detectUserLocation = function () {
    var self = this;
    // 1. Intentar Geolocation API del Navegador
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          self.userLocation.lat = pos.coords.latitude;
          self.userLocation.lon = pos.coords.longitude;
          self.userLocation.city = 'Mi Ubicación Local';
          self.userLocation.country = 'Nexo Directo';
          self.userLocation.flag = '🎯';
          if (typeof self.opts.onLocationChanged === 'function') {
            self.opts.onLocationChanged(self.userLocation);
          }
        },
        function () {
          // Si deniega, consultar IP Geolocation gratuita
          self.fetchIpLocation();
        },
        { timeout: 4000 }
      );
    } else {
      this.fetchIpLocation();
    }
  };

  CyberThreatMap.prototype.fetchIpLocation = function () {
    var self = this;
    fetch('https://ipapi.co/json/')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.latitude && data.longitude) {
          self.userLocation.lat = data.latitude;
          self.userLocation.lon = data.longitude;
          self.userLocation.city = data.city || 'Nodo Detectado';
          self.userLocation.country = data.country_code || 'XX';
          var match = COUNTRY_DB[data.country_code];
          self.userLocation.flag = match ? match.flag : '🎯';
          if (typeof self.opts.onLocationChanged === 'function') {
            self.opts.onLocationChanged(self.userLocation);
          }
        }
      })
      .catch(function () {});
  };

  // Lanzar un haz balístico desde el país atacante hacia la ubicación del usuario
  CyberThreatMap.prototype.launchBeam = function (ev) {
    if (!ev) return;
    var countryCode = 'XX';
    var cInfo = null;

    if (ev.country) {
      if (typeof ev.country === 'object') {
        countryCode = ev.country.code || 'RU';
        cInfo = ev.country;
      } else if (typeof ev.country === 'string') {
        countryCode = ev.country;
      }
    }

    if (!cInfo || !cInfo.lat) {
      cInfo = COUNTRY_DB[countryCode] || COUNTRY_DB['RU'];
    }

    var startCoords = { lat: cInfo.lat || 55.75, lon: cInfo.lon || 37.61 };
    var startPt = project(startCoords.lon, startCoords.lat, this.width, this.height);
    var endPt = project(this.userLocation.lon, this.userLocation.lat, this.width, this.height);

    var dist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
    var midX = (startPt.x + endPt.x) / 2;
    var midY = (startPt.y + endPt.y) / 2;
    var arcHeight = Math.max(45, dist * 0.28);
    var ctrlPt = { x: midX, y: Math.min(startPt.y, endPt.y) - arcHeight };

    var color = '#ff3366'; // Rojo crítico (SQLi / RCE)
    var rule = (ev.rule || 'SQL_INJECTION').toUpperCase();
    if (rule.indexOf('HONEYPOT') !== -1 || rule.indexOf('TRAVERSAL') !== -1) color = '#ffcf33'; // Amarillo
    else if (rule.indexOf('BOT') !== -1 || rule.indexOf('SCAN') !== -1) color = '#3ff0ff'; // Cyan

    this.beams.push({
      id: ev.id || Math.random().toString(36),
      sx: startPt.x,
      sy: startPt.y,
      cx: ctrlPt.x,
      cy: ctrlPt.y,
      tx: endPt.x,
      ty: endPt.y,
      t: 0,
      speed: 0.016 + Math.random() * 0.008,
      color: color,
      rule: rule,
      country: cInfo,
      ip: ev.ip || '185.220.101.45',
      tail: []
    });

    // Registrar hotspot reciente en el país de origen
    this.recentHotspots.push({
      x: startPt.x,
      y: startPt.y,
      code: countryCode,
      color: color,
      born: Date.now()
    });
    if (this.recentHotspots.length > 20) this.recentHotspots.shift();
  };

  CyberThreatMap.prototype.generateSimulatedAttack = function () {
    var countryKeys = Object.keys(COUNTRY_DB);
    var randKey = countryKeys[Math.floor(Math.random() * countryKeys.length)];
    var c = COUNTRY_DB[randKey];

    var attackTypes = [
      { rule: 'SQL_INJECTION', url: '/wp-login.php?user=admin%27+OR+1=1--', sev: 'CRITICAL', label: '💉 SQL Injection' },
      { rule: 'HONEYPOT_HIT', url: '/.env', sev: 'CRITICAL', label: '🍯 Honeypot (.env)' },
      { rule: 'PATH_TRAVERSAL', url: '/downloads?file=../../etc/passwd', sev: 'CRITICAL', label: '📂 Path Traversal' },
      { rule: 'RCE_EXPLOIT', url: '/api/webhook?cmd=whoami', sev: 'CRITICAL', label: '⚡ RCE Shell Exploit' },
      { rule: 'BAD_USER_AGENT', url: '/api/license', sev: 'HIGH', label: '🤖 Bad Bot / Scanner' },
      { rule: 'XSS_ATTACK', url: '/search?q=<script>alert()</script>', sev: 'HIGH', label: '☣️ Vector XSS Reflejado' }
    ];
    var atk = attackTypes[Math.floor(Math.random() * attackTypes.length)];

    var mockIp = (Math.floor(Math.random() * 190) + 20) + '.' +
                 (Math.floor(Math.random() * 250) + 1) + '.' +
                 (Math.floor(Math.random() * 250) + 1) + '.' +
                 (Math.floor(Math.random() * 250) + 1);

    var ev = {
      id: 'waf_sim_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      at: Date.now(),
      ip: mockIp,
      country: c,
      method: 'GET',
      url: atk.url,
      rule: atk.rule,
      severity: atk.sev,
      action: 'BLOCKED_403'
    };

    this.launchBeam(ev);
    return ev;
  };

  CyberThreatMap.prototype.drawContinents = function (ctx) {
    var w = this.width, h = this.height;

    // 1. Fondo Abisal Táctico
    var bgGrad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h));
    bgGrad.addColorStop(0, '#040b24');
    bgGrad.addColorStop(0.7, '#020617');
    bgGrad.addColorStop(1, '#01030d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Cuadrícula de Coordenadas (Graticule)
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = 'rgba(107, 140, 255, 0.08)';

    // Paralelos
    [-60, -30, 0, 30, 60].forEach(function (lat) {
      var pt = project(0, lat, w, h);
      ctx.beginPath();
      ctx.moveTo(0, pt.y);
      ctx.lineTo(w, pt.y);
      ctx.stroke();
    });

    // Ecuador resaltado
    var eq = project(0, 0, w, h);
    ctx.strokeStyle = 'rgba(61, 232, 164, 0.16)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, eq.y);
    ctx.lineTo(w, eq.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Meridianos
    ctx.strokeStyle = 'rgba(107, 140, 255, 0.08)';
    [-120, -60, 0, 60, 120].forEach(function (lon) {
      var pt = project(lon, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(pt.x, 0);
      ctx.lineTo(pt.x, h);
      ctx.stroke();
    });

    // 3. Silueta de Continentes
    ctx.fillStyle = 'rgba(13, 26, 60, 0.75)';
    ctx.strokeStyle = 'rgba(65, 120, 255, 0.5)';
    ctx.lineWidth = 1.3;
    ctx.lineJoin = 'round';

    CONTINENTS.forEach(function (poly) {
      if (!poly.length) return;
      ctx.beginPath();
      var first = project(poly[0][0], poly[0][1], w, h);
      ctx.moveTo(first.x, first.y);
      for (var i = 1; i < poly.length; i++) {
        var pt = project(poly[i][0], poly[i][1], w, h);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // 4. Matriz de Puntos Cibernéticos (Land Dots)
    ctx.fillStyle = 'rgba(80, 150, 255, 0.22)';
    var dotSpacing = Math.max(16, Math.floor(w / 45));
    for (var x = dotSpacing / 2; x < w; x += dotSpacing) {
      for (var y = dotSpacing / 2; y < h; y += dotSpacing) {
        // Muestrear si está dentro de la tierra (aproximado por canvas point-in-path o simplemente sutil grid)
        if ((x + y) % (dotSpacing * 2) === 0) {
          ctx.fillRect(x, y, 1.2, 1.2);
        }
      }
    }
  };

  CyberThreatMap.prototype.drawHotspots = function (ctx) {
    var now = Date.now();
    for (var i = this.recentHotspots.length - 1; i >= 0; i--) {
      var hs = this.recentHotspots[i];
      var age = (now - hs.born) / 1000;
      if (age > 12) {
        this.recentHotspots.splice(i, 1);
        continue;
      }
      var alpha = Math.max(0, 1 - age / 12);
      var pulse = (now * 0.005) % 1;

      // Círculo central
      ctx.fillStyle = hs.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Onda expansiva
      ctx.strokeStyle = hs.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hs.x, hs.y, 4 + pulse * 14, 0, Math.PI * 2);
      ctx.stroke();

      // Etiqueta del país atacante
      ctx.fillStyle = '#ffcf33';
      ctx.font = '8px monospace';
      ctx.fillText(hs.code, hs.x + 6, hs.y - 4);
      ctx.globalAlpha = 1.0;
    }
  };

  CyberThreatMap.prototype.drawBeams = function (ctx) {
    var now = Date.now();

    for (var i = this.beams.length - 1; i >= 0; i--) {
      var b = this.beams[i];
      b.t += b.speed;

      // Calcular punto actual en la curva de Bézier cuadrática
      // B(t) = (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
      var t = b.t;
      var invT = 1 - t;
      var curX = invT * invT * b.sx + 2 * invT * t * b.cx + t * t * b.tx;
      var curY = invT * invT * b.sy + 2 * invT * t * b.cy + t * t * b.ty;

      b.tail.push({ x: curX, y: curY, alpha: 1.0 });
      if (b.tail.length > 20) b.tail.shift();

      // 1. Dibujar estela tenue de la trayectoria completa
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 51, 102, 0.12)';
      ctx.setLineDash([2, 5]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.sx, b.sy);
      ctx.quadraticCurveTo(b.cx, b.cy, b.tx, b.ty);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Dibujar haz de luz balístico cometa
      if (b.tail.length > 2) {
        for (var k = 1; k < b.tail.length; k++) {
          var p0 = b.tail[k - 1];
          var p1 = b.tail[k];
          var prog = k / b.tail.length;

          ctx.strokeStyle = b.color;
          ctx.globalAlpha = prog * 0.9;
          ctx.lineWidth = 1.5 + prog * 2.2;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
      }

      // 3. Núcleo incandescente del cometa
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(curX, curY, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // 4. Chispas que desprenden hacia atrás
      if (Math.random() > 0.4) {
        this.particles.push({
          x: curX,
          y: curY,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          color: b.color,
          alpha: 0.9,
          size: Math.random() * 2 + 1,
          born: now
        });
      }

      // 5. Impacto e Intercepción en el escudo del usuario
      if (b.t >= 1.0) {
        this.deflections.push({
          x: b.tx,
          y: b.ty,
          r: 6,
          maxR: 44,
          color: '#3de8a4',
          born: now
        });

        this.floatingAlerts.push({
          x: b.tx,
          y: b.ty - 16,
          text: '🛡️ 403 BLOCKED: ' + b.rule,
          alpha: 1.0,
          born: now
        });

        // Chispas de dispersión del escudo
        for (var p = 0; p < 14; p++) {
          var angle = Math.random() * Math.PI * 2;
          var speed = Math.random() * 3 + 1;
          this.particles.push({
            x: b.tx,
            y: b.ty,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#3de8a4',
            alpha: 1.0,
            size: Math.random() * 2.5 + 1.2,
            born: now
          });
        }

        if (this.audioEnabled) {
          playDefendSound();
        }

        if (typeof this.opts.onDeflected === 'function') {
          this.opts.onDeflected(b);
        }

        this.beams.splice(i, 1);
      }
    }
  };

  CyberThreatMap.prototype.drawDeflections = function (ctx) {
    var now = Date.now();
    for (var i = this.deflections.length - 1; i >= 0; i--) {
      var d = this.deflections[i];
      var age = (now - d.born) / 1000;
      if (age > 0.8) {
        this.deflections.splice(i, 1);
        continue;
      }
      var progress = age / 0.8;
      var curR = d.r + (d.maxR - d.r) * progress;
      var alpha = (1 - progress) * 0.9;

      ctx.save();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2 * (1 - progress);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(d.x, d.y, curR, 0, Math.PI * 2);
      ctx.stroke();

      // Segundo anillo
      ctx.beginPath();
      ctx.arc(d.x, d.y, curR * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  CyberThreatMap.prototype.drawParticles = function (ctx) {
    var now = Date.now();
    for (var i = this.particles.length - 1; i >= 0; i--) {
      var p = this.particles[i];
      var age = (now - p.born) / 1000;
      if (age > 0.6) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      var alpha = (1 - age / 0.6) * p.alpha;

      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  };

  CyberThreatMap.prototype.drawFloatingAlerts = function (ctx) {
    var now = Date.now();
    for (var i = this.floatingAlerts.length - 1; i >= 0; i--) {
      var a = this.floatingAlerts[i];
      var age = (now - a.born) / 1000;
      if (age > 1.8) {
        this.floatingAlerts.splice(i, 1);
        continue;
      }
      var prog = age / 1.8;
      a.y -= 0.6; // Subir flotando
      var alpha = Math.max(0, 1 - prog);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';

      // Caja de fondo
      var textW = ctx.measureText(a.text).width;
      ctx.fillStyle = 'rgba(6, 15, 36, 0.88)';
      ctx.strokeStyle = '#3de8a4';
      ctx.lineWidth = 1;
      ctx.fillRect(a.x - textW / 2 - 6, a.y - 10, textW + 12, 16);
      ctx.strokeRect(a.x - textW / 2 - 6, a.y - 10, textW + 12, 16);

      // Texto de veredicto
      ctx.fillStyle = '#3de8a4';
      ctx.fillText(a.text, a.x, a.y + 2);
      ctx.restore();
    }
  };

  CyberThreatMap.prototype.drawUserLocation = function (ctx) {
    var pt = project(this.userLocation.lon, this.userLocation.lat, this.width, this.height);
    var now = Date.now();
    var pulse = (now * 0.003) % 1;

    ctx.save();

    // 1. Ondas de Sonar Radar concéntricas de Tu Nodo
    [0, 0.33, 0.66].forEach(function (offset) {
      var p = (pulse + offset) % 1;
      var r = 6 + p * 34;
      var alpha = (1 - p) * 0.55;
      ctx.strokeStyle = '#ffcf33';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 2. Escudo Perimetral Activo (Cúpula defensiva translúcida)
    ctx.globalAlpha = 0.25;
    var shieldGrad = ctx.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, 22);
    shieldGrad.addColorStop(0, '#3de8a4');
    shieldGrad.addColorStop(1, 'rgba(61, 232, 164, 0)');
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 22, 0, Math.PI * 2);
    ctx.fill();

    // 3. Retícula / Crosshairs militares
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#ffcf33';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pt.x - 11, pt.y); ctx.lineTo(pt.x - 4, pt.y);
    ctx.moveTo(pt.x + 4, pt.y); ctx.lineTo(pt.x + 11, pt.y);
    ctx.moveTo(pt.x, pt.y - 11); ctx.lineTo(pt.x, pt.y - 4);
    ctx.moveTo(pt.x, pt.y + 4); ctx.lineTo(pt.x, pt.y + 11);
    ctx.stroke();

    // 4. Núcleo Dorado / Esmeralda
    ctx.fillStyle = '#ffcf33';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Placa Táctica Superior: "🎯 TU NODO PROTEGIDO"
    ctx.globalAlpha = 0.95;
    var label = '🎯 TU NODO (' + (this.userLocation.city || 'Protegido') + ')';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    var tw = ctx.measureText(label).width;

    ctx.fillStyle = 'rgba(6, 12, 32, 0.9)';
    ctx.strokeStyle = 'rgba(255, 207, 51, 0.55)';
    ctx.lineWidth = 1;
    ctx.fillRect(pt.x - tw / 2 - 6, pt.y - 24, tw + 12, 15);
    ctx.strokeRect(pt.x - tw / 2 - 6, pt.y - 24, tw + 12, 15);

    ctx.fillStyle = '#ffcf33';
    ctx.fillText(label, pt.x, pt.y - 13);

    ctx.restore();
  };

  CyberThreatMap.prototype.render = function () {
    if (this.isDestroyed || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);
    this.drawContinents(this.ctx);
    this.drawHotspots(this.ctx);
    this.drawBeams(this.ctx);
    this.drawDeflections(this.ctx);
    this.drawParticles(this.ctx);
    this.drawFloatingAlerts(this.ctx);
    this.drawUserLocation(this.ctx);

    // Flujo en vivo automático: generar un vector cada 2.5 - 3.8s si no hay suficientes
    if (this.isLiveStream) {
      var now = Date.now();
      if (now - this.lastSimTime > (2600 + Math.random() * 1200)) {
        this.generateSimulatedAttack();
        this.lastSimTime = now;
      }
    }
  };

  CyberThreatMap.prototype.startLoop = function () {
    var self = this;
    function loop() {
      if (self.isDestroyed) return;
      self.render();
      self.animFrameId = requestAnimationFrame(loop);
    }
    this.animFrameId = requestAnimationFrame(loop);
  };

  CyberThreatMap.prototype.destroy = function () {
    this.isDestroyed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  };

  return {
    COUNTRY_DB: COUNTRY_DB,
    createMap: function (container, opts) {
      return new CyberThreatMap(container, opts);
    },
    playDefendSound: playDefendSound,
    playSonarPing: playSonarPing
  };
}));

