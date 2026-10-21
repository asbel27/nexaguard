/**
 * Browser Engine (Puppeteer-core + Google Chrome)
 * Maneja el navegador real Google Chrome con un perfil de usuario persistente (user_data_fb).
 * Esto permite que el usuario inicie sesión en Facebook / Instagram UNA SOLA VEZ y las cookies se guarden para siempre.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DEFAULT_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

let browserInstance = null;

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

async function getOrLaunchBrowser(options = {}) {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

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
    // Si falló por lock residual, intentar limpiar una vez y relanzar
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

async function openInteractiveSession(url = 'https://www.facebook.com') {
  if (browserInstance && !browserInstance.isConnected()) {
    browserInstance = null;
  }

  const browser = await getOrLaunchBrowser({ headless: false });
  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  try {
    await page.bringToFront();
  } catch (e) {}
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  return page;
}

async function checkLoginStatus() {
  const userDataDir = getUserDataDir();
  // Si la carpeta del perfil tiene cookies o datos creados
  const defaultDir = path.join(userDataDir, 'Default');
  const networkDir = path.join(defaultDir, 'Network');
  const cookiesPath1 = path.join(defaultDir, 'Cookies');
  const cookiesPath2 = path.join(networkDir, 'Cookies');

  const hasSessionFiles = fs.existsSync(cookiesPath1) || fs.existsSync(cookiesPath2);

  return {
    profileExists: hasSessionFiles,
    userDataDir: userDataDir
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
  checkLoginStatus,
  closeBrowser
};
