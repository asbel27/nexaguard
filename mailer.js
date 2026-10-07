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

  function defangText(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/(https?:\/\/|www\.)/gi, '')
      .replace(/\.([a-zA-Z]{2,})/g, '&#8203;.$1');
  }

  /* ---- Plantilla 2: Bienvenida y Copia del Caso para el Cliente ---- */
  function buildClientEmail({ fullName, cleanSubject, dateStr, correo, telefono, mensaje }) {
    const safeSubject = defangText(cleanSubject);
    const safeMessage = defangText(mensaje || 'Sin detalles adicionales.');

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
    .field-value span { color: #ffffff !important; font-weight: normal !important; }
    .msg-box { background: #070c22; border: 1px solid #1f2e67; border-radius: 8px; padding: 18px; color: #ffffff !important; font-size: 14px; font-weight: normal !important; line-height: 1.6; white-space: pre-wrap; margin-bottom: 24px; }
    .steps { list-style: none; padding: 0; margin: 16px 0 24px; display: grid; gap: 10px; }
    .step-item { background: #070c22; border: 1px solid #1c2a5e; border-radius: 8px; padding: 12px 16px; display: flex; align-items: flex-start; gap: 12px; font-size: 13px; color: #ffffff !important; line-height: 1.4; }
    .step-num { background: #ffcf33; color: #0b1235 !important; font-weight: 800; font-size: 12px; width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; }
    .footer { background: #070b1e; padding: 20px 28px; font-size: 12px; color: #8e9ec9 !important; text-align: center; border-top: 1px solid #151e44; line-height: 1.5; }
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
            <span>${safeSubject}</span>
          </td>
        </tr>
        <tr>
          <td class="field-label">Fecha de registro:</td>
          <td class="field-value" style="color:#ffffff !important; font-weight:normal !important;">
            <span>${escapeHtml(dateStr)}</span>
          </td>
        </tr>
        <tr>
          <td class="field-label">Tu correo:</td>
          <td class="field-value" style="color:#ffffff !important; font-weight:normal !important;">
            <span>${escapeHtml(correo)}</span>
          </td>
        </tr>
        <tr>
          <td class="field-label">Tu teléfono:</td>
          <td class="field-value" style="color:#ffffff !important; font-weight:normal !important;">
            <span>${escapeHtml(telefono || 'No especificado')}</span>
          </td>
        </tr>
      </table>

      <div class="section-title">Detalles proporcionados:</div>
      <div class="msg-box" style="color:#ffffff !important; font-weight:normal !important;">${safeMessage}</div>

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
      nexaguards.com · contacto@nexaguards.com
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

  // 3. Notificación de Alerta de Amenaza Detectada (Monitoreo automático / Radar)
  async function sendThreatAlertEmail({ siteUrl, host, verdict, threatCount, findings = [], clientEmail, clientName }) {
    const isInf = verdict === 'infected';
    const tag = isInf ? 'INFECTADO' : 'SOSPECHOSO';
    const tagColor = isInf ? '#ff4560' : '#ffcf33';
    const dateStr = new Date().toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });

    let findingsHtml = '';
    if (findings && findings.length > 0) {
      findingsHtml = '<ul style="margin:12px 0;padding-left:20px;color:#cbd5e1;font-size:14px;line-height:1.6">';
      findings.forEach(f => {
        findingsHtml += `<li><strong style="color:${f.sev === 'crit' ? '#ff6b8a' : '#ffcf33'}">[${escapeHtml(f.sev ? f.sev.toUpperCase() : 'ALERTA')}]</strong> <b>${escapeHtml(f.title || f.cat || 'Amenaza')}</b>: ${escapeHtml(f.detail || '')}</li>`;
      });
      findingsHtml += '</ul>';
    } else {
      findingsHtml = '<p style="color:#94a3b8;font-size:14px">Se detectaron anomalías o scripts maliciosos durante la inspección automática.</p>';
    }

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:24px;background:#060a1f;font-family:system-ui,-apple-system,sans-serif;color:#e2e8f0">
      <div style="max-width:580px;margin:0 auto;background:#0d1538;border:1px solid rgba(255,69,96,0.35);border-radius:14px;padding:32px;box-shadow:0 15px 35px rgba(0,0,0,0.5)">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
          <span style="font-size:32px">🚨</span>
          <div>
            <h2 style="margin:0;color:#ffffff;font-size:20px">Alerta Crítica de Seguridad · NexaGuard</h2>
            <span style="display:inline-block;margin-top:4px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;background:rgba(255,69,96,0.18);color:${tagColor};border:1px solid ${tagColor}">${tag}: ${threatCount} AMENAZAS DETECTADAS</span>
          </div>
        </div>
        <p style="font-size:15px;line-height:1.6;color:#cbd5e1">El sistema de vigilancia automática de <strong>NexaGuard Security</strong> ha detectado actividad maliciosa en el siguiente sitio web:</p>
        <div style="background:#131c46;border-radius:8px;padding:16px;margin:18px 0;border:1px solid rgba(255,255,255,0.08)">
          <p style="margin:0 0 6px;font-size:14px;color:#94a3b8">Dominio analizado:</p>
          <a href="${escapeHtml(siteUrl)}" style="color:#ffcf33;font-size:17px;font-weight:700;text-decoration:none">${escapeHtml(host || siteUrl)}</a>
          <p style="margin:8px 0 0;font-size:12px;color:#64748b">Fecha de detección: ${escapeHtml(dateStr)}</p>
        </div>
        <h4 style="color:#ffffff;margin:20px 0 8px;font-size:15px">Detalle de hallazgos iniciales:</h4>
        ${findingsHtml}
        <div style="margin-top:28px;text-align:center">
          <a href="https://www.nexaguards.com/panel" style="display:inline-block;padding:12px 26px;background:#ff4560;color:#ffffff;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;box-shadow:0 4px 15px rgba(255,69,96,0.4)">Ingresar al Panel de Seguridad ›</a>
        </div>
        <p style="margin-top:24px;font-size:12px;color:#64748b;text-align:center">NexaGuard Security · Sistema Automatizado de Detección y Blindaje Forense</p>
      </div>
    </body>
    </html>`;

    const text = `🚨 ALERTA DE SEGURIDAD NEXAGUARD\n\nSitio: ${host || siteUrl}\nEstado: ${tag}\nAmenazas detectadas: ${threatCount}\nFecha: ${dateStr}\n\nIngresa al panel para desinfectar: https://www.nexaguards.com/panel`;

    const subject = `🚨 [NexaGuard Alerta] Amenaza detectada en ${host || siteUrl} (${tag})`;

    // Notificar al Administrador
    await dispatchEmail({ to: toEmail, subject, html, text });

    // Notificar al Cliente si tiene correo válido
    if (clientEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail) && clientEmail.toLowerCase() !== toEmail.toLowerCase()) {
      try {
        await dispatchEmail({ to: clientEmail, subject, html, text });
      } catch (err) {
        console.warn('Aviso: no se pudo enviar copia de alerta al cliente:', err.message);
      }
    }
  }

  return {
    isConfigured,
    user,
    toEmail,
    sendContactEmail,
    sendThreatAlertEmail
  };
}

module.exports = { createMailer };
