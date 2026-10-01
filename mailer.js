'use strict';
/* =====================================================================
   NexaGuard · Servicio de Correo Electrónico (SMTP con Nodemailer)
   Envía correos desde el correo corporativo (ej: contacto@nexaguards.com)
   usando el servidor SMTP de HostGator hacia la bandeja de Gmail del admin.
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

  async function sendContactEmail({ nombre, apellido, telefono, correo, asunto, mensaje, ip }) {
    if (!isConfigured) {
      console.warn('⚠️ SMTP no configurado: falta SMTP_PASS. Configura la contraseña en Render para enviar correos.');
      throw new Error('El servicio de correo aún no está configurado en el servidor (falta SMTP_PASS).');
    }

    const fullName = [nombre, apellido].filter(Boolean).join(' ').trim() || 'Cliente';
    const cleanSubject = asunto ? asunto.trim() : 'Consulta desde la web';
    const emailSubject = `🛡️ [NexaGuard] ${cleanSubject} — ${fullName}`;
    const dateStr = new Date().toLocaleString('es-ES', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' });

    const htmlContent = `
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
      <span class="badge">NUEVO CONTACTO</span>
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

      <div style="font-size:13px; font-weight:600; color:#8e9ec9; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">Mensaje del cliente:</div>
      <div class="msg-box">${escapeHtml(mensaje || 'Sin mensaje adicional.')}</div>

      <div class="btn-wrap">
        <a class="reply-btn" href="mailto:${encodeURIComponent(correo)}?subject=${encodeURIComponent('Re: ' + cleanSubject + ' - NexaGuard')}">
          ↩️ Responder directamente a ${escapeHtml(nombre || 'este cliente')}
        </a>
      </div>
    </div>
    <div class="footer">
      Este correo fue generado por el formulario seguro de NexaGuard.<br>
      Remitente autenticado con DKIM vía ${escapeHtml(user)}.
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
🛡️ NUEVO MENSAJE DE CONTACTO (NexaGuard)
--------------------------------------------------
Nombre:   ${fullName}
Correo:   ${correo}
Teléfono: ${telefono || 'No especificado'}
Asunto:   ${cleanSubject}
Fecha:    ${dateStr}
${ip ? 'IP:       ' + ip : ''}

MENSAJE:
--------------------------------------------------
${mensaje || 'Sin mensaje adicional.'}
--------------------------------------------------
Puedes responder directamente a este correo para escribirle a ${correo}.
    `;

    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + resendApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `NexaGuard <${user}>`,
          to: [toEmail],
          reply_to: correo,
          subject: emailSubject,
          html: htmlContent,
          text: textContent
        })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || ('Error al enviar con servicio de correo: HTTP ' + res.status));
      }
      return await res.json();
    }

    try {
      const info = await transporter.sendMail({
        from: `"NexaGuard" <${user}>`,
        to: toEmail,
        replyTo: `"${fullName.replace(/["\r\n]/g, '')}" <${correo}>`,
        subject: emailSubject,
        text: textContent,
        html: htmlContent
      });
      return info;
    } catch (err) {
      if (err.code === 'ETIMEDOUT' || (err.message && /timeout|ETIMEDOUT/i.test(err.message))) {
        throw new Error(`Tiempo de espera agotado al conectar a ${host}:${port}. El puerto SMTP está bloqueado o inaccesible desde Render.`);
      }
      throw err;
    }
  }

  return {
    isConfigured,
    user,
    toEmail,
    sendContactEmail
  };
}

module.exports = { createMailer };
