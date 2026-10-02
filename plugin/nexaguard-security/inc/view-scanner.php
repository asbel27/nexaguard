<?php
if (!defined('ABSPATH')) {
    exit;
}

$last_report = get_option('nexaguard_last_scan_report', null);
$quarantine_log = get_option('nexaguard_quarantine_log', array());
?>
<div class="wrap nexaguard-admin-wrap">
    <div class="nexaguard-header">
        <div class="nexaguard-brand">
            <svg class="nexaguard-logo" viewBox="0 0 24 24" fill="none" stroke="#ffcf33" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="m9 12 2 2 4-4"/>
            </svg>
            <div>
                <h1>NexaGuard Security <span class="badge-v">v<?php echo NEXAGUARD_VERSION; ?></span></h1>
                <p class="sub">Escáner forense profundo de archivos, base de datos y erradicación de malware</p>
            </div>
        </div>
        <div class="nexaguard-header-actions">
            <a href="<?php echo admin_url('admin.php?page=nexaguard-waf'); ?>" class="btn-ng btn-ng-outline">🛡️ Configurar Blindaje WAF</a>
            <button type="button" id="btn-start-scan" class="btn-ng btn-ng-primary">
                ⚡ Iniciar Análisis Forense
            </button>
        </div>
    </div>

    <!-- Banner de estado dinámico -->
    <div id="scan-status-card" class="ng-card scan-summary-card <?php echo ($last_report && $last_report['threats_count'] > 0) ? 'status-danger' : 'status-clean'; ?>">
        <div class="summary-left">
            <div class="status-indicator">
                <span id="status-icon"><?php echo ($last_report && $last_report['threats_count'] > 0) ? '⚠️' : '✓'; ?></span>
            </div>
            <div>
                <h3 id="status-heading">
                    <?php 
                    if (!$last_report) {
                        echo 'Aún no se ha realizado ningún escaneo';
                    } elseif ($last_report['threats_count'] > 0) {
                        echo '¡Atención! Se detectaron ' . $last_report['threats_count'] . ' amenazas de seguridad';
                    } else {
                        echo 'Sistema 100% limpio y protegido';
                    }
                    ?>
                </h3>
                <p id="status-desc" class="ng-hint">
                    <?php 
                    if ($last_report) {
                        echo 'Último análisis: ' . date('d/m/Y H:i:s', $last_report['timestamp']) . ' · ' . $last_report['scanned_files'] . ' archivos analizados en ' . $last_report['elapsed'] . 's.';
                    } else {
                        echo 'Haz clic en "Iniciar Análisis Forense" para auditar archivos, plugins, temas y la base de datos.';
                    }
                    ?>
                </p>
            </div>
        </div>
        <div class="summary-kpis">
            <div class="kpi-box">
                <span class="kpi-val" id="kpi-threats"><?php echo $last_report ? $last_report['threats_count'] : '0'; ?></span>
                <span class="kpi-lbl">Amenazas</span>
            </div>
            <div class="kpi-box">
                <span class="kpi-val" id="kpi-files"><?php echo $last_report ? $last_report['scanned_files'] : '0'; ?></span>
                <span class="kpi-lbl">Archivos auditados</span>
            </div>
            <div class="kpi-box">
                <span class="kpi-val" id="kpi-quarantine"><?php echo count($quarantine_log); ?></span>
                <span class="kpi-lbl">En cuarentena</span>
            </div>
        </div>
    </div>

    <!-- Barra de progreso interactiva (visible al escanear) -->
    <div id="scan-progress-box" class="ng-card" style="display:none;">
        <div class="progress-info">
            <span id="scan-progress-label">Auditando archivos y base de datos…</span>
            <span id="scan-progress-pct">0%</span>
        </div>
        <div class="progress-track">
            <div id="scan-progress-bar" class="progress-fill" style="width: 0%;"></div>
        </div>
        <p class="ng-hint" style="margin-top:8px">Inspeccionando firmas ClearFake, ClickFix, webshells, PHP en uploads y anomalías en base de datos…</p>
    </div>

    <!-- Contenedor de amenazas encontradas -->
    <div id="threats-container" class="ng-card" style="margin-top:20px;">
        <div class="card-title-bar">
            <h3>Resultados de la Auditoría Forense</h3>
            <span id="threats-badge" class="badge-count <?php echo ($last_report && $last_report['threats_count'] > 0) ? 'danger' : 'ok'; ?>">
                <?php echo ($last_report) ? $last_report['threats_count'] . ' hallazgos' : '0 hallazgos'; ?>
            </span>
        </div>

        <div id="threats-list" class="threats-grid">
            <?php if (!$last_report || empty($last_report['threats'])): ?>
                <div class="empty-state">
                    <p>🛡️ No hay amenazas activas detectadas en este momento.</p>
                    <small class="ng-hint">Si notas comportamientos anómalos o popups extraños, ejecuta un análisis ahora.</small>
                </div>
            <?php else: ?>
                <?php foreach ($last_report['threats'] as $t): ?>
                    <div class="threat-item <?php echo esc_attr($t['severity']); ?>" id="threat-<?php echo esc_attr($t['id']); ?>">
                        <div class="threat-header">
                            <span class="sev-badge <?php echo esc_attr($t['severity']); ?>">
                                <?php echo ($t['severity'] === 'crit') ? 'CRÍTICO' : 'ADVERTENCIA'; ?>
                            </span>
                            <h4><?php echo esc_html($t['title']); ?></h4>
                        </div>
                        <p class="threat-desc"><?php echo esc_html($t['desc']); ?></p>
                        <div class="threat-loc">
                            <code><?php echo esc_html($t['file']); ?><?php echo ($t['line'] > 0) ? ' : Línea ' . $t['line'] : ''; ?></code>
                        </div>
                        <?php if (!empty($t['code'])): ?>
                            <pre class="threat-snippet"><code><?php echo esc_html($t['code']); ?></code></pre>
                        <?php endif; ?>
                        <div class="threat-actions">
                            <?php if ($t['clean_action'] === 'sanitize_injection'): ?>
                                <button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clearfake" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                    🧹 Erradicar Inyección y Reparar
                                </button>
                            <?php elseif ($t['clean_action'] === 'quarantine'): ?>
                                <button type="button" class="btn-ng btn-ng-danger btn-quarantine-file" data-file="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                    🔒 Mover a Cuarentena Segura
                                </button>
                            <?php elseif ($t['clean_action'] === 'clean_db_option'): ?>
                                <button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clean_db_option" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                    🗄️ Limpiar Opción de Base de Datos
                                </button>
                            <?php elseif ($t['clean_action'] === 'clean_post_injection'): ?>
                                <button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clean_post_injection" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                    📝 Limpiar Entrada/Plantilla
                                </button>
                            <?php elseif ($t['clean_action'] === 'remove_cron_hook'): ?>
                                <button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="remove_cron_hook" data-target="<?php echo esc_attr($t['full_path']); ?>" data-id="<?php echo esc_attr($t['id']); ?>">
                                    ⏱️ Eliminar Tarea Cron
                                </button>
                            <?php endif; ?>
                            <button type="button" class="btn-ng btn-ng-outline btn-whitelist-item" data-target="<?php echo esc_attr($t['file']); ?>" data-id="<?php echo esc_attr($t['id']); ?>" title="Omitir en futuros escaneos">
                                ✓ Permitir / Falso Positivo
                            </button>
                        </div>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </div>

    <!-- Archivos en cuarentena -->
    <?php if (!empty($quarantine_log)): ?>
    <div class="ng-card" style="margin-top:20px;">
        <h3>Archivos Aislados en Cuarentena Segura</h3>
        <p class="ng-hint">Estos archivos fueron deshabilitados y movidos a un entorno protegido con permisos restringidos (Deny From All).</p>
        <table class="ng-table">
            <thead>
                <tr>
                    <th>Ruta Original</th>
                    <th>Fecha de Cuarentena</th>
                    <th>Tamaño</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($quarantine_log as $qid => $item): ?>
                    <tr>
                        <td><code><?php echo esc_html(str_replace(ABSPATH, '', $item['original_path'])); ?></code></td>
                        <td><?php echo esc_html($item['date']); ?></td>
                        <td><?php echo size_format($item['size']); ?></td>
                        <td>
                            <button type="button" class="btn-ng btn-ng-outline sm btn-restore-file" data-id="<?php echo esc_attr($qid); ?>">
                                Restaurar
                            </button>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php endif; ?>
</div>
