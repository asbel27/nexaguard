'use strict';
/* =====================================================================
   Cliente de NOWPayments (API v1 · Invoices & IPN Webhook)
   Sin dependencias externas. Usa el `fetch` nativo de Node 18+ y `crypto`.
   Documentación: https://documenter.getpostman.com/view/7907941/S1a32n38
   ===================================================================== */

const crypto = require('crypto');

function createNowPaymentsClient(cfg) {
  cfg = Object.assign({
    apiBase: 'https://api.nowpayments.io/v1',
    timeoutMs: 15000,
    apiKey: '',
    ipnKey: ''
  }, cfg || {});

  const enabled = !!(cfg.apiKey && cfg.ipnKey);

  function withTimeout(opts) {
    return Object.assign({}, opts, (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? { signal: AbortSignal.timeout(cfg.timeoutMs) } : {});
  }

  async function api(path, opts) {
    if (!cfg.apiKey) throw new Error('NOWPayments: API key no configurada.');
    let r;
    const url = cfg.apiBase.replace(/\/+$/, '') + path;
    try {
      r = await fetch(url, withTimeout(Object.assign({}, opts, {
        headers: Object.assign({
          'x-api-key': cfg.apiKey,
          'Content-Type': 'application/json'
        }, (opts && opts.headers) || {})
      })));
    } catch (e) {
      const err = new Error('No se pudo contactar a NOWPayments (' + (e.message || 'error de red') + ').');
      err.status = 502;
      throw err;
    }

    let d = {};
    try { d = await r.json(); } catch (e) {}

    if (!r.ok) {
      const detail = d.message || d.error || ('HTTP ' + r.status);
      const err = new Error('NOWPayments: ' + detail);
      err.status = r.status;
      err.data = d;
      throw err;
    }
    return d;
  }

  /**
   * Comprueba el estado operativo de la API de NOWPayments
   */
  async function checkStatus() {
    return api('/status', { method: 'GET' });
  }

  /**
   * Crea un Invoice (factura de pago alojada) que soporta Binance Pay, USDT, BTC, etc.
   */
  async function createInvoice({
    price_amount,
    price_currency = 'usd',
    order_id,
    order_description,
    ipn_callback_url,
    success_url,
    cancel_url
  }) {
    const payload = {
      price_amount: Number(price_amount),
      price_currency: String(price_currency).toLowerCase(),
      order_id: String(order_id),
      order_description: String(order_description || 'NexaGuard Security'),
      ipn_callback_url: ipn_callback_url || undefined,
      success_url: success_url || undefined,
      cancel_url: cancel_url || undefined
    };

    return api('/invoice', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  /**
   * Verifica la firma criptográfica HMAC-SHA512 del webhook IPN de NOWPayments
   */
  function verifyIpnSignature(bodyObj, signatureHeader) {
    if (!cfg.ipnKey) return false;
    if (!signatureHeader || !bodyObj) return false;

    try {
      // NOWPayments ordena las claves del objeto alfabéticamente para calcular el hash HMAC
      function sortObject(obj) {
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
        return Object.keys(obj).sort().reduce((result, key) => {
          result[key] = (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) ? sortObject(obj[key]) : obj[key];
          return result;
        }, {});
      }

      const sortedObj = sortObject(bodyObj);
      const jsonStr = JSON.stringify(sortedObj);
      const expectedHmac = crypto.createHmac('sha512', cfg.ipnKey).update(jsonStr).digest('hex');

      const expectedBuf = Buffer.from(expectedHmac, 'hex');
      const receivedBuf = Buffer.from(String(signatureHeader).trim(), 'hex');

      if (expectedBuf.length !== receivedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch (e) {
      console.error('Error al verificar firma IPN de NOWPayments:', e.message);
      return false;
    }
  }

  return {
    enabled,
    apiKey: cfg.apiKey,
    checkStatus,
    createInvoice,
    verifyIpnSignature
  };
}

module.exports = { createNowPaymentsClient };

