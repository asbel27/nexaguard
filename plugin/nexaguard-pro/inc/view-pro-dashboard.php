<?php
/**
 * NexaGuard PRO - Vista del Panel de Control Empresarial
 * 
 * @package NexaGuard_Pro
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap nexaguard-pro-wrap">
    <!-- Header Principal -->
    <div class="nxg-pro-header">
        <div class="nxg-pro-brand">
            <div class="nxg-pro-logo">⚡</div>
            <div>
                <h1>NexaGuard Security <span class="nxg-badge-enterprise">PRO v<?php echo esc_html(NEXAGUARD_PRO_VERSION); ?></span></h1>
                <p>Defensa Perimetral Activa · Reconstrucción de Núcleo Oficial · Endurecimiento Profundo · Capa 7 WAF</p>
            </div>
        </div>
        <div class="nxg-pro-status-pill <?php echo $is_active ? 'active' : 'inactive'; ?>">
            <span class="status-dot"></span>
            <span><?php echo $is_active ? 'PRO ACTIVADO · PROTEGIDO' : 'LICENCIA PENDIENTE'; ?></span>
        </div>
    </div>

    <?php if ($is_active): ?>
        <div style="background: linear-gradient(135deg, #09261a 0%, #064e3b 100%); border: 1.5px solid #10b981; border-radius: 12px; padding: 18px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; box-shadow: 0 8px 24px rgba(16,185,129,0.15);">
            <div>
                <div style="color: #3de8a4; font-weight: 800; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px;">✓ LICENCIA PRO ACTIVA Y VINCULADA</div>
                <h3 style="color: #ffffff; margin: 4px 0; font-size: 1.15rem;">Todas las funciones avanzadas están desbloqueadas en NexaGuard Security</h3>
                <p style="color: #a7f3d0; margin: 0; font-size: 0.88rem;">Escudo Balístico, Vigilancia 24H, Cortafuegos WAF, Auto-Cárcel y Reconstrucción Oficial de Archivos Vitales listos.</p>
            </div>
            <a href="admin.php?page=nexaguard-security" class="nxg-btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 800; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 0.95rem; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">
                ⚡ Ir a NexaGuard Security (Ver Todo Activado) →
            </a>
        </div>
    <?php endif; ?>

    <!-- Navegación por pestañas -->
    <div class="nxg-pro-tabs">
        <button class="nxg-tab-btn active" data-tab="tab-license">🔑 Clave & Licencia</button>
        <button class="nxg-tab-btn" data-tab="tab-vital">🛠️ Reconstrucción de Núcleo</button>
        <button class="nxg-tab-btn" data-tab="tab-hardening">🔒 Endurecimiento Profundo</button>
        <button class="nxg-tab-btn" data-tab="tab-waf">🛡️ Cortafuegos L7 & Auto-Cárcel (<?php echo count($jailed_ips); ?>)</button>
        <button class="nxg-tab-btn" data-tab="tab-remediation">⚡ Erradicación 1-Clic</button>
    </div>

    <div class="nxg-pro-content">
        <!-- PESTAÑA 1: LICENCIA -->
        <div class="nxg-tab-pane active" id="tab-license">
            <div class="nxg-card">
                <h3>Gestión de Licencia NexaGuard PRO</h3>
                <p class="nxg-muted">Ingresa tu clave de licencia adquirida en <a href="https://www.nexaguards.com/#planes" target="_blank" style="color:#f59e0b;font-weight:600;">nexaguards.com</a> para vincular este dominio con la red de inteligencia de amenazas en tiempo real.</p>
                
                <div class="nxg-license-box">
                    <div class="nxg-input-group">
                        <label for="pro-license-key">Clave de Licencia Oficial (Formato: NXG-PRO-XXXX-XXXX):</label>
                        <input type="text" id="pro-license-key" class="nxg-input" placeholder="NXG-PRO-XXXX-XXXX-XXXX" value="<?php echo !empty($license_data['key']) ? esc_attr($license_data['key']) : ''; ?>">
                    </div>
                    <div class="nxg-actions">
                        <button type="button" id="btn-activate-license" class="nxg-btn nxg-btn-gold">⚡ Validar & Activar Licencia</button>
                        <?php if ($is_active): ?>
                            <button type="button" id="btn-deactivate-license" class="nxg-btn nxg-btn-outline">Desvincular Licencia</button>
                        <?php endif; ?>
                    </div>
                </div>

                <?php if ($is_active): ?>
                    <div class="nxg-license-details">
                        <div class="nxg-stat-item">
                            <span class="label">Plan Activo:</span>
                            <span class="val"><?php echo esc_html(!empty($license_data['plan']) ? $license_data['plan'] : 'NexaGuard PRO Enterprise'); ?></span>
                        </div>
                        <div class="nxg-stat-item">
                            <span class="label">Dominio Vinculado:</span>
                            <span class="val"><?php echo esc_html(!empty($license_data['domain']) ? $license_data['domain'] : parse_url(home_url(), PHP_URL_HOST)); ?></span>
                        </div>
                        <div class="nxg-stat-item">
                            <span class="label">Días Restantes:</span>
                            <span class="val gold"><?php echo intval(!empty($license_data['days_left']) ? $license_data['days_left'] : 365); ?> días</span>
                        </div>
                        <div class="nxg-stat-item">
                            <span class="label">Fecha de Vencimiento:</span>
                            <span class="val"><?php echo esc_html(!empty($license_data['expires_at']) ? $license_data['expires_at'] : 'Indefinido'); ?></span>
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- PESTAÑA 2: RECONSTRUCCIÓN DE ARCHIVOS VITALES -->
        <div class="nxg-tab-pane" id="tab-vital">
            <div class="nxg-card">
                <div class="nxg-card-header">
                    <div>
                        <h3>Reconstrucción Oficial de Archivos Vitales (WordPress.org Core)</h3>
                        <p class="nxg-muted">Descarga réplicas inmaculadas directamente desde los repositorios oficiales de WordPress.org y reemplaza de forma segura archivos alterados o inyectados por malware.</p>
                    </div>
                    <button type="button" id="btn-rebuild-all-vital-pro" class="nxg-btn nxg-btn-gold">🛠️ Reconstruir TODOS los Archivos Vitales</button>
                </div>

                <div class="nxg-table-wrap">
                    <table class="nxg-table">
                        <thead>
                            <tr>
                                <th>Archivo Vital</th>
                                <th>Descripción del Sistema</th>
                                <th>Estado en Disco</th>
                                <th>Acción PRO</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($vital_files as $rel => $meta): 
                                $exists = file_exists(ABSPATH . $rel);
                                $perms = $exists ? substr(sprintf('%o', fileperms(ABSPATH . $rel)), -4) : 'N/A';
                            ?>
                                <tr>
                                    <td><strong>/<?php echo esc_html($rel); ?></strong></td>
                                    <td><?php echo esc_html($meta['label']); ?></td>
                                    <td>
                                        <?php if ($exists): ?>
                                            <span class="nxg-tag success">Presente (<?php echo esc_html($perms); ?>)</span>
                                        <?php else: ?>
                                            <span class="nxg-tag danger">Faltante</span>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <button type="button" class="nxg-btn nxg-btn-sm nxg-btn-rebuild-single" data-file="<?php echo esc_attr($rel); ?>">Reconstruir Copia Oficial</button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- PESTAÑA 3: ENDURECIMIENTO PROFUNDO -->
        <div class="nxg-tab-pane" id="tab-hardening">
            <div class="nxg-card">
                <div class="nxg-card-header">
                    <div>
                        <h3>Endurecimiento Avanzado de Sistema y Servidor (Deep Hardening)</h3>
                        <p class="nxg-muted">Aplica directivas de seguridad a nivel de servidor (.htaccess), bloquea el editor de código y neutraliza ataques de fuerza bruta.</p>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button type="button" id="btn-apply-full-hardening" class="nxg-btn nxg-btn-gold">🔒 Aplicar Blindaje Completo</button>
                        <button type="button" id="btn-regenerate-salts" class="nxg-btn nxg-btn-outline">🔑 Regenerar Sales de Seguridad</button>
                    </div>
                </div>

                <div class="nxg-grid-2">
                    <div class="nxg-feature-card">
                        <div class="feature-icon">🛡️</div>
                        <h4>Bloqueo de Editor de Temas y Plugins</h4>
                        <p>Deshabilita el editor de código integrado en wp-config.php (DISALLOW_FILE_EDIT) para evitar que intrusos editen archivos PHP desde el panel.</p>
                    </div>
                    <div class="nxg-feature-card">
                        <div class="feature-icon">🚫</div>
                        <h4>Bloqueo de Ejecución PHP en Subidas</h4>
                        <p>Coloca directivas restrictivas en /wp-content/uploads/ para que ningún script ejecutable (.php, .phtml) pueda correr aunque sea subido.</p>
                    </div>
                    <div class="nxg-feature-card">
                        <div class="feature-icon">🔒</div>
                        <h4>Protección de Archivos Sensibles</h4>
                        <p>Deniega acceso web directo a wp-config.php, .htaccess, archivos .env, scripts de instalación y volcados de bases de datos (.sql, .bak).</p>
                    </div>
                    <div class="nxg-feature-card">
                        <div class="feature-icon">⚡</div>
                        <h4>Desactivación de XML-RPC</h4>
                        <p>Cierra el protocolo xmlrpc.php para neutralizar ataques masivos de fuerza bruta por diccionario y amplificación DDoS.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- PESTAÑA 4: WAF CAPA 7 & AUTO-CÁRCEL -->
        <div class="nxg-tab-pane" id="tab-waf">
            <div class="nxg-card">
                <div class="nxg-card-header">
                    <div>
                        <h3>Cortafuegos de Aplicación Web (Layer 7 WAF) & Auto-Cárcel 24H</h3>
                        <p class="nxg-muted">Inspección activa en tiempo real contra SQL Injection, RCE, Cross-Site Scripting y Bots Hostiles con confinamiento automático de 24 horas.</p>
                    </div>
                    <?php if (!empty($jailed_ips)): ?>
                        <button type="button" id="btn-clear-jail" class="nxg-btn nxg-btn-outline">Vaciar Cárcel de IPs</button>
                    <?php endif; ?>
                </div>

                <h4>IPs Confinadas en la Cárcel 24H (<?php echo count($jailed_ips); ?>)</h4>
                <?php if (empty($jailed_ips)): ?>
                    <p class="nxg-empty">No hay direcciones IP confinadas en este momento. El sistema de defensa está en guardia continua.</p>
                <?php else: ?>
                    <div class="nxg-table-wrap">
                        <table class="nxg-table">
                            <thead>
                                <tr>
                                    <th>Dirección IP</th>
                                    <th>Causa del Confinamiento</th>
                                    <th>Fecha de Bloqueo</th>
                                    <th>Expira En</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($jailed_ips as $ip => $data): 
                                    $remaining = max(0, $data['expires_at'] - time());
                                    $hours = floor($remaining / 3600);
                                    $mins = floor(($remaining % 3600) / 60);
                                ?>
                                    <tr>
                                        <td><code><?php echo esc_html($ip); ?></code></td>
                                        <td><?php echo esc_html($data['reason']); ?></td>
                                        <td><?php echo date('Y-m-d H:i:s', $data['jailed_at']); ?></td>
                                        <td><span class="nxg-tag warning"><?php echo "{$hours}h {$mins}m"; ?></span></td>
                                        <td>
                                            <button type="button" class="nxg-btn nxg-btn-sm btn-unjail-ip" data-ip="<?php echo esc_attr($ip); ?>">Liberar IP</button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>

                <h4 style="margin-top:24px;">Registro de Ataques Neutralizados Recientemente</h4>
                <?php if (empty($waf_logs)): ?>
                    <p class="nxg-empty">Aún no se han registrado intentos de intrusión hostil en el registro perimetral.</p>
                <?php else: ?>
                    <div class="nxg-table-wrap">
                        <table class="nxg-table">
                            <thead>
                                <tr>
                                    <th>Fecha / Hora</th>
                                    <th>IP Origen</th>
                                    <th>Vector de Ataque</th>
                                    <th>Ubicación</th>
                                    <th>Muestra Interceptada</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach (array_slice($waf_logs, 0, 15) as $log): ?>
                                    <tr>
                                        <td><?php echo esc_html($log['time']); ?></td>
                                        <td><code><?php echo esc_html($log['ip']); ?></code></td>
                                        <td><span class="nxg-tag danger"><?php echo esc_html($log['type']); ?></span></td>
                                        <td><?php echo esc_html($log['vector']); ?></td>
                                        <td><code class="nxg-code-sample"><?php echo esc_html($log['sample']); ?></code></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- PESTAÑA 5: ERRADICACIÓN TOTAL EN 1 CLIC -->
        <div class="nxg-tab-pane" id="tab-remediation">
            <div class="nxg-card">
                <div class="nxg-eradication-hero">
                    <div class="hero-icon">🚨</div>
                    <h3>Erradicación & Remediación Integral con 1 Clic</h3>
                    <p>Si tu sitio ha sufrido una infección masiva o hackeo, este motor realiza automáticamente el protocolo de rescate forense completo: aísla todas las webshells en cuarentena, reconstruye los archivos del núcleo con copias oficiales inmaculadas de WordPress.org y blinda el servidor para impedir reinfecciones.</p>
                    <button type="button" id="btn-auto-remediate-pro" class="nxg-btn nxg-btn-gold lg">⚡ Ejecutar Erradicación & Blindaje Total</button>
                </div>
            </div>
        </div>
    </div>
</div>

