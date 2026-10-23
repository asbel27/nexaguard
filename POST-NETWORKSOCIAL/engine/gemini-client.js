/**
 * Google Gemini AI Client for NexaGuard Social AutoPoster
 * Conexión directa y oficial con la API de Google Gemini (Gemini 1.5 Flash / 2.0 / Pro).
 * Permite generar textos persuasivos con Spintax, conceptos creativos y prompts visuales para imágenes y video.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

function readSettings() {
  const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');
  try {
    if (!fs.existsSync(settingsPath)) return {};
    return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function getGeminiApiKey() {
  const settings = readSettings();
  return (settings.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
}

function httpsPost(url, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const u = new URL(url);

    const options = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 25000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const errMsg = parsed.error ? parsed.error.message : `HTTP ${res.statusCode}: ${body.slice(0, 200)}`;
            reject(new Error(errMsg));
          }
        } catch (e) {
          reject(new Error(`Respuesta no válida de Google Gemini: ${body.slice(0, 150)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Tiempo de espera agotado al conectar con Google Gemini'));
    });

    req.write(data);
    req.end();
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: 443,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      timeout: 25000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const errMsg = parsed.error ? parsed.error.message : `HTTP ${res.statusCode}: ${body.slice(0, 200)}`;
            reject(new Error(errMsg));
          }
        } catch (e) {
          reject(new Error(`Respuesta no válida de Google Gemini: ${body.slice(0, 150)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Tiempo de espera agotado al conectar con Google Gemini'));
    });

    req.end();
  });
}

let cachedWorkingModel = null;
let cachedApiVersion = 'v1beta';

/**
 * Consulta a Google AI Studio la lista de modelos soportados por la API Key del usuario
 */
async function queryAvailableModels(key) {
  const versions = ['v1beta', 'v1'];
  for (const v of versions) {
    try {
      const res = await httpsGet(`https://generativelanguage.googleapis.com/${v}/models?key=${key}`);
      if (res.models && Array.isArray(res.models)) {
        const supported = res.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));
        if (supported.length > 0) {
          return { version: v, models: supported };
        }
      }
    } catch (err) {
      // Intentar la siguiente versión de la API
    }
  }
  return { version: 'v1beta', models: [] };
}

/**
 * Resuelve automáticamente el mejor modelo funcional para la clave del usuario
 */
async function resolveBestGeminiModel(apiKey) {
  const key = (apiKey || getGeminiApiKey()).trim();
  if (!key) throw new Error('No has ingresado ninguna clave de API de Google Gemini.');

  if (cachedWorkingModel) return { model: cachedWorkingModel, version: cachedApiVersion };

  const settings = readSettings();
  if (settings.geminiModel) {
    cachedWorkingModel = settings.geminiModel;
    cachedApiVersion = settings.geminiApiVersion || 'v1beta';
    return { model: cachedWorkingModel, version: cachedApiVersion };
  }

  const { version, models } = await queryAvailableModels(key);
  if (models.length > 0) {
    // Lista de preferencia por calidad y velocidad
    const priorities = [
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-8b',
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-pro'
    ];

    let chosen = priorities.find(p => models.includes(p));
    if (!chosen) {
      chosen = models.find(m => m.includes('gemini') && !m.includes('embedding') && !m.includes('aqa')) || models[0];
    }

    cachedWorkingModel = chosen;
    cachedApiVersion = version;
    return { model: chosen, version };
  }

  // Fallback seguro
  return { model: 'gemini-1.5-flash-latest', version: 'v1beta' };
}

/**
 * Valida si una clave de Gemini es válida probando automáticamente los modelos admitidos
 */
