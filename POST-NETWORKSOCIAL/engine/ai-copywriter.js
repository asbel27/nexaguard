/**
 * AI & Copywriting Engine para NexaGuard Social AutoPoster
 * Generador de textos persuasivos basados en fórmulas probadas de Copywriting:
 * - PAS (Problem - Agitation - Solution): Toca el dolor, agita las consecuencias y ofrece la solución.
 * - Storytelling / Caso de Estudio: Muestra cómo se resolvió un hackeo real sin sonar a publicidad.
 * - Alerta de Seguridad Educativa (Value-First): Imposible de rechazar por administradores porque aporta valor real a la comunidad.
 */

const { parseSpintax } = require('./spintax');
const { detectLanguage } = require('./language-detector');

const MULTILANG_FRAMEWORKS = {
  en: [
    {
      id: 'pas-dolor-urgencia',
      name: '🔥 PAS Formula (Pain, Agitation & Urgent Solution - English)',
      type: 'PAS',
      spintax: `{Fellow web developers & WordPress owners|Hello group|Important security notice for WordPress webmasters} ⚠️

{Imagine waking up on a Monday morning to find your client's website blocked by Google with a red "Deceptive site ahead" warning.|Is there anything worse than an urgent call from a furious client saying their site is redirecting to scam pages?|The ultimate nightmare of every agency is a silent hack destroying months of hard work in minutes.}

{Traffic plunges to zero, clients cannot checkout, and Google penalties grow harsher by the hour.|Attempting to clean the code manually without forensic tools risks breaking the database or leaving hidden backdoors that reinfect tomorrow.}

💡 {Here is the good news: you do not have to rebuild from scratch.|To resolve this cleanly without data loss, our NexaGuard forensic protocol applies:}

1️⃣ {Immutable backup prior to touching any server files.|Full database and core snapshot.}
2️⃣ {Cryptographic SHA-256 verification against the official WordPress.org core.|Isolating tampered files.}
3️⃣ {Purging hidden base64 webshells and persistent database transients.|Cleaning wp-content/uploads/ and backdoor cron jobs.}
4️⃣ {Official Google Search Console review report to lift warnings in 24-48h.|WAF perimeter hardening.}

🔍 {We made our remote diagnostic scanner 100% free with zero install needed on your server:|Run a live free diagnosis in 15 seconds on any domain:}
👉 https://www.nexaguards.com/#escaner

{Protecting our clients' security is protecting our professional reputation. Hope this helps!} 🛡️💻`
    },
    {
      id: 'caso-estudio-educativo',
      name: '🧠 Technical Case Study (Value-First / High Admin Approval - English)',
      type: 'Value-First',
      spintax: `{Sharing a real forensic case we resolved this week that might save you hours of troubleshooting|Quick technical insight for the community on a recent stealth WordPress intrusion}:

📌 {The Issue:|The reported symptom:}
{A high-traffic WooCommerce store was losing 40% of mobile sales. On desktop it loaded fine, but from smartphones it redirected to spam landing pages.|A client contacted us after noticing thousands of Japanese replica URLs indexed on Google Search, while the front-end looked completely normal.}

🕵️‍♂️ {The Technical Finding:|Where the trap was hidden:}
{The attackers injected a conditional rewrite in .htaccess combined with an obfuscated base64 script inside wp_options checking the HTTP_USER_AGENT (ClearFake campaign).|A sophisticated HTTP cloaking technique: serving mass spam to Googlebot while serving clean pages to direct human visitors to evade detection.}

🛠️ {The Step-by-Step Eradication Protocol:}
1. {Restoring clean WordPress official .htaccess directives.|Replacing corrupted server rewrite rules.}
2. {Cryptographic hash comparison against official WordPress.org release files.|Replacing modified core binaries.}
3. {Eliminating hidden webshells in /wp-content/uploads/.|Purging execution rights on media folders.}
4. {Rotating SALT keys in wp-config.php and activating Core Sentinel WAF rules.|Hardening API endpoints.}

🛡️ {We documented this entire case and built a real-time scanner for anyone who wants to audit their domains for free:|Feel free to test your sites or client projects using our free remote forensic scanner:}
👉 https://www.nexaguards.com/#escaner

{Have you run into these mobile conditional redirects lately? Let's discuss in the comments!} 🚀`
    },
    {
      id: 'alerta-seguridad-comunidad',
      name: '🚨 Preventive Security Alert (High Engagement - English)',
      type: 'Alerta',
      spintax: `{Attention WordPress community|Important notice for webmasters and digital agencies|Keep an eye on your sites' security this week} ⚠️

{A widespread wave of automated attacks targeting vulnerabilities in outdated WordPress plugins and WooCommerce checkouts has been detected.|Over the last 72 hours, we have seen an aggressive spike in database malware injections and mobile traffic hijacking.}

{What are the immediate red flags of a compromised site?|Check if you notice any of these symptoms:}
🔴 {Google Chrome or Safe Browsing "Deceptive site ahead" red screen.}
🔴 {Mobile visitors reporting random redirects to unknown domains.}
🔴 {Foreign URLs or spam keywords indexed in Google search results.}
🔴 {Unauthorized administrator accounts created in wp_users.}

{To help the community audit their security, at NexaGuard we opened our live forensic engine 100% free with no install required:|You can run a free 15-second diagnostic scan on any domain right now:}
👉 https://www.nexaguards.com/#escaner

{Share this with fellow developers to catch infections before Google blacklists the domain!} 🛡️💪`
    }
  ],
  pt: [
    {
      id: 'pas-dolor-urgencia',
      name: '🔥 Fórmula PAS (Dor, Agitação e Solução Urgente - Português)',
      type: 'PAS',
      spintax: `{Atenção desenvolvedores e donos de sites WordPress|Olá grupo|Aviso importante para quem gerencia sites} ⚠️

{Imagine acordar e ver que o site do seu cliente foi bloqueado pelo Google com a tela vermelha de "Site Enganoso".|Existe algo pior do que receber a ligação de um cliente dizendo que o site está redirecionando para páginas suspeitas?|O maior pesadelo de um desenvolvedor é um ataque silencioso destruindo meses de trabalho em minutos.}

{As visitas caem a zero e o Google penaliza o domínio a cada hora que passa.|Tentar limpar o código manualmente sem ferramentas forenses pode quebrar o banco de dados ou deixar backdoors que reinfectam tudo amanhã.}

💡 {A boa notícia é que você não precisa reconstruir o site do zero:|Para resolver com rigor técnico e sem perda de dados, aplicamos o protocolo forense NexaGuard:}

1️⃣ Backup imutável completo antes de alterar qualquer arquivo.
2️⃣ Verificação criptográfica SHA-256 contra o núcleo oficial do WordPress.
3️⃣ Remoção de webshells em uploads e códigos ofuscados na tabela wp_options.
4️⃣ Relatório técnico para o Google Search Console remover o bloqueio em 24-48h.

🔍 {Liberamos nosso scanner forense remoto 100% gratuito e sem necessidade de instalar nada no seu servidor:|Podem rodar o diagnóstico gratuito em tempo real em qualquer domínio:}
👉 https://www.nexaguards.com/#escaner

{Cuidar da segurança dos clientes protege nossa reputação profissional. Espero que ajude!} 🛡️💻`
    }
  ]
};

