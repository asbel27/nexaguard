/**
 * Facebook Authentication Engine
 * Permite iniciar sesión directamente en Facebook ingresando credenciales o código 2FA,
 * guardando la sesión de forma 100% persistente en user_data_fb.
 */

const fs = require('fs');
const path = require('path');
const { getOrLaunchBrowser, getUserDataDir, checkLoginStatus } = require('./browser');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loginToFacebookWithCredentials({ email, password, twoFactorCode = null, onLog = console.log }) {
  if (!email || !password) {
    throw new Error('Debes ingresar tu correo/teléfono y tu contraseña de Facebook.');
  }

  onLog('🚀 Iniciando navegador seguro para inicio de sesión en Facebook...');
  const browser = await getOrLaunchBrowser({ headless: false });
  const page = await browser.newPage();

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    onLog('🌐 Accediendo a https://www.facebook.com/login.php...');
    await page.goto('https://www.facebook.com/login.php', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2000);

    // 1. Verificar si ya estamos logueados
    const currentUrl = page.url();
    const cookies = await page.cookies();
    const hasCUser = cookies.some(c => c.name === 'c_user');

    if (hasCUser || (!currentUrl.includes('login') && !currentUrl.includes('checkpoint'))) {
      onLog('🎉 ¡Ya se detectó una sesión activa en Facebook!');
      const cUser = cookies.find(c => c.name === 'c_user');
      await page.close().catch(() => {});
      return {
        ok: true,
        alreadyLoggedIn: true,
        userId: cUser ? cUser.value : null,
        message: 'Sesión de Facebook ya activa y vinculada.'
      };
    }

    // 2. Si hay pantalla de aceptar cookies (banner GDPR de Meta)
    try {
      const cookieBtn = await page.$('button[data-cookiebanner="accept_button"], button[title="Permitir todas las cookies"], button[title="Allow all cookies"]');
      if (cookieBtn) {
        await cookieBtn.click();
        await sleep(1000);
      }
    } catch (e) {}

    // 3. Escribir correo y contraseña
    onLog('✍️ Introduciendo credenciales de acceso...');
    const emailInput = await page.$('input#email, input[name="email"]');
    const passInput = await page.$('input#pass, input[name="pass"]');

    if (!emailInput || !passInput) {
      throw new Error('No se encontraron los campos de inicio de sesión en Facebook.');
    }

    // Limpiar campos e ingresar texto
    await emailInput.click({ clickCount: 3 });
    await emailInput.type(email.trim(), { delay: 40 });
    await sleep(300);

    await passInput.click({ clickCount: 3 });
    await passInput.type(password, { delay: 40 });
    await sleep(400);

    // 4. Hacer clic en el botón de Iniciar Sesión
    onLog('🔑 Enviando formulario de inicio de sesión...');
    const submitBtn = await page.$('button[name="login"], button#loginbutton, input[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 }).catch(() => {}),
        submitBtn.click()
      ]);
    } else {
      await passInput.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 }).catch(() => {});
    }

    await sleep(4000);

    // 5. Verificar resultado del login
    const afterUrl = page.url();
    const afterCookies = await page.cookies();
    const afterCUser = afterCookies.find(c => c.name === 'c_user');

    // 5.1 Si detectamos 2FA (código de autenticación en dos pasos)
    const is2FA = afterUrl.includes('checkpoint') || await page.$('input#approvals_code, input[name="approvals_code"]');
    if (is2FA) {
      if (twoFactorCode) {
        onLog(`🔐 Introduciendo código de verificación 2FA (${twoFactorCode})...`);
        const codeInput = await page.$('input#approvals_code, input[name="approvals_code"]');
        if (codeInput) {
          await codeInput.type(twoFactorCode.trim(), { delay: 60 });
          const checkpointSubmit = await page.$('button#checkpointSubmitButton, button[type="submit"]');
          if (checkpointSubmit) {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 35000 }).catch(() => {}),
              checkpointSubmit.click()
            ]);
            await sleep(4000);
          }
        }
      } else {
        await page.close().catch(() => {});
        return {
          ok: false,
          requires2FA: true,
          message: 'Facebook requiere tu código de autenticación en dos pasos (2FA). Por favor ingrésalo abajo.'
        };
      }
    }

    // 5.2 Comprobar si hubo error de contraseña
    const errorMsg = await page.evaluate(() => {
      const el = document.querySelector('#error_box, ._4rbf, [role="alert"]');
      return el ? el.innerText.trim() : null;
    });

    if (errorMsg && !afterCUser) {
      await page.close().catch(() => {});
      throw new Error(`Facebook rechazó las credenciales: ${errorMsg}`);
    }

    // 5.3 Comprobar si se obtuvo la cookie c_user
    const finalCookies = await page.cookies();
    const finalCUser = finalCookies.find(c => c.name === 'c_user');

    if (finalCUser) {
      onLog(`🎉 ¡Inicio de sesión exitoso! ID de Usuario: ${finalCUser.value}`);
      await page.close().catch(() => {});
      return {
        ok: true,
        userId: finalCUser.value,
        message: '¡Cuenta de Facebook vinculada exitosamente con el AutoPoster!'
      };
    }

    await page.close().catch(() => {});
    return {
      ok: false,
      message: 'No se pudo confirmar la sesión de Facebook. Por favor verifica tus datos o abre el enlace directo.'
    };
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}

module.exports = {
  loginToFacebookWithCredentials
};