async function testGeminiConnection(apiKey) {
  const key = (apiKey || getGeminiApiKey()).trim();
  if (!key) {
    throw new Error('No has ingresado ninguna clave de API de Google Gemini.');
  }

  // 1. Consultar dinámicamente qué modelos tiene habilitados esta clave específica
  const { version: detectedVersion, models: availableModels } = await queryAvailableModels(key);

  // 2. Ordenar modelos candidatos
  const defaultCandidates = [
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-pro'
  ];

  let candidatesToTry = [];
  if (availableModels.length > 0) {
    for (const d of defaultCandidates) {
      if (availableModels.includes(d)) candidatesToTry.push(d);
    }
    for (const m of availableModels) {
      if (!candidatesToTry.includes(m)) candidatesToTry.push(m);
    }
  } else {
    candidatesToTry = defaultCandidates;
  }

  let lastError = null;
  const versionsToTry = [detectedVersion, 'v1beta', 'v1'].filter((v, i, arr) => arr.indexOf(v) === i);

  for (const model of candidatesToTry) {
    for (const ver of versionsToTry) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${key}`;
        const payload = {
          contents: [{
            parts: [{ text: 'Responde únicamente con la palabra OK si estás conectado correctamente.' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0.1
          }
        };

        const res = await httpsPost(endpoint, payload);
        const reply = res.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'OK';

        cachedWorkingModel = model;
        cachedApiVersion = ver;

        return {
          ok: true,
          model,
          apiVersion: ver,
          reply,
          availableModels: availableModels.slice(0, 8),
          message: `¡Conexión exitosa con Google Gemini AI (Modelo: ${model})!`
        };
      } catch (err) {
        lastError = err;
      }
    }
  }

  throw lastError || new Error('No se pudo verificar la clave con los modelos disponibles de Google Gemini.');
}

/**
 * Genera texto con Google Gemini usando el modelo validado
 */
async function generateWithGemini({ prompt, systemInstruction = '', maxTokens = 1200, temperature = 0.7 }) {
  const key = getGeminiApiKey();
  if (!key) {
    throw new Error('Debes conectar tu clave de Google Gemini en la configuración.');
  }

  const { model, version } = await resolveBestGeminiModel(key);
  const versions = [version, 'v1beta', 'v1'].filter((v, i, arr) => arr.indexOf(v) === i);

  let lastError = null;
  for (const v of versions) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${key}`;
      const payload = {
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: temperature
        }
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      const res = await httpsPost(endpoint, payload);
      const text = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return text.trim();
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

/**
 * Genera una publicación persuasiva para Facebook / Instagram utilizando Gemini
 */
async function generateGeminiPost({ topic, brandName = 'NexaGuard', targetUrl = 'https://nexaguards.com', language = 'es' }) {
  const prompt = `Eres un copywriter experto en marketing orgánico para grupos de Facebook e Instagram.
Genera una publicación viral de alto impacto sobre el siguiente tema o marca:
- Tema/Nicho: ${topic}
- Nombre de la Marca/Proyecto: ${brandName}
- Enlace Oficial / Llamada a la acción: ${targetUrl}
- Idioma: ${language}

REGLAS OBLIGATORIAS:
1. Usa la estructura persuasiva de marketing (Gancho impactante con emoji de alerta, dolor o problema real, solución concreta, llamada a la acción con el enlace, 3-5 hashtags relevantes al final).
2. Agrega sintaxis Spintax {opción1|opción2|opción3} en al menos 4 partes (saludo, adjetivos, despedida) para evitar detección de spam en Meta.
3. No incluyas explicaciones previas ni comillas alrededor del texto, entrega ÚNICAMENTE el texto listo para publicar en Facebook.`;

  return await generateWithGemini({ prompt, maxTokens: 900, temperature: 0.8 });
}

/**
 * Genera el concepto visual (título, subtítulo, badge, estadísticas, tema) con Gemini
 */
async function generateGeminiCreativeConcept({ topic, brandName = 'NexaGuard' }) {
  const prompt = `Actúa como director creativo de diseño gráfico para redes sociales.
Genera los textos para un banner/video publicitario de alta conversión para:
Tema/Nicho: ${topic}
Marca: ${brandName}

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta (sin markdown de código ni texto adicional):
{
  "title": "TITULAR CORTO EN MAYÚSCULAS DE MÁXIMO 40 CARACTERES",
  "subtitle": "Subtítulo persuasivo y claro de máximo 85 caracteres.",
  "badge": "⭐ BADGE DESTACADO (máx 28 caracteres)",
  "cta": "LLAMADA A LA ACCIÓN (máx 38 caracteres)",
  "theme": "uno de estos colores: red, amber, cyan, green, purple",
  "stats": ["✓ Beneficio 1", "✓ Beneficio 2", "✓ Beneficio 3"]
}`;

  try {
    const raw = await generateWithGemini({ prompt, maxTokens: 400, temperature: 0.7 });
    const clean = raw.replace(/^```json/i, '').replace(/```$/i, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    // Fallback inteligente si falla el JSON
    return {
      title: topic.slice(0, 40).toUpperCase(),
      subtitle: `Soluciones profesionales con garantía de calidad y atención inmediata.`,
      badge: `⭐ ${brandName.slice(0, 20).toUpperCase()}`,
      cta: `MÁS INFORMACIÓN · ${brandName.toLowerCase()}.com`,
      theme: 'cyan',
      stats: ['✓ Atención Rápida', '✓ Mejor Servicio', '✓ 100% Garantizado']
    };
  }
}

module.exports = {
  getGeminiApiKey,
  testGeminiConnection,
  generateWithGemini,
  generateGeminiPost,
  generateGeminiCreativeConcept
};

