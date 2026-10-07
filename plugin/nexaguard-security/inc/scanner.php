<?php
if (!defined('ABSPATH')) {
    exit;
}

class NexaGuard_Scanner {
    private $threats = array();
    private $scanned_files = 0;
    private $scanned_options = 0;
    private $whitelist = array();

    // Catálogo forense avanzado de firmas de malware y vectores de ataque (Histórico, Nulled y Moderno)
    private $patterns = array(
        // --- 1. AMENAZAS MODERNAS & ACTIVAS (2024 - 2026) ---
        'clearfake_etherhiding' => array(
            'regex'    => '/(data:text\/javascript;base64,[A-Za-z0-9+\/]{32,}|0xA1decFB[a-zA-Z0-9]*|0x46790e2[a-zA-Z0-9]*)/i',
            'title'    => 'Inyección de malware ClearFake / EtherHiding',
            'desc'     => 'Script en base64 o contrato en Binance Smart Chain utilizado para inyectar falsos captchas de Cloudflare y troyanos.',
            'severity' => 'crit',
            'type'     => 'clearfake'
        ),
        'smart_contract_rpc' => array(
            'regex'    => '/(bsc-testnet-rpc|data-seed-prebsc|bnbchain\.org|eth_call|0x6d4ce63c|ethers\.Contract)/i',
            'title'    => 'Llamada sospechosa a Blockchain / Smart Contract RPC',
            'desc'     => 'Código que consulta contratos inteligentes en la blockchain para evadir bloqueos tradicionales de dominio.',
            'severity' => 'crit',
            'type'     => 'etherhiding'
        ),
        'fake_captcha_turnstile' => array(
            'regex'    => '/(cf-turnstile-wrapper|challenge-platform|verify_you_are_human|fake-turnstile|verify-turnstile-overlay)/i',
            'title'    => 'Falso Captcha Cloudflare Turnstile / Phishing',
            'desc'     => 'Superposición fraudulenta que simula verificación humana para engañar a los visitantes.',
            'severity' => 'crit',
            'type'     => 'clearfake'
        ),
        'clickfix_powershell' => array(
            'regex'    => '/(powershell\s+(-e|-enc|-encodedcommand|-w\s+hidden)|mshta\s+https?:\/\/|certutil\s+-urlcache)/i',
            'title'    => 'Comando malicioso ClickFix (PowerShell / MSHTA)',
            'desc'     => 'Ataque que copia al portapapeles scripts destructivos simulando solucionar un problema del navegador.',
            'severity' => 'crit',
            'type'     => 'clickfix'
        ),
        'balada_socgholish_redirect' => array(
            'regex'    => '/(document\.location|window\.location|location\.href|location\.replace)\s*=\s*[\'"]https?:\/\/(?!wordpress\.org|localhost|127\.0\.0\.1|([a-z0-9\-]+\.)?google\.com|([a-z0-9\-]+\.)?gstatic\.com|([a-z0-9\-]+\.)?cloudflare\.com|([a-z0-9\-]+\.)?facebook\.com)[^\'"]*(traffic|click|track|stat|promo|ad\.|cdn[0-9]*\.|analytics-[a-z0-9]+\.com|gate|redirect|counter|delivery|fastcdn|suporte)\.[a-z]{2,}/i',
            'title'    => 'Redirección maliciosa / Secuestro de tráfico (Traffic Hijacking)',
            'desc'     => 'Script inyectado diseñado para desviar a los visitantes a páginas fraudulentas o de publicidad no autorizada.',
            'severity' => 'crit',
            'type'     => 'malicious_js'
        ),
        'magecart_formjacking' => array(
            'regex'    => '/(addEventListener\s*\(\s*[\'"]submit[\'"]|on\(?[\'"]submit[\'"])[^}]*(cc_number|cardNumber|card_number|card-cvc|billing_card|creditCard)[^}]*(fetch\s*\(|sendBeacon|XMLHttpRequest|\$\.post|\$\.ajax)/is',
            'title'    => 'Ladrón de tarjetas de crédito / Formjacking (Magecart)',
            'desc'     => 'Script espía que intercepta datos de tarjetas de crédito y contraseñas en formularios de pago.',
            'severity' => 'crit',
            'type'     => 'stealer'
        ),

        // --- 2. VECTORES ESPECÍFICOS DE TEMAS Y PLUGINS NULLED (PIRATAS) ---
        'nulled_hex_octal_pack' => array(
            'regex'    => '/((\\\x[0-9a-fA-F]{8,}|(\\\x[0-9a-fA-F]{2}){8,}|(\\[0-7]{3}){8,}|(\bchr\s*\(\s*\d+\s*\)\s*\.\s*){6,}|(\$GLOBALS\s*\[\s*[\'"]\\x[0-9a-fA-F]{2}))/i',
            'title'    => 'Ofuscación Hexadecimal/Octal masiva (Nulled Packer / FOPO)',
            'desc'     => 'Secuencias de código empaquetadas en valores hexadecimales o llamadas continuas a chr(), habituales en temas nulled.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'unpack_gzinflate_base64' => array(
            'regex'    => '/(gzinflate|gzuncompress)\s*\(\s*(base64_decode|str_rot13)\s*\(/i',
            'title'    => 'Desempaquetado de Payload comprimido (gzinflate + base64)',
            'desc'     => 'Doble capa de compresión utilizada para ocultar backdoors y código malicioso sin levantar sospechas directas.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'nulled_header_backdoor' => array(
            'regex'    => '/(eval|assert|system|passthru|shell_exec)\s*\(\s*@?\$_(SERVER|COOKIE)\[[\'"](HTTP_[A-Z_]+|REMOTE_[A-Z_]+)[\'"]\]\s*\)/i',
            'title'    => 'Puerta trasera oculta en Cabecera HTTP (Header-based Backdoor)',
            'desc'     => 'Código PHP que ejecuta comandos recibidos por User-Agent o Cookies para no dejar rastros en registros HTTP.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'nulled_remote_dropper' => array(
            'regex'    => '/(file_put_contents|fwrite)\s*\([^,]+,\s*(wp_remote_retrieve_body\s*\(|file_get_contents\s*\(\s*[\'"]https?:\/\/|curl_exec\s*\()/i',
            'title'    => 'Dropper Remoto (Descarga y escritura de scripts)',
            'desc'     => 'Mecanismo que descarga archivos de servidores externos de cibercriminales y los escribe como ejecutables locales.',
            'severity' => 'crit',
            'type'     => 'dropper'
        ),
        'nulled_admin_creator' => array(
            'regex'    => '/(if\s*\([^)]*\$_(GET|POST|REQUEST|COOKIE)\[[^)]*\)[^}]*(wp_create_user|wp_insert_user|set_role\s*\(\s*[\'"]administrator[\'"]|wp_set_current_user|wp_set_auth_cookie))/is',
            'title'    => 'Creación no autorizada de Administrador / Puerta trasera de Auth',
            'desc'     => 'Código condicionado por parámetros web para crear administradores o forzar inicios de sesión clandestinos.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'nulled_dynamic_execution' => array(
            'regex'    => '/(call_user_func|call_user_func_array)\s*\(\s*[\'"](assert|system|passthru|shell_exec|exec|popen|proc_open)[\'"]\s*,/i',
            'title'    => 'Evasión dinámica de ejecución (call_user_func -> RCE)',
            'desc'     => 'Invocación indirecta de funciones peligrosas del sistema operativo para evadir la detección estática tradicional.',
            'severity' => 'crit',
            'type'     => 'rce'
        ),
        'obfuscated_strrev' => array(
            'regex'    => '/(eval|assert)\s*\(\s*(strrev|str_rot13|hex2bin)\s*\(\s*[\'"][^\'"]{6,}[\'"]\s*\)\s*\)/i',
            'title'    => 'Ofuscación por inversión/rotación de cadenas (strrev en eval)',
            'desc'     => 'Código escrito al revés o rotado para burlar filtros de palabras clave al momento de la ejecución.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'file_tampering_core' => array(
            'regex'    => '/(file_put_contents|fwrite|touch|unlink|rename)\s*\([^)]*(\/|\\\\)?(wp-config\.php|wp-blog-header\.php|wp-load\.php|wp-settings\.php|\.htaccess)[\'"]?\s*\)/i',
            'title'    => 'Manipulación no autorizada de archivos del Núcleo / htaccess',
            'desc'     => 'Intento desde temas o plugins de sobreescribir o alterar archivos críticos de la raíz de WordPress.',
            'severity' => 'crit',
            'type'     => 'tampering'
        ),

        // --- 3. TROYANOS DISFRAZADOS DE SEGURIDAD & C&C (CAMPAÑA WORDFENCE 2025) ---
        'fake_antimalware_bot' => array(
            'regex'    => '/(acpp_ping_event|acpp_send_ping|45\.61\.136\.85|plugin-ping|WP-antymalwary-bot|custom_ads_url|insert_code_in_header_files)/i',
            'title'    => 'Troyano C&C Camuflado de Anti-Malware (WP-antymalwary-bot)',
            'desc'     => 'Malware reportado por Wordfence que se hace pasar por optimizador o anti-malware, envía pings C&C e inyecta anuncios.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'stealth_plugin_hider' => array(
            'regex'    => '/(add_filter\s*\(\s*[\'"]all_plugins[\'"][^)]*unset\s*\(\s*\$[a-zA-Z0-9_]+\[plugin_basename\s*\(\s*__FILE__\s*\)\]|unset\s*\(\s*\$[a-zA-Z0-9_]+\[plugin_basename\s*\(\s*__FILE__\s*\)\]\s*\))/is',
            'title'    => 'Mecanismo de Ocultación de Plugin en Dashboard (Stealth Plugin Hider)',
            'desc'     => 'Técnica de evasión que manipula el filtro all_plugins para esconder plugins maliciosos de la lista del panel de administración.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'rest_api_unauthorized_rce' => array(
            'regex'    => '/register_rest_route\s*\([^,]+,[^,]+,\s*\[[^]]*[\'"]permission_callback[\'"]\s*=>\s*[\'"]__return_true[\'"][^]]*\]\s*\)\s*;[^}]*(insert_code|header\.php|file_put_contents)/is',
            'title'    => 'Ruta REST API no autorizada para Inyección Remota (REST RCE)',
            'desc'     => 'Endpoint REST público sin control de permisos utilizado para inyectar código PHP arbitrario en los temas del sitio.',
            'severity' => 'crit',
            'type'     => 'rce'
        ),
        'encrypted_header_backdoor' => array(
            'regex'    => '/(if\s*\(\s*!\s*isset\s*\(\s*\$_(GET|POST|REQUEST)\[[\'"]key[\'"]\]\s*\)\s*\|\|\s*!\s*isset\s*\(\s*\$_(GET|POST|REQUEST)\[[\'"]iv[\'"]\]\s*\)\s*\)[^}]*\$encryptedBase64|removable_code.*\$encryptedBase64)/is',
            'title'    => 'Payload Cifrado en Plantilla con Clave Dinámica (AES Header Backdoor)',
            'desc'     => 'Código en header.php que requiere parámetros de clave e IV (Initialization Vector) para descifrar y ejecutar código en vivo.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'cron_persistence_reinstaller' => array(
            'regex'    => '/(file_put_contents\s*\([^)]*plugins\/[^)]*\)\s*;[^}]*activate_plugin\s*\()/is',
            'title'    => 'Persistencia y Reinstalación Clandestina de Plugins (Cron Dropper)',
            'desc'     => 'Código en wp-cron.php u otros archivos del sistema que vuelve a crear y activar plugins maliciosos si son eliminados.',
            'severity' => 'crit',
            'type'     => 'dropper'
        ),
        'supply_chain_c2_drainer' => array(
            'regex'    => '/(94\.156\.79\.8|hostpdf\.co|pachamama\s*\(|AddSites|sc-top\.js|custom_notify_plugin_update)/i',
            'title'    => 'Malware Supply Chain WordPress.org (Angel Drainer / Pachamama)',
            'desc'     => 'Inyección reportada por Wordfence en 5 plugins oficiales comprometidos: exfiltración de credenciales de base de datos a 94.156.79.8 y drenador de criptoactivos.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),

        // --- 3.5 AMENAZAS ACTIVAS & EMERGENTES 2026 (SUCURI, WORDFENCE, PATCHSTACK, BLEEPINGCOMPUTER) ---
        'sc_mesh_loader' => array(
            'regex'    => '/(SC_AUTO_PREPEND|SC_START|SC_END|SC_BLOCK|\$GLOBALS\s*\[\s*[\'"]SC_[A-Z0-9_]+[\'"]\s*\]|\/\*\s*SC_[A-Z0-9_]+\s*\*\/)/i',
            'title'    => 'Malla Autoreparable SC WordPress Malware (Sucuri Sept/Oct 2026)',
            'desc'     => 'Firma característica de la campaña SC WordPress Malware: loaders interconectados en malla que restauran el backdoor a los pocos segundos de su eliminación.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'blockchain_c2_eth_rpc' => array(
            'regex'    => '/(mainnet\.infura\.io|rpc\.ankr\.com|alchemy\.com\/v2|cloudflare-eth\.com|eth\.llamarpc\.com|eth-mainnet\.g\.alchemy\.com|web3_clientVersion)/i',
            'title'    => 'Comando y Control (C2) sobre RPC de Blockchain Ethereum',
            'desc'     => 'Backdoor que consulta nodos RPC de Ethereum y contratos inteligentes para descargar comandos y evadir bloqueos de dominios (Sucuri Report 2026).',
            'severity' => 'crit',
            'type'     => 'etherhiding'
        ),
        'shared_memory_persistence' => array(
            'regex'    => '/(shmop_open|shmop_read|shmop_write|shmat|shmdt|shm_get_var|shm_put_var|ftok\s*\()/i',
            'title'    => 'Persistencia en Memoria Compartida (Shared Memory / System V IPC)',
            'desc'     => 'Payload malicioso residente en memoria RAM del servidor web. Sobrevive a la eliminación de archivos y limpiezas de base de datos (Sucuri SC Malware).',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'clickfix_clipboard_smuggling' => array(
            'regex'    => '/(powershell\s+(-e|-enc|-encodedcommand|-w\s+hidden)|mshta\s+https?:\/\/|certutil\s+-urlcache|curl\s+-[sS]?[kK]?\s+https?:\/\/[^\s|]+\s*\|\s*powershell|Invoke-Expression\s*\(|IEX\s*\(New-Object)/i',
            'title'    => 'Ingeniería Social ClickFix / Payload Smuggling (CTM360 / BleepingComputer)',
            'desc'     => 'Falsos cuadros de diálogo que inducen al usuario a copiar y ejecutar scripts PowerShell destructivos en el portapapeles.',
            'severity' => 'crit',
            'type'     => 'clickfix'
        ),
        'comment2shell_xss' => array(
            'regex'    => '/(<[a-z0-9_-]+(\s+[a-z0-9_-]+(\s*=\s*([\'"][^\'"]*[\r\n]+[^\'"]*[\'"]|[^\s>]+))?)*\s*(href|src|action)\s*=\s*[\'"]?\s*javascript:(?!\s*(void\s*\(\s*0\s*\)|;|void\s*0|history\.(back|go)\s*\(\s*-?1?\s*\)|return\s+false\s*;?)\s*[\'"]?)|\bhref\s*=\s*[\r\n]+\s*[\'"]?\s*javascript:|<[a-z]+[^>]*[\r\n]+[^>]*\bjavascript:(?!\s*(void\s*\(\s*0\s*\)|;|void\s*0|history\.(back|go)\s*\(\s*-?1?\s*\)|return\s+false\s*;?)\s*[\'"]?)(alert|eval|fetch|location|document|window|XMLHttpRequest|script|atob|fromCharCode|\(|\$|\+))/is',
            'title'    => 'Explotación Comment2Shell / XSS con Salto de Línea (CVE-2026-93485)',
            'desc'     => 'Vulnerabilidad reportada por Patchstack que burla el filtrado KSES mediante saltos de línea dentro de atributos HTML para ejecutar JavaScript en la sesión del administrador.',
            'severity' => 'crit',
            'type'     => 'malicious_js'
        ),
        'arbitrary_file_upload_rce' => array(
            'regex'    => '/(wwlc_file_upload_handler|unauthenticated.*upload|allow_unauthenticated_upload)/i',
            'title'    => 'Vulnerabilidad de Subida Arbitraria de Archivos (CVE-2026-27540 / Lead Capture)',
            'desc'     => 'Endpoint AJAX vulnerable sin autenticación ni validación de tipo de archivo explotado para subir webshells PHP (Wordfence / The Hacker News 2026).',
            'severity' => 'crit',
            'type'     => 'rce'
        ),
        'auto_prepend_hijack' => array(
            'regex'    => '/(auto_prepend_file|auto_append_file)\s*=\s*[\'"]?([^\s\'"]+\.php)/i',
            'title'    => 'Secuestro de Ejecución PHP vía auto_prepend_file (.user.ini / php.ini)',
            'desc'     => 'Directiva en configuración PHP que fuerza la ejecución de un loader malicioso antes de inicializar WordPress (Sucuri SC Malware).',
            'severity' => 'crit',
            'type'     => 'tampering'
        ),

        // --- 4. AMENAZAS HISTÓRICAS & WEBSHELLS CLÁSICAS ---
        'eval_base64' => array(
            'regex'    => '/eval\s*\(\s*(base64_decode|gzinflate|gzuncompress|str_rot13|hex2bin)\s*\(/i',
            'title'    => 'Ofuscación crítica: eval(base64/gzinflate)',
            'desc'     => 'Ejecución oculta de código binario o comprimido, típico de backdoors y webshells.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'eval_atob_obfuscation' => array(
            'regex'    => '/(eval\s*\(\s*atob\s*\(|String\.fromCharCode\s*\(\s*\d+\s*(,\s*\d+){8,}\))/i',
            'title'    => 'JavaScript ofuscado: eval(atob) / fromCharCode masivo',
            'desc'     => 'Carga dinámica de scripts en el navegador mediante ofuscación para evadir antivirus.',
            'severity' => 'crit',
            'type'     => 'malicious_js'
        ),
        'assert_shell' => array(
            'regex'    => '/(assert\s*\(\s*\$_(GET|POST|REQUEST|COOKIE)|create_function\s*\([^\)]*\$_(GET|POST|REQUEST)|preg_replace\s*\(\s*[\'"][^\'"]*\/e[\'"]\s*,\s*(\$_(GET|POST|REQUEST|COOKIE)|eval|base64_decode))/i',
            'title'    => 'Inyección de código remoto: assert / create_function / preg_replace /e',
            'desc'     => 'Puerta trasera que ejecuta código PHP arbitrario enviado por atacantes vía peticiones web.',
            'severity' => 'crit',
            'type'     => 'webshell'
        ),
        'system_execution' => array(
            'regex'    => '/(system|shell_exec|passthru|popen|proc_open)\s*\(\s*\$_(GET|POST|REQUEST|COOKIE|SERVER)/i',
            'title'    => 'Ejecución de comandos del sistema operativo (RCE)',
            'desc'     => 'Comando de terminal controlado por parámetros HTTP. Riesgo extremo de toma de control total del servidor.',
            'severity' => 'crit',
            'type'     => 'rce'
        ),
        'variable_function_call' => array(
            'regex'    => '/(\$_(GET|POST|COOKIE|REQUEST)\[[^\]]+\]\s*\(\s*\$_(GET|POST|COOKIE|REQUEST)\[[^\]]+\]\)|\$([a-zA-Z0-9_]+)\s*=\s*\$_(GET|POST|COOKIE|REQUEST)\[[^\]]+\]\s*;[^\$]*\$\3\s*\()/is',
            'title'    => 'Llamada dinámica a función arbitraria vía input HTTP',
            'desc'     => 'Técnica de evasión donde tanto el nombre de la función como su argumento son controlados por el atacante.',
            'severity' => 'crit',
            'type'     => 'webshell'
        ),
        'webshell_signatures' => array(
            'regex'    => '/\b(c99shell|r57shell|WSO_VERSION|FilesMan|b374k|alfa_team|alfa-shell|IndoXploit|MadSpot|p0wny-shell|weevely|c100\s*(webshell|shell)|\$c100|pHpINJ|Remview|Draft-Webshell|IronShell|AK-74\s*shell|PHP-Backdoor|Dark-Shell|Antichat\s*shell|bypass403|bypass_shell|0byte\s*shell|hacker-shell|AnonSec|SadAttack|Marijuana-Shell)\b/i',
            'title'    => 'Firma de WebShell conocida (Clásica y Moderna)',
            'desc'     => 'Herramienta gráfica de administración ilícita o consola remota instalada por ciberatacantes.',
            'severity' => 'crit',
            'type'     => 'webshell'
        ),
        'rogue_uploader' => array(
            'regex'    => '/(move_uploaded_file|copy)\s*\(\s*\$_FILES\[[^\]]+\]\[[\'"]tmp_name[\'"]\]\s*,\s*[^;]*\.(php|phtml|phar)/i',
            'title'    => 'Subida no autorizada de ejecutables PHP (Rogue Uploader)',
            'desc'     => 'Backdoor que permite subir y ejecutar scripts PHP adicionales en el servidor.',
            'severity' => 'crit',
            'type'     => 'backdoor'
        ),
        'seo_spam_injection' => array(
            'regex'    => '/((style\s*=\s*[\'"][^\'"]*(display\s*:\s*none|visibility\s*:\s*hidden|position\s*:\s*absolute;\s*left\s*:\s*-[0-9]{3,}px|text-indent\s*:\s*-[0-9]{3,}px)[^\'"]*[\'"])|class\s*=\s*[\'"][^\'"]*hidden[^\'"]*[\'"])[^>]*>[^<]*<a[^>]+href=[^>]+>(online-casino|viagra|cialis|slot-online|judi-online|poker-online|payday-loan|replica-watch|baccarat|porn|sex-video)/i',
            'title'    => 'Inyección de Spam SEO Oculto (Black Hat SEO)',
            'desc'     => 'Enlaces o textos ocultos con CSS invisible para monetización ilegal (casinos, medicamentos ilegales, apuestas).',
            'severity' => 'warn',
            'type'     => 'seo_spam'
        ),
        'hidden_iframe' => array(
            'regex'    => '/<iframe[^>]+(style\s*=\s*["\'][^"\']*(display\s*:\s*none|visibility\s*:\s*hidden|\bwidth\s*:\s*0|\bheight\s*:\s*0)|\bwidth\s*=\s*["\']0["\']|\bheight\s*=\s*["\']0["\'])/i',
            'title'    => 'Iframe oculto / Redirección fraudulenta',
            'desc'     => 'Marco invisible diseñado para inflar visitas fraudulentas o cargar exploits en segundo plano.',
            'severity' => 'warn',
            'type'     => 'hidden_iframe'
        )
    );

    public function __construct() {
        $this->whitelist = get_option('nexaguard_whitelisted_items', array());
    }

    public function scan_full() {
        $start_time = microtime(true);
        $this->threats = array();
        $this->scanned_files = 0;
        $this->scanned_options = 0;

        // Desglose forense de áreas y carpetas auditadas
        $this->breakdown = array(
            'themes'     => array('name' => 'Temas y Plantillas', 'path' => 'wp-content/themes/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🎨'),
            'plugins'    => array('name' => 'Plugins Instalados', 'path' => 'wp-content/plugins/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🔌'),
            'dropins'    => array('name' => 'Drop-Ins y Shims (wp-content)', 'path' => 'wp-content/ (*.php)', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '💉'),
            'uploads'    => array('name' => 'Archivos de Medios', 'path' => 'wp-content/uploads/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '📁'),
            'mu_plugins' => array('name' => 'Must-Use Plugins (Sistema)', 'path' => 'wp-content/mu-plugins/', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '⚡'),
            'core'       => array('name' => 'Núcleo WordPress (Core)', 'path' => 'wp-includes/, wp-admin/, raíz', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🏛️'),
            'php_config' => array('name' => 'Configuración PHP (.user.ini / php.ini)', 'path' => '.user.ini, php.ini', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '⚙️'),
            'database'   => array('name' => 'Base de Datos MySQL', 'path' => 'wp_options, wp_posts, cron, triggers', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '🗄️'),
            'admins'     => array('name' => 'Cuentas de Administrador', 'path' => 'wp_users (roles & permisos)', 'files' => 0, 'threats' => 0, 'status' => 'clean', 'icon' => '👤')
        );

        // 1. Escanear carpeta de subidas (Uploads) con filtro inteligente y verificación .htaccess
        $this->scan_uploads();

        // 2. Escanear todos los plugins instalados (activos e inactivos)
        $this->scan_plugins();

        // 3. Escanear plugins obligatorios (mu-plugins)
        $this->scan_mu_plugins();

        // 4. Escanear Drop-Ins y shims en wp-content (db.php, advanced-cache.php, loaders ocultos SC Malware)
        $this->scan_dropins_and_shims();

        // 5. Escanear secuestro de configuración PHP vía auto_prepend_file (.user.ini, php.ini)
        $this->scan_php_config_prepend();

        // 6. Escanear todos los temas instalados
        $this->scan_themes();

        // 7. Escanear integridad de archivos raíz y Core de WordPress
        $this->scan_core();

        // 8. Escanear base de datos (wp_options, wp_posts, wp-cron, triggers)
        $this->scan_database();

        // 9. Verificar cuentas de administradores y triggers de persistencia
        $this->scan_admin_users();

        $cloud_intel = $this->sync_cloud_threat_intel();

        $elapsed = round(microtime(true) - $start_time, 2);

        $report = array(
            'timestamp'       => time(),
            'elapsed'         => $elapsed,
            'scanned_files'   => $this->scanned_files,
            'scanned_options' => $this->scanned_options,
            'threats_count'   => count($this->threats),
            'threats'         => $this->threats,
            'breakdown'       => $this->breakdown,
            'cloud_intel'     => $cloud_intel,
            'status'          => count($this->threats) === 0 ? 'clean' : 'infected'
        );

        update_option('nexaguard_last_scan_report', $report);

        return $report;
    }

    private function sync_cloud_threat_intel() {
        $feed_url = 'https://nexaguard.onrender.com/api/threat-intel';
        $response = wp_remote_get($feed_url, array('timeout' => 3, 'sslverify' => false));
        if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
            $data = json_decode(wp_remote_retrieve_body($response), true);
            if ($data && !empty($data['threat_signatures'])) {
                update_option('nexaguard_cloud_intel_cache', $data);
                return array(
                    'status'    => 'connected',
                    'cloud'     => $data['cloud'],
                    'version'   => $data['feed_version'],
                    'synced_at' => current_time('mysql')
                );
            }
        }
        $cached = get_option('nexaguard_cloud_intel_cache', null);
        if ($cached) {
            return array(
                'status'    => 'connected',
                'cloud'     => $cached['cloud'],
                'version'   => $cached['feed_version'],
                'synced_at' => 'Caché local sincronizada'
            );
        }
        return array(
            'status'    => 'local_engine',
            'cloud'     => 'NexaGuard Threat Cloud (Modo Autónomo)',
            'version'   => '2026.10',
            'synced_at' => 'Motor Heurístico Nativo'
        );
    }

    /**
     * Escaneo de Uploads con discriminación de falsos positivos legítimos
     * (Redux Framework, Silence is golden, etc.)
     */
    private function scan_uploads() {
        $upload_dir = wp_upload_dir();
        $path = $upload_dir['basedir'];
        if (!is_dir($path)) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isFile()) {
                $this->scanned_files++;
                $this->breakdown['uploads']['files']++;
                $ext = strtolower($item->getExtension());
                $filepath = $item->getPathname();
                $rel = str_replace(array(ABSPATH, '\\'), array('', '/'), $filepath);

                // Si está en lista blanca, saltar
                if (in_array($rel, $this->whitelist) || in_array($filepath, $this->whitelist)) {
                    continue;
                }

                if (in_array($ext, array('php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'shtml'))) {
                    $content = @file_get_contents($filepath);
                    if ($content === false) continue;

                    // 1. Ignorar archivos 'Silence is golden' estándar de WordPress (index.php vacío protector)
                    $clean_text = trim(preg_replace('/\s+/', ' ', $content));
                    if (basename($filepath) === 'index.php' && (stripos($clean_text, 'Silence is golden') !== false || strlen($clean_text) < 60)) {
                        continue; // 100% benigno
                    }

                    // 2. Comprobar si pertenece a Redux Framework u otros frameworks de temas legítimos
                    $is_redux_or_theme_cache = (
                        strpos($rel, 'uploads/redux/') !== false ||
                        strpos($rel, 'uploads/elementor/') !== false ||
                        strpos($rel, 'uploads/elementor-widget/') !== false ||
                        strpos($rel, 'uploads/et-cache/') !== false ||
                        strpos($rel, 'uploads/astra-addon/') !== false
                    );

                    // Analizar si el contenido tiene malware real
                    $threat_found = false;
                    foreach ($this->patterns as $key => $p) {
                        if (preg_match($p['regex'], $content, $matches, PREG_OFFSET_CAPTURE)) {
                            $threat_found = true;
                            $offset = $matches[0][1];
                            $line = substr_count(substr($content, 0, $offset), "\n") + 1;
                            $snippet = substr($content, max(0, $offset - 40), 180);

                            $this->add_threat(array(
                                'id'          => md5($filepath . $key),
                                'category'    => 'uploads_malware',
                                'severity'    => 'crit',
                                'title'       => 'Malware / Backdoor en carpeta Uploads: ' . $p['title'],
                                'desc'        => $p['desc'] . ' [Ubicado en ' . esc_html($rel) . ']',
                                'file'        => $rel,
                                'full_path'   => $filepath,
                                'line'        => $line,
                                'code'        => htmlspecialchars($snippet),
                                'can_clean'   => true,
                                'clean_action'=> 'quarantine'
                            ), 'uploads');
                            break;
                        }
                    }

                    // Si pertenece a Redux Framework y NO tiene malware real, OMITIR falso positivo
                    if ($is_redux_or_theme_cache && !$threat_found) {
                        continue;
                    }

                    // Si es un archivo PHP desconocido en uploads fuera de frameworks conocidos:
                    if (!$threat_found) {
                        $this->add_threat(array(
                            'id'          => md5($filepath),
                            'category'    => 'uploads_php_suspicious',
                            'severity'    => 'warn',
                            'title'       => 'Archivo ejecutable PHP inusual en Uploads',
                            'desc'        => 'Se encontró un archivo PHP en la carpeta de medios. Aunque no contiene una firma de malware conocida, los archivos PHP en uploads son inusuales.',
                            'file'        => $rel,
                            'full_path'   => $filepath,
                            'line'        => 1,
                            'code'        => htmlspecialchars(substr($content, 0, 180)),
                            'can_clean'   => true,
                            'clean_action'=> 'quarantine'
                        ), 'uploads');
                    }
                    continue;
                }

                // 3. Detección de imágenes o archivos multimedia políglotas con PHP embebido en Uploads
                if (in_array($ext, array('jpg', 'jpeg', 'png', 'gif', 'webp', 'ico', 'pdf', 'txt', 'svg')) && $item->getSize() < 2500000) {
                    $head = @file_get_contents($filepath, false, null, 0, 16384);
                    if ($head !== false && preg_match('/<\?(php|=)\s/i', $head)) {
                        $this->add_threat(array(
                            'id'          => md5($filepath . '_polyglot'),
                            'category'    => 'polyglot_php_media',
                            'severity'    => 'crit',
                            'title'       => 'Payload ejecutable PHP oculto en archivo multimedia',
                            'desc'        => 'Se detectó código ejecutable PHP camuflado dentro de un archivo de imagen o medio en Uploads (Técnica de evasión Polyglot/LFI).',
                            'file'        => $rel,
                            'full_path'   => $filepath,
                            'line'        => 1,
                            'code'        => htmlspecialchars(substr($head, 0, 180)),
                            'can_clean'   => true,
                            'clean_action'=> 'quarantine'
                        ), 'uploads');
                        continue;
                    }
                }

                // 4. Detección de .htaccess sospechoso dentro de uploads que intente habilitar PHP
                if (basename($filepath) === '.htaccess') {
                    $ht = @file_get_contents($filepath);
                    if ($ht !== false && preg_match('/(SetHandler|AddType|AddHandler|php_value\s+auto_prepend_file|php_flag\s+engine\s+on)/i', $ht)) {
                        $this->add_threat(array(
                            'id'          => md5($filepath . '_htaccess'),
                            'category'    => 'htaccess_execution_override',
                            'severity'    => 'crit',
                            'title'       => 'Manipulación de .htaccess para ejecutar scripts en Uploads',
                            'desc'        => 'Regla de servidor en uploads configurada para permitir la ejecución de scripts PHP o saltarse restricciones perimetrales.',
                            'file'        => $rel,
                            'full_path'   => $filepath,
                            'line'        => 1,
                            'code'        => htmlspecialchars(substr($ht, 0, 180)),
                            'can_clean'   => true,
                            'clean_action'=> 'quarantine'
                        ), 'uploads');
                        continue;
                    }
                }

                // Escanear contenido de archivos .ico, .txt, .svg, .js por si tienen código PHP/JS embebido o malware
                if (in_array($ext, array('ico', 'txt', 'svg', 'htm', 'html', 'js')) && $item->getSize() < 500000) {
                    $this->check_file_content($filepath, 'uploads');
                }
            }
        }

        // 5. Verificar blindaje de ejecución PHP en Uploads (CVE-2026-27540 Arbitrary File Upload Protection)
        $upload_protect_ht = trailingslashit($path) . '.htaccess';
        if (!file_exists($upload_protect_ht) || stripos(@file_get_contents($upload_protect_ht), 'Deny from all') === false) {
            $this->add_threat(array(
                'id'          => md5('uploads_php_execution_unprotected'),
                'category'    => 'uploads_execution_risk',
                'severity'    => 'warn',
                'title'       => 'Directorio de Medios (Uploads) sin contención de scripts PHP',
                'desc'        => 'No existe una regla de bloqueo de ejecución PHP (.htaccess) en wp-content/uploads/. Si un atacante explota una vulnerabilidad de subida arbitraria (ej: CVE-2026-27540 en WooCommerce Wholesale Lead Capture), podrá ejecutar webshells directamente.',
                'file'        => 'wp-content/uploads/.htaccess',
                'full_path'   => $upload_protect_ht,
                'line'        => 0,
                'code'        => 'Falta directiva <FilesMatch "\.(php...)"> Deny from all',
                'can_clean'   => true,
                'clean_action'=> 'protect_uploads_directory'
            ), 'uploads');
        }
    }

    /**
     * Escaneo de todos los plugins instalados en wp-content/plugins/
     */
    private function scan_plugins() {
        $plugins_dir = WP_PLUGIN_DIR;
        if (!is_dir($plugins_dir)) return;

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($plugins_dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isFile()) {
                $filepath = $item->getPathname();
                $rel = str_replace(array(ABSPATH, '\\'), array('', '/'), $filepath);

                // Omitir el propio plugin NexaGuard Security para no auto-analizarse
                if (strpos($rel, 'nexaguard-security') !== false) {
                    continue;
                }

                // Omitir carpetas de desarrollo / dependencias externas
                if (strpos($rel, '/node_modules/') !== false || strpos($rel, '/.git/') !== false || strpos($rel, '/tests/') !== false) {
                    continue;
                }

                $ext = strtolower($item->getExtension());
                if (in_array($ext, array('php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'inc', 'js', 'html', 'htm', 'ico')) && $item->getSize() < 1200000) {
                    $this->scanned_files++;
                    $this->breakdown['plugins']['files']++;
                    $this->check_file_content($filepath, 'plugins');
                }
            }
        }
    }

    /**
     * Escaneo de plugins obligatorios mu-plugins
     */
    private function scan_mu_plugins() {
        $mu_dir = WPMU_PLUGIN_DIR;
        if (!is_dir($mu_dir)) return;

        $files = scandir($mu_dir);
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            $filepath = $mu_dir . '/' . $file;
            if (is_file($filepath) && pathinfo($filepath, PATHINFO_EXTENSION) === 'php') {
                $this->scanned_files++;
                $this->breakdown['mu_plugins']['files']++;
                $this->check_file_content($filepath, 'mu_plugins');
            }
        }
    }

    /**
     * Auditoría de Drop-Ins y Shims en wp-content/
     * Inspecciona db.php, advanced-cache.php, object-cache.php y archivos ocultos .*php
     * (Vector clave de persistencia del SC WordPress Malware reportado por Sucuri en sept/oct 2026).
     */
    private function scan_dropins_and_shims() {
        $content_dir = WP_CONTENT_DIR;
        if (!is_dir($content_dir)) return;

        $official_dropins = array(
            'advanced-cache.php', 'db.php', 'db-error.php', 'install.php',
            'maintenance.php', 'object-cache.php', 'php-error.php', 'fatal-error-handler.php', 'index.php'
        );

        $files = @scandir($content_dir);
        if (!$files) return;

        foreach ($files as $file) {
            if ($file === '.' || $file === '..') continue;
            $filepath = $content_dir . '/' . $file;
            if (!is_file($filepath)) continue;

            $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            $is_hidden = (substr($file, 0, 1) === '.');

            // Auditar archivos .php y archivos ocultos .*.php
            if ($ext === 'php' || ($is_hidden && preg_match('/\.php$/i', $file))) {
                $this->scanned_files++;
                $this->breakdown['dropins']['files']++;

                $rel = 'wp-content/' . $file;
                if (in_array($rel, $this->whitelist) || in_array($filepath, $this->whitelist)) {
                    continue;
                }

                $content = @file_get_contents($filepath);
                if ($content === false) continue;

                // 1. Detección de archivos ocultos en wp-content (ej: .c1b12371.php)
                if ($is_hidden) {
                    $this->add_threat(array(
                        'id'          => md5('hidden_shim_' . $file),
                        'category'    => 'sc_mesh_loader',
                        'severity'    => 'crit',
                        'title'       => 'Archivo Oculto Sospechoso en wp-content/ (' . $file . ')',
                        'desc'        => 'Se detectó un archivo ejecutable oculto con punto inicial en wp-content/. Esta técnica es empleada por el malware SC (Sucuri 2026) para esconder loaders invisibles.',
                        'file'        => $rel,
                        'full_path'   => $filepath,
                        'line'        => 1,
                        'code'        => htmlspecialchars(substr($content, 0, 180)),
                        'can_clean'   => true,
                        'clean_action'=> 'force_delete'
                    ), 'dropins');
                    continue;
                }

                // 2. Si no es un drop-in oficial de WordPress ni index.php, es un archivo rogue/shim
                if (!in_array($file, $official_dropins, true)) {
                    $this->add_threat(array(
                        'id'          => md5('rogue_dropin_' . $file),
                        'category'    => 'rogue_shim_file',
                        'severity'    => 'crit',
                        'title'       => 'Archivo Shim / Drop-in No Estándar en wp-content/ (' . $file . ')',
                        'desc'        => "El archivo '{$file}' no es un drop-in oficial de WordPress ni pertenece a plugins conocidos. Es utilizado habitualmente como puente (shim) por loaders maliciosos.",
                        'file'        => $rel,
                        'full_path'   => $filepath,
                        'line'        => 1,
                        'code'        => htmlspecialchars(substr($content, 0, 180)),
                        'can_clean'   => true,
                        'clean_action'=> 'quarantine'
                    ), 'dropins');
                    continue;
                }

                // 3. Inspeccionar drop-ins oficiales por cargas maliciosas
                // (db.php y advanced-cache.php infectados con SC malware o gzip+base64)
                if (preg_match('/(SC_AUTO_PREPEND|SC_START|SC_END|SC_BLOCK|gzinflate\s*\(\s*base64_decode|shmop_open|eth_call|mainnet\.infura\.io|0x[a-fA-F0-9]{40})/i', $content, $m)) {
                    $this->add_threat(array(
                        'id'          => md5('dropin_infected_' . $file),
                        'category'    => 'dropin_persistence',
                        'severity'    => 'crit',
                        'title'       => 'Infección Crítica en Drop-In wp-content/' . $file . ' (SC Mesh Malware)',
                        'desc'        => "El drop-in '{$file}' está comprometido con un payload de persistencia que reconstruye el malware en cada petición antes de que carguen los plugins (Sucuri 2026).",
                        'file'        => $rel,
                        'full_path'   => $filepath,
                        'line'        => 1,
                        'code'        => htmlspecialchars(substr($m[0], 0, 160)),
                        'can_clean'   => true,
                        'clean_action'=> 'clean_dropin'
                    ), 'dropins');
                } else {
                    // Chequeo general de patrones
                    $this->check_file_content($filepath, 'dropins');
                }
            }
        }
    }

    /**
     * Auditoría de secuestro de configuración PHP vía auto_prepend_file
     * Revisa .user.ini, php.ini y .htaccess en la raíz y en wp-content/
     * (Sucuri SC Malware: Paso 1 del informe de limpieza).
     */
    private function scan_php_config_prepend() {
        $paths_to_check = array(
            ABSPATH . '.user.ini',
            ABSPATH . 'php.ini',
            WP_CONTENT_DIR . '/.user.ini',
            WP_CONTENT_DIR . '/php.ini'
        );

        foreach ($paths_to_check as $file) {
            if (!file_exists($file)) continue;
            $this->scanned_files++;
            $this->breakdown['php_config']['files']++;
            $content = @file_get_contents($file);
            if ($content === false) continue;

            $rel = str_replace(array(ABSPATH, '\\'), array('', '/'), $file);
            if (in_array($rel, $this->whitelist) || in_array($file, $this->whitelist)) continue;

            if (preg_match('/(auto_prepend_file|auto_append_file)\s*=\s*[\'"]?([^\r\n\'"]+)[\'"]?/i', $content, $matches)) {
                $target_target = trim($matches[2]);
                // Si apunta a un script dentro de la instalación o fuera de vendor estándar
                if (!empty($target_target) && stripos($target_target, 'wordfence-waf.php') === false) {
                    $this->add_threat(array(
                        'id'          => md5('php_config_prepend_' . $file),
                        'category'    => 'auto_prepend_hijack',
                        'severity'    => 'crit',
                        'title'       => 'Secuestro de ejecución PHP vía auto_prepend_file en ' . basename($file),
                        'desc'        => "La directiva auto_prepend_file en {$rel} ejecuta '{$target_target}' antes de cada petición web. Es el vector primario de persistencia del malware SC (Sucuri 2026).",
                        'file'        => $rel,
                        'full_path'   => $file,
                        'line'        => 1,
                        'code'        => htmlspecialchars($matches[0]),
                        'can_clean'   => true,
                        'clean_action'=> 'neutralize_auto_prepend'
                    ), 'php_config');
                }
            }
        }
    }

    /**
     * Escaneo de todos los temas instalados
     */
    private function scan_themes() {
        $themes_dir = get_theme_root();
        if (!is_dir($themes_dir)) return;

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($themes_dir, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST
        );

        foreach ($iterator as $item) {
            if ($item->isFile()) {
                $ext = strtolower($item->getExtension());
                if (in_array($ext, array('php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'inc', 'js', 'html', 'htm', 'ico')) && $item->getSize() < 1200000) {
                    $this->scanned_files++;
                    $this->breakdown['themes']['files']++;
                    $this->check_file_content($item->getPathname(), 'themes');
                }
            }
        }
    }

    /**
     * Escaneo de integridad del Core de WordPress y archivos raíz
     */
    private function scan_core() {
        $root_files = array(
            ABSPATH . 'index.php',
            ABSPATH . 'wp-blog-header.php',
            ABSPATH . 'wp-config.php',
            ABSPATH . 'wp-settings.php',
            ABSPATH . 'wp-load.php',
            ABSPATH . 'wp-login.php',
            ABSPATH . 'wp-cron.php',
            ABSPATH . '.htaccess'
        );

        // 1. Escanear archivos raíz principales con firmas heurísticas
        foreach ($root_files as $filepath) {
            if (file_exists($filepath)) {
                $this->scanned_files++;
                $this->breakdown['core']['files']++;

                // Auditoría especializada en wp-cron.php para detectar droppers de persistencia
                if (basename($filepath) === 'wp-cron.php') {
                    $cron_code = @file_get_contents($filepath);
                    if ($cron_code !== false && preg_match('/(START CUSTOM CODE|WP-antymalwary-bot|activate_plugin|plugin_slug|custom_ads_url)/i', $cron_code)) {
                        $this->add_threat(array(
                            'id'          => md5($filepath . '_cron_dropper'),
                            'category'    => 'cron_persistence_reinstaller',
                            'severity'    => 'crit',
                            'title'       => 'Infección Crítica en wp-cron.php (Persistencia / Dropper C&C)',
                            'desc'        => 'Se detectó código inyectado en wp-cron.php diseñado para reinstalar y reactivar troyanos automáticamente en cada visita (Vector Wordfence 2025).',
                            'file'        => 'wp-cron.php',
                            'full_path'   => $filepath,
                            'line'        => 1,
                            'code'        => htmlspecialchars(substr($cron_code, 0, 200)),
                            'can_clean'   => true,
                            'clean_action'=> 'sanitize_injection'
                        ), 'core');
                        continue;
                    }
                }

                $this->check_file_content($filepath, 'core');
            }
        }

        // 2. Inspeccionar archivos clave de wp-includes
        $includes_dir = ABSPATH . WPINC;
        if (is_dir($includes_dir)) {
            $critical_includes = array(
                $includes_dir . '/template-loader.php',
                $includes_dir . '/functions.php',
                $includes_dir . '/load.php',
                $includes_dir . '/default-filters.php',
                $includes_dir . '/version.php',
                $includes_dir . '/pluggable.php',
                $includes_dir . '/general-template.php',
                $includes_dir . '/formatting.php',
                $includes_dir . '/js/wp-embed.min.js',
                $includes_dir . '/js/jquery/jquery.min.js'
            );
            foreach ($critical_includes as $filepath) {
                if (file_exists($filepath)) {
                    $this->scanned_files++;
                    $this->breakdown['core']['files']++;
                    $this->check_file_content($filepath, 'core');
                }
            }
        }

        // 3. Auditoría forense de wp-config.php (Sales criptográficas y DISALLOW_FILE_EDIT - Hostinet Paso 8 & Hardening)
        $this->audit_wp_config();

        // 4. Auditoría de .htaccess (Redirecciones maliciosas y Options -Indexes - Hostinet Paso 1, 5 & Hardening)
        $this->audit_htaccess();

        // 5. Verificación de Integridad por Checksums Oficiales de WordPress.org (Hostinet Pasos 4, 5 y 6)
        $this->scan_core_checksums();

        // 6. Detección de Anomalías Temporales / Archivos de Core modificados recientemente (Hostinet Paso 4)
        $this->scan_recent_core_tampering();
    }

    /**
     * Auditoría de seguridad y hardening en wp-config.php
     * Verifica sales criptográficas (Paso 8 Hostinet) y deshabilitación de edición de código en panel (Hardening #1)
     */
    private function audit_wp_config() {
        $config_file = ABSPATH . 'wp-config.php';
        if (!file_exists($config_file)) {
            if (file_exists(dirname(ABSPATH) . '/wp-config.php')) {
                $config_file = dirname(ABSPATH) . '/wp-config.php';
            } else {
                return;
            }
        }

        $content = @file_get_contents($config_file);
        if ($content === false) return;

        // Comprobar claves y sales secretas por defecto o vacías (Hostinet Paso 8)
        if (preg_match('/define\s*\(\s*[\'"](AUTH_KEY|SECURE_AUTH_KEY|LOGGED_IN_KEY|NONCE_KEY|AUTH_SALT|SECURE_AUTH_SALT|LOGGED_IN_SALT|NONCE_SALT)[\'"]\s*,\s*[\'"](put your unique phrase here|[\s]*)[\'"]\s*\)/i', $content, $matches)) {
            $this->add_threat(array(
                'id'          => md5('wp_config_insecure_salts'),
                'category'    => 'insecure_salts',
                'severity'    => 'crit',
                'title'       => 'Claves de Sal Criptográfica Inseguras en wp-config.php',
                'desc'        => 'Las sales secretas de autenticación (AUTH_KEY, SECURE_AUTH_SALT, etc.) usan la frase por defecto ("put your unique phrase here") o están vacías. Esto permite a atacantes falsificar cookies de sesión y mantener sesiones activas secuestradas (Hostinet Paso 8).',
                'file'        => 'wp-config.php',
                'full_path'   => $config_file,
                'line'        => 0,
                'code'        => htmlspecialchars(substr($matches[0], 0, 150)),
                'can_clean'   => true,
                'clean_action'=> 'regenerate_wp_salts'
            ), 'core');
        }

        // Comprobar si DISALLOW_FILE_EDIT está ausente o en false (Hostinet Recomendación Hardening #1)
        if (!preg_match('/define\s*\(\s*[\'"]DISALLOW_FILE_EDIT[\'"]\s*,\s*true\s*\)/i', $content)) {
            $this->add_threat(array(
                'id'          => md5('wp_config_file_edit_enabled'),
                'category'    => 'hardening_file_edit',
                'severity'    => 'warn',
                'title'       => 'Editor de Temas y Plugins Activo en el Panel (Riesgo de Webshell)',
                'desc'        => 'WordPress permite modificar archivos PHP directamente desde el Escritorio. Si un atacante compromete credenciales de administrador, podrá inyectar backdoors y webshells sin necesidad de acceso FTP (Hostinet Recomendación #1).',
                'file'        => 'wp-config.php',
                'full_path'   => $config_file,
                'line'        => 0,
                'code'        => "define('DISALLOW_FILE_EDIT', true); // No configurado",
                'can_clean'   => true,
                'clean_action'=> 'apply_disallow_file_edit'
            ), 'core');
        }
    }

    /**
     * Auditoría forense de .htaccess raíz
     * Comprueba redirecciones maliciosas de tráfico y falta de 'Options -Indexes'
     */
    private function audit_htaccess() {
        $htaccess_file = ABSPATH . '.htaccess';
        if (!file_exists($htaccess_file)) return;

        $content = @file_get_contents($htaccess_file);
        if ($content === false) return;

        // Detección de redirecciones maliciosas o cloaking de tráfico (Hostinet Paso 1 & 5)
        if (preg_match('/(RewriteRule|Redirect(Match)?)\s+.*\b(https?:\/\/(?!wordpress\.org|google\.|bing\.)[a-zA-Z0-9\.\-_]+\b.*)/i', $content, $m)) {
            $site_domain = parse_url(home_url(), PHP_URL_HOST);
            if ($site_domain && stripos($m[0], $site_domain) === false) {
                $this->add_threat(array(
                    'id'          => md5('htaccess_malicious_redirect'),
                    'category'    => 'malicious_redirect',
                    'severity'    => 'crit',
                    'title'       => 'Redirección Sospechosa en .htaccess (Traffic Hijacking)',
                    'desc'        => 'Se encontró una regla de redirección en .htaccess que desvía visitantes a un dominio externo no autorizado.',
                    'file'        => '.htaccess',
                    'full_path'   => $htaccess_file,
                    'line'        => 0,
                    'code'        => htmlspecialchars(substr($m[0], 0, 160)),
                    'can_clean'   => true,
                    'clean_action'=> 'sanitize_injection'
                ), 'core');
            }
        }

        // Comprobar si Options -Indexes está presente para evitar Directory Browsing (Hostinet Hardening #2)
        if (stripos($content, 'Options -Indexes') === false && stripos($content, 'Options -indexes') === false) {
            $this->add_threat(array(
                'id'          => md5('htaccess_missing_options_indexes'),
                'category'    => 'hardening_directory_browsing',
                'severity'    => 'warn',
                'title'       => 'Listado de Directorios Apache Expuesto (Falta "Options -Indexes")',
                'desc'        => 'El servidor web podría permitir a atacantes listar el contenido de directorios sin index.php, revelando archivos de copia de seguridad o scripts (Hostinet Recomendación #2).',
                'file'        => '.htaccess',
                'full_path'   => $htaccess_file,
                'line'        => 0,
                'code'        => 'Options -Indexes // No configurado en .htaccess',
                'can_clean'   => true,
                'clean_action'=> 'apply_htaccess_no_indexes'
            ), 'core');
        }
    }

    /**
     * Verificación de Integridad por Checksums Oficiales de WordPress.org
     * Compara los hashes MD5 oficiales de cada archivo del núcleo con los locales (Hostinet Pasos 4, 5 y 6)
     */
    private function scan_core_checksums() {
        global $wp_version;

        $locale = function_exists('get_locale') ? get_locale() : 'en_US';
        $cache_key = 'nexaguard_core_checksums_' . md5($wp_version . '_' . $locale);
        $checksums = get_transient($cache_key);

        if (empty($checksums) || !is_array($checksums)) {
            $api_url = "https://api.wordpress.org/core/checksums/1.0/?version={$wp_version}&locale={$locale}";
            $response = wp_remote_get($api_url, array('timeout' => 4, 'sslverify' => false));
            if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
                $body = json_decode(wp_remote_retrieve_body($response), true);
                if ($body && !empty($body['checksums'])) {
                    $checksums = $body['checksums'];
                    set_transient($cache_key, $checksums, 24 * HOUR_IN_SECONDS);
                }
            }
        }

        if (empty($checksums) || !is_array($checksums)) {
            return;
        }

        // Validar integridad de archivos clave del núcleo de WordPress
        $core_critical_rel = array(
            'index.php', 'wp-blog-header.php', 'wp-settings.php', 'wp-load.php',
            'wp-login.php', 'wp-cron.php', 'wp-mail.php', 'wp-links-opml.php', 'wp-trackback.php',
            'wp-includes/functions.php', 'wp-includes/template-loader.php',
            'wp-includes/load.php', 'wp-includes/version.php', 'wp-includes/pluggable.php',
            'wp-includes/default-filters.php', 'wp-includes/formatting.php', 'wp-includes/general-template.php'
        );

        foreach ($core_critical_rel as $rel_file) {
            if (!isset($checksums[$rel_file])) continue;
            $local_path = ABSPATH . $rel_file;
            if (!file_exists($local_path)) continue;

            $official_md5 = $checksums[$rel_file];
            $local_md5 = md5_file($local_path);

            if ($local_md5 !== false && $local_md5 !== $official_md5) {
                $mtime = filemtime($local_path);
                $mod_time_str = date('d/m/Y H:i:s', $mtime);

                $this->add_threat(array(
                    'id'          => md5('checksum_mismatch_' . $rel_file),
                    'category'    => 'core_checksum_mismatch',
                    'severity'    => 'crit',
                    'title'       => 'Modificación no autorizada en archivo del Núcleo (' . $rel_file . ')',
                    'desc'        => "La firma digital MD5 de este archivo no coincide con la versión original y firmada de WordPress.org (Modificado: {$mod_time_str}). Contiene alteraciones o inyecciones de código (Hostinet Pasos 4 y 5).",
                    'file'        => $rel_file,
                    'full_path'   => $local_path,
                    'line'        => 1,
                    'code'        => 'MD5 local (' . substr($local_md5, 0, 10) . '...) != Oficial WP.org (' . substr($official_md5, 0, 10) . '...)',
                    'can_clean'   => true,
                    'clean_action'=> 'restore_core_file'
                ), 'core');
            }
        }

        // Inspeccionar archivos rogue desconocidos en wp-admin/
        $admin_dir = ABSPATH . 'wp-admin';
        if (is_dir($admin_dir)) {
            $admin_files = @scandir($admin_dir);
            if ($admin_files) {
                foreach ($admin_files as $af) {
                    if ($af === '.' || $af === '..' || is_dir($admin_dir . '/' . $af)) continue;
                    if (pathinfo($af, PATHINFO_EXTENSION) === 'php') {
                        $rel_admin = 'wp-admin/' . $af;
                        if (!isset($checksums[$rel_admin])) {
                            $this->add_threat(array(
                                'id'          => md5('rogue_admin_file_' . $af),
                                'category'    => 'rogue_core_file',
                                'severity'    => 'crit',
                                'title'       => 'Archivo desconocido o rogue en wp-admin/ (' . $af . ')',
                                'desc'        => "El archivo '{$af}' no pertenece a la distribución oficial de WordPress en wp-admin/. Es altamente probable que sea una puerta trasera o webshell instalada clandestinamente.",
                                'file'        => $rel_admin,
                                'full_path'   => $admin_dir . '/' . $af,
                                'line'        => 1,
                                'code'        => 'Archivo PHP no reconocido por la base de datos oficial de WordPress.org',
                                'can_clean'   => true,
                                'clean_action'=> 'quarantine'
                            ), 'core');
                        }
                    }
                }
            }
        }
    }

    /**
     * Detección de anomalías temporales:
     * Archivos sensibles del Core alterados en las últimas 48 horas (Hostinet Paso 4)
     */
    private function scan_recent_core_tampering() {
        $recent_threshold = time() - (48 * 3600); // 48 horas atrás
        $critical_core = array(
            ABSPATH . 'index.php',
            ABSPATH . 'wp-blog-header.php',
            ABSPATH . 'wp-settings.php',
            ABSPATH . 'wp-load.php',
            ABSPATH . 'wp-login.php',
            ABSPATH . 'wp-mail.php'
        );

        foreach ($critical_core as $file) {
            if (file_exists($file)) {
                $mtime = filemtime($file);
                // Si fue modificado en las últimas 48 horas y no es una instalación nueva del día de hoy
                if ($mtime > $recent_threshold && !file_exists($file . '.bak_nexaguard')) {
                    $rel = str_replace(array(ABSPATH, '\\'), array('', '/'), $file);
                    // Comprobar si ya se reportó por checksum para no duplicar
                    $already_reported = false;
                    foreach ($this->threats as $t) {
                        if ($t['file'] === $rel) {
                            $already_reported = true;
                            break;
                        }
                    }
                    if (!$already_reported) {
                        $this->add_threat(array(
                            'id'          => md5('recent_core_mod_' . $rel),
                            'category'    => 'recent_core_modification',
                            'severity'    => 'warn',
                            'title'       => 'Archivo del Núcleo modificado recientemente (' . $rel . ')',
                            'desc'        => 'Este archivo del sistema fue alterado en las últimas 48 horas (' . date('d/m/Y H:i:s', $mtime) . '). Los atacantes suelen dejar huellas de fecha reciente al inyectar código (Hostinet Pasos 4 y 5).',
                            'file'        => $rel,
                            'full_path'   => $file,
                            'line'        => 1,
                            'code'        => 'Última modificación detectada: ' . date('d/m/Y H:i:s', $mtime),
                            'can_clean'   => true,
                            'clean_action'=> 'restore_core_file'
                        ), 'core');
                    }
                }
            }
        }
    }

    /**
     * Análisis forense de contenido de un archivo
     */
    private function check_file_content($filepath, $location = '') {
        $rel = str_replace(array(ABSPATH, '\\'), array('', '/'), $filepath);

        if (in_array($rel, $this->whitelist) || in_array($filepath, $this->whitelist)) {
            return;
        }

        $content = @file_get_contents($filepath);
        if ($content === false) {
            return;
        }

        $ext = strtolower(pathinfo($filepath, PATHINFO_EXTENSION));
        $php_exts = array('php', 'phtml', 'php3', 'php4', 'php5', 'php7', 'phps', 'inc');
        $is_php = in_array($ext, $php_exts);

        // Reglas que aplican de forma exclusiva a código PHP
        $php_only_rules = array(
            'eval_base64', 'unpack_gzinflate_base64', 'nulled_hex_octal_pack',
            'nulled_header_backdoor', 'nulled_remote_dropper', 'nulled_admin_creator',
            'nulled_dynamic_execution', 'obfuscated_strrev', 'file_tampering_core',
            'assert_shell', 'system_execution', 'variable_function_call', 'rogue_uploader',
            'fake_antimalware_bot', 'stealth_plugin_hider', 'rest_api_unauthorized_rce',
            'encrypted_header_backdoor', 'cron_persistence_reinstaller',
            'sc_mesh_loader', 'shared_memory_persistence', 'arbitrary_file_upload_rce'
        );

        foreach ($this->patterns as $key => $p) {
            // Si la regla requiere PHP y el archivo no es un script PHP ejecutable, saltar
            if (in_array($key, $php_only_rules) && !$is_php) {
                continue;
            }

            // 1. Los iframes ocultos NUNCA deben evaluarse en archivos PHP de plugins o temas
            // (los shortcodes y librerías usan iframes legítimos para mapas, pagos y reproductores).
            // Solo se auditan en Uploads y Base de Datos (donde sí representan malware inyectado).
            if ($key === 'hidden_iframe' && ($location === 'plugins' || $location === 'themes' || $location === 'core')) {
                continue;
            }

            // 2. No evaluar ofuscación JS genérica en archivos .js minificados de plugins o temas
            if ($key === 'eval_atob_obfuscation' && $ext === 'js' && ($location === 'plugins' || $location === 'themes')) {
                continue;
            }

            // 3. Omitir falsos positivos en plugins oficiales de Cloudflare Turnstile
            if ($key === 'fake_captcha_turnstile' && (strpos($rel, 'cloudflare') !== false || strpos($rel, 'turnstile') !== false)) {
                continue;
            }

            // 4. Omitir llamadas blockchain en plugins legítimos de Web3 / Crypto
            if ($key === 'smart_contract_rpc' && (strpos($rel, 'web3') !== false || strpos($rel, 'crypto') !== false || strpos($rel, 'metamask') !== false)) {
                continue;
            }

            // 5. La manipulación de Core no aplica a los propios archivos del Core
            if ($key === 'file_tampering_core' && $location === 'core') {
                continue;
            }

            // 6. Omitir falsos positivos de empaquetado en librerías de fuentes o vendor conocidas
            if ($key === 'nulled_hex_octal_pack' && (strpos($rel, '/vendor/') !== false || strpos($rel, '/composer/') !== false || strpos($rel, 'ReduxFramework') !== false)) {
                continue;
            }

            if (preg_match($p['regex'], $content, $matches, PREG_OFFSET_CAPTURE)) {
                $offset = $matches[0][1];
                $line = substr_count(substr($content, 0, $offset), "\n") + 1;
                $snippet = substr($content, max(0, $offset - 40), 180);

                // Determinar acción segura:
                // Si es un archivo estándar de tema o core, desinfectar la inyección para no romper la web.
                // Si es una webshell dedicada o un archivo extraño (ej: wso.php, dropper), aislar en cuarentena.
                $is_system_or_plugin_file = ($location === 'core' || $location === 'plugins' || $location === 'themes');
                $basename = strtolower(basename($filepath));
                $standard_template_files = array('functions.php', 'header.php', 'footer.php', 'index.php', 'page.php', 'single.php', 'archive.php', 'sidebar.php', 'comments.php', 'search.php', '404.php', 'style.css', 'template-loader.php', 'load.php', 'wp-settings.php', 'wp-blog-header.php', 'wp-config.php', 'wp-load.php', 'wp-login.php');
                $is_dedicated_webshell_name = preg_match('/^(wso|c99|r57|alfa|shell|mini|leaf|bypass|backdoor|up|uploader|root|pass|cmd|temp|test|check|license|eval|madspot|p0wny|weevely)\.php$/i', $basename);
                $is_standalone_trojan = (
                    strpos($rel, 'plugins/hseo') !== false || 
                    $location === 'uploads' || 
                    $is_dedicated_webshell_name || 
                    ($is_system_or_plugin_file && !in_array($basename, $standard_template_files) && in_array($p['type'], array('webshell', 'dropper', 'rce')))
                );
                $clean_action = ($is_system_or_plugin_file && !$is_standalone_trojan) 
                    ? 'sanitize_injection' 
                    : (in_array($p['type'], array('clearfake', 'etherhiding', 'clickfix')) ? 'sanitize_injection' : 'quarantine');

                $this->add_threat(array(
                    'id'          => md5($filepath . $line . $key),
                    'category'    => $key,
                    'severity'    => $p['severity'],
                    'title'       => $p['title'],
                    'desc'        => $p['desc'],
                    'file'        => $rel,
                    'full_path'   => $filepath,
                    'line'        => $line,
                    'code'        => htmlspecialchars($snippet),
                    'can_clean'   => true,
                    'clean_action'=> $clean_action
                ), $location);
            }
        }
    }

    /**
     * Escaneo forense exhaustivo de la base de datos (wp_options, wp_posts, wp-cron)
     */
    private function scan_database() {
        global $wpdb;

        // 1. Escanear wp_options buscando inyecciones (excluyendo estrictamente opciones internas y cachés de NexaGuard)
        $options = $wpdb->get_results(
            "SELECT option_name, option_value FROM {$wpdb->options} 
             WHERE option_name NOT LIKE '%nexaguard%'
               AND (option_name IN ('siteurl', 'home', 'active_plugins', 'insert_headers_and_footers', 'header_footer_scripts', 'custom_css_post_id') 
                OR option_name LIKE '%custom_code%'
                OR option_name LIKE '%theme_mods_%'
                OR option_value LIKE '%data:text/javascript;base64%' 
                OR option_value LIKE '%bsc-testnet%' 
                OR option_value LIKE '%0xA1decFB%'
                OR option_value LIKE '%0x46790e2%'
                OR option_value LIKE '%eth_call%'
                OR option_value LIKE '%challenge-platform%'
                OR option_value LIKE '%eval(base64%'
                OR option_value LIKE '%String.fromCharCode%'
                OR option_value LIKE '%gzinflate(%'
                OR option_value LIKE '%str_rot13(%'
                OR option_value LIKE '%assert(%'
                OR option_value LIKE '%powershell%'
                OR option_value LIKE '%base64_decode(%'
                OR option_value LIKE '%location.href%'
                OR option_value LIKE '%location.replace%'
                OR option_value LIKE '%online-casino%'
                OR option_value LIKE '%slot-online%'
                OR option_value LIKE '%viagra%')
             LIMIT 350"
        );

        if ($options) {
            foreach ($options as $row) {
                // Doble salvaguarda: ignorar cualquier opción interna o transitorio de NexaGuard
                if (stripos($row->option_name, 'nexaguard') !== false) {
                    continue;
                }

                $this->scanned_options++;
                $this->breakdown['database']['files']++;
                $val = $row->option_value;
                foreach ($this->patterns as $key => $p) {
                    if (preg_match($p['regex'], $val, $matches)) {
                        $this->add_threat(array(
                            'id'          => md5('db_opt_' . $row->option_name . '_' . $key),
                            'category'    => 'db_' . $key,
                            'severity'    => $p['severity'],
                            'title'       => $p['title'] . ' (en Base de Datos)',
                            'desc'        => $p['desc'] . ' [Ubicado en la opción ' . esc_html($row->option_name) . '].',
                            'file'        => 'Base de datos: tabla ' . $wpdb->options . ' -> ' . $row->option_name,
                            'full_path'   => $row->option_name,
                            'line'        => 0,
                            'code'        => htmlspecialchars(substr($matches[0], 0, 160)),
                            'can_clean'   => true,
                            'clean_action'=> 'clean_db_option',
                            'is_db'       => true
                        ), 'database');
                        break;
                    }
                }
            }
        }

        // 2. Escanear wp_posts buscando inyecciones de scripts (Elementor, bloques o cabeceras globales)
        $posts = $wpdb->get_results(
            "SELECT ID, post_title, post_type, post_content FROM {$wpdb->posts} 
             WHERE post_status = 'publish' 
               AND (post_content LIKE '%data:text/javascript;base64%' 
                 OR post_content LIKE '%bsc-testnet%' 
                 OR post_content LIKE '%0xA1decFB%' 
                 OR post_content LIKE '%0x46790e2%' 
                 OR post_content LIKE '%challenge-platform%' 
                 OR post_content LIKE '%turnstile.render%' 
                 OR post_content LIKE '%eval(base64%' 
                 OR post_content LIKE '%eval(atob%'
                 OR post_content LIKE '%location.href%'
                 OR post_content LIKE '%location.replace%'
                 OR post_content LIKE '%online-casino%'
                 OR post_content LIKE '%slot-online%'
                 OR post_content LIKE '%viagra%'
                 OR post_content LIKE '%display:none%http%')
             LIMIT 100"
        );

        if ($posts) {
            foreach ($posts as $post) {
                $this->scanned_options++;
                $this->breakdown['database']['files']++;
                foreach ($this->patterns as $key => $p) {
                    if (preg_match($p['regex'], $post->post_content, $matches)) {
                        $this->add_threat(array(
                            'id'          => md5('post_' . $post->ID . '_' . $key),
                            'category'    => 'post_' . $key,
                            'severity'    => $p['severity'],
                            'title'       => $p['title'] . ' (en Publicación/Plantilla)',
                            'desc'        => $p['desc'] . ' [Encontrado en post #' . $post->ID . ' "' . esc_html($post->post_title) . '"]',
                            'file'        => 'Base de datos: wp_posts -> #' . $post->ID . ' (' . $post->post_type . ')',
                            'full_path'   => $post->ID,
                            'line'        => 0,
                            'code'        => htmlspecialchars(substr($matches[0], 0, 160)),
                            'can_clean'   => true,
                            'clean_action'=> 'clean_post_injection',
                            'is_db'       => true
                        ), 'database');
                    }
                }
            }
        }

        // 3. Escanear tareas programadas de WP-Cron por hooks maliciosos
        $cron = get_option('cron');
        if (is_array($cron)) {
            foreach ($cron as $timestamp => $cronhooks) {
                if (!is_array($cronhooks)) continue;
                foreach ($cronhooks as $hook => $keys) {
                    $this->breakdown['database']['files']++;
                    if (preg_match('/(eval|base64|system|shell|passthru|exec|assert|backdoor|clearfake)/i', $hook)) {
                        $this->add_threat(array(
                            'id'          => md5('cron_' . $hook),
                            'category'    => 'suspicious_cron',
                            'severity'    => 'crit',
                            'title'       => 'Tarea programada sospechosa (WP-Cron)',
                            'desc'        => 'Se encontró un hook programado potencialmente malicioso: ' . esc_html($hook),
                            'file'        => 'WP-Cron -> ' . $hook,
                            'full_path'   => $hook,
                            'line'        => 0,
                            'code'        => 'Hook: ' . $hook,
                            'can_clean'   => true,
                            'clean_action'=> 'remove_cron_hook',
                            'is_db'       => true
                        ), 'database');
                    }
                }
            }
        }
    }

    /**
     * Verificación de usuarios con rol de administrador
     */
    private function scan_admin_users() {
        global $wpdb;

        $admins = get_users(array('role' => 'administrator'));
        foreach ($admins as $admin) {
            $this->breakdown['admins']['files']++;
            $email = strtolower($admin->user_email);
            $login = strtolower($admin->user_login);
            $is_tempmail = preg_match('/@(tempmail|guerrillamail|10minutemail|sharklasers|mailinator|yopmail|dispostable|trashmail|throwawaymail)\./i', $email);
            $is_suspicious_login = preg_match('/^(backdoor|test_admin|temp_admin|support_admin|wp_support|sysadmin_wp|backup_adm|wp_adm|ghost_admin|pluginauth|pluginguest|options|sc_adm)$/i', $login);
            $is_dummy_email = preg_match('/@(example\.com|domain\.com|test\.com|localhost)$/i', $email);

            if ($is_tempmail || $is_suspicious_login || $is_dummy_email) {
                $reason = $is_tempmail ? 'correo temporal' : ($is_suspicious_login ? 'nombre de usuario altamente sospechoso' : 'correo ficticio o no verificable');
                $this->add_threat(array(
                    'id'          => md5('user_' . $admin->ID),
                    'category'    => 'suspicious_admin',
                    'severity'    => 'crit',
                    'title'       => 'Administrador sospechoso detectado (' . $reason . ')',
                    'desc'        => "El usuario '{$admin->user_login}' ({$email}) tiene privilegios de administrador con {$reason}.",
                    'file'        => 'Usuarios de WordPress -> ID #' . $admin->ID,
                    'full_path'   => $admin->ID,
                    'line'        => 0,
                    'code'        => 'Usuario: ' . $admin->user_login . ' | Email: ' . $email . ' | Creado: ' . $admin->user_registered,
                    'can_clean'   => true,
                    'clean_action'=> 'downgrade_user',
                    'is_db'       => true
                ), 'admins');
            }
        }

        // Auditoría de Triggers Maliciosos de MySQL (Sucuri SC Malware: triggers que recrean administradores en wp_users)
        if (isset($wpdb) && method_exists($wpdb, 'get_results')) {
            $triggers = $wpdb->get_results("SHOW TRIGGERS LIKE '{$wpdb->prefix}users'");
            if ($triggers) {
                foreach ($triggers as $trig) {
                    $trig_name = isset($trig->Trigger) ? $trig->Trigger : '';
                    $trig_stmt = isset($trig->Statement) ? $trig->Statement : '';
                    if (preg_match('/(INSERT\s+INTO\s+.*users|administrator|capabilities|INSERT\s+INTO\s+.*usermeta)/i', $trig_stmt)) {
                        $this->add_threat(array(
                            'id'          => md5('mysql_trigger_' . $trig_name),
                            'category'    => 'mysql_persistence_trigger',
                            'severity'    => 'crit',
                            'title'       => 'Trigger Malicioso de MySQL en wp_users (' . $trig_name . ')',
                            'desc'        => 'Se detectó un trigger de base de datos programado para recrear cuentas de administrador tras ser borradas (Sucuri SC Malware).',
                            'file'        => 'MySQL Triggers -> ' . $trig_name,
                            'full_path'   => $trig_name,
                            'line'        => 0,
                            'code'        => htmlspecialchars(substr($trig_stmt, 0, 160)),
                            'can_clean'   => true,
                            'clean_action'=> 'clean_db_trigger',
                            'is_db'       => true
                        ), 'admins');
                    }
                }
            }
        }
    }

    private function add_threat($threat, $module = '') {
        $this->threats[] = $threat;
        if (!empty($module)) {
            $norm = $module;
            if ($norm === 'plugin') $norm = 'plugins';
            if ($norm === 'theme') $norm = 'themes';
            if ($norm === 'mu_plugin') $norm = 'mu_plugins';
            if ($norm === 'dropin') $norm = 'dropins';
            if ($norm === 'core_root' || $norm === 'core_includes') $norm = 'core';

            if (isset($this->breakdown[$norm])) {
                $this->breakdown[$norm]['threats']++;
                $this->breakdown[$norm]['status'] = 'infected';
            }
        }
    }
}