const COPYWRITING_FRAMEWORKS = [
  {
    id: 'pas-dolor-urgencia',
    name: '🔥 Fórmula PAS (Dolor, Agitación y Solución Urgente)',
    type: 'PAS',
    description: 'Enfocado en el pánico de un cliente infectado, la pérdida de dinero y la solución inmediata.',
    spintax: `{Colegas desarrolladores y dueños de webs|Hola grupo|Aviso importante para los que administran WordPress} ⚠️

{Imagina levantarte un lunes por la mañana y ver que la web de tu cliente muestra una pantalla roja de Google diciendo "Sitio Engañoso".|¿Hay algo peor que recibir una llamada de un cliente furioso diciendo que su web redirige a páginas de apuestas o estafas?|El peor dolor de cabeza de un webmaster es un hackeo silencioso que destruye meses de trabajo en minutos.}

{El pánico es real: las visitas caen a cero, los clientes no pueden comprar y cada hora que pasa Google penaliza el dominio con más fuerza.|Si intentas limpiar el código a mano sin experiencia forense, corres el riesgo de romper la base de datos o dejar una puerta trasera que reinfectará todo mañana.}

💡 {La buena noticia es que no tienes que rehacer la web desde cero ni volverte loco:|Para resolverlo con criterio técnico y sin perder contenido, implementamos un protocolo de desinfección forense en NexaGuard:}

1️⃣ {Aislamiento forense y respaldo inmutable de datos.|Copia de seguridad completa antes de tocar cualquier archivo.}
2️⃣ {Auditoría SHA-256 contra el núcleo oficial de WordPress.|Verificación criptográfica para erradicar archivos adulterados.}
3️⃣ {Erradicación de webshells en uploads y código ofuscado base64.|Limpieza profunda en carpetas públicas y base de datos.}
4️⃣ {Informe técnico para Google Search Console que levanta la alerta en 24-48h.|Blindaje perimetral WAF para que nunca vuelva a ocurrir.}

🔍 {Si tienes un sitio con problemas o quieres auditarlo gratis por precaución, habilitamos un escáner remoto sin costo:|Pueden pasar el diagnóstico gratuito en vivo para comprobar la salud de cualquier dominio:}
👉 https://www.nexaguards.com/#escaner

{Cuidar la seguridad de nuestros clientes también es parte de nuestra reputación profesional.|Espero que les sirva este recurso si les toca una urgencia.} 🛡️💻`
  },
  {
    id: 'caso-estudio-educativo',
    name: '🧠 Caso de Estudio Técnico (Imposible de rechazar por Administradores)',
    type: 'Value-First',
    description: 'Post 100% educativo que explica cómo se resolvió una infección real. Los admins lo aprueban porque enseña.',
    spintax: `{Paso a compartir un caso forense real que resolvimos esta semana y que le puede ahorrar horas a más de uno|Breve aporte técnico para la comunidad sobre una intrusión reciente en WordPress|Comparto un aprendizaje sobre cómo los atacantes están ocultando malware hoy en día}:

📌 {El problema:|El síntoma reportado:}
{Una tienda en WooCommerce empezó a perder el 40% de sus ventas móviles. En ordenador cargaba normal, pero desde teléfonos redirigía a sitios fraudulentos.|Un cliente nos contactó porque en Google aparecían miles de URLs en caracteres japoneses promocionando réplicas, pero su web se veía normal.}

🕵️‍♂️ {El hallazgo técnico:|Dónde estaba la trampa:}
{Los atacantes habían inyectado una regla condicional en el archivo .htaccess y un script ofuscado con base64 dentro de la tabla wp_options. El código verificaba el HTTP_USER_AGENT y solo atacaba a visitantes desde Google en dispositivos móviles (campaña ClearFake).|Usaban una técnica de cloaking: a Googlebot le entregaban spam masivo y a los humanos la web limpia para no ser detectados.}

🛠️ {Cómo se solucionó paso a paso:|El protocolo de erradicación:}
1. {Restauración limpia del .htaccess oficial de WordPress.|Reemplazo de directivas de servidor adulteradas.}
2. {Comparación de hashes criptográficos con el core oficial de WordPress.org.|Sustitución de archivos del núcleo modificados.}
3. {Eliminación de la puerta trasera oculta en /wp-content/uploads/.|Purga de webshells con permisos de ejecución.}
4. {Rotación de las claves SALT en wp-config.php para cerrar sesiones activas del atacante.|Implementación de reglas WAF para bloquear el vector de entrada.}

🛡️ {En NexaGuard documentamos todos estos casos forenses y ofrecemos un escáner en tiempo real para quienes quieran chequear sus sitios gratis:|Si quieren comprobar si alguno de sus proyectos tiene inyecciones ocultas de este tipo, pueden usar nuestro escáner gratuito:}
👉 https://www.nexaguards.com/#escaner

{¿A alguno le ha tocado lidiar con este tipo de redirecciones móviles recientemente? Los leo en comentarios.|¡Mucho éxito con sus proyectos y a blindar esos WordPress!} 🚀`
  },
  {
    id: 'alerta-seguridad-comunidad',
    name: '🚨 Alerta Preventiva de Seguridad (Alta Interacción)',
    type: 'Alerta',
    description: 'Advierte a los miembros sobre vulnerabilidades activas recientes y ofrece la auditoría gratuita.',
    spintax: `{Atención comunidad de WordPress|Aviso importante para webmasters y agencias|Mucho ojo con la seguridad de sus sitios esta semana} ⚠️

{Se ha detectado una ola masiva de ataques automatizados dirigidos a vulnerabilidades en plugins desactualizados de WordPress y WooCommerce.|Durante los últimos días hemos visto un incremento notable en sitios afectados por inyecciones en la base de datos y secuestro de tráfico.}

{¿Cuáles son las señales de que un sitio está comprometido?|Revisa si notas alguno de estos síntomas:}
🔴 {Avisos de "Sitio engañoso" en Google Chrome o Safe Browsing.|Pantalla roja al intentar entrar a la web.}
🔴 {Visitantes móviles que reportan ser enviados a páginas extrañas.|Redirecciones que solo ocurren desde celulares.}
🔴 {Páginas extrañas indexadas en Google que tú nunca publicaste.|Miles de URLs con spam en los resultados de búsqueda.}
🔴 {Nuevos administradores creados en la web sin tu autorización.|Cuentas parásito con correos temporales en wp_users.}

{Para ayudar a la comunidad, en NexaGuard habilitamos nuestro motor forense para auditar cualquier dominio de forma 100% gratuita y sin instalar nada en tu hosting:|Les dejo nuestra herramienta gratuita de escaneo forense para que puedan auditar sus sitios o los de sus clientes en 15 segundos:}
👉 https://www.nexaguards.com/#escaner

{Compartan este aviso con colegas que tengan sitios en producción para prevenir infecciones a tiempo.|¡A proteger esos proyectos!} 🛡️💪`
  }
];

/**
 * Genera un texto adaptado combinando el framework con el idioma del grupo
 * @param {string} frameworkId
 * @param {string} [targetLang='es']
 */
function generatePersuasiveCopy(frameworkId, targetLang = 'es') {
  let langList = MULTILANG_FRAMEWORKS[targetLang];
  let tmpl = null;

  if (langList) {
    tmpl = langList.find(f => f.id === frameworkId) || langList[0];
  }

  if (!tmpl) {
    tmpl = COPYWRITING_FRAMEWORKS.find(f => f.id === frameworkId) || COPYWRITING_FRAMEWORKS[0];
  }

  return {
    lang: targetLang,
    rawSpintax: tmpl.spintax,
    sampleText: parseSpintax(tmpl.spintax),
    name: tmpl.name,
    type: tmpl.type
  };
}

module.exports = {
  COPYWRITING_FRAMEWORKS,
  MULTILANG_FRAMEWORKS,
  generatePersuasiveCopy
};

