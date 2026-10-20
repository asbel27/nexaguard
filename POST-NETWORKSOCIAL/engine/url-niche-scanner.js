/**
 * NexaGuard AI URL Niche & Brand Scanner
 * Rastrea cualquier URL web, extrae automáticamente el nicho de mercado, la marca,
 * la propuesta de valor y genera publicaciones persuasivas personalizadas con Spintax y CTAs.
 */

const { detectLanguage, getLanguageName } = require('./language-detector');
const { parseSpintax } = require('./spintax');

const NICHE_TAXONOMY = [
  {
    id: 'cybersecurity',
    name: 'Ciberseguridad & Rescate Web',
    keywords: ['seguridad', 'malware', 'hack', 'antivirus', 'firewall', 'ciberseguridad', 'security', 'desinfeccion', 'scanner', 'escaner', 'pantalla roja', 'backdoor', 'webshell', 'vulnerabilidad'],
    painPoints: ['pantalla roja de Google Safe Browsing', 'hackeos silenciosos que destruyen el SEO', 'robo de datos y pasarelas de pago comprometidas', 'pérdida de confianza de los clientes'],
    hashtags: ['#Ciberseguridad', '#SeguridadWeb', '#WordPress', '#Malware', '#GoogleSafeBrowsing', '#ProteccionWeb']
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce & Tiendas Online',
    keywords: ['tienda', 'shop', 'carrito', 'checkout', 'comprar', 'ecommerce', 'woocommerce', 'shopify', 'productos', 'catalogo', 'envios', 'ventas online'],
    painPoints: ['abandono de carritos en el checkout', 'pérdida de ventas en dispositivos móviles', 'falta de confianza al procesar pagos', 'costos elevados de adquisición de clientes'],
    hashtags: ['#Ecommerce', '#TiendaOnline', '#WooCommerce', '#Shopify', '#VentasOnline', '#Emprendedores']
  },
  {
    id: 'marketing_seo',
    name: 'Marketing Digital & SEO',
    keywords: ['seo', 'posicionamiento', 'marketing', 'ventas', 'leads', 'google ads', 'trafico', 'redes sociales', 'copywriting', 'conversion', 'estrategia', 'audiencia'],
    painPoints: ['tráfico web estancado sin visitas orgánicas', 'gasto desmedido en anuncios con poco retorno', 'pérdida de posiciones en Google frente a la competencia', 'falta de clientes potenciales calificados'],
    hashtags: ['#MarketingDigital', '#SEO', '#PosicionamientoWeb', '#EstrategiaDigital', '#CrecimientoOnline', '#TraficoWeb']
  },
  {
    id: 'web_dev',
    name: 'Desarrollo de Software & Diseño Web',
    keywords: ['desarrollo', 'programacion', 'diseño web', 'developer', 'software', 'app', 'web design', 'hosting', 'codigo', 'frontend', 'backend', 'api', 'saas'],
    painPoints: ['sitios web lentos con baja velocidad de carga (Core Web Vitals)', 'diseños desactualizados que no convierten visitantes', 'complejidad técnica para escalar el negocio', 'dependencia de plataformas rígidas'],
    hashtags: ['#DesarrolloWeb', '#DiseñoWeb', '#Programacion', '#Webmasters', '#SaaS', '#Tecnologia']
  },
  {
    id: 'b2b_consulting',
    name: 'Consultoría & Servicios Profesionales B2B',
    keywords: ['consultoria', 'asesoria', 'servicios', 'empresas', 'gestion', 'soluciones', 'b2b', 'profesionales', 'consultores', 'corporativo', 'negocios'],
    painPoints: ['procesos manuales que frenan el crecimiento empresarial', 'dificultad para diferenciarse en un mercado saturado', 'falta de claridad en la estrategia comercial', 'costos operativos descontrolados'],
    hashtags: ['#Consultoria', '#NegociosB2B', '#EstrategiaEmpresarial', '#Liderazgo', '#Gestion', '#Empresas']
  },
  {
    id: 'health_wellness',
    name: 'Salud, Bienestar & Fitness',
    keywords: ['salud', 'medico', 'clinica', 'fitness', 'nutricion', 'bienestar', 'terapia', 'entrenamiento', 'cuidado', 'pacientes'],
    painPoints: ['dificultad para mantener hábitos saludables a largo plazo', 'desinformación en dietas y rutinas milagrosas', 'falta de tiempo para cuidar la salud integral', 'estrés y agotamiento físico'],
    hashtags: ['#SaludYBienestar', '#Fitness', '#VidaSaludable', '#Nutricion', '#BienestarIntegral']
  },
  {
    id: 'education',
    name: 'Educación & Cursos Online',
    keywords: ['curso', 'academia', 'aprender', 'formacion', 'clases', 'educacion', 'masterclass', 'estudiar', 'certificacion', 'habilidades'],
    painPoints: ['falta de habilidades prácticas demandadas por el mercado', 'cursos teóricos obsoletos que no enseñan casos reales', 'estancamiento laboral por falta de especialización'],
    hashtags: ['#EducacionOnline', '#CursosOnline', '#Aprender', '#FormacionProfesional', '#DesarrolloPersonal']
  }
];

