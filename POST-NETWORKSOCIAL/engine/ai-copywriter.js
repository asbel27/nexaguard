/**
 * AI & Copywriting Engine para NexaGuard Social AutoPoster
 * Generador de textos persuasivos basados en fórmulas probadas de Copywriting:
 * - PAS (Problem - Agitation - Solution): Toca el dolor, agita las consecuencias y ofrece la solución.
 * - Storytelling / Caso de Estudio: Muestra cómo se resolvió un hackeo real sin sonar a publicidad.
 * - Alerta de Seguridad Educativa (Value-First): Imposible de rechazar por administradores porque aporta valor real a la comunidad.
 */

const { parseSpintax } = require('./spintax');

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
 * Genera un texto adaptado combinando el framework con el nicho del grupo
 */
function generatePersuasiveCopy(frameworkId) {
  const tmpl = COPYWRITING_FRAMEWORKS.find(f => f.id === frameworkId) || COPYWRITING_FRAMEWORKS[0];
  return {
    rawSpintax: tmpl.spintax,
    sampleText: parseSpintax(tmpl.spintax),
    name: tmpl.name,
    type: tmpl.type
  };
}

module.exports = {
  COPYWRITING_FRAMEWORKS,
  generatePersuasiveCopy
};

