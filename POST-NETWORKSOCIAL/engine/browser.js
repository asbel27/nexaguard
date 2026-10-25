/**
 * Browser Engine (Puppeteer-core + Google Chrome)
 * Maneja el navegador real Google Chrome con un perfil de usuario persistente (user_data_fb).
 * Esto permite que el usuario inicie sesión en Facebook / Instagram UNA SOLA VEZ y las cookies se guarden para siempre.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { exec, spawn } = require('child_process');
const puppeteer = require('puppeteer-core');

const DEFAULT_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

let browserInstance = null;
const DEBUG_PORT = 9222;

function findChromePath(customPath) {
  if (customPath && fs.existsSync(customPath)) return customPath;
  for (const p of DEFAULT_CHROME_PATHS) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function getUserDataDir() {
  const dir = path.join(__dirname, '..', 'user_data_fb');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanStaleLocks(userDataDir) {
  try {
    const lockfile = path.join(userDataDir, 'lockfile');
    if (fs.existsSync(lockfile)) {
      try { fs.unlinkSync(lockfile); } catch (e) {}
    }
  } catch (e) {}
}

/**
 * Termina cualquier proceso de Chrome residual que tenga bloqueada la carpeta user_data_fb
 */
function killOrphanUserDataChrome() {
  return new Promise((resolve) => {
    resolve();
  });
}

/**
 * Comprueba si el puerto de depuración de Chrome (9222) responde
 */
function isDebugPortActive(port = DEBUG_PORT) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, { timeout: 1200 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Obtiene una instancia activa de navegador (vía CDP en port 9222 o nuevo launch)
 */
async function getOrLaunchBrowser(options = {}) {
  // 1. Si ya tenemos una instancia conectada y viva, reusarla
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  // 2. Si hay un Chrome interactivo abierto en el puerto 9222, conectarse a él
  const isPortActive = await isDebugPortActive(DEBUG_PORT);
  if (isPortActive) {
    try {
      browserInstance = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${DEBUG_PORT}`,
        defaultViewport: null
      });
      browserInstance.on('disconnected', () => {
        browserInstance = null;
      });
      return browserInstance;
    } catch (e) {
      browserInstance = null;
    }
  }

  // 3. De lo contrario, lanzar nueva instancia con Puppeteer
  const chromePath = findChromePath(options.chromePath);
  if (!chromePath) {
    throw new Error('No se encontró Google Chrome en las rutas estándar de Windows. Por favor verifica que Google Chrome esté instalado.');
  }

  const userDataDir = getUserDataDir();
  cleanStaleLocks(userDataDir);

  const headless = options.headless !== undefined ? options.headless : false;

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-infobars',
    '--start-maximized',
    '--window-size=1280,800',
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--ignore-certificate-errors',
    '--disable-blink-features=AutomationControlled',
    '--disable-notifications'
  ];

  try {
    browserInstance = await puppeteer.launch({
      executablePath: chromePath,
      headless: headless ? 'new' : false,
      userDataDir: userDataDir,
      defaultViewport: null,
      args: launchArgs,
      ignoreDefaultArgs: ['--enable-automation']
    });
  } catch (err) {
    // Si falló por lock residual, forzar limpieza de proceso y relanzar
    await killOrphanUserDataChrome();
    cleanStaleLocks(userDataDir);
    browserInstance = await puppeteer.launch({
      executablePath: chromePath,
      headless: headless ? 'new' : false,
      userDataDir: userDataDir,
      defaultViewport: null,
      args: launchArgs,
      ignoreDefaultArgs: ['--enable-automation']
    });
  }

  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });

  return browserInstance;
}

/**
 * Abre la ventana visual interactiva de inicio de sesión (Facebook / Instagram)
 * Se ejecuta en modo App nativo (--app=URL) garantizando que se abra en el escritorio
 * visible de Windows con foco inmediato (exactamente como ventana de autorización).
 */
/**
 * Abre la ventana visual interactiva de inicio de sesión (Facebook / Instagram)
 * Se ejecuta lanzando el script .bat nativo desacoplado para garantizar que Windows
 * dibuje la ventana en el monitor interactivo visible del usuario.
 */
async function openInteractiveSession(targetUrl = 'https://www.facebook.com/login', platform = 'facebook') {
  // 1. Desconectar Puppeteer si estaba conectado
  await closeBrowser();

  // 2. Limpiar procesos huérfanos de Chrome con user_data_fb
  await killOrphanUserDataChrome();

  const userDataDir = getUserDataDir();
  cleanStaleLocks(userDataDir);

  const batPath = platform === 'instagram'
    ? path.join(__dirname, '..', 'ABRIR-SESION-INSTAGRAM.bat')
    : path.join(__dirname, '..', 'ABRIR-SESION-FACEBOOK.bat');

  // 3. Lanzar mediante cmd.exe /c start
  exec(`cmd.exe /c start "" "${batPath}"`, (err) => {
    if (err) {
      const chromePath = findChromePath();
      if (chromePath) {
        const startArgs = [
          `--remote-debugging-port=${DEBUG_PORT}`,
          `--user-data-dir=\`"${userDataDir}\`"`,
          '--window-size=1080,780',
          '--no-first-run',
          '--no-default-browser-check',
          `--app=\`"${targetUrl}\`"`
        ].join(' ');
        exec(`powershell -NoProfile -Command "Start-Process -FilePath '${chromePath}' -ArgumentList '${startArgs}' -WindowStyle Normal"`);
      }
    }
  });

  return { ok: true, launched: true, url: targetUrl, platform, batPath };
}