/**
 * Escanea una URL y extrae información semántica
 * @param {string} rawUrl
 * @returns {Promise<Object>}
 */
async function scanUrlNiche(rawUrl) {
  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  // Descargar contenido HTML
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let html = '';
  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 NexaGuardBot/2.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status} al acceder a ${targetUrl}`);
    html = await res.text();
  } catch (err) {
    clearTimeout(timeoutId);
    // Si la web externa bloquea bot headers o falla, fallback con análisis del dominio
    html = `<html><head><title>${targetUrl.replace(/https?:\/\//, '')}</title></head><body></body></html>`;
  }

  // 1. Extraer Metadatos
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].trim() : '';

  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';

  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const ogSiteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

  // Extraer encabezados h1, h2
  const headings = [];
  const hMatches = html.matchAll(/<(h1|h2)[^>]*>([^<]+)<\/(h1|h2)>/gi);
  for (const m of hMatches) {
    const text = m[2].replace(/\s+/g, ' ').trim();
    if (text.length > 5 && text.length < 120) headings.push(text);
  }

  // 2. Extraer Nombre de la Marca
  let brandName = '';
  if (ogSiteNameMatch && ogSiteNameMatch[1]) {
    brandName = ogSiteNameMatch[1].trim();
  } else if (rawTitle) {
    const parts = rawTitle.split(/[|\-–—:•]/);
    brandName = parts[0].trim();
    if (brandName.length > 30 && parts.length > 1) {
      brandName = parts[parts.length - 1].trim();
    }
  }
  if (!brandName || brandName.length > 35) {
    try {
      const u = new URL(targetUrl);
      brandName = u.hostname.replace(/^www\./, '').split('.')[0];
      brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    } catch (e) {
      brandName = 'NexaGuard';
    }
  }

  // 3. Determinar el Idioma de la Página
  const fullTextSample = `${rawTitle} ${metaDesc} ${headings.join(' ')}`.slice(0, 1500);
  const detectedLang = detectLanguage(fullTextSample);

  // 4. Clasificar el Nicho de Mercado
  const scores = {};
  NICHE_TAXONOMY.forEach(n => { scores[n.id] = 0; });

  const cleanSample = fullTextSample.toLowerCase();
  NICHE_TAXONOMY.forEach(n => {
    n.keywords.forEach(kw => {
      if (cleanSample.includes(kw)) {
        scores[n.id] += 2;
      }
    });
  });

  let bestNiche = NICHE_TAXONOMY[0];
  let maxScore = -1;
  NICHE_TAXONOMY.forEach(n => {
    if (scores[n.id] > maxScore) {
      maxScore = scores[n.id];
      bestNiche = n;
    }
  });

  // Si no hay coincidencias fuertes pero la URL es nexaguard
  if (targetUrl.includes('nexaguard')) {
    bestNiche = NICHE_TAXONOMY[0];
  }

  // 5. Síntesis de Propuesta de Valor y Resumen
  const summary = metaDesc || (headings[0] ? `${headings[0]}. ${headings[1] || ''}` : `Soluciones profesionales en ${bestNiche.name}`);

  // 6. Generar Publicaciones con IA específicas para esta URL y Nicho
  const generatedPosts = generateTailoredPosts({
    brand: brandName,
    url: targetUrl,
    niche: bestNiche,
    lang: detectedLang,
    summary
  });

  return {
    ok: true,
    url: targetUrl,
    brand: brandName,
    nicheId: bestNiche.id,
    nicheName: bestNiche.name,
    detectedLang,
    langName: getLanguageName(detectedLang),
    summary,
    sampleHeadings: headings.slice(0, 4),
    hashtags: bestNiche.hashtags,
    generatedPosts
  };
}

