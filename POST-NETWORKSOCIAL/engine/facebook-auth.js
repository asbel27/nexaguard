/**
 * Facebook Authentication Engine
 * Permite iniciar sesión directamente en Facebook ingresando credenciales o código 2FA,
 * o importando cookies de sesión, guardando el perfil en user_data_fb.
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

    onLog('🌐 Accediendo a Facebook...');
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(2500);

    // 1. Verificar si ya estamos logueados
    let cookies = await page.cookies();
    let hasCUser = cookies.some(c => c.name === 'c_user');

    if (hasCUser) {
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
        await sleep(1500);
      }
    } catch (e) {}

    // 3. Comprobar si hay un perfil recordado en pantalla (ej: "Programador Asb - Continuar")
    const continueBtn = await page.$('div[aria-label*="Continuar"], [aria-label*="Continuar"]');
    if (continueBtn) {
      onLog('👤 Detectado perfil recordado en pantalla. Intentando continuar...');
      await continueBtn.click();
      await sleep(3500);

      cookies = await page.cookies();
      hasCUser = cookies.some(c => c.name === 'c_user');
      if (hasCUser) {
        const cUser = cookies.find(c => c.name === 'c_user');
        onLog(`🎉 ¡Inicio de sesión inmediato con el perfil guardado! ID: ${cUser.value}`);
        await page.close().catch(() => {});
        return {
          ok: true,
          userId: cUser.value,
          message: '¡Sesión vinculada con tu perfil guardado en Facebook!'
        };
      }
    }

    // 4. Si pide sólo contraseña para el perfil existente
    let passOnlyInput = await page.$('input[type="password"]');
    let emailInput = await page.$('input#email, input[name="email"], input[type="text"]');

    // Si no hay campo de email visible, buscar botón "Usar otro perfil" o "Iniciar sesión"
    if (!emailInput && !passOnlyInput) {
      onLog('🔍 Buscando opción de inicio de sesión con credenciales...');
      const otherProfileBtn = await page.evaluateHandle(() => {
        const els = Array.from(document.querySelectorAll('a, button, div[role="button"]'));
        return els.find(el => {
          const t = (el.innerText || '').toLowerCase();
          return t.includes('otro perfil') || t.includes('otra cuenta') || t.includes('iniciar sesión');
        });
      });
      const el = otherProfileBtn.asElement();
      if (el) {
        await el.click();
        await sleep(2500);
      }
    }

    // Volver a buscar campos tras clic
    emailInput = await page.$('input#email, input[name="email"]');
    let passInput = await page.$('input#pass, input[name="pass"], input[type="password"]');

    // Si aún no encontramos el email pero sí la contraseña (perfil ya seleccionado):
    if (!emailInput && passInput) {
      onLog('🔑 Introduciendo contraseña para el perfil actual...');
      await passInput.click({ clickCount: 3 });
      await passInput.type(password, { delay: 40 });
      await sleep(400);

      const submitBtn = await page.$('button[name="login"], button#loginbutton, button[type="submit"], [role="button"][tabindex="0"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await passInput.press('Enter');
      }
      await sleep(5000);
    } else if (emailInput && passInput) {
      onLog('✍️ Introduciendo correo y contraseña...');
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(email.trim(), { delay: 40 });
      await sleep(300);

      await passInput.click({ clickCount: 3 });
      await passInput.type(password, { delay: 40 });
      await sleep(400);

      onLog('🔑 Enviando formulario de inicio de sesión...');
      const submitBtn = await page.$('button[name="login"], button#loginbutton, input[type="submit"]');
      if (submitBtn) {
        await submitBtn.click();
      } else {
        await passInput.press('Enter');
      }
      await sleep(5000);
    } else {
      // Si no encontramos los campos, intentar navegar a la pantalla directa de login clásico
      onLog('🌐 Redirigiendo a pantalla de login alternativa...');
      await page.goto('https://www.facebook.com/login/device-based/regular/login/', { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(2000);

      emailInput = await page.$('input#email, input[name="email"]');
      passInput = await page.$('input#pass, input[name="pass"]');

      if (emailInput && passInput) {
        await emailInput.type(email.trim(), { delay: 40 });
        await passInput.type(password, { delay: 40 });
        const submitBtn = await page.$('button[name="login"], button#loginbutton');
        if (submitBtn) await submitBtn.click();
        else await passInput.press('Enter');
        await sleep(5000);
      } else {
        await page.close().catch(() => {});
        throw new Error('Facebook requiere que abras la ventana directamente para autorizar la cuenta.');
      }
    }

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
            await checkpointSubmit.click();
            await sleep(5000);
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

    // 5.2 Comprobar si se obtuvo la cookie c_user
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
      message: 'Facebook no completó el inicio de sesión. Por favor verifica tu contraseña o abre el navegador con el archivo .bat.'
    };
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}

/**
 * Importa cookies de Facebook directamente (c_user y xs) sin pasar por formularios
 */
async function importFacebookCookies({ cUser, xs, cookieString }) {
  let finalCUser = (cUser || '').trim();
  let finalXs = (xs || '').trim();

  if (cookieString) {
    const matchCUser = cookieString.match(/c_user=([^;]+)/);
    const matchXs = cookieString.match(/xs=([^;]+)/);
    if (matchCUser) finalCUser = matchCUser[1].trim();
    if (matchXs) finalXs = matchXs[1].trim();
  }

  if (!finalCUser || !finalXs) {
    throw new Error('Debes proporcionar el valor de c_user y xs (o la cadena completa de cookies de Facebook).');
  }

  const browser = await getOrLaunchBrowser({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    await page.setCookie(
      { name: 'c_user', value: finalCUser, domain: '.facebook.com', path: '/', httpOnly: false, secure: true },
      { name: 'xs', value: finalXs, domain: '.facebook.com', path: '/', httpOnly: true, secure: true }
    );

    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    const cookies = await page.cookies();
    const verified = cookies.some(c => c.name === 'c_user');

    await page.close().catch(() => {});

    if (verified) {
      return {
        ok: true,
        userId: finalCUser,
        message: '¡Cookies importadas y cuenta de Facebook vinculada con éxito!'
      };
    } else {
      throw new Error('Las cookies proporcionadas no fueron aceptadas por Facebook o están expiradas.');
    }
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}

module.exports = {
  loginToFacebookWithCredentials,
  importFacebookCookies
};
