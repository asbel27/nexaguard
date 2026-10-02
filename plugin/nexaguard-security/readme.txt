=== NexaGuard Security · Antimalware & Blindaje Forense WordPress ===
Contributors: nexaguard
Tags: security, malware, scanner, firewall, waf, backdoor, clearfake, clickfix, quarantine
Requires at least: 5.0
Tested up to: 6.7
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

NexaGuard Security es la suite experta de ciberseguridad para WordPress: auditoría forense de archivos y base de datos, erradicación de backdoors y webshells, neutralización de ClearFake / EtherHiding y cortafuegos en tiempo real (WAF).

== Descripción ==

NexaGuard Security audita profundamente tu instalación de WordPress para identificar, aislar y eliminar amenazas que otros plugins no logran detectar:

* **Escáner Forense Profundo:** Inspecciona la raíz, temas, plugins, mu-plugins, uploads y la tabla wp_options.
* **Neutralización de ClearFake / EtherHiding / ClickFix:** Detecta scripts base64 inyectados y llamadas a contratos inteligentes que despliegan falsos captchas de Cloudflare.
* **Erradicación con un Clic:** Limpia inyecciones maliciosas preservando los archivos originales con copias de respaldo automáticas.
* **Cuarentena Segura:** Mueve archivos maliciosos y webshells a un directorio blindado con acceso bloqueado (Deny From All).
* **Cortafuegos WAF en Tiempo Real:** Bloquea inyecciones SQL, Directory Traversal y ejecución de webshells.
* **Blindaje Perimetral:** Deshabilita la ejecución de PHP en /uploads/, apaga XML-RPC y oculta la versión de WordPress.

== Instalación ==

1. Descarga el archivo `nexaguard-security.zip`.
2. En tu panel de administración de WordPress, ve a **Plugins > Añadir nuevo > Subir plugin**.
3. Selecciona el archivo zip descargado y haz clic en **Instalar ahora**.
4. Haz clic en **Activar plugin**.
5. Ve al menú **NexaGuard** en tu barra lateral y presiona **Iniciar Análisis Forense**.
