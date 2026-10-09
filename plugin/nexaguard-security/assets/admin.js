jQuery(document).ready(function ($) {
    'use strict';

    // ============ SISTEMA DE NOTIFICACIONES TOAST ANIMADAS (7 SEG) ============
    function showToast(message, type, title) {
        type = type || 'info'; // 'success', 'error', 'warning', 'info'
        var icons = {
            success: '🛡️',
            error: '🚨',
            warning: '⚠️',
            info: '🔔'
        };
        var titles = {
            success: 'Operación Exitosa',
            error: 'Atención / Error',
            warning: 'Advertencia de Seguridad',
            info: 'Aviso de NexaGuard'
        };

        var icon = icons[type] || '🔔';
        var toastTitle = title || titles[type] || 'Aviso';

        var $container = $('#nexaguard-toast-container');
        if (!$container.length) {
            $container = $('<div id="nexaguard-toast-container"></div>');
            $('body').append($container);
        }

        var $toast = $(
            '<div class="ng-toast toast-' + type + '">' +
                '<div class="ng-toast-body">' +
                    '<span class="ng-toast-icon">' + icon + '</span>' +
                    '<div class="ng-toast-content">' +
                        '<div class="ng-toast-title">' + escapeHtml(toastTitle) + '</div>' +
                        '<p class="ng-toast-msg">' + escapeHtml(message) + '</p>' +
                    '</div>' +
                    '<button type="button" class="ng-toast-close" title="Cerrar">&times;</button>' +
                '</div>' +
                '<div class="ng-toast-progress-bar"><div class="ng-toast-progress-fill"></div></div>' +
            '</div>'
        );

        $container.append($toast);

        // Entrada fluida con animación
        requestAnimationFrame(function () {
            $toast.addClass('ng-toast-visible');
        });

        var isRemoved = false;
        function dismissToast() {
            if (isRemoved) return;
            isRemoved = true;
            $toast.removeClass('ng-toast-visible').addClass('ng-toast-closing');
            setTimeout(function () {
                $toast.remove();
                if (!$container.children().length) {
                    $container.remove();
                }
            }, 1200); // Se desvanece suavemente
        }

        // Cierre manual inmediato
        $toast.find('.ng-toast-close').on('click', function () {
            dismissToast();
        });

        // Cierre automático en exactamente 7 segundos (7000ms)
        setTimeout(dismissToast, 7000);
    }

    // ============ SISTEMA DE MODAL INTERACTIVO Y ANIMADO (REEMPLAZO TOTAL DE ALERT Y CONFIRM) ============
    function ensureConfirmModalExists() {
        var $modal = $('#nexaguard-confirm-modal');
        if (!$modal.length) {
            $modal = $(
                '<div id="nexaguard-confirm-modal" class="ng-modal" style="display:none; z-index:9999999 !important;">' +
                    '<div class="ng-modal-box" style="max-width:520px; border:1.5px solid rgba(255,207,51,0.5); box-shadow:0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(255,207,51,0.15);">' +
                        '<div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">' +
                            '<span id="ng-confirm-icon" style="font-size:2rem; line-height:1;">🛡️</span>' +
                            '<div>' +
                                '<h3 id="ng-confirm-title" style="margin:0; font-size:1.2rem; color:#ffffff;">Confirmación de Seguridad</h3>' +
                                '<small style="color:#ffcf33; font-weight:700; font-size:0.75rem; letter-spacing:0.04em;">NEXAGUARD INTELLIGENT FORENSICS</small>' +
                            '</div>' +
                        '</div>' +
                        '<p id="ng-confirm-message" style="color:#dbe4ff; font-size:0.92rem; line-height:1.6; margin:0 0 20px; white-space:pre-line;"></p>' +
                        '<div class="ng-modal-acts" style="display:flex; gap:10px; justify-content:flex-end; border-top:1px solid rgba(255,255,255,0.08); padding-top:16px;">' +
                            '<button type="button" id="ng-confirm-cancel-btn" class="btn-ng btn-ng-outline" style="min-width:105px;">Cancelar</button>' +
                            '<button type="button" id="ng-confirm-ok-btn" class="btn-ng btn-ng-primary" style="min-width:140px;">Continuar</button>' +
                        '</div>' +
                    '</div>' +
                '</div>'
            );
            $('body').append($modal);
        }
        return $modal;
    }

    function showConfirm(message, onConfirm, onCancel, options) {
        options = options || {};
        var title = options.title || 'Confirmación de Seguridad';
        var icon = options.icon || '🛡️';
        var btnOkText = options.btnOkText || 'Continuar';
        var btnCancelText = options.btnCancelText || 'Cancelar';
        var isDanger = options.danger || false;

        var $modal = ensureConfirmModalExists();
        if (!$modal.parent().is('body')) {
            $modal.appendTo('body');
        }

        $('#ng-confirm-title').text(title);
        $('#ng-confirm-icon').text(icon);
        $('#ng-confirm-message').text(message);

        var $okBtn = $('#ng-confirm-ok-btn').show().text(btnOkText);
        var $cancelBtn = $('#ng-confirm-cancel-btn').show().text(btnCancelText);

        if (isDanger) {
            $okBtn.removeClass('btn-ng-primary').addClass('btn-ng-danger');
        } else {
            $okBtn.removeClass('btn-ng-danger').addClass('btn-ng-primary');
        }

        $okBtn.off('click');
        $cancelBtn.off('click');

        function closeModal() {
            $modal.stop(true, true).fadeOut(150);
        }

        $okBtn.on('click', function () {
            closeModal();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });

        $cancelBtn.on('click', function () {
            closeModal();
            if (typeof onCancel === 'function') {
                onCancel();
            }
        });

        $modal.css({ display: 'flex', opacity: 0 }).stop(true, true).fadeTo(200, 1);
    }

    function showAlert(message, type, title, onOk) {
        type = type || 'info';
        var icons = {
            success: '🛡️',
            error: '🚨',
            warning: '⚠️',
            info: '🔔'
        };
        var titles = {
            success: 'Operación Exitosa',
            error: 'Atención / Error',
            warning: 'Advertencia de Seguridad',
            info: 'Aviso de NexaGuard'
        };

        var icon = icons[type] || '🔔';
        var modalTitle = title || titles[type] || 'Aviso de NexaGuard';

        var $modal = ensureConfirmModalExists();
        if (!$modal.parent().is('body')) {
            $modal.appendTo('body');
        }

        $('#ng-confirm-title').text(modalTitle);
        $('#ng-confirm-icon').text(icon);
        $('#ng-confirm-message').text(message);

        var $okBtn = $('#ng-confirm-ok-btn').show().text('Entendido');
        var $cancelBtn = $('#ng-confirm-cancel-btn').hide();

        if (type === 'error') {
            $okBtn.removeClass('btn-ng-primary').addClass('btn-ng-danger');
        } else {
            $okBtn.removeClass('btn-ng-danger').addClass('btn-ng-primary');
        }

        $okBtn.off('click');
        $cancelBtn.off('click');

        function closeModal() {
            $modal.stop(true, true).fadeOut(150);
        }

        $okBtn.on('click', function () {
            closeModal();
            if (typeof onOk === 'function') {
                onOk();
            }
        });

        $modal.css({ display: 'flex', opacity: 0 }).stop(true, true).fadeTo(200, 1);
    }

    // Exponer globalmente y neutralizar cualquier llamada nativa a window.alert o window.confirm
    window.nexaguardToast = showToast;
    window.nexaguardConfirm = showConfirm;
    window.nexaguardAlert = showAlert;
    window.alert = function (msg) {
        showAlert(msg, 'warning', 'Aviso de NexaGuard');
    };
    var alert = function (msg, type, title) {
        showAlert(msg, type || 'error', title);
    };

    // ============ SISTEMA DE PESTAÑAS (TABS) ============
    function switchTab(target) {
        if (!target || !$('#tab-' + target).length) return;
        $('.ng-tab').removeClass('is-active');
        $('.ng-tab-panel').removeClass('is-active');
        $('.ng-tab[data-tab="' + target + '"]').addClass('is-active');
        $('#tab-' + target).addClass('is-active');
        try { sessionStorage.setItem('nexaguard_active_tab', target); } catch(e) {}

        if (target === 'vigilance') {
            if (typeof startRadarTerminalStream === 'function' && $('#vigilance-radar-box').hasClass('radar-scanning')) {
                startRadarTerminalStream();
            } else if (typeof fetchAndRenderRealThreatLogs === 'function') {
                fetchAndRenderRealThreatLogs();
            }
        }
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
                        showAlert(res.data && res.data.message ? res.data.message : 'Error durante el análisis.', 'error', 'Error de Escaneo');
                    }
                }, 500);
            },
            error: function () {
                clearInterval(timer);
                $progBox.slideUp();
                $btn.prop('disabled', false).text('⚡ Iniciar Análisis Forense');
                showAlert('No se pudo completar la conexión con el servidor durante el escaneo.', 'error', 'Fallo de Conexión');
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
                showAlert('No se pudo resetear el historial de auditoría.', 'error', 'Error');
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
            showToast('El análisis forense detectó ' + d.threats_count + ' amenaza(s) activas que requieren desinfección o cuarentena.', 'warning', 'Amenazas Detectadas');
        } else {
            $card.removeClass('status-danger').addClass('status-clean');
            $('#status-icon').text('✓');
            $('#status-heading').text('Sistema 100% limpio y protegido');
            $('#threats-badge').removeClass('danger').addClass('ok').text('0 hallazgos');
            showToast('Auditoría completada: No se encontraron archivos infectados ni anomalías en tu sitio web.', 'success', 'Sistema 100% Limpio');
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

        showConfirm(
            '¿Forzar la eliminación definitiva de esta amenaza? NexaGuard desbloqueará permisos y destruirá el archivo.',
            function () {
                if (!nexaguardData.is_pro) {
                    showToast('Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para forzar la eliminación de amenazas.', 'warning', 'Acción Restringida');
                    openActionBlockedModal();
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
                            showToast('Archivo malicioso destruido con éxito.', 'success', 'Amenaza Neutralizada');
                        } else {
                            $btn.prop('disabled', false).text('Reintentar');
                            if (res.data && res.data.code === 'pro_required') {
                                showToast(res.data.message || 'Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para eliminar amenazas.', 'warning', 'Acción Restringida');
                                openActionBlockedModal();
                            } else {
                                showAlert(res.data && res.data.message ? res.data.message : 'Error al eliminar el archivo.', 'error', 'Error al Eliminar');
                            }
                        }
                    },
                    error: function () {
                        $btn.prop('disabled', false).text('Reintentar');
                        showAlert('Error de conexión con el servidor al eliminar el archivo.', 'error', 'Fallo de Red');
                    }
                });
            },
            null,
            { title: 'Destrucción Forzada', icon: '🗑️', btnOkText: 'Destruir Archivo', danger: true }
        );
    });

    // 4. Destruir Carpeta Completa del Plugin Malicioso
    $(document).on('click', '.btn-delete-plugin-folder', function () {
        var $btn = $(this);
        var target = $btn.data('target');

        showConfirm(
            '¿Estás seguro de destruir la carpeta completa del plugin malicioso? Esta acción eliminará todo el plugin troyano.',
            function () {
                if (!nexaguardData.is_pro) {
                    showToast('Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para destruir carpetas de plugins maliciosos.', 'warning', 'Acción Restringida');
                    openActionBlockedModal();
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
                            showToast(res.data && res.data.message ? res.data.message : 'Plugin destruido con éxito.', 'success', 'Carpeta Erradicada');
                        } else {
                            $btn.prop('disabled', false).text('Reintentar');
                            if (res.data && res.data.code === 'pro_required') {
                                showToast(res.data.message || 'Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para eliminar plugins maliciosos.', 'warning', 'Acción Restringida');
                                openActionBlockedModal();
                            } else {
                                showAlert(res.data && res.data.message ? res.data.message : 'Error al eliminar carpeta del plugin.', 'error', 'Error al Eliminar');
                            }
                        }
                    },
                    error: function () {
                        $btn.prop('disabled', false).text('Reintentar');
                        showAlert('Error de conexión con el servidor al eliminar la carpeta.', 'error', 'Fallo de Red');
                    }
                });
            },
            null,
            { title: 'Destruir Plugin Malicioso', icon: '💣', btnOkText: 'Destruir Carpeta', danger: true }
        );
    });

    // 5. Limpiar / Erradicar Amenaza
    $(document).on('click', '.btn-clean-threat', function () {
        var $btn = $(this);
        var type = $btn.data('type');
        var target = $btn.data('target');
        var id = $btn.data('id');

        var confirmMsg = '¿Deseas desinfectar este archivo? Se extirpará únicamente el código malicioso inyectado y se creará una copia de seguridad automática antes de guardar.';
        var confirmTitle = 'Desinfección Forense';
        var confirmIcon = '🛡️';
        var confirmOk = 'Desinfectar Ahora';

        if (type === 'restore_core_file') {
            confirmMsg = '¿Deseas restaurar este archivo oficial descargándolo directamente desde WordPress.org? Se creará una copia de seguridad antes de sustituirlo.';
            confirmTitle = 'Restaurar Core de WordPress';
            confirmIcon = '🏛️';
            confirmOk = 'Restaurar de WP.org';
        } else if (type === 'delete_db_option') {
            confirmMsg = '¿Estás seguro de que deseas purgar y eliminar definitivamente esta clave de la base de datos?';
            confirmTitle = 'Purgar Registro MySQL';
            confirmIcon = '🗄️';
            confirmOk = 'Eliminar Registro';
        } else if (type === 'remove_cron_hook') {
            confirmMsg = '¿Deseas remover esta tarea programada (cron) de la base de datos?';
            confirmTitle = 'Remover Tarea C&C WP-Cron';
            confirmIcon = '⏱️';
            confirmOk = 'Remover Tarea';
        } else if (type === 'downgrade_user') {
            confirmMsg = '¿Deseas degradar los permisos de este usuario sospechoso a suscriptor?';
            confirmTitle = 'Revocar Privilegios Admin';
            confirmIcon = '👤';
            confirmOk = 'Degradar a Suscriptor';
        } else if (type === 'apply_disallow_file_edit') {
            confirmMsg = '¿Deseas aplicar el blindaje en wp-config.php para deshabilitar la edición de temas y plugins desde el panel de WordPress?';
            confirmTitle = 'Blindar Editor PHP';
            confirmIcon = '🔒';
            confirmOk = 'Aplicar Blindaje';
        } else if (type === 'apply_htaccess_no_indexes') {
            confirmMsg = '¿Deseas aplicar "Options -Indexes" en .htaccess para evitar que se puedan listar directorios en tu servidor?';
            confirmTitle = 'Bloquear Listado Apache';
            confirmIcon = '📁';
            confirmOk = 'Proteger Directorios';
        } else if (type === 'protect_uploads_directory') {
            confirmMsg = '¿Deseas aplicar el blindaje contra ejecución de scripts PHP en la carpeta de medios (uploads) y en el archivo .htaccess principal de WordPress?';
            confirmTitle = 'Bloquear PHP en Uploads';
            confirmIcon = '🛡️';
            confirmOk = 'Aplicar Blindaje';
        } else if (type === 'regenerate_wp_salts') {
            confirmMsg = '¿Deseas regenerar todas las claves y sales criptográficas en wp-config.php? Esto invalidará de inmediato todas las sesiones y cookies secuestradas por atacantes.';
            confirmTitle = 'Regenerar Sales de Seguridad';
            confirmIcon = '🔑';
            confirmOk = 'Regenerar Sales';
        }

        showConfirm(
            confirmMsg,
            function () {
                if (!nexaguardData.is_pro) {
                    showToast('Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para desinfectar y erradicar amenazas.', 'warning', 'Acción Restringida');
                    openActionBlockedModal();
                    return;
                }

                var loadingLabel = (type === 'restore_core_file') ? 'Restaurando desde WP.org…' : (type === 'delete_db_option' ? 'Purgando…' : (type.indexOf('apply_') !== -1 || type.indexOf('protect_') !== -1 || type === 'regenerate_wp_salts' ? 'Aplicando…' : 'Desinfectando…'));
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
                                var successMsg = (type === 'restore_core_file') ? '✓ Archivo oficial de WordPress.org restaurado' : (type === 'protect_uploads_directory' || type.indexOf('apply_') !== -1 ? '✓ Blindaje .htaccess aplicado con éxito' : '✓ Desinfección completada con éxito');
                                $('#threat-' + id).css('border-left-color', '#3de8a4').find('.threat-actions').html('<span style="color:#3de8a4;font-weight:700">' + successMsg + '</span>');
                                setTimeout(function () {
                                    $('#threat-' + id).fadeOut(400, function () {
                                        $(this).remove();
                                        updateThreatCounts();
                                    });
                                }, 1800);
                            }
                            showToast(res.data && res.data.message ? res.data.message : 'Acción completada con éxito.', 'success', 'Operación Completada');
                        } else {
                            $btn.prop('disabled', false).text('Reintentar');
                            if (res.data && res.data.code === 'pro_required') {
                                showToast(res.data.message || 'Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para desinfectar amenazas.', 'warning', 'Acción Restringida');
                                openActionBlockedModal();
                            } else {
                                showAlert(res.data && res.data.message ? res.data.message : 'Error al limpiar la amenaza.', 'error', 'Error al Limpiar');
                            }
                        }
                    },
                    error: function () {
                        $btn.prop('disabled', false).text('Reintentar');
                        showAlert('Error de conexión con el servidor al intentar limpiar el archivo.', 'error', 'Fallo de Red');
                    }
                });
            },
            null,
            { title: confirmTitle, icon: confirmIcon, btnOkText: confirmOk }
        );
    });

    // 5.1 Reparación y Blindaje Automático con 1 Clic (Auto-Remediate All)
    $(document).on('click', '#btn-auto-remediate-all', function () {
        var $btn = $(this);

        showConfirm(
            '¿Deseas que NexaGuard limpie, repare y blinde automáticamente todo tu sitio web de forma 100% segura?\n\n✓ Los archivos del sistema se restaurarán limpios desde WordPress.org.\n✓ Los virus en plugins se extirparán sin romper tus extensiones.\n✓ Se aplicarán los blindajes preventivos de servidor.\n✓ Se guardan copias de respaldo de cada archivo intervenido.',
            function () {
                if (!nexaguardData.is_pro) {
                    showToast('Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para la remediación y blindaje automático.', 'warning', 'Acción Restringida');
                    openActionBlockedModal();
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
                            showToast('Todas las amenazas detectadas fueron neutralizadas y blindadas con éxito.', 'success', 'Remediación Exitosa');
                        } else {
                            $btn.prop('disabled', false).html('⚡ LIMPIAR Y BLINDAR SITIO CON 1 CLIC');
                            if (res.data && res.data.code === 'pro_required') {
                                showToast(res.data.message || 'Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para reparar tu sitio.', 'warning', 'Acción Restringida');
                                openActionBlockedModal();
                            } else {
                                showAlert(res.data && res.data.message ? res.data.message : 'Error durante la reparación automática.', 'error', 'Error');
                            }
                        }
                    },
                    error: function () {
                        $btn.prop('disabled', false).html('⚡ LIMPIAR Y BLINDAR SITIO CON 1 CLIC');
                        showAlert('Error de conexión con el servidor durante el proceso de remediación.', 'error', 'Fallo de Red');
                    }
                });
            },
            null,
            { title: 'Remediación Total con 1 Clic', icon: '⚡', btnOkText: 'Limpiar y Blindar Web' }
        );
    });

    // 6. Mover a Cuarentena
    $(document).on('click', '.btn-quarantine-file', function () {
        var $btn = $(this);
        var file = $btn.data('file');
        var id = $btn.data('id');

        showConfirm(
            '¿Mover este archivo malicioso a la cuarentena segura aislada con permisos restringidos (Deny From All)?',
            function () {
                if (!nexaguardData.is_pro) {
                    showToast('Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para mover archivos a cuarentena.', 'warning', 'Acción Restringida');
                    openActionBlockedModal();
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
                                $qTab.append('<span class="ng-tab-badge ok">' + qCount + '</span>');
                            }
                            showToast('El archivo ha sido neutralizado y trasladado a la bóveda de cuarentena protegida.', 'success', 'Archivo en Cuarentena');
                        } else {
                            $btn.prop('disabled', false).text('Reintentar');
                            if (res.data && res.data.code === 'pro_required') {
                                showToast(res.data.message || 'Función PRO requerida: Adquiere el Plan PRO ($9.99/mes) para aislar amenazas.', 'warning', 'Acción Restringida');
                                openActionBlockedModal();
                            } else {
                                showAlert(res.data && res.data.message ? res.data.message : 'Error al aislar el archivo.', 'error', 'Error en Cuarentena');
                            }
                        }
                    },
                    error: function () {
                        $btn.prop('disabled', false).text('Reintentar');
                        showAlert('Error de conexión con el servidor al aislar el archivo.', 'error', 'Fallo de Red');
                    }
                });
            },
            null,
            { title: 'Aislamiento de Seguridad', icon: '☣️', btnOkText: 'Enviar a Cuarentena', danger: true }
        );
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
                    showToast('Elemento añadido a la lista de permitidos.', 'success', 'Regla Guardada');
                } else {
                    $btn.prop('disabled', false).text('Reintentar');
                    showAlert('No se pudo añadir a la lista de permitidos.', 'error', 'Error');
                }
            },
            error: function () {
                $btn.prop('disabled', false).text('Reintentar');
                showAlert('Error de conexión con el servidor al actualizar la lista.', 'error', 'Fallo de Red');
            }
        });
    });

    // 8. Restaurar de Cuarentena
    $(document).on('click', '.btn-restore-file', function () {
        var $btn = $(this);
        var qid = $btn.data('id');

        showConfirm(
            '¿Restaurar este archivo a su ubicación original en el servidor?',
            function () {
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
                            showToast('Archivo restaurado a su ubicación original.', 'success', 'Restauración Exitosa');
                        } else {
                            $btn.prop('disabled', false).text('Restaurar');
                            showAlert(res.data && res.data.message ? res.data.message : 'Error al restaurar el archivo.', 'error', 'Error al Restaurar');
                        }
                    },
                    error: function () {
                        $btn.prop('disabled', false).text('Restaurar');
                        showAlert('Error de conexión con el servidor al restaurar.', 'error', 'Fallo de Red');
                    }
                });
            },
            null,
            { title: 'Restaurar Archivo', icon: '↩️', btnOkText: 'Restaurar' }
        );
    });

    // 8.1 Revertir Snapshot / Rollback en 1 Clic
    $(document).on('click', '.btn-revert-snapshot', function () {
        var $btn = $(this);
        var snapshotId = $btn.data('id');
        var fileName = $btn.data('file');

        showConfirm(
            '¿Deseas revertir este archivo (' + fileName + ') a su estado exacto anterior a la desinfección? Se recuperará el archivo original que tenías antes.',
            function () {
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
                            showToast(res.data && res.data.message ? res.data.message : 'Archivo restaurado con éxito a su estado previo.', 'success', 'Reversión Completada');
                        } else {
                            $btn.prop('disabled', false).text('↩️ Revertir (Deshacer)');
                            showAlert(res.data && res.data.message ? res.data.message : 'Error al revertir el archivo.', 'error', 'Error al Revertir');
                        }
                    },
                    error: function () {
                        $btn.prop('disabled', false).text('↩️ Revertir (Deshacer)');
                        showAlert('Error de conexión con el servidor al revertir el respaldo.', 'error', 'Fallo de Red');
                    }
                });
            },
            null,
            { title: 'Reversión Instantánea', icon: '↩️', btnOkText: 'Revertir a Respaldo' }
        );
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
                    showToast('Las reglas del Cortafuegos WAF y blindaje perimetral han sido guardadas y activadas en el servidor.', 'success', 'Blindaje WAF Actualizado');
                    setTimeout(function () { $msg.fadeOut(function () { $(this).text('').show(); }); }, 3500);
                } else {
                    $msg.text('Error al guardar.').css('color', '#ff8ba0');
                    showToast('No se pudieron aplicar las reglas de blindaje.', 'error', 'Error de Configuración');
                }
            },
            error: function () {
                $msg.text('Error de conexión.').css('color', '#ff8ba0');
                showToast('Error de conexión con el servidor al guardar el WAF.', 'error', 'Error de Red');
            }
        });
    });

    // Funciones auxiliares para apertura/cierre confiable de modales
    window.nexaguardOpenUpgradeModal = function () {
        var $modal = $('#clean-upgrade-modal');
        if (!$modal.length) return;
        if (!$modal.parent().is('body')) {
            $modal.appendTo('body');
        }
        $modal.css({ display: 'flex', opacity: 0 }).stop(true, true).fadeTo(200, 1);
    };

    window.nexaguardCloseUpgradeModal = function () {
        $('#clean-upgrade-modal').stop(true, true).fadeOut(150);
    };

    window.nexaguardOpenActionBlockedModal = function () {
        var $modal = $('#nexaguard-action-blocked-modal');
        if (!$modal.length) {
            window.nexaguardOpenUpgradeModal();
            return;
        }
        if (!$modal.parent().is('body')) {
            $modal.appendTo('body');
        }
        $modal.css({ display: 'flex', opacity: 0 }).stop(true, true).fadeTo(200, 1);
    };

    window.nexaguardCloseActionBlockedModal = function () {
        $('#nexaguard-action-blocked-modal').stop(true, true).fadeOut(150);
    };

    window.nexaguardOpenLicenseModal = function (msg) {
        var $modal = $('#license-modal');
        if (!$modal.length) return;
        if (!$modal.parent().is('body')) {
            $modal.appendTo('body');
        }
        var $msg = $('#license-modal-msg');
        if (msg) {
            $msg.text(msg).css('color', '#ffcf33');
        } else {
            $msg.text('');
        }
        $modal.css({ display: 'flex', opacity: 0 }).stop(true, true).fadeTo(200, 1);
    };

    window.nexaguardCloseLicenseModal = function () {
        $('#license-modal').stop(true, true).fadeOut(150);
    };

    var openUpgradeModal = window.nexaguardOpenUpgradeModal;
    var closeUpgradeModal = window.nexaguardCloseUpgradeModal;
    var openActionBlockedModal = window.nexaguardOpenActionBlockedModal;
    var closeActionBlockedModal = window.nexaguardCloseActionBlockedModal;
    var openLicenseModal = window.nexaguardOpenLicenseModal;
    var closeLicenseModal = window.nexaguardCloseLicenseModal;

    // Interceptar clicks en WAF cuando no es PRO
    $(document).on('click', '#btn-locked-waf-submit, .btn-locked-waf-submit, .waf-locked-container, .waf-locked-container label, .btn-open-upgrade-modal, [class*="btn-locked-waf"]', function (e) {
        if (!nexaguardData.is_pro) {
            e.preventDefault();
            e.stopPropagation();
            window.nexaguardOpenUpgradeModal();
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
            startRadarTerminalStream();
        } else {
            $btn.removeClass('is-active').attr('data-active', '0');
            $('#v-toggle-label').text('ACTIVAR VIGILANCIA 24H');
            $('#vigilance-radar-box').removeClass('radar-scanning').addClass('radar-paused');
            $('#radar-status-text').html('⏸️ Sistema de vigilancia en pausa. Actívalo para proteger tu web.');
            $('#radar-status-sub').text('Haz clic en el botón superior para activar el radar perimetral permanente.');
            stopRadarTerminalStream();
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
            e.stopPropagation();
            openUpgradeModal();
            return false;
        }
    });

    /* =========================================================================
     * CONSOLA HACKER & LIVE TELEMETRY RADAR STREAM
     * ========================================================================= */
    var radarStreamTimer = null;
    var displayedThreatIds = {};

    var patrolTelemetryPool = [
        { type: 'telemetry', text: 'PERIMETER SWEEP: Inspecting PHP core integrity against WordPress.org API... [0 TAMPERING]' },
        { type: 'telemetry', text: 'WAF ENGINE: Monitoring /wp-comments-post.php against Comment2Shell (CVE-2026-93485)... [ARMED]' },
        { type: 'telemetry', text: 'HEURISTIC SENSOR: Watching wp-content/uploads/ for unauthorized .php execution... [LOCKED]' },
        { type: 'warn',      text: 'TRAFFIC PROBE: Inspecting incoming User-Agent strings for Kali Linux scanner signatures...' },
        { type: 'telemetry', text: 'BLOCKCHAIN MONITOR: Scanning RPC nodes for EtherHiding / ClearFake C2 traffic... [SECURE]' },
        { type: 'telemetry', text: 'SQL INJECTION SHIELD: Validating dynamic query statements across active plugins... [CLEAN]' },
        { type: 'warn',      text: 'BOTNET RADAR: Analyzing request rate velocity from unverified IP subnets... [NORMAL]' },
        { type: 'telemetry', text: 'RUNTIME DEFENSE: Verifying memory hooks in wp-settings.php and mu-plugins... [PASS]' },
        { type: 'telemetry', text: 'DATABASE INTEGRITY: Monitoring wp_options table for serialized payload injection... [VERIFIED]' },
        { type: 'warn',      text: 'DIRECTORY GUARD: Enforcing Options -Indexes on Apache/LiteSpeed web server... [PROTECTED]' }
    ];

    /* =========================================================================
     * SISTEMA DE ALARMA HOSPITALARIA (4S) Y VOZ SINTÉTICA ESTILO AVAST
     * ========================================================================= */
    var radarSoundEnabled = localStorage.getItem('nexaguard_radar_sound') !== '0';
    var isInitialRadarLoad = true;

    function playHospitalCyberAlarm(durationSeconds) {
        if (!radarSoundEnabled) return;
        durationSeconds = durationSeconds || 4.0;

        try {
            var AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            var ctx = new AudioContextClass();

            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            var masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
            masterGain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.05);
            masterGain.connect(ctx.destination);

            // Filtro para sonido clínico/electrónico de alta urgencia
            var filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1400, ctx.currentTime);
            filter.connect(masterGain);

            var osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.connect(filter);

            // Alternancia rítmica de 2 tonos de alarma médica/perimetral: 920Hz y 680Hz cada 250ms
            var now = ctx.currentTime;
            var step = 0.25;
            var totalSteps = Math.floor(durationSeconds / step);
            for (var i = 0; i < totalSteps; i++) {
                var t = now + (i * step);
                var freq = (i % 2 === 0) ? 920 : 680;
                osc.frequency.setValueAtTime(freq, t);
            }

            // Desvanecimiento suave en los últimos milisegundos de los 4 segundos
            masterGain.gain.setValueAtTime(0.35, now + durationSeconds - 0.2);
            masterGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

            osc.start(now);
            osc.stop(now + durationSeconds + 0.05);

            setTimeout(function () {
                try { ctx.close(); } catch (e) {}
            }, (durationSeconds + 0.3) * 1000);
        } catch (e) {
            console.warn('AudioContext alarm error:', e);
        }
    }

    function speakThreatAlert(reason) {
        if (!radarSoundEnabled || !window.speechSynthesis) return;

        try {
            window.speechSynthesis.cancel();

            var cleanReason = (reason || 'Ataque malicioso')
                .replace(/\[.*?\]/g, '')
                .replace(/HTTP\s*\d+/gi, '')
                .trim();

            var text = '¡Alerta NexaGuard! Amenaza detectada: ' + cleanReason + '. Intrusión bloqueada.';
            var utter = new SpeechSynthesisUtterance(text);
            utter.lang = 'es-ES';
            utter.rate = 1.05;
            utter.pitch = 0.95;
            utter.volume = 1.0;

            var voices = window.speechSynthesis.getVoices();
            for (var i = 0; i < voices.length; i++) {
                if (voices[i].lang && voices[i].lang.toLowerCase().indexOf('es') === 0) {
                    utter.voice = voices[i];
                    break;
                }
            }

            // Iniciar locución a los 650ms para que la sirena suene primero
            setTimeout(function () {
                try {
                    window.speechSynthesis.speak(utter);
                } catch (err) {}
            }, 650);
        } catch (e) {
            console.warn('SpeechSynthesis error:', e);
        }
    }

    function triggerIntrusionAlert(log) {
        // 1. Sirena electrónica hospitalaria por 4 segundos
        playHospitalCyberAlarm(4.0);

        // 2. Voz sintética estilo Avast anunciando la amenaza
        speakThreatAlert(log.reason);

        // 3. Parpadeo de emergencia rojo en la pantalla de la terminal
        var $screen = $('#hacker-radar-screen');
        $screen.addClass('terminal-alarm-flash');
        setTimeout(function () {
            $screen.removeClass('terminal-alarm-flash');
        }, 4000);

        // 4. Notificación flotante de seguridad
        showToast(
            'IP ' + log.ip + ' intentó: ' + log.reason + ' (' + (log.tool_tag || 'HTTP 403') + ')',
            'error',
            '🚨 INTRUSIÓN INTERCEPTADA'
        );
    }

    function appendTerminalLine(htmlClass, text) {
        var $inner = $('#terminal-stream-inner');
        var $screen = $('#hacker-radar-screen');
        if (!$inner.length) return;

        var now = new Date();
        var timeStr = now.toTimeString().split(' ')[0];
        var prefix = '[' + timeStr + '] ';

        var $line = $('<div class="term-line ' + htmlClass + '"></div>');
        $line.html(prefix + text);

        $inner.append($line);

        // Limitar a las últimas 120 líneas en el DOM para rendimiento óptimo
        var $lines = $inner.find('.term-line');
        if ($lines.length > 120) {
            $lines.slice(0, $lines.length - 120).remove();
        }

        // Auto-scroll fluido hacia el final para efecto de terminal hacker
        $screen.stop().animate({ scrollTop: $screen[0].scrollHeight }, 180);
    }

    function fetchAndRenderRealThreatLogs() {
        if (!nexaguardData || !nexaguardData.ajax_url) return;
        $.ajax({
            url: nexaguardData.ajax_url,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'nexaguard_get_radar_logs',
                nonce: nexaguardData.nonce
            },
            success: function (res) {
                if (res && res.success && res.data && res.data.logs) {
                    var logs = res.data.logs;
                    var threatCount = logs.length;
                    $('#terminal-threat-count').text(threatCount);

                    var newThreatToAlert = null;

                    // Recorrer los registros de ataques reales y mostrarlos
                    for (var i = logs.length - 1; i >= 0; i--) {
                        var log = logs[i];
                        if (!displayedThreatIds[log.id]) {
                            displayedThreatIds[log.id] = true;

                            var kaliBadge = '';
                            if (log.tool_tag && log.tool_tag.indexOf('Kali Linux') !== -1) {
                                kaliBadge = '<span class="term-tag-kali">KALI LINUX DETECTED</span> ';
                            } else if (log.tool_tag) {
                                kaliBadge = '<span class="term-tag-kali" style="background:#ffbd2e;color:#000;">' + log.tool_tag + '</span> ';
                            }

                            var attackHtml = kaliBadge +
                                '<strong>🚨 [ATAQUE INTERCEPTADO ' + (log.status || 403) + ']</strong> ' +
                                'IP: ' + log.ip + ' | Motivo: ' + log.reason + ' | Solicitud: ' + log.method + ' ' + log.uri;

                            appendTerminalLine('term-blocked', attackHtml);

                            if (!isInitialRadarLoad) {
                                newThreatToAlert = log;
                            }
                        }
                    }

                    // Si no es la carga inicial y se detectó un nuevo ataque en vivo: ¡disparar alarma y voz!
                    if (!isInitialRadarLoad && newThreatToAlert) {
                        triggerIntrusionAlert(newThreatToAlert);
                    }

                    isInitialRadarLoad = false;
                }
            }
        });
    }

    function startRadarTerminalStream() {
        if (radarStreamTimer) return;

        appendTerminalLine('term-system', '[RADAR ACTIVE] Sistema táctico de telemetría en vivo iniciado. Escaneando frecuencias de red...');
        $('#terminal-typing-status').text('monitoreando y patrullando perímetros de red en tiempo real...');

        // Consultar ataques reales inmediatamente
        fetchAndRenderRealThreatLogs();

        var patrolIndex = 0;
        radarStreamTimer = setInterval(function () {
            var item = patrolTelemetryPool[patrolIndex % patrolTelemetryPool.length];
            patrolIndex++;
            appendTerminalLine(item.type === 'warn' ? 'term-warn' : 'term-telemetry', item.text);

            // Cada 4 ciclos verificar si entraron nuevos ataques reales
            if (patrolIndex % 4 === 0) {
                fetchAndRenderRealThreatLogs();
            }
        }, 2500);
    }

    function stopRadarTerminalStream() {
        if (radarStreamTimer) {
            clearInterval(radarStreamTimer);
            radarStreamTimer = null;
        }
        appendTerminalLine('term-dim', '[RADAR STANDBY] Telemetría en pausa por el operador. Sensores perimetrales en espera.');
        $('#terminal-typing-status').text('en espera. Activa el radar para patrullar.');
    }

    // Limpiar terminal con modal animado NexaGuard (sin alerts nativos)
    $(document).on('click', '#btn-clear-terminal-logs', function (e) {
        e.preventDefault();
        showConfirm(
            '¿Deseas vaciar el registro visual de ataques detectados y reiniciar la consola de telemetría?',
            function () {
                $.ajax({
                    url: nexaguardData.ajax_url,
                    type: 'POST',
                    data: {
                        action: 'nexaguard_clear_radar_logs',
                        nonce: nexaguardData.nonce
                    },
                    success: function () {
                        $('#terminal-stream-inner').html('<div class="term-line term-system">[TERMINAL RESET] Registro vaciado por el operador. Sensores restablecidos.</div>');
                        $('#terminal-threat-count').text('0');
                        displayedThreatIds = {};
                        showToast('Registro de telemetría y consola vaciados correctamente.', 'success', 'Terminal Reiniciada');
                    },
                    error: function () {
                        showAlert('No se pudo vaciar el registro en el servidor.', 'error', 'Error');
                    }
                });
            },
            null,
            {
                title: 'Vaciar Telemetría del Radar',
                icon: '🗑️',
                btnOkText: 'Sí, vaciar',
                btnCancelText: 'Cancelar',
                danger: true
            }
        );
    });

    // Control de Alarma Sonora y Voz
    $(document).on('click', '#btn-toggle-radar-sound', function (e) {
        e.preventDefault();
        radarSoundEnabled = !radarSoundEnabled;
        localStorage.setItem('nexaguard_radar_sound', radarSoundEnabled ? '1' : '0');

        if (radarSoundEnabled) {
            $(this).html('🔊 Alarma & Voz: ON').css({ color: '#ffcf33', borderColor: 'rgba(255,207,51,0.35)', background: 'rgba(255,207,51,0.1)' });
            showToast('Alarma sonora y locución Avast activadas para nuevas amenazas.', 'info', 'Sonido Habilitado');
        } else {
            $(this).html('🔇 Silenciado').css({ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.08)' });
            showToast('Alarma sonora y locución silenciadas.', 'info', 'Sonido Silenciado');
        }
    });

    // Botón para probar la sirena de 4 segundos y la voz sintética
    $(document).on('click', '#btn-test-radar-sound', function (e) {
        e.preventDefault();
        triggerIntrusionAlert({
            ip: '192.168.1.105',
            reason: 'Inyección SQL Maliciosa y Payload Kali Linux',
            tool_tag: 'Kali Linux [SQLMap Scanner]'
        });
    });

    // Inicializar estado del botón de sonido según preferencia guardada
    if (!radarSoundEnabled) {
        $('#btn-toggle-radar-sound').html('🔇 Silenciado').css({ color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)', background: 'rgba(148,163,184,0.08)' });
    }

    // Auto-iniciar telemetría si el radar ya está activo al cargar
    if ($('#vigilance-radar-box').hasClass('radar-scanning')) {
        startRadarTerminalStream();
    } else {
        fetchAndRenderRealThreatLogs();
    }

    // Monitoreo periódico en segundo plano si la pestaña de vigilancia está abierta
    setInterval(function () {
        if ($('#tab-vigilance').hasClass('is-active')) {
            fetchAndRenderRealThreatLogs();
        }
    }, 8000);

    // ============ GESTIÓN DE LICENCIA PRO ============
    $('#btn-edit-license').on('click', function (e) {
        e.preventDefault();
        openLicenseModal();
    });

    $(document).on('click', '.btn-vigilance-locked, .btn-open-lic-modal', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeUpgradeModal();
        openLicenseModal('Ingresa tu clave de licencia oficial del Plan Security PRO para desbloquear el radar 24h y el blindaje WAF.');
    });

    $('#btn-unlink-license').on('click', function (e) {
        e.preventDefault();
        showConfirm(
            '¿Deseas desvincular la licencia de este WordPress y regresar a la Edición Estándar?',
            function () {
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
            },
            null,
            { title: 'Desvincular Licencia', icon: '🔑', btnOkText: 'Desvincular', danger: true }
        );
    });

    $('#btn-close-license').on('click', function (e) {
        e.preventDefault();
        closeLicenseModal();
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

    // ============ MODAL DE UPGRADE / PLAN PRO ============
    $(document).on('click', '.btn-locked-clean, .btn-open-clean-modal', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openUpgradeModal();
    });

    $('#btn-close-action-blocked').on('click', function (e) {
        e.preventDefault();
        closeActionBlockedModal();
    });

    $('#btn-close-clean-modal').on('click', function (e) {
        e.preventDefault();
        closeUpgradeModal();
    });

    $(document).on('click', '.btn-switch-to-key', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeUpgradeModal();
        closeActionBlockedModal();
        openLicenseModal('Introduce tu clave de licencia del Plan PRO:');
    });

    // Cerrar modales al hacer clic en el fondo oscuro exterior
    $(document).on('click', '.ng-modal', function (e) {
        if (e.target === this) {
            closeUpgradeModal();
            closeActionBlockedModal();
            closeLicenseModal();
        }
    });

    // Cerrar modales con tecla ESC
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
            closeUpgradeModal();
            closeActionBlockedModal();
            closeLicenseModal();
        }
    });

    // ============ PERSONALIZADOR Y EMBELLECEDOR DE LOGIN ============
    // Selector de Medios de WordPress para Fondo
    $(document).on('click', '#btn-select-login-bg', function (e) {
        e.preventDefault();
        if (typeof wp === 'undefined' || !wp.media) {
            showAlert('La biblioteca de medios de WordPress no está disponible en este momento. Puedes ingresar la URL directamente.', 'warning', 'Biblioteca de Medios');
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
            showAlert('La biblioteca de medios de WordPress no está disponible en este momento. Puedes ingresar la URL directamente.', 'warning', 'Biblioteca de Medios');
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

    /* =========================================================================
     * AUTO-ACTUALIZADOR DE NEXAGUARD (COMPROBACIÓN Y UPGRADE EN VIVO)
     * ========================================================================= */
    $(document).on('click', '#btn-check-plugin-update', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var $status = $('#update-check-status');
        var ngData = window.nexaguardData || window.nexaguard_data || {};

        if (!ngData.ajax_url) {
            $status.html('<span style="color:#ef4444;">Error: Parámetros de WordPress no encontrados.</span>');
            return;
        }

        $btn.prop('disabled', true);
        $status.html('<span style="color:#b6c4eb;">Buscando versión remota en GitHub...</span>');

        $.ajax({
            url: ngData.ajax_url,
            type: 'POST',
            dataType: 'json',
            timeout: 15000,
            data: {
                action: 'nexaguard_check_update',
                nonce: ngData.nonce
            },
            success: function (res) {
                $btn.prop('disabled', false);

                if (res && res.success && res.data) {
                    if (res.data.has_update) {
                        $status.html(
                            '<span style="color:#ffcf33; font-weight:700;">⚡ ¡Nueva versión v' + res.data.remote_version + ' disponible!</span> ' +
                            '<button type="button" id="btn-do-plugin-update" class="btn-ng btn-ng-primary" style="padding:4px 12px; font-size:0.75rem; margin-left:8px; font-weight:700; cursor:pointer;">' +
                            'Actualizar ahora' +
                            '</button>'
                        );
                    } else {
                        $status.html(
                            '<span style="color:#10b981; font-weight:600;">✓ ' + res.data.message + '</span> ' +
                            '<button type="button" id="btn-do-plugin-update" class="btn-ng btn-ng-outline" style="padding:2px 8px; font-size:0.72rem; margin-left:6px; cursor:pointer; color:#b6c4eb; border:1px solid rgba(255,255,255,0.2);" title="Reinstalar o sincronizar con los últimos cambios de GitHub">' +
                            '🔄 Reinstalar / Sincronizar' +
                            '</button>'
                        );
                    }
                } else {
                    var err = (res && res.data && res.data.message) ? res.data.message : 'Error al consultar actualizaciones.';
                    $status.html('<span style="color:#ef4444;">' + err + '</span>');
                }
            },
            error: function (xhr, status, error) {
                $btn.prop('disabled', false);
                var detail = '';
                if (xhr && xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message) {
                    detail = xhr.responseJSON.data.message;
                } else if (xhr && xhr.responseText && xhr.responseText.length < 150) {
                    detail = xhr.responseText;
                } else {
                    detail = error || status || 'Tiempo de espera agotado';
                }
                $status.html('<span style="color:#ef4444;">Error al comprobar (' + detail + ').</span>');
            }
        });
    });

    $(document).on('click', '#btn-do-plugin-update', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var $status = $('#update-check-status');
        var ngData = window.nexaguardData || window.nexaguard_data || {};

        showConfirm(
            '¿Deseas sincronizar y actualizar NexaGuard Security con los archivos más recientes de GitHub?\n\n✓ Se actualizará el núcleo de blindaje, la consola y las reglas WAF.\n✓ Tus ajustes y configuraciones se conservarán intactos.\n✓ No necesitas desinstalar ni volver a subir ningún archivo ZIP.',
            function () {
                $btn.prop('disabled', true).text('Actualizando...');
                $status.html('<span style="color:#ffcf33;">Descargando e instalando nueva versión desde GitHub...</span>');

                $.ajax({
                    url: ngData.ajax_url,
                    type: 'POST',
                    dataType: 'json',
                    timeout: 60000,
                    data: {
                        action: 'nexaguard_perform_update',
                        nonce: ngData.nonce
                    },
                    success: function (res) {
                        if (res && res.success && res.data) {
                            $status.html('<span style="color:#10b981; font-weight:700;">✓ ' + res.data.message + ' Recargando...</span>');
                            showToast(res.data.message, 'success', 'Actualización Exitosa');
                            setTimeout(function () {
                                location.reload();
                            }, 1800);
                        } else {
                            $btn.prop('disabled', false).text('Reintentar');
                            var err = (res && res.data && res.data.message) ? res.data.message : 'La actualización falló.';
                            $status.html('<span style="color:#ef4444;">' + err + '</span>');
                            showAlert(err, 'error', 'Error al Actualizar');
                        }
                    },
                    error: function (xhr, status, error) {
                        $btn.prop('disabled', false).text('Reintentar');
                        var detail = (xhr && xhr.responseJSON && xhr.responseJSON.data && xhr.responseJSON.data.message)
                            ? xhr.responseJSON.data.message
                            : (error || status || 'Error desconocido');
                        $status.html('<span style="color:#ef4444;">Error durante la actualización (' + detail + ').</span>');
                        showAlert('Error durante la actualización: ' + detail, 'error', 'Fallo de Red');
                    }
                });
            },
            null,
            {
                title: 'Actualizar NexaGuard Security',
                icon: '⚡',
                btnOkText: 'Actualizar ahora',
                btnCancelText: 'Cancelar'
            }
        );
    });
});
