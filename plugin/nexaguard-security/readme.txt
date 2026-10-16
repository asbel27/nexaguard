=== NexaGuard Security - Antimalware & Blindaje Forense WordPress ===
Contributors: asbel27
Donate link: https://www.nexaguards.com
Tags: security, malware, scanner, firewall, waf
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.5.6
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Suite avanzada de ciberseguridad para WordPress: escáner forense profundo de archivos y base de datos, erradicación de backdoors y webshells, neutralización de ClearFake / ClickFix y blindaje en tiempo real (WAF).

== Description ==

**NexaGuard Security** es una solución integral y liviana de ciberseguridad diseñada para proteger sitios WordPress contra intrusiones complejas, inyecciones de código y malware avanzado.

A diferencia de otras soluciones pesadas que ralentizan tu servidor con consultas excesivas a bases de datos, NexaGuard utiliza un motor heurístico optimizado y firmas criptográficas para auditar el código fuente, la base de datos y la integridad del núcleo sin saturar los recursos de tu servidor compartido o VPS.

### 🛡️ Características Principales

* **Escáner Forense Profundo:** Inspecciona la raíz, directorios de temas, plugins, mu-plugins, uploads y la tabla wp_options.
* **Neutralización de ClearFake / EtherHiding / ClickFix:** Detecta scripts base64 inyectados y llamadas a contratos inteligentes que despliegan falsos avisos de Cloudflare.
* **Monitor de Núcleo (Sentinel):** Compara los archivos vitales de WordPress contra los hashes oficiales para identificar modificaciones no autorizadas al instante.
* **Vigilancia Continua:** Monitoreo periódico de eventos y telemetría de integridad del sitio.
* **Erradicación con un Clic:** Limpia inyecciones maliciosas preservando los archivos originales con copias de respaldo automáticas.
* **Cuarentena Blindada:** Aísla de forma segura archivos maliciosos y webshells en un directorio con acceso bloqueado (`Deny from all`).
* **Cortafuegos WAF en Tiempo Real:** Bloquea inyecciones SQL, Directory Traversal, Cross-Site Scripting (XSS) y ejecución de webshells.
* **Blindaje Perimetral:** Deshabilita la ejecución de PHP en `/uploads/`, apaga XML-RPC y previene la enumeración de usuarios.

== Installation ==

1. Sube la carpeta `nexaguard-security` al directorio `/wp-content/plugins/` de tu instalación, o sube el archivo .zip desde **Plugins > Añadir nuevo > Subir plugin**.
2. Activa el plugin a través de la pantalla **Plugins** en WordPress.
3. Dirígete a la sección **NexaGuard** en el menú lateral de administración.
4. Haz clic en **Iniciar Análisis Forense** para auditar y proteger tu sitio web.

== Frequently Asked Questions ==

= ¿NexaGuard ralentizará mi sitio web? =
No. NexaGuard fue diseñado con enfoque en el rendimiento. El escáner ejecuta lotes de procesamiento controlados con pausas dinámicas para no saturar la CPU ni la memoria RAM de tu servidor.

= ¿Qué hace NexaGuard si encuentra un archivo infectado? =
Puedes elegir entre aislar el archivo en cuarentena blindada o limpiar la inyección maliciosa automáticamente manteniendo una copia de respaldo para revertir cualquier cambio en un solo clic.

= ¿Requiere una cuenta o servicio externo para funcionar? =
No. Las funciones esenciales de escaneo local, verificación de integridad de núcleo, cuarentena y firewall WAF son 100% funcionales de forma gratuita y local. Opcionalmente, puedes vincular una licencia PRO con la nube de inteligencia NexaGuard Threat Cloud (https://www.nexaguards.com) para recibir telemetría avanzada y firmas de amenazas de día cero.

== External Service ==

Este plugin puede conectarse de forma opcional y segura a la nube de inteligencia NexaGuard (https://www.nexaguards.com) para la verificación de firmas de amenazas y validación de licencias PRO.

* **Servicio:** NexaGuard Threat Intelligence & License Gateway
* **URL:** https://www.nexaguards.com
* **Datos transmitidos:** Dirección URL / dominio del sitio y clave de licencia (si se ha configurado) para verificar la validez y obtener las firmas de malware más recientes.
* **Términos de servicio:** https://www.nexaguards.com/terminos
* **Política de privacidad:** https://www.nexaguards.com/privacidad

== Screenshots ==

1. Panel principal de NexaGuard: resumen de amenazas, estado del firewall y acceso rápido al escáner.
2. Escáner Forense en acción detectando malware y webshells.
3. Monitor de Núcleo (Sentinel) verificando la integridad de archivos frente al repositorio oficial.
4. Registro de eventos del cortafuegos WAF y opciones de blindaje perimetral.

== Changelog ==

= 1.5.6 =
* Reorganización intuitiva de pestañas: Monitor de Núcleo (Sentinel) y Vigilancia 24H posicionados junto al Escáner Forense.
* Mejoras en el motor de detección de scripts maliciosos ClearFake y ClickFix.
* Erradicaciones de cortesía gratuitas incluidas en la versión estándar.
* Compatibilidad verificada con WordPress 6.7 y PHP 8.2+.
* Optimización en la gestión de copias de seguridad de cuarentena.

= 1.5.5 =
* Incorporación de Monitor de Núcleo (Sentinel) para auditoría de archivos core de WordPress.
* Sistema de rollback mejorado para restaurar archivos modificados con un solo clic.

= 1.5.0 =
* Lanzamiento de la versión unificada de NexaGuard Security Suite.
