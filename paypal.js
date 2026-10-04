'use strict';
/* =====================================================================
   Cliente de PayPal (REST API v2 · Orders), sin dependencias.
   Usa el `fetch` global de Node 18+. No hace falta ninguna librería.
   Documentación: https://developer.paypal.com/docs/api/orders/v2/
   ===================================================================== */

function createPayPalClient(cfg) {
  cfg = Object.assign({ mode: 'live', timeoutMs: 15000 }, cfg || {});
  const base = cfg.apiBase || (cfg.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.paypal.com');
  const enabled = !!(cfg.clientId && cfg.clientSecret);
  let tokenCache = null; // { token, exp }

  function withTimeout(opts) {
    return Object.assign({}, opts, AbortSignal && AbortSignal.timeout ? { signal: AbortSignal.timeout(cfg.timeoutMs) } : {});
  }

  async function getToken() {
    if (tokenCache && tokenCache.exp > Date.now() + 30000) return tokenCache.token;
    let r;
    try {
      r = await fetch(base + '/v1/oauth2/token', withTimeout({
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(cfg.clientId + ':' + cfg.clientSecret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials'
      }));
    } catch (e) { throw new Error('No se pudo contactar a PayPal (' + (e.message || 'error de red') + ').'); }
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok || !d.access_token) { const err = new Error('No se pudo autenticar con PayPal: revisa PAYPAL_CLIENT_ID y PAYPAL_CLIENT_SECRET.'); err.status = 502; throw err; }
    tokenCache = { token: d.access_token, exp: Date.now() + (d.expires_in || 300) * 1000 };
    return tokenCache.token;
  }

  async function api(path, opts) {
    const token = await getToken();
    let r;
    try {
      r = await fetch(base + path, withTimeout(Object.assign({}, opts, {
        headers: Object.assign({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, (opts && opts.headers) || {})
      })));
    } catch (e) { const err = new Error('No se pudo contactar a PayPal (' + (e.message || 'error de red') + ').'); err.status = 502; throw err; }
    let d = {}; try { d = await r.json(); } catch (e) {}
    if (!r.ok) {
      const detail = (d.details && d.details[0] && (d.details[0].description || d.details[0].issue)) || d.message || ('HTTP ' + r.status);
      const err = new Error('PayPal: ' + detail); err.status = r.status; err.data = d; throw err;
    }
    return d;
  }

  /**
   * Crea una orden por el monto exacto de un plan.
   * amount: string con 2 decimales, ej. "199.00". currency: "USD".
   * referenceId: normalmente el id del plan; se usa para recuperar el plan al capturar.
   */
  async function createOrder({ amount, currency, referenceId, description, requestId }) {
    return api('/v2/checkout/orders', {
      method: 'POST',
      headers: requestId ? { 'PayPal-Request-Id': requestId } : {},
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ reference_id: referenceId, custom_id: referenceId, description: description, amount: { currency_code: currency, value: amount } }],
        application_context: {
          brand_name: 'NexaGuard',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW'
        }
      })
    });
  }

  async function captureOrder(orderId, requestId) {
    return api('/v2/checkout/orders/' + encodeURIComponent(orderId) + '/capture', {
      method: 'POST', headers: requestId ? { 'PayPal-Request-Id': requestId } : {}
    });
  }

  async function getOrder(orderId) { return api('/v2/checkout/orders/' + encodeURIComponent(orderId)); }

  return { enabled, base, mode: cfg.mode, getToken, createOrder, captureOrder, getOrder };
}

module.exports = { createPayPalClient };
