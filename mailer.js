'use strict';
/* =====================================================================
   NexaGuard · Servicio de Correo Electrónico
   - Notificación de nuevo caso al Administrador (Gmail)
   - Copia de seguridad y bienvenida automática al Cliente
   - Compatible con Resend HTTPS API (Render Free) y SMTP con Nodemailer
   ===================================================================== */
const nodemailer = require('nodemailer');

function createMailer(options = {}) {
  const host = options.host || process.env.SMTP_HOST || 'smtp.titan.email';
  const port = Number(options.port || process.env.SMTP_PORT || 465);
  const secureEnv = process.env.SMTP_SECURE;
  const secure = options.secure !== undefined
    ? options.secure
    : (secureEnv !== undefined ? (secureEnv === '1' || secureEnv === 'true') : (port === 465));
  const user = options.user || process.env.SMTP_USER || 'contacto@nexaguards.com';
  const pass = options.pass || process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const toEmail = options.to || process.env.CONTACT_TO_EMAIL || process.env.ADMIN_EMAIL || 'asbeldev8@gmail.com';
  const resendApiKey = options.resendKey || process.env.RESEND_API_KEY || '';

  const isConfigured = !!resendApiKey || !!(host && user && pass);

  let transporter = null;
  if (!resendApiKey && isConfigured) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---- Despacho común de correo (vía Resend HTTPS o SMTP Nodemailer) ---- */
  async function dispatchEmail({ to, replyTo, subject, html, text }) {
    if (resendApiKey) {
      const fromAddr = process.env.RESEND_FROM || 'NexaGuard <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + resendApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddr,
          to: Array.isArray(to) ? to : [to],
          reply_to: replyTo,
          subject,
          html,
          text
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || ('Error al enviar con servicio de correo: HTTP ' + res.status));
      }
      return await res.json();
    }

    if (transporter) {
      try {
        return await transporter.sendMail({
          from: `"NexaGuard" <${user}>`,
          to,
          replyTo,
          subject,
          text,
          html
        });
      } catch (err) {
        if (err.code === 'ETIMEDOUT' || (err.message && /timeout|ETIMEDOUT/i.test(err.message))) {
          throw new Error(`Tiempo de espera agotado al conectar a ${host}:${port}. El puerto SMTP está bloqueado o inaccesible desde Render.`);
        }
        throw err;
      }
    }

    throw new Error('Servicio de correo no configurado.');
  }

  /* ---- Plantilla 1: Notificación para el Administrador ---- */
  function buildAdminEmail({ fullName, cleanSubject, dateStr, correo, telefono, mensaje, ip }) {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080d24; color: #eaf0ff; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #0e173e; border: 1px solid #233575; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #15214f 0%, #0b1235 100%); border-bottom: 2px solid #ffcf33; padding: 24px 28px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { margin: 0; color: #a9beff; font-size: 13px; }
    .content { padding: 28px; }
    .badge { display: inline-block; background: rgba(255, 207, 51, 0.15); color: #ffcf33; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(255, 207, 51, 0.3); margin-bottom: 18px; }
    .field-table { width: 100%; border-collapse: collapse; margin-bottom: 22px; }
    .field-table td { padding: 10px 12px; border-bottom: 1px solid #1a275a; font-size: 14px; }
    .field-label { color: #8e9ec9; width: 110px; font-weight: 600; }
    .field-value { color: #ffffff; }
    .field-value a { color: #6b8cff; text-decoration: none; font-weight: 500; }
    .field-value a:hover { text-decoration: underline; }
    .msg-box { background: #070c22; border: 1px solid #1f2e67; border-radius: 8px; padding: 18px; color: #e1e7fa; font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px; }
    .btn-wrap { text-align: center; margin: 24px 0 12px; }
    .reply-btn { display: inline-block; background: #ffcf33; color: #0b1235; font-weight: 700; font-size: 14px; padding: 12px 26px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 14px rgba(255, 207, 51, 0.3); }
    .footer { background: #070b1e; padding: 16px 28px; font-size: 11px; color: #6a79a3; text-align: center; border-top: 1px solid #151e44; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 32px; margin-bottom: 8px;">🛡️</div>
      <h1>Nuevo Mensaje de Contacto</h1>
      <p>Recibido desde la web oficial de NexaGuard</p>
    </div>
    <div class="content">
      <span class="badge">NUEVO CASO RECIBIDO</span>
      <table class="field-table">
        <tr>
          <td class="field-label">Nombre:</td>
          <td class="field-value"><strong>${escapeHtml(fullName)}</strong></td>
        </tr>
        <tr>
          <td class="field-label">Correo:</td>
          <td class="field-value"><a href="mailto:${escapeHtml(correo)}">${escapeHtml(correo)}</a></td>
        </tr>
        <tr>
          <td class="field-label">Teléfono:</td>
          <td class="field-value">${telefono ? `<a href="tel:${escapeHtml(telefono)}">${escapeHtml(telefono)}</a>` : '<em style="color:#7182b0">No especificado</em>'}</td>
        </tr>
        <tr>
          <td class="field-label">Asunto:</td>
          <td class="field-value"><strong>${escapeHtml(cleanSubject)}</strong></td>
        </tr>
        <tr>
          <td class="field-label">Fecha:</td>
          <td class="field-value">${escapeHtml(dateStr)}</td>
        </tr>
        ${ip ? `<tr><td class="field-label">IP Origen:</td><td class="field-value" style="font-family:monospace;font-size:12px;color:#8e9ec9;">${escapeHtml(ip)}</td></tr>` : ''}
      </table>

      <div style="font-size:13px; font-weight:600; color:#8e9ec9; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Mensaje / Diagnóstico del cliente:</div>
      <div class="msg-box">${escapeHtml(mensaje || 'Sin mensaje adicional.')}</div>

      <div class="btn-wrap">
        <a class="reply-btn" href="mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent('Re: ' + cleanSubject + ' - NexaGuard')}">
          ↩️ Responder directamente a ${escapeHtml(fullName)}
        </a>
      </div>
    </div>
    <div class="footer">
      Este correo fue generado por el formulario seguro de NexaGuard.<br>
      Puedes responder directamente a este correo para escribirle al cliente.
    </div>
  </div>
</body>
</html>
    `;

    const text = `
🛡️ NUEVO MENSAJE DE CONTACTO (NexaGuard)
--------------------------------------------------
Nombre:   ${fullName}
Correo:   ${correo}
Teléfono: ${telefono || 'No especificado'}
Asunto:   ${cleanSubject}
Fecha:    ${dateStr}
${ip ? 'IP:       ' + ip : ''}

MENSAJE / DIAGNÓSTICO:
--------------------------------------------------
${mensaje || 'Sin mensaje adicional.'}
--------------------------------------------------
Puedes responder directamente a este correo para escribirle a ${correo}.
    `;

    return { html, text };
  }

  /* ---- Plantilla 2: Bienvenida y Copia del Caso para el Cliente ---- */
  /* ---- Plantilla 2: Bienvenida y Copia del Caso para el Cliente ---- */
  function buildClientEmail({ fullName, cleanSubject, dateStr, correo, telefono, mensaje }) {
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080d24; color: #ffffff; margin: 0; padding: 24px; -webkit-text-size-adjust: 100%; }
    .card { max-width: 600px; margin: 0 auto; background: #0e173e; border: 1px solid #233575; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #15214f 0%, #0b1235 100%); border-bottom: 2px solid #ffcf33; padding: 26px 28px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; color: #ffffff !important; font-size: 21px; font-weight: 700; }
    .header p { margin: 0; color: #ffcf33 !important; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .content { padding: 28px; color: #ffffff !important; }
    .intro { font-size: 15px; line-height: 1.6; color: #ffffff !important; margin-bottom: 22px; font-weight: normal; }
    .badge-wrap { margin-bottom: 16px; }
    .badge { display: inline-block; background: rgba(10, 186, 115, 0.15); color: #0aba73 !important; font-weight: 600; font-size: 12px; padding: 5px 12px; border-radius: 20px; border: 1px solid rgba(10, 186, 115, 0.3); }
    .section-title { font-size: 13px; font-weight: 700; color: #ffcf33 !important; text-transform: uppercase; letter-spacing: 0.5px; margin: 20px 0 10px; }
    .field-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .field-table td { padding: 10px 12px; border-bottom: 1px solid #1a275a; font-size: 14px; }
    .field-label { color: #8e9ec9 !important; width: 130px; font-weight: 600; }
    .field-value { color: #ffffff !important; font-weight: normal !important; }
    .field-value a, .field-value span, .field-value strong { color: #ffffff !important; font-weight: normal !important; text-decoration: none !important; }
    .msg-box { background: #070c22; border: 1px solid #1f2e67; border-radius: 8px; padding: 18px; color: #ffffff !important; font-size: 14px; font-weight: normal !important; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px; }
    .steps { list-style: none; padding: 0; margin: 16px 0 24px; display: grid; gap: 10px; }
    .step-item { background: #070c22; border: 1px solid #1c2a5e; border-radius: 8px; padding: 12px 16px; display: flex; align-items: flex-start; gap: 12px; font-size: 13px; color: #ffffff !important; line-height: 1.4; }
    .step-num { background: #ffcf33; color: #0b1235 !important; font-weight: 800; font-size: 12px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; }
    .footer { background: #070b1e; padding: 20px 28px; font-size: 12px; color: #8e9ec9 !important; text-align: center; border-top: 1px solid #151e44; line-height: 1.5; }
    .footer a { color: #ffcf33 !important; text-decoration: none; }
    a, a:link, a:visited { color: #ffffff !important; text-decoration: none !important; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div style="font-size: 36px; margin-bottom: 8px;">🛡️</div>
      <h1>¡Hola, ${escapeHtml(fullName)}!</h1>
      <p>Hemos recibido tu solicitud correctamente</p>
    </div>
    <div class="content">
      <div class="badge-wrap">
        <span class="badge">✓ CASO REGISTRADO EN NUESTRO SISTEMA</span>
      </div>

      <p class="intro">
        Gracias por ponerte en contacto con <strong>NexaGuard</strong>. Nuestro equipo técnico ya ha recibido los detalles de tu solicitud y está revisando tu caso para responderte con la mejor alternativa de solución.
      </p>

      <div class="section-title">📋 Resumen de tu solicitud / servicio:</div>
      <table class="field-table">
        <tr>
          <td class="field-label">Servicio / Asunto:</td>
          <td class="field-value" style="color:#ffffff !important; font-weight:normal !important;">
            <span style="color:#ffffff !important; font-weight:normal !important; text-decoration:none !important;">${escapeHtml(cleanSubject)}</span>
          </td>
        </tr>
        <tr>
          <td class="field-label">Fecha de registro:</td>
          <td class="field-value" style="color:#ffffff !important; font-weight:normal !important;">
            <span style="color:#ffffff !important; font-weight:normal !important; text-decoration:none !important;">${escapeHtml(dateStr)}</span>
          </td>
        </tr>
        <tr>
          <td class="field-label">Tu correo:</td>
          <td class="field-value" style="color:#ffffff !important; font-weight:normal !important;">
            <span style="color:#ffffff !important; font-weight:normal !important; text-decoration:none !important;">${escapeHtml(correo)}</span>
          </td>
        </tr>
        <tr>
          <td class="field-label">Tu teléfono:</td>
          <td class="field-value" style="color:#ffffff !important; font-weight:normal !important;">
            <span style="color:#ffffff !important; font-weight:normal !important; text-decoration:none !important;">${escapeHtml(telefono || 'No especificado')}</span>
          </td>
        </tr>
      </table>

      <div class="section-title">Detalles proporcionados:</div>
      <div class="msg-box" style="color:#ffffff !important; font-weight:normal !important;">${escapeHtml(mensaje || 'Sin detalles adicionales.')}</div>

      <div class="section-title">⚡ Próximos pasos:</div>
      <div class="steps">
        <div class="step-item">
          <div class="step-num">1</div>
          <div><span style="color:#ffcf33; font-weight:700;">Revisión técnica:</span> Evaluamos los requerimientos y el estado de tu sitio web.</div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div><span style="color:#ffcf33; font-weight:700;">Contacto directo:</span> Nos pondremos en contacto contigo por este medio o por WhatsApp con la propuesta de trabajo.</div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div><span style="color:#ffcf33; font-weight:700;">Garantía de servicio:</span> Todo trabajo realizado incluye garantía de 30 días y soporte técnico.</div>
        </div>
      </div>
    </div>
    <div class="footer">
      <strong>NexaGuard</strong> · Servicio profesional para sitios WordPress.<br>
      Puedes responder directamente a este correo si deseas agregar algún dato a tu caso.<br>
      <a href="https://nexaguards.com" style="color:#ffcf33 !important;">nexaguards.com</a> · contacto@nexaguards.com
    </div>
  </div>
</body>
</html>
    `;

    const text = `
🛡️ ¡HOLA, ${fullName}! - HEMOS RECIBIDO TU SOLICITUD
--------------------------------------------------
Gracias por contactar con NexaGuard. Nuestro equipo ya recibió tu caso y está analizando la información de tu sitio web.

RESUMEN DE TU CASO:
--------------------------------------------------
Servicio / Asunto: ${cleanSubject}
Fecha de apertura: ${dateStr}
Tu correo:         ${correo}
Tu teléfono:       ${telefono || 'No especificado'}

DETALLES O SÍNTOMAS ENVIADOS:
--------------------------------------------------
${mensaje || 'Sin detalles adicionales.'}
--------------------------------------------------

¿QUÉ SIGUE AHORA?
1. Diagnóstico: Un ingeniero revisa los síntomas de tu WordPress.
2. Contacto directo: Te responderemos con la solución recomendada.
3. Garantía y Blindaje: Todo servicio incluye 30 días de garantía.

NexaGuard · Reparación y blindaje para WordPress
contacto@nexaguards.com
    `;

    return { html, text };
  }

  /* ---- Envío Principal: Notificación al Admin + Copia al Cliente ---- */
  async function sendContactEmail({ nombre, apellido, telefono, correo, asunto, mensaje, ip }) {
    if (!isConfigured) {
      console.warn('⚠️ Servicio de correo no configurado (falta RESEND_API_KEY o SMTP_PASS).');
      throw new Error('El servicio de correo aún no está configurado en el servidor.');
    }

    const fullName = [nombre, apellido].filter(Boolean).join(' ').trim() || 'Cliente';
    const cleanSubject = asunto ? asunto.trim() : 'Consulta desde la web';
    const dateStr = new Date().toLocaleString('es-ES', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' });

    // 1. Notificación para el Administrador (tu Gmail)
    const adminEmailData = buildAdminEmail({ fullName, cleanSubject, dateStr, correo, telefono, mensaje, ip });
    const adminSubject = `🛡️ [NexaGuard] ${cleanSubject} — ${fullName}`;

    const adminResult = await dispatchEmail({
      to: toEmail,
      replyTo: `"${fullName.replace(/["\r\n]/g, '')}" <${correo}>`,
      subject: adminSubject,
      html: adminEmailData.html,
      text: adminEmailData.text
    });

    // 2. Copia de Bienvenida para el Cliente
    if (correo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) && correo.toLowerCase() !== toEmail.toLowerCase()) {
      try {
        const clientEmailData = buildClientEmail({ fullName, cleanSubject, dateStr, correo, telefono, mensaje });
        const clientSubject = `Confirmación de solicitud de servicio — NexaGuard`;

        await dispatchEmail({
          to: correo,
          replyTo: `"NexaGuard Soporte" <${user}>`,
          subject: clientSubject,
          html: clientEmailData.html,
          text: clientEmailData.text
        });
      } catch (clientErr) {
        // En modo de prueba de Resend (sin dominio verificado), Resend no deja enviar a correos ajenos.
        // Capturamos el aviso para que la solicitud del cliente no se interrumpa.
        console.warn('Aviso: No se pudo enviar la copia al cliente (requiere verificar dominio en resend.com/domains):', clientErr.message);
      }
    }

    return adminResult;
  }

  return {
    isConfigured,
    user,
    toEmail,
    sendContactEmail
  };
}

module.exports = { createMailer };
