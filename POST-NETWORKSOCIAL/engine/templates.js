/**
 * NexaGuard Built-in High-Converting Post Templates
 * Con formato Spintax nativo para que cada publicación sea 100% única y evite baneos.
 */

const TEMPLATES = [
  {
    id: 'wp-hackeado',
    name: '🚨 WordPress Hackeado / Rescate Urgente (Alta Conversión)',
    category: 'Soporte y Emergencia',
    spintax: `{Hola a todos|Buenas colegas|Hola desarrolladores y webmasters|Saludos grupo} 👋

{¿A alguien le ha pasado que un cliente le escribe en pánico porque su web en WordPress fue hackeada?|Si administras sitios de clientes en WordPress, sabes lo que duele cuando una web es infectada de la nada|Una de las peores pesadillas de cualquier diseñador o agencia es levantarse con un cliente diciendo que su web redirige a páginas raras o Google la marcó en rojo.}

{Justo por eso desarrollamos NexaGuard|Quiero compartir con ustedes una herramienta que creamos en nuestro equipo de ciberseguridad}: una plataforma especializada en **auditoría forense, desinfección en 1 clic y blindaje de WordPress**.

🔍 {Puedes escanear cualquier dominio totalmente gratis|Haz un diagnóstico gratuito en vivo sin instalar nada previo}:
👉 https://www.nexaguards.com/#escaner

{¿Qué resolvemos de inmediato?|Entre las amenazas que erradicamos de raíz}:
✅ Redirecciones móviles maliciosas (ClearFake, EtherHiding).
✅ Erradicación del Japanese Keyword Hack (miles de URLs spam en Google).
✅ Retirada de la pantalla roja "Sitio Engañoso" de Google Safe Browsing en 24-48h.
✅ Limpieza profunda de webshells en wp-content/uploads/ y base de datos.

{Si tienen una web comprometida ahora mismo o quieren tenerlo a mano para emergencias de clientes, pruébenlo sin costo|Guarden el enlace para cuando un cliente les llegue con una infección urgente}:
🔗 https://www.nexaguards.com/

{¡Espero que les sea de mucha ayuda!|Cualquier duda técnica me pueden escribir directamente.} 💪🛡️`
  },
  {
    id: 'pantalla-roja',
    name: '🛑 Quitar Pantalla Roja de Google Safe Browsing',
    category: 'SEO & Google Penalizaciones',
    spintax: `{Atención webmasters|Dato clave para desarrolladores web|Tip importante para agencias y freelancers} ⚠️

{Si tu sitio web o el de algún cliente acaba de ser marcado con la temida PANTALLA ROJA de Google ("El sitio al que vas a acceder es engañoso"), no entres en pánico.|¿Te ha salido alguna vez la pantalla roja de advertencia de Google en tu WordPress? Esto provoca que el 95% de los visitantes huyan de inmediato.}

{El error que comete la mayoría es pedir la revisión en Search Console antes de limpiar todo el malware oculto, lo que hace que Google te catalogue como reincidente y tarde semanas en desbloquearte.|Para quitar la alerta rápido hay un protocolo exacto que debes seguir antes de solicitar la reconsideración.}

Publicamos una **guía técnica forense paso a paso** donde explicamos cómo erradicar los scripts de phishing, limpiar las puertas traseras y solicitar el deslistado en 24 horas:

📖 {Léela completa aquí|Guía paso a paso gratis}:
👉 https://www.nexaguards.com/quitar-pantalla-roja-google/

Y si necesitan auditar la web en tiempo real:
🔍 https://www.nexaguards.com/#escaner

{¡Compártanlo con quien lo necesite!|Mucho éxito con sus proyectos.} 🚀`
  },
  {
    id: 'japanese-seo',
    name: '🇯🇵 Japanese Keyword Hack (Miles de URLs spam en Google)',
    category: 'SEO & Spam Cloaking',
    spintax: `{¿Tu web en WordPress tiene miles de URLs en caracteres japoneses o chinos indexadas en Google?|Mucho cuidado con el Japanese Keyword Hack, una de las infecciones SEO más agresivas del momento.|Atención a todos los que hacen SEO y administran tiendas online o blogs en WordPress.}

Esta infección utiliza técnicas de **cloaking condicional**:
👉 A ti como humano te muestra la web normal.
👉 Pero a **Googlebot** le entrega miles de páginas de réplicas ilegales que destruyen tu tráfico orgánico y autoridad de marca.

Preparamos una guía técnica forense explicando cómo detectar los generadores dinámicos, purgar los sitemaps parásitos y **forzar respuestas HTTP 410 Gone** para que Google las desindexe rápidamente:

🔗 {Enlace a la guía técnica|Cómo erradicarlo paso a paso}:
https://www.nexaguards.com/japanese-keyword-hack/

También pueden pasar el escáner gratuito de NexaGuard para comprobar si su servidor tiene directivas de cloaking activas:
👉 https://www.nexaguards.com/#escaner`
  },
  {
    id: 'escaner-gratis',
    name: '🛡️ Escáner Forense Gratuito para Desarrolladores y Agencias',
    category: 'Herramientas Gratuitas',
    spintax: `{Colegas del grupo|Hola a todos|Buenas desarrolladores y diseñadores web} 👋

{¿Cuándo fue la última vez que revisaron la seguridad profunda de sus webs o las de sus clientes?|Muchos sitios de WordPress están infectados con backdoors o scripts silenciosos que no rompen la web pero roban tráfico o datos.}

Lanzamos el **Escáner Forense Remoto de NexaGuard**:
⚡ Comprueba en 15 segundos:
- Inyecciones JavaScript ocultas
- Presencia en listas negras de Google Safe Browsing
- Vulnerabilidades críticas de plugins
- Cabeceras de seguridad perimetral y WAF

Es **100% gratuito** y no requiere registro ni instalar nada:
👉 https://www.nexaguards.com/#escaner

{Pruébenlo con sus dominios y me cuentan qué tal les da el puntaje de salud.|¡Espero que les sirva para auditar los proyectos de sus clientes!} 🛡️💻`
  },
  {
    id: 'woocommerce-seguridad',
    name: '💳 Protección de Checkout WooCommerce & Skimmers Magecart',
    category: 'E-commerce & WooCommerce',
    spintax: `{Atención dueños de tiendas WooCommerce y desarrolladores de e-commerce|Alerta de seguridad para tiendas online en WordPress|Dato crítico para los que gestionan ventas con WooCommerce} 🛍️💳

{¿Sabías que los skimmers digitales de tarjetas (ataques tipo Magecart) son cada vez más comunes en WordPress?|Uno de los ataques más peligrosos en tiendas virtuales es la inyección de scripts en la página de checkout que roban los datos de las tarjetas de los clientes en tiempo real.}

Esto no solo destruye las ventas, sino que puede causar que pasarelas como Stripe o PayPal suspendan tu cuenta comercial de forma definitiva.

En NexaGuard publicamos una guía forense detallando cómo auditar el formulario de pago, erradicar skimmers y blindar WooCommerce con WAF:
👉 https://www.nexaguards.com/desinfectar-woocommerce-hackeado/

Y si quieres auditar la seguridad de tu tienda gratis:
🔍 https://www.nexaguards.com/#escaner`
  }
];

module.exports = { TEMPLATES };