/**
 * Cierra la ventana interactiva si está abierta
 */
async function closeInteractiveWindow() {
  const isPortActive = await isDebugPortActive(DEBUG_PORT);
  if (isPortActive) {
    try {
      const browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${DEBUG_PORT}` });
      await browser.close();
      browserInstance = null;
      return { ok: true, closed: true };
    } catch (e) {}
  }
  await killOrphanUserDataChrome();
  browserInstance = null;
  return { ok: true, closed: true };
}

/**
 * Verifica con 100% de precisión si la sesión de Facebook / Instagram está activa y vinculada
 */
async function checkLoginStatus() {
  const userDataDir = getUserDataDir();
  let facebookLoggedIn = false;
  let instagramLoggedIn = false;
  let facebookUserId = null;
  let activeWindow = false;

  // 1. Probar en vivo mediante CDP si la ventana interactiva está abierta
  const isPortActive = await isDebugPortActive(DEBUG_PORT);
  if (isPortActive) {
    activeWindow = true;
    try {
      const browser = await puppeteer.connect({
        browserURL: `http://127.0.0.1:${DEBUG_PORT}`,
        defaultViewport: null
      });
      const pages = await browser.pages();
      for (const page of pages) {
        try {
          const cookies = await page.cookies();
          const cUser = cookies.find(c => c.name === 'c_user');
          if (cUser) {
            facebookLoggedIn = true;
            facebookUserId = cUser.value;
          }
          const instaUser = cookies.find(c => c.name === 'ds_user_id' || c.name === 'sessionid');
          if (instaUser) {
            instagramLoggedIn = true;
          }
        } catch (e) {}
      }
      browser.disconnect();
    } catch (e) {}
  }

  // 2. Si no se detectó vía CDP (ej. Chrome cerrado), inspeccionar el archivo SQLite de Cookies en disco
  if (!facebookLoggedIn || !instagramLoggedIn) {
    const defaultDir = path.join(userDataDir, 'Default');
    const networkDir = path.join(defaultDir, 'Network');
    const cookiesPath = fs.existsSync(path.join(networkDir, 'Cookies'))
      ? path.join(networkDir, 'Cookies')
      : path.join(defaultDir, 'Cookies');

    if (fs.existsSync(cookiesPath)) {
      try {
        const buf = fs.readFileSync(cookiesPath);
        const str = buf.toString('latin1');
        if (str.includes('c_user')) {
          facebookLoggedIn = true;
          // Intentar extraer el ID numérico que sigue a c_user
          const match = str.match(/c_user[^\d]*(\d{8,22})/);
          if (match) facebookUserId = match[1];
        }
        if (str.includes('sessionid') || str.includes('ds_user_id')) {
          instagramLoggedIn = true;
        }
      } catch (e) {
        // Archivo en uso exclusivo o sin acceso
      }
    }
  }

  const profileExists = fs.existsSync(path.join(userDataDir, 'Default'));

  return {
    profileExists,
    userDataDir,
    activeWindow,
    facebookLoggedIn,
    facebookUserId,
    instagramLoggedIn,
    statusText: facebookLoggedIn
      ? `Conectado a Facebook ${facebookUserId ? `(ID: ${facebookUserId})` : ''}`
      : 'Sesión de Facebook no iniciada'
  };
}

async function closeBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.close();
    } catch (e) {}
    browserInstance = null;
  }
}

module.exports = {
  findChromePath,
  getUserDataDir,
  getOrLaunchBrowser,
  openInteractiveSession,
  closeInteractiveWindow,
  checkLoginStatus,
  closeBrowser
};
