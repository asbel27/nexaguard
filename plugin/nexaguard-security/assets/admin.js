jQuery(document).ready(function ($) {
    'use strict';

    // ============ SISTEMA DE PESTAÑAS (TABS) ============
    function switchTab(target) {
        if (!target || !$('#tab-' + target).length) return;
        $('.ng-tab').removeClass('is-active');
        $('.ng-tab-panel').removeClass('is-active');
        $('.ng-tab[data-tab="' + target + '"]').addClass('is-active');
        $('#tab-' + target).addClass('is-active');
        try { sessionStorage.setItem('nexaguard_active_tab', target); } catch(e) {}
    }

    $(document).on('click', '.ng-tab', function () {
        var target = $(this).data('tab');
        switchTab(target);
    });

    // Restaurar pestaña activa al cargar (prioridad: URL param > sessionStorage > pestaña por defecto)
    try {
        var urlParams = new URLSearchParams(window.location.search);
        var paramTab = urlParams.get('tab');
        var savedTab = sessionStorage.getItem('nexaguard_active_tab');
        var initialTab = (paramTab && $('#tab-' + paramTab).length) ? paramTab : savedTab;
        if (initialTab && $('#tab-' + initialTab).length) {
            switchTab(initialTab);
        }
    } catch(e) {}

    // 1. Iniciar Escaneo Forense
    $('#btn-start-scan').on('click', function () {
        var $btn = $(this);
        $btn.prop('disabled', true).text('⏳ Analizando en tiempo real…');

        // Limpiar inmediatamente la lista previa para no mostrar el análisis anterior mientras escanea
        $('#threats-list').html('<div class="empty-state"><p>⏳ Realizando análisis forense en vivo y consultando base de amenazas en tiempo real…</p></div>');
        $('#threats-badge').text('Analizando…');

        var $progBox = $('#scan-progress-box').slideDown();
        var $progBar = $('#scan-progress-bar');
        var $progPct = $('#scan-progress-pct');

        var scanStages = [
            { pct: 12, folder: '📁 Evaluando: wp-content/uploads/', label: 'Inspeccionando carpeta de medios (Uploads), ejecutables PHP y blindaje .htaccess…' },
            { pct: 24, folder: '🔌 Evaluando: wp-content/plugins/', label: 'Auditando plugins instalados (activos e inactivos), backdoors y webshells…' },
            { pct: 36, folder: '💉 Evaluando: wp-content/ (Drop-Ins y Shims)', label: 'Inspeccionando db.php, advanced-cache.php, loaders ocultos y mallas SC malware…' },
            { pct: 48, folder: '🎨 Evaluando: wp-content/themes/', label: 'Escaneando plantillas del tema, functions.php y scripts inyectados…' },
            { pct: 60, folder: '⚡ Evaluando: wp-content/mu-plugins/', label: 'Auditando plugins obligatorios del sistema (Must-Use plugins)...' },
            { pct: 72, folder: '🏛️ Evaluando: wp-includes/ y wp-admin/', label: 'Verificando firmas MD5 oficiales de WordPress.org, sales en wp-config y .htaccess...' },
            { pct: 82, folder: '⚙️ Evaluando: Configuración PHP (.user.ini / php.ini)', label: 'Auditando directivas de secuestro auto_prepend_file y auto_append_file...' },
            { pct: 90, folder: '🗄️ Evaluando: Base de Datos MySQL y Memoria', label: 'Examinando wp_options, publicaciones, tareas WP-Cron y triggers de persistencia...' },
            { pct: 96, folder: '👤 Evaluando: Cuentas y Privilegios', label: 'Comprobando cuentas de administrador ocultas y permisos clandestinos…' },
            { pct: 99, folder: '☁️ Sincronizando: NexaGuard Threat Cloud Intel', label: 'Comparando contra firmas de SC Mesh, ClearFake, EtherHiding, ClickFix y Zero-Day…' }
        ];
        var stageIdx = 0;

        var timer = setInterval(function () {
            if (stageIdx < scanStages.length) {
                var s = scanStages[stageIdx];
                $progBar.css('width', s.pct + '%');
                $progPct.text(s.pct + '%');
                $('#scan-progress-label').text(s.label);
                $('#scan-current-folder').text(s.folder);
                stageIdx++;
            }
        }, 450);

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_run_scan',
                nonce: nexaguardData.nonce
            },
            success: function (res) {
                clearInterval(timer);
                $progBar.css('width', '100%');
                $progPct.text('100%');
                $('#scan-current-folder').text('✓ Análisis de directorios finalizado');
                $('#scan-progress-label').text('Auditoría forense completada exitosamente.');

                setTimeout(function () {
                    $progBox.slideUp();
                    $btn.prop('disabled', false).text('⚡ Iniciar Análisis Forense');

                    if (res.success && res.data) {
                        renderScanResults(res.data);
                    } else {
                        alert(res.data && res.data.message ? res.data.message : 'Error durante el análisis.');
                    }
                }, 500);
            },
            error: function () {
                clearInterval(timer);
                $progBox.slideUp();
                $btn.prop('disabled', false).text('⚡ Iniciar Análisis Forense');
                alert('No se pudo completar la conexión con el servidor.');
            }
        });
    });

    // 2. Resetear Escaneo / Limpiar Historial Anterior
    $('#btn-reset-scan').on('click', function () {
        var $btn = $(this);
        $btn.prop('disabled', true).text('Limpiando…');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_reset_scan',
                nonce: nexaguardData.nonce
            },
            success: function (res) {
                $btn.prop('disabled', false).text('🔄 Limpiar Vista / Resetear');
                $('#kpi-threats').text('0');
                $('#kpi-files').text('0');
                $('#scan-status-card').removeClass('status-danger').addClass('status-clean');
                $('#status-icon').text('✓');
                $('#status-heading').text('Listo para Iniciar Análisis en Tiempo Real');
                $('#status-desc').html('Haz clic en <strong>"Iniciar Análisis Forense"</strong> para auditar plugins, temas, Core y base de datos con la base de firmas en tiempo real.');
                $('#threats-badge').removeClass('danger').addClass('ok').text('0 hallazgos');
                $('#threats-list').html('<div class="empty-state"><p>🛡️ No hay amenazas activas detectadas en este momento.</p><small class="ng-hint" style="color: #e2eafc; font-weight: 600;">Pulsa "Iniciar Análisis Forense" para auditar en tiempo real.</small></div>');

                // Resetear cuadrícula de carpetas
                $('.folder-item').removeClass('has-threats');
                $('.folder-count b').text('0');
                $('.folder-status-badge').removeClass('danger').addClass('clean').text('✓ Limpio');

                // Quitar badge en la pestaña de escáner
                $('.ng-tab[data-tab="scanner"] .ng-tab-badge').remove();
            },
            error: function () {
                $btn.prop('disabled', false).text('🔄 Limpiar Vista / Resetear');
                alert('No se pudo resetear el historial.');
            }
        });
    });

    function renderScanResults(d) {
        $('#kpi-threats').text(d.threats_count);
        $('#kpi-files').text(d.scanned_files);

        // Actualizar badge en la pestaña de escáner
        var $scannerTab = $('.ng-tab[data-tab="scanner"]');
        $scannerTab.find('.ng-tab-badge').remove();
        if (d.threats_count > 0) {
            $scannerTab.append('<span class="ng-tab-badge danger">' + d.threats_count + '</span>');
            switchTab('scanner');
        }

        var $card = $('#scan-status-card');
        if (d.threats_count > 0) {
            $card.removeClass('status-clean').addClass('status-danger');
            $('#status-icon').text('⚠️');
            $('#status-heading').text('¡Atención! Se detectaron ' + d.threats_count + ' amenazas de seguridad');
            $('#threats-badge').removeClass('ok').addClass('danger').text(d.threats_count + ' hallazgos');
        } else {
            $card.removeClass('status-danger').addClass('status-clean');
            $('#status-icon').text('✓');
            $('#status-heading').text('Sistema 100% limpio y protegido');
            $('#threats-badge').removeClass('danger').addClass('ok').text('0 hallazgos');
        }

        // Actualizar texto descriptivo con alto contraste
        $('#status-desc').html('Último análisis: <span class="status-highlight">ahora mismo</span> · <span class="status-highlight">' + d.scanned_files + ' archivos</span> auditados en <span class="status-highlight">' + d.elapsed + 's</span>.');

        // Actualizar desglose de carpetas y componentes
        if (d.breakdown) {
            Object.keys(d.breakdown).forEach(function (k) {
                var item = d.breakdown[k];
                var $item = $('#folder-item-' + k);
                var $cnt = $('#count-' + k);
                var $bdg = $('#badge-' + k);

                if ($cnt.length) {
                    $cnt.text(Number(item.files).toLocaleString());
                }
                if ($bdg.length) {
                    if (item.threats > 0) {
                        $item.addClass('has-threats');
                        $bdg.removeClass('clean').addClass('danger').text('⚠️ ' + item.threats + ' detectado(s)');
                    } else {
                        $item.removeClass('has-threats');
                        $bdg.removeClass('danger').addClass('clean').text('✓ Limpio');
                    }
                }
            });
        }

        if (!nexaguardData.is_pro && d.threats_count > 0) {
            $('.threats-pro-banner').remove();
            var bannerHtml = '<div class="threats-pro-banner">' +
                '<div class="tpb-badge">⚡ FUNCIÓN DE LIMPIEZA AUTOMÁTICA PRO</div>' +
                '<h4>Erradicación con 1 Clic Bloqueada · Se detectaron ' + d.threats_count + ' amenazas</h4>' +
                '<p>NexaGuard ha localizado con precisión quirúrgica los archivos infectados y las inyecciones en base de datos. Para erradicarlos automáticamente sin romper tu sitio o encargar la desinfección a nuestros ingenieros:</p>' +
                '<div class="tpb-acts">' +
                    '<button type="button" class="btn-ng btn-ng-primary btn-open-clean-modal">⚡ Desbloquear Erradicación con Plan PRO ($9.99/mes)</button> ' +
                    '<a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-danger">Solicitar Plan Rescate ($99)</a> ' +
                    '<button type="button" class="btn-ng btn-ng-link btn-open-lic-modal" style="color:#ffcf33">Ya tengo mi clave de licencia ›</button>' +
                '</div>' +
            '</div>';
            $('#threats-list').before(bannerHtml);
        }

        var $list = $('#threats-list').empty();
        if (!d.threats || d.threats.length === 0) {
            $('.threats-pro-banner').remove();
            $list.append('<div class="empty-state"><p>🛡️ No se encontraron amenazas. Tu instalación de WordPress está limpia.</p><small class="ng-hint" style="color: #e2eafc; font-weight: 600;">Mantén activo el Cortafuegos WAF para bloquear intrusiones en tiempo real.</small></div>');
            return;
        }

        d.threats.forEach(function (t) {
            var sevClass = t.severity === 'crit' ? 'crit' : 'warn';
            var sevLabel = t.severity === 'crit' ? 'CRÍTICO' : 'ADVERTENCIA';

            var isHseo = (t.file && t.file.indexOf('plugins/hseo') !== -1) || (t.full_path && t.full_path.indexOf('plugins/hseo') !== -1);
            var delFolderBtn = '';
            if (isHseo) {
                delFolderBtn = '<button type="button" class="btn-ng btn-ng-danger btn-delete-plugin-folder" data-target="' + t.full_path + '" data-id="' + t.id + '" title="Destruir la carpeta completa de este plugin troyano">💥 Destruir Carpeta del Plugin (HSEO)</button>';
            }

            var actBtn = '';
            var forceDelBtn = '';
            var quarantineBtn = '';

            if (!t.is_db) {
                if (t.clean_action === 'restore_core_file') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="restore_core_file" data-target="' + t.full_path + '" data-id="' + t.id + '" title="Descargar y restaurar el archivo original limpio desde WordPress.org">🔄 Restaurar Archivo Original (WordPress.org)</button>';
                } else if (t.clean_action === 'sanitize_injection') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clearfake" data-target="' + t.full_path + '" data-id="' + t.id + '" title="Extirpar código malicioso inyectado preservando el archivo original">🧹 Desinfectar Código (Extirpar Inyección)</button>';
                } else if (t.clean_action === 'clean_dropin') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="clean_dropin" data-target="' + t.full_path + '" data-id="' + t.id + '">💉 Desinfectar Drop-In (SC Malware)</button>';
                } else if (t.clean_action === 'neutralize_auto_prepend') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="neutralize_auto_prepend" data-target="' + t.full_path + '" data-id="' + t.id + '">⚡ Neutralizar auto_prepend_file (Seguro)</button>';
                } else if (t.clean_action === 'protect_uploads_directory') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-primary btn-clean-threat" data-type="protect_uploads_directory" data-target="' + t.full_path + '" data-id="' + t.id + '">🛡️ Bloquear Ejecución PHP en Uploads</button>';
                } else if (t.clean_action === 'apply_disallow_file_edit') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-primary btn-clean-threat" data-type="apply_disallow_file_edit" data-target="' + t.full_path + '" data-id="' + t.id + '">🛡️ Bloquear Editor de Archivos (wp-config)</button>';
                } else if (t.clean_action === 'apply_htaccess_no_indexes') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-primary btn-clean-threat" data-type="apply_htaccess_no_indexes" data-target="' + t.full_path + '" data-id="' + t.id + '">🛡️ Bloquear Listado de Carpetas (.htaccess)</button>';
                } else if (t.clean_action === 'regenerate_wp_salts') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-primary btn-clean-threat" data-type="regenerate_wp_salts" data-target="' + t.full_path + '" data-id="' + t.id + '">🔑 Regenerar Sales e Invalidar Sesiones</button>';
                }

                // Para acciones de hardening, archivos core o neutralización, no mostrar botón redundante ni peligroso de eliminación forzada
                var isHardeningAction = (t.clean_action === 'apply_disallow_file_edit' || t.clean_action === 'apply_htaccess_no_indexes' || t.clean_action === 'regenerate_wp_salts' || t.clean_action === 'protect_uploads_directory' || t.clean_action === 'neutralize_auto_prepend');
                var isCoreFile = (t.module === 'core' || t.clean_action === 'restore_core_file' || (t.file && (t.file.indexOf('wp-includes') !== -1 || t.file.indexOf('wp-admin') !== -1 || t.file === 'index.php' || t.file === 'wp-config.php' || t.file.indexOf('version.php') !== -1)));
                if (!isHardeningAction && !isCoreFile) {
                    forceDelBtn = '<button type="button" class="btn-ng btn-ng-danger btn-force-delete" data-target="' + t.full_path + '" data-id="' + t.id + '" title="Eliminar definitivamente este archivo malicioso">💥 Eliminar Archivo Malicioso</button>';
                }

                if (t.clean_action === 'quarantine') {
                    quarantineBtn = '<button type="button" class="btn-ng btn-ng-outline btn-quarantine-file" data-file="' + t.full_path + '" data-id="' + t.id + '">🔒 Mover a Cuarentena</button>';
                }
            } else {
                if (t.clean_action === 'clean_db_option') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clean_db_option" data-target="' + t.full_path + '" data-id="' + t.id + '" title="Intentar limpiar script de la opción">🧹 Limpiar Inyección en BD</button> ' +
                             '<button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="delete_db_option" data-target="' + t.full_path + '" data-id="' + t.id + '" title="Eliminar completamente esta opción de la base de datos">💥 Purgar Opción de BD</button>';
                } else if (t.clean_action === 'clean_post_injection') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clean_post_injection" data-target="' + t.full_path + '" data-id="' + t.id + '">📝 Limpiar Publicación en BD</button>';
                } else if (t.clean_action === 'remove_cron_hook') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="remove_cron_hook" data-target="' + t.full_path + '" data-id="' + t.id + '">⏱️ Eliminar Tarea Cron</button>';
                } else if (t.clean_action === 'downgrade_user') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="downgrade_user" data-target="' + t.full_path + '" data-id="' + t.id + '">👤 Degradar a Suscriptor</button>';
                } else if (t.clean_action === 'clean_db_trigger') {
                    actBtn = '<button type="button" class="btn-ng btn-ng-danger btn-clean-threat" data-type="clean_db_trigger" data-target="' + t.full_path + '" data-id="' + t.id + '">💥 Eliminar Trigger Malicioso de MySQL</button>';
                }
            }

            var whitelistBtn = '<button type="button" class="btn-ng btn-ng-outline btn-whitelist-item" data-target="' + t.file + '" data-id="' + t.id + '" title="Omitir en futuros escaneos">✓ Permitir / Falso Positivo</button>';

            var actionButtonsHtml = '';
            if (nexaguardData.is_pro) {
                actionButtonsHtml = delFolderBtn + ' ' + actBtn + ' ' + forceDelBtn + ' ' + quarantineBtn + ' ' + whitelistBtn;
            } else {
                actionButtonsHtml = '<button type="button" class="btn-ng btn-ng-danger btn-locked-clean" data-target="' + t.file + '" title="Erradicar amenaza (Requiere Plan Pro o Rescate)">🔒 Erradicar Amenaza (Función PRO)</button> ' +
                                    '<button type="button" class="btn-ng btn-ng-outline btn-locked-clean" data-target="' + t.file + '" title="Mover a cuarentena (Requiere Plan Pro)">🔒 Cuarentena (Función PRO)</button> ' +
                                    whitelistBtn;
            }

            var item = $('<div class="threat-item ' + sevClass + '" id="threat-' + t.id + '">' +
                '<div class="threat-header">' +
                    '<span class="sev-badge ' + sevClass + '">' + sevLabel + '</span>' +
                    '<h4>' + escapeHtml(t.title) + '</h4>' +
                '</div>' +
                '<p class="threat-desc">' + escapeHtml(t.desc) + '</p>' +
                '<div class="threat-loc"><code>' + escapeHtml(t.file) + (t.line > 0 ? ' : Línea ' + t.line : '') + '</code></div>' +
                (t.code ? '<pre class="threat-snippet"><code>' + escapeHtml(t.code) + '</code></pre>' : '') +
                '<div class="threat-actions">' + actionButtonsHtml + '</div>' +
            '</div>');

            $list.append(item);
        });
    }

    // 3. Forzar Eliminación Superando Restricciones de Permisos
    $(document).on('click', '.btn-force-delete', function () {
        var $btn = $(this);
        var target = $btn.data('target');
        var id = $btn.data('id');

        if (!confirm('¿Forzar la eliminación definitiva de esta amenaza? NexaGuard desbloqueará permisos y destruirá el archivo.')) {
            return;
        }

        $btn.prop('disabled', true).text('Destruyendo…');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_force_delete',
                nonce: nexaguardData.nonce,
                target: target,
                mode: 'file'
            },
            success: function (res) {
                if (res.success) {
                    $('#threat-' + id).fadeOut(350, function () {
                        $(this).remove();
                        updateThreatCounts();
                    });
                } else {
                    $btn.prop('disabled', false).text('Reintentar');
                    alert(res.data && res.data.message ? res.data.message : 'Error al eliminar.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).text('Reintentar');
                alert('Error de conexión.');
            }
        });
    });

    // 4. Destruir Carpeta Completa del Plugin Malicioso
    $(document).on('click', '.btn-delete-plugin-folder', function () {
        var $btn = $(this);
        var target = $btn.data('target');

        if (!confirm('¿Estás seguro de destruir la carpeta completa del plugin malicioso? Esta acción eliminará todo el plugin troyano.')) {
            return;
        }

        $btn.prop('disabled', true).text('Destruyendo plugin…');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_force_delete',
                nonce: nexaguardData.nonce,
                target: target,
                mode: 'plugin_folder'
            },
            success: function (res) {
                if (res.success) {
                    // Remover todas las amenazas pertenecientes a ese plugin
                    $('.threat-item').each(function () {
                        var text = $(this).text();
                        if (text.indexOf('hseo') !== -1) {
                            $(this).fadeOut(350, function () { $(this).remove(); updateThreatCounts(); });
                        }
                    });
                    alert(res.data && res.data.message ? res.data.message : 'Plugin destruido con éxito.');
                } else {
                    $btn.prop('disabled', false).text('Reintentar');
                    alert(res.data && res.data.message ? res.data.message : 'Error al eliminar carpeta.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).text('Reintentar');
                alert('Error de conexión.');
            }
        });
    });

    // 5. Limpiar / Erradicar Amenaza
    $(document).on('click', '.btn-clean-threat', function () {
        var $btn = $(this);
        var type = $btn.data('type');
        var target = $btn.data('target');
        var id = $btn.data('id');

        var confirmMsg = '¿Deseas desinfectar este archivo? Se extirpará únicamente el código malicioso inyectado y se creará una copia de seguridad automática antes de guardar.';
        if (type === 'restore_core_file') {
            confirmMsg = '¿Deseas restaurar este archivo oficial descargándolo directamente desde WordPress.org? Se creará una copia de seguridad antes de sustituirlo.';
        } else if (type === 'delete_db_option') {
            confirmMsg = '¿Estás seguro de que deseas purgar y eliminar definitivamente esta clave de la base de datos?';
        } else if (type === 'remove_cron_hook') {
            confirmMsg = '¿Deseas remover esta tarea programada (cron) de la base de datos?';
        } else if (type === 'downgrade_user') {
            confirmMsg = '¿Deseas degradar los permisos de este usuario sospechoso a suscriptor?';
        } else if (type === 'apply_disallow_file_edit') {
            confirmMsg = '¿Deseas aplicar el blindaje en wp-config.php para deshabilitar la edición de temas y plugins desde el panel de WordPress?';
        } else if (type === 'apply_htaccess_no_indexes') {
            confirmMsg = '¿Deseas aplicar "Options -Indexes" en .htaccess para evitar que se puedan listar directorios en tu servidor?';
        } else if (type === 'regenerate_wp_salts') {
            confirmMsg = '¿Deseas regenerar todas las claves y sales criptográficas en wp-config.php? Esto invalidará de inmediato todas las sesiones y cookies secuestradas por atacantes.';
        }

        if (!confirm(confirmMsg)) {
            return;
        }

        var loadingLabel = (type === 'restore_core_file') ? 'Restaurando desde WP.org…' : (type === 'delete_db_option' ? 'Purgando…' : (type.indexOf('apply_') !== -1 || type === 'regenerate_wp_salts' ? 'Aplicando…' : 'Desinfectando…'));
        $btn.prop('disabled', true).text(loadingLabel);

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_clean_threat',
                nonce: nexaguardData.nonce,
                threat_type: type,
                target: target
            },
            success: function (res) {
                if (res.success) {
                    if (type === 'delete_db_option' || type === 'remove_cron_hook') {
                        $('#threat-' + id).fadeOut(350, function () {
                            $(this).remove();
                            updateThreatCounts();
                        });
                    } else {
                        var successMsg = (type === 'restore_core_file') ? '✓ Archivo oficial de WordPress.org restaurado' : '✓ Desinfección completada con éxito';
                        $('#threat-' + id).css('border-left-color', '#3de8a4').find('.threat-actions').html('<span style="color:#3de8a4;font-weight:700">' + successMsg + '</span>');
                    }
                } else {
                    $btn.prop('disabled', false).text('Reintentar');
                    alert(res.data && res.data.message ? res.data.message : 'Error al limpiar.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).text('Reintentar');
                alert('Error de conexión.');
            }
        });
    });

    // 5.1 Reparación y Blindaje Automático con 1 Clic (Auto-Remediate All)
    $(document).on('click', '#btn-auto-remediate-all', function () {
        var $btn = $(this);

        if (!confirm('¿Deseas que NexaGuard limpie, repare y blinde automáticamente todo tu sitio web de forma 100% segura?\n\n- Los archivos del sistema se restaurarán limpios desde WordPress.org.\n- Los virus en plugins se extirparán sin romper tus extensiones.\n- Se aplicarán los blindajes preventivos de servidor.\n- Se guardan copias de respaldo de cada archivo.')) {
            return;
        }

        $btn.prop('disabled', true).html('⚡ Reparando y Blindando Sitio… (Espere)');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_auto_remediate_all',
                nonce: nexaguardData.nonce
            },
            success: function (res) {
                if (res.success) {
                    $('#auto-remediate-banner').fadeOut(300);
                    $('#threats-badge').removeClass('danger').addClass('ok').text('0 hallazgos (Limpio)');

                    var summaryMsg = '<div class="empty-state" style="border: 2px solid #3de8a4; background: rgba(61,232,164,0.1); padding: 30px; border-radius: 12px; text-align: center;">' +
                        '<div style="font-size: 3rem; margin-bottom: 12px;">🛡️✨</div>' +
                        '<h3 style="color: #3de8a4; font-size: 1.4rem; margin-bottom: 8px;">¡Tu sitio web ha sido limpiado y blindado con éxito!</h3>' +
                        '<p style="color: #e2eafc; font-size: 1rem; max-width: 600px; margin: 0 auto 16px;">' + (res.data.message || 'Todas las amenazas fueron neutralizadas de forma segura.') + '</p>' +
                        '<button type="button" class="btn-ng btn-ng-primary" onclick="location.reload();">🔄 Actualizar Vista</button>' +
                        '</div>';

                    $('#threats-list').html(summaryMsg);

                    $('.scan-summary-card').removeClass('status-danger').addClass('status-clean');
                    $('.status-indicator').html('🛡️');
                    $('.summary-left h3').text('SITIO BLINDADO Y PROTEGIDO');
                    $('.summary-left p').text('0 amenazas activas en el sistema.');
                } else {
                    $btn.prop('disabled', false).html('⚡ LIMPIAR Y BLINDAR SITIO CON 1 CLIC');
                    alert(res.data && res.data.message ? res.data.message : 'Error durante la reparación automática.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).html('⚡ LIMPIAR Y BLINDAR SITIO CON 1 CLIC');
                alert('Error de conexión durante el proceso de remediación.');
            }
        });
    });

    // 6. Mover a Cuarentena
    $(document).on('click', '.btn-quarantine-file', function () {
        var $btn = $(this);
        var file = $btn.data('file');
        var id = $btn.data('id');

        if (!confirm('¿Mover este archivo malicioso a la cuarentena segura aislada?')) {
            return;
        }

        $btn.prop('disabled', true).text('Aislando…');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_quarantine_file',
                nonce: nexaguardData.nonce,
                file: file
            },
            success: function (res) {
                if (res.success) {
                    $('#threat-' + id).fadeOut(400, function () { 
                        $(this).remove(); 
                        updateThreatCounts();
                    });
                    var qCount = parseInt($('#kpi-quarantine').text() || '0', 10) + 1;
                    $('#kpi-quarantine').text(qCount);
                    $('#quarantine-badge').text(qCount + ' archivo(s)');
                    var $qTab = $('.ng-tab[data-tab="quarantine"]');
                    $qTab.find('.ng-tab-badge').remove();
                    if (qCount > 0) {
                        $qTab.append('<span class="ng-tab-badge info">' + qCount + '</span>');
                    }
                } else {
                    $btn.prop('disabled', false).text('Reintentar');
                    alert(res.data && res.data.message ? res.data.message : 'Error al aislar.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).text('Reintentar');
                alert('Error de conexión.');
            }
        });
    });

    // 7. Marcar como Falso Positivo / Permitir
    $(document).on('click', '.btn-whitelist-item', function () {
        var $btn = $(this);
        var target = $btn.data('target');
        var id = $btn.data('id');

        $btn.prop('disabled', true).text('Guardando…');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_whitelist_item',
                nonce: nexaguardData.nonce,
                target: target
            },
            success: function (res) {
                if (res.success) {
                    $('#threat-' + id).fadeOut(350, function () {
                        $(this).remove();
                        updateThreatCounts();
                    });
                } else {
                    $btn.prop('disabled', false).text('Reintentar');
                    alert('No se pudo añadir a la lista de permitidos.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).text('Reintentar');
                alert('Error de conexión.');
            }
        });
    });

    // 8. Restaurar de Cuarentena
    $(document).on('click', '.btn-restore-file', function () {
        var $btn = $(this);
        var qid = $btn.data('id');

        if (!confirm('¿Restaurar este archivo a su ubicación original?')) {
            return;
        }

        $btn.prop('disabled', true).text('Restaurando…');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_restore_quarantine',
                nonce: nexaguardData.nonce,
                quarantine_id: qid
            },
            success: function (res) {
                if (res.success) {
                    $btn.closest('tr').fadeOut(400, function () { $(this).remove(); });
                } else {
                    $btn.prop('disabled', false).text('Restaurar');
                    alert(res.data && res.data.message ? res.data.message : 'Error al restaurar.');
                }
            }
        });
    });

    // 8.1 Revertir Snapshot / Rollback en 1 Clic
    $(document).on('click', '.btn-revert-snapshot', function () {
        var $btn = $(this);
        var snapshotId = $btn.data('id');
        var fileName = $btn.data('file');

        if (!confirm('¿Deseas revertir este archivo (' + fileName + ') a su estado exacto anterior a la desinfección? Se recuperará el archivo original que tenías antes.')) {
            return;
        }

        $btn.prop('disabled', true).text('Revirtiendo…');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_revert_snapshot',
                nonce: nexaguardData.nonce,
                snapshot_id: snapshotId
            },
            success: function (res) {
                if (res.success) {
                    $btn.closest('tr').fadeOut(350, function () {
                        $(this).remove();
                        var count = $('#rollback-table tbody tr').length;
                        $('#rollback-badge').text(count + ' punto(s) de respaldo');
                        var $rbTab = $('.ng-tab[data-tab="rollback"]');
                        $rbTab.find('.ng-tab-badge').remove();
                        if (count > 0) {
                            $rbTab.append('<span class="ng-tab-badge info">' + count + '</span>');
                        }
                        if (count === 0) {
                            $('#rollback-table').replaceWith('<div class="empty-state" style="padding:22px; text-align:center;"><p style="margin:0; color:#a0acd2;">🛡️ La bóveda de seguridad está lista. Al realizar cualquier limpieza o restauración con 1 clic, tus puntos de reversión aparecerán aquí.</p></div>');
                        }
                    });
                    alert(res.data && res.data.message ? res.data.message : 'Archivo restaurado con éxito a su estado previo.');
                } else {
                    $btn.prop('disabled', false).text('↩️ Revertir (Deshacer)');
                    alert(res.data && res.data.message ? res.data.message : 'Error al revertir el archivo.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).text('↩️ Revertir (Deshacer)');
                alert('Error de conexión al revertir el respaldo.');
            }
        });
    });

    // 9. Guardar Configuración WAF
    $('#form-waf-settings').on('submit', function (e) {
        e.preventDefault();
        if (!nexaguardData.is_pro) {
            $('#clean-upgrade-modal').fadeIn(200);
            return false;
        }

        var $form = $(this);
        var $msg = $('#save-msg').text('Guardando reglas…').css('color', '#ffcf33');

        var formData = $form.serializeArray();
        formData.push({ name: 'action', value: 'nexaguard_save_settings' });
        formData.push({ name: 'nonce', value: nexaguardData.nonce });

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: formData,
            success: function (res) {
                if (res.success) {
                    $msg.text('✓ Reglas de blindaje aplicadas con éxito.').css('color', '#3de8a4');
                    setTimeout(function () { $msg.fadeOut(function () { $(this).text('').show(); }); }, 3500);
                } else {
                    $msg.text('Error al guardar.').css('color', '#ff8ba0');
                }
            },
            error: function () {
                $msg.text('Error de conexión.').css('color', '#ff8ba0');
            }
        });
    });

    // Interceptar clicks en WAF cuando no es PRO
    $(document).on('click', '.waf-locked-container, .waf-locked-container label, .btn-locked-waf-submit, .btn-open-upgrade-modal', function (e) {
        if (!nexaguardData.is_pro) {
            e.preventDefault();
            $('#clean-upgrade-modal').fadeIn(200);
            return false;
        }
    });

    function updateThreatCounts() {
        var count = $('#threats-list .threat-item').length;
        $('#kpi-threats').text(count);
        $('#threats-badge').text(count + ' hallazgos');

        // Actualizar badge en la pestaña
        var $scannerTab = $('.ng-tab[data-tab="scanner"]');
        $scannerTab.find('.ng-tab-badge').remove();
        if (count > 0) {
            $scannerTab.append('<span class="ng-tab-badge danger">' + count + '</span>');
        }

        if (count === 0) {
            $('#scan-status-card').removeClass('status-danger').addClass('status-clean');
            $('#status-icon').text('✓');
            $('#status-heading').text('Sistema 100% limpio y protegido');
            $('#threats-badge').removeClass('danger').addClass('ok');
            $('#threats-list').html('<div class="empty-state"><p>🛡️ No hay amenazas activas detectadas en este momento.</p><small class="ng-hint" style="color: #e2eafc; font-weight: 600;">Mantén activo el Cortafuegos WAF para bloquear intrusiones en tiempo real.</small></div>');
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ============ SISTEMA DE VIGILANCIA 24H & RADAR ============
    function playRadarActivationSound() {
        try {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            var ctx = new AudioContext();
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();

            // Tono inicial en 940Hz que baja en barrido hacia 440Hz como sonar de submarino/radar
            osc.type = 'sine';
            osc.frequency.setValueAtTime(940, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.38);

            // Ataque rápido y desvanecimiento suave con eco
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.7);
        } catch (e) {
            console.log('Web Audio Radar sound:', e);
        }
    }

    $('#btn-toggle-vigilance').on('click', function (e) {
        var $btn = $(this);

        // Si es versión estándar sin PRO activa: bloquear radar y abrir modal de compra
        if (!nexaguardData.is_pro || $btn.attr('data-locked') === '1' || $btn.hasClass('btn-vigilance-locked')) {
            e.preventDefault();
            $('#clean-upgrade-modal').fadeIn(200);
            return false;
        }

        var current = parseInt($btn.attr('data-active'), 10) || 0;
        var next = current === 1 ? 0 : 1;

        $btn.prop('disabled', true);

        if (next === 1) {
            playRadarActivationSound();
            $btn.addClass('is-active').attr('data-active', '1');
            $('#v-toggle-label').text('VIGILANCIA ACTIVA 24H');
            $('#vigilance-radar-box').removeClass('radar-paused').addClass('radar-scanning');
            $('#radar-status-text').html('🟢 El sistema de vigilancia de 24 horas para tu web está activado.');
            $('#radar-status-sub').text('NexaGuard Cloud Radar supervisa continuamente inyecciones PHP, cambios en archivos y peticiones maliciosas.');
        } else {
            $btn.removeClass('is-active').attr('data-active', '0');
            $('#v-toggle-label').text('ACTIVAR VIGILANCIA 24H');
            $('#vigilance-radar-box').removeClass('radar-scanning').addClass('radar-paused');
            $('#radar-status-text').html('⏸️ Sistema de vigilancia en pausa. Actívalo para proteger tu web.');
            $('#radar-status-sub').text('Haz clic en el botón superior para activar el radar perimetral permanente.');
        }

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_toggle_vigilance',
                active: next,
                nonce: nexaguardData.nonce
            },
            complete: function () {
                $btn.prop('disabled', false);
            }
        });
    });

    // Clicks en la caja del radar o distintivos bloqueados
    $(document).on('click', '.vigilance-card.vigilance-locked #vigilance-radar-box, .radar-locked', function (e) {
        if (!nexaguardData.is_pro) {
            e.preventDefault();
            $('#clean-upgrade-modal').fadeIn(200);
            return false;
        }
    });

    // ============ GESTIÓN DE LICENCIA PRO ============
    $('#btn-edit-license').on('click', function () {
        $('#license-modal').fadeIn(200);
        $('#license-modal-msg').text('');
    });

    $(document).on('click', '.btn-vigilance-locked, .btn-open-lic-modal', function (e) {
        e.preventDefault();
        $('#clean-upgrade-modal').fadeOut(150);
        $('#license-modal').fadeIn(200);
        $('#license-modal-msg').text('Ingresa tu clave de licencia oficial del Plan Security PRO para desbloquear el radar 24h y el blindaje WAF.').css('color', '#ffcf33');
    });

    $('#btn-unlink-license').on('click', function (e) {
        e.preventDefault();
        if (!confirm('¿Deseas desvincular la licencia de este WordPress y regresar a la Edición Estándar?')) return;
        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_validate_license',
                license_key: '',
                nonce: nexaguardData.nonce
            },
            complete: function () {
                location.reload();
            }
        });
    });

    $('#btn-close-license').on('click', function () {
        $('#license-modal').fadeOut(200);
    });

    $('#btn-save-license').on('click', function () {
        var $btn = $(this);
        var key = $('#input-license-key').val().trim();
        var $msg = $('#license-modal-msg');

        if (!key) {
            $msg.text('Por favor escribe tu clave de licencia.').css('color', '#ff8ba0');
            return;
        }

        $btn.prop('disabled', true).text('Verificando…');
        $msg.text('Conectando con NexaGuard Threat Cloud…').css('color', '#a0acd2');

        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_validate_license',
                license_key: key,
                nonce: nexaguardData.nonce
            },
            success: function (res) {
                if (res.success && res.data && res.data.valid) {
                    $msg.text('✓ ' + (res.data.notice || 'Licencia activada con éxito.')).css('color', '#3de8a4');
                    setTimeout(function () {
                        location.reload();
                    }, 1000);
                } else {
                    var errTxt = (res.data && res.data.message) ? res.data.message : ((res.data && res.data.notice) ? res.data.notice : 'Clave de licencia no válida o expirada.');
                    $msg.text(errTxt).css('color', '#ff8ba0');
                }
            },
            error: function () {
                $msg.text('Error de conexión con el servidor.').css('color', '#ff8ba0');
            },
            complete: function () {
                $btn.prop('disabled', false).text('Verificar y Guardar');
            }
        });
    });

    // ============ MODAL DE CONVERSIÓN DE LIMPIEZA ============
    $(document).on('click', '.btn-locked-clean, .btn-open-clean-modal', function (e) {
        e.preventDefault();
        $('#clean-upgrade-modal').fadeIn(200);
    });

    $('#btn-close-clean-modal').on('click', function () {
        $('#clean-upgrade-modal').fadeOut(200);
    });

    $(document).on('click', '.btn-switch-to-key', function (e) {
        e.preventDefault();
        $('#clean-upgrade-modal').fadeOut(100);
        $('#license-modal').fadeIn(200);
    });

    // ============ PERSONALIZADOR Y EMBELLECEDOR DE LOGIN ============
    // Selector de Medios de WordPress para Fondo
    $(document).on('click', '#btn-select-login-bg', function (e) {
        e.preventDefault();
        if (typeof wp === 'undefined' || !wp.media) {
            alert('La biblioteca de medios de WordPress no está disponible en este momento. Puedes ingresar la URL directamente.');
            return;
        }
        var bgFrame = wp.media({
            title: 'Seleccionar Imagen de Fondo para Login',
            button: { text: 'Usar como Fondo' },
            multiple: false
        });
        bgFrame.on('select', function () {
            var attachment = bgFrame.state().get('selection').first().toJSON();
            $('#login_bg_image').val(attachment.url).trigger('input');
        });
        bgFrame.open();
    });

    // Selector de Medios de WordPress para Logo
    $(document).on('click', '#btn-select-login-logo', function (e) {
        e.preventDefault();
        if (typeof wp === 'undefined' || !wp.media) {
            alert('La biblioteca de medios de WordPress no está disponible en este momento. Puedes ingresar la URL directamente.');
            return;
        }
        var logoFrame = wp.media({
            title: 'Seleccionar Logo Personalizado (Sustituir Icono WP)',
            button: { text: 'Usar como Logo' },
            multiple: false
        });
        logoFrame.on('select', function () {
            var attachment = logoFrame.state().get('selection').first().toJSON();
            $('#login_logo_image').val(attachment.url).trigger('input');
        });
        logoFrame.open();
    });

    // Limpiar imagen de fondo y logo
    $(document).on('click', '#btn-clear-login-bg', function (e) {
        e.preventDefault();
        $('#login_bg_image').val('').trigger('input');
    });

    $(document).on('click', '#btn-clear-login-logo', function (e) {
        e.preventDefault();
        $('#login_logo_image').val('').trigger('input');
    });

    // Activar / Desactivar panel de customizer
    $(document).on('change', '#login_custom_design', function () {
        var isEnabled = $(this).is(':checked');
        $('#login-customizer-controls').css('opacity', isEnabled ? '1' : '0.6');
    });

    // Función de actualización en tiempo real de la miniatura de previsualización
    function updateLoginPreview() {
        var bgUrl = ($('#login_bg_image').val() || '').trim();
        var logoUrl = ($('#login_logo_image').val() || '').trim();
        var preset = $('input[name="login_bg_preset"]:checked').val() || 'deep-navy';
        var noticeText = ($('#login_security_notice').val() || '').trim() || 'Estás iniciando sesión en tu WordPress protegido por NexaGuard';

        var $box = $('#login-preview-card');
        if (!$box.length) return;

        // Fondo
        if (bgUrl) {
            $box.css({
                'background-image': 'url(' + bgUrl + ')',
                'background-size': 'cover',
                'background-position': 'center center'
            });
        } else if (preset === 'cyber-dark') {
            $box.css({
                'background-image': 'radial-gradient(circle at 50% 20%, #172554 0%, #0b112c 50%, #030712 100%)',
                'background-size': 'auto'
            });
        } else if (preset === 'matrix') {
            $box.css({
                'background-image': 'linear-gradient(135deg, #022c22 0%, #05161e 40%, #0b0f19 100%)',
                'background-size': 'auto'
            });
        } else {
            // deep-navy
            $box.css({
                'background-image': 'radial-gradient(ellipse at bottom, #1e1b4b 0%, #0a0f2c 60%, #030717 100%)',
                'background-size': 'auto'
            });
        }

        // Logo
        var $logoContainer = $('#login-preview-logo');
        if (logoUrl) {
            $logoContainer.html('<img src="' + logoUrl + '" alt="Logo" style="max-height:48px; max-width:180px; object-fit:contain;" />');
        } else {
            $logoContainer.html('<span style="font-size:2.2rem; line-height:1;">🛡️</span><span style="font-size:0.86rem; font-weight:800; color:#ffcf33; display:block; margin-top:4px;">NexaGuard Security</span>');
        }

        // Aviso de seguridad
        $('#login-preview-notice').text(noticeText);
    }

    // Escuchar cambios para actualización instantánea
    $(document).on('input change', '#login_bg_image, #login_logo_image, #login_security_notice, input[name="login_bg_preset"]', function () {
        updateLoginPreview();
    });

    // Inicializar previsualización al cargar
    updateLoginPreview();
});