/**
 * Genera 3 fórmulas de Copywriting persuasivo adaptadas exactamente a la marca, URL y nicho
 */
function generateTailoredPosts({ brand, url, niche, lang = 'es', summary }) {
  const isEn = lang === 'en';
  const isPt = lang === 'pt';

  const pain = niche.painPoints[Math.floor(Math.random() * niche.painPoints.length)];
  const tagsStr = niche.hashtags.join(' ');

  if (isEn) {
    return [
      {
        id: 'tailored-pas',
        type: 'PAS',
        title: `🔥 PAS Formula: How ${brand} solves ${niche.name}`,
        spintax: `{Attention webmasters and business owners|Hello group|Important update for anyone in ${niche.name}} ⚠️\n\n{Are you struggling with ${pain}?|One of the biggest bottlenecks today is ${pain}.|Nothing is more frustrating than losing time and revenue because of ${pain}.}\n\n{When this happens, performance drops and customers lose trust quickly.|Trying to fix it with manual hacks usually creates more issues tomorrow.}\n\n💡 {Here is the proven solution:|That is why ${brand} built a specialized platform:}\n\n✓ {Built specifically for ${niche.name}.|Optimized for real-world results.}\n✓ {Fast setup with zero complex technical overhead.|Engineered for high performance and peace of mind.}\n✓ {Proven track record helping businesses scale securely.|Trusted by professionals.}\n\n👉 {Check it out in action here:|Explore the platform and free tools now:}\n${url}\n\n{Hope this helps your business stay ahead!} 🚀\n\n${tagsStr}`
      },
      {
        id: 'tailored-case-study',
        type: 'Case Study',
        title: `🧠 Value-First Case Study: Transformation with ${brand}`,
        spintax: `{Sharing a real-world case study on how we tackled ${pain}|Quick breakdown of how ${brand} delivered results in ${niche.name}}: \n\n📌 {The Challenge:}\n{A client came to us losing traction due to ${pain}. Manual methods were failing and operational costs were escalating.}\n\n🕵️‍♂️ {The Solution Applied by ${brand}:}\n1. {In-depth diagnostic assessment to isolate root vulnerabilities.}\n2. {Deploying targeted infrastructure optimized for ${niche.name}.}\n3. {Continuous monitoring to ensure zero downtime and peak performance.}\n\n📈 {The Outcome:}\n{Within days, the problem was completely resolved with zero loss of data or momentum.}\n\n🔗 {Full details and free diagnostic available at:}\n👉 ${url}\n\n{Have you encountered this in your projects? Let's discuss in the comments!} 💬\n\n${tagsStr}`
      },
      {
        id: 'tailored-alert',
        type: 'Alert',
        title: `🚨 Industry Alert & Free Tool Release from ${brand}`,
        spintax: `{Urgent notice for everyone operating in ${niche.name}|Important security and performance alert} ⚠️\n\n{Recent industry data shows an alarming surge in ${pain}. If your infrastructure is not prepared, you could face severe downtime and penalties.}\n\n{Key warning signs to check right now:}\n🔴 {Sudden drops in performance or conversion rates.}\n🔴 {Unusual traffic behavior or security warnings.}\n🔴 {Lagging response times on critical customer touchpoints.}\n\n🛡️ {To support the community, ${brand} has released a free live diagnostic tool with no install required:}\n👉 ${url}\n\n{Run a quick check on your domain today to stay protected and ahead of the curve!} 💪\n\n${tagsStr}`
      }
    ];
  }

  // Versión en Español (Default / Latam / España)
  return [
    {
      id: 'tailored-pas',
      type: 'PAS',
      title: `🔥 Fórmula PAS: Cómo ${brand} soluciona ${niche.name}`,
      spintax: `{Atención emprendedores y profesionales del sector|Hola a todos en la comunidad|Aviso importante para quienes trabajan en ${niche.name}} ⚠️\n\n{¿Alguna vez te has enfrentado a ${pain}?|Uno de los problemas más costosos y frustrantes hoy en día es ${pain}.|No hay nada peor que ver cómo meses de esfuerzo se ven amenazados por ${pain}.}\n\n{El impacto es inmediato: caen las visitas, se pierden ventas y la reputación de la marca queda en riesgo.|Intentar solucionarlo con parches improvisados suele generar más errores a largo plazo.}\n\n💡 {La buena noticia es que existe una solución técnica y probada:|Por eso en ${brand} desarrollamos un protocolo integral:}\n\n1️⃣ {Diagnóstico integral para atacar la raíz del problema.|Auditoría exhaustiva sin riesgo para tu información.}\n2️⃣ {Implementación de tecnología especializada para ${niche.name}.|Optimización enfocada en máxima estabilidad y resultados.}\n3️⃣ {Garantía y soporte profesional 24/7 para tu tranquilidad.|Acompañamiento técnico directo.}\n\n🔍 {Puedes conocer la plataforma y probar las herramientas gratuitas en:}\n👉 ${url}\n\n{¡Mucho éxito con sus proyectos y a blindar esos resultados!} 🛡️🚀\n\n${tagsStr}`
    },
    {
      id: 'tailored-case-study',
      type: 'Caso de Estudio',
      title: `🧠 Caso de Éxito Técnico: Aprendizajes con ${brand}`,
      spintax: `{Paso a compartir un caso real de optimización en ${niche.name} que le puede servir a más de uno|Breve aporte técnico para el grupo sobre cómo resolver ${pain}}: \n\n📌 {El desafío inicial:}\n{Un proyecto llegó a nosotros sufriendo fuertemente por ${pain}. Habían intentado resolverlo manualmente pero el problema persistía.}\n\n🛠️ {El protocolo aplicado por ${brand}:}\n1. {Aislamiento del vector del problema y respaldo completo.}\n2. {Aplicación de arquitectura especializada en ${niche.name}.}\n3. {Monitoreo activo para evitar cualquier recaída o degradación del servicio.}\n\n📈 {El resultado obtenido:}\n{En tiempo récord se restableció el 100% de la operatividad, recuperando clientes y confianza sin perder datos.}\n\n🔗 {Compartimos la guía completa y las herramientas de diagnóstico en:}\n👉 ${url}\n\n{¿A alguien más le ha tocado lidiar con esto recientemente? Los leo en comentarios.} 💬\n\n${tagsStr}`
    },
    {
      id: 'tailored-alert',
      type: 'Alerta',
      title: `🚨 Alerta Preventiva & Recurso Gratuito de ${brand}`,
      spintax: `{Atención comunidad de ${niche.name}|Aviso importante para directores y webmasters} ⚠️\n\n{Durante los últimos días se ha registrado un incremento notable de problemas vinculados a ${pain}. Quienes no tomen medidas a tiempo pueden sufrir pérdidas significativas.}\n\n{Señales clave para verificar hoy mismo:}\n🔴 {Caídas repentinas en la conversión o rendimiento.}\n🔴 {Alertas de seguridad o comportamientos extraños en la plataforma.}\n🔴 {Quejas de usuarios en puntos clave del servicio.}\n\n🛡️ {Para apoyar a la comunidad, en ${brand} habilitamos una auditoría y escáner en vivo 100% gratuito sin necesidad de instalar nada:}\n👉 ${url}\n\n{Recomiendo hacer una revisión preventiva hoy mismo en el enlace. ¡A cuidar esos proyectos!} 💪\n\n${tagsStr}`
    }
  ];
}

module.exports = {
  NICHE_TAXONOMY,
  scanUrlNiche
};
