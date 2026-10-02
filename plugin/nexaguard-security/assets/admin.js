/* NexaGuard Security - Admin JavaScript */
jQuery(document).ready(function ($) {
    'use strict';

    // 1. Iniciar Escaneo Forense
    $('#btn-start-scan').on('click', function () {
        var $btn = $(this);
        $btn.prop('disabled', true).text('⏳ Analizando archivos y base de datos…');

        var $progBox = $('#scan-progress-box').slideDown();
        var $progBar = $('#scan-progress-bar');
        var $progPct = $('#scan-progress-pct');
        var pct = 0;

        var timer = setInterval(function () {
            if (pct < 88) {
                pct += Math.floor(Math.random() * 8) + 3;
                $progBar.css('width', pct + '%');
                $progPct.text(pct + '%');
            }
        }, 300);

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

    function renderScanResults(d) {
        $('#kpi-threats').text(d.threats_count);
        $('#kpi-files').text(d.scanned_files);

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

        $('#status-desc').text('Último análisis: ahora mismo · ' + d.scanned_files + ' archivos auditados en ' + d.elapsed + 's.');

        var $list = $('#threats-list').empty();
        if (!d.threats || d.threats.length === 0) {
            $list.append('<div class="empty-state"><p>🛡️ No se encontraron amenazas. Tu instalación de WordPress está limpia.</p><small class="ng-hint">Mantén activo el Cortafuegos WAF para bloquear intrusiones en tiempo real.</small></div>');
            return;
        }

        d.threats.forEach(function (t) {
            var sevClass = t.severity === 'crit' ? 'crit' : 'warn';
            var sevLabel = t.severity === 'crit' ? 'CRÍTICO' : 'ADVERTENCIA';

            var actBtn = '';
            if (t.clean_action === 'sanitize_injection') {
                actBtn = '<button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clearfake" data-target="' + t.full_path + '" data-id="' + t.id + '">🧹 Erradicar Inyección y Reparar</button>';
            } else if (t.clean_action === 'quarantine') {
                actBtn = '<button type="button" class="btn-ng btn-ng-danger btn-quarantine-file" data-file="' + t.full_path + '" data-id="' + t.id + '">🔒 Mover a Cuarentena Segura</button>';
            } else if (t.clean_action === 'clean_db_option') {
                actBtn = '<button type="button" class="btn-ng btn-ng-action btn-clean-threat" data-type="clean_db_option" data-target="' + t.full_path + '" data-id="' + t.id + '">🗄️ Limpiar Opción de Base de Datos</button>';
            }

            var item = $('<div class="threat-item ' + sevClass + '" id="threat-' + t.id + '">' +
                '<div class="threat-header">' +
                    '<span class="sev-badge ' + sevClass + '">' + sevLabel + '</span>' +
                    '<h4>' + escapeHtml(t.title) + '</h4>' +
                '</div>' +
                '<p class="threat-desc">' + escapeHtml(t.desc) + '</p>' +
                '<div class="threat-loc"><code>' + escapeHtml(t.file) + (t.line > 0 ? ' : Línea ' + t.line : '') + '</code></div>' +
                (t.code ? '<pre class="threat-snippet"><code>' + escapeHtml(t.code) + '</code></pre>' : '') +
                '<div class="threat-actions">' + actBtn + '</div>' +
            '</div>');

            $list.append(item);
        });
    }

    // 2. Limpiar / Erradicar Amenaza
    $(document).on('click', '.btn-clean-threat', function () {
        var $btn = $(this);
        var type = $btn.data('type');
        var target = $btn.data('target');
        var id = $btn.data('id');

        if (!confirm('¿Deseas erradicar esta inyección? Se creará una copia de seguridad automática antes de limpiar.')) {
            return;
        }

        $btn.prop('disabled', true).text('Limpiando…');

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
                    $('#threat-' + id).css('border-left-color', '#3de8a4').find('.threat-actions').html('<span style="color:#3de8a4;font-weight:700">✓ Amenaza erradicada con éxito</span>');
                } else {
                    $btn.prop('disabled', false).text('Reintentar limpieza');
                    alert(res.data && res.data.message ? res.data.message : 'Error al limpiar.');
                }
            },
            error: function () {
                $btn.prop('disabled', false).text('Reintentar limpieza');
                alert('Error de conexión.');
            }
        });
    });

    // 3. Mover a Cuarentena
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
                    $('#threat-' + id).fadeOut(400, function () { $(this).remove(); });
                    var qCount = parseInt($('#kpi-quarantine').text() || '0', 10);
                    $('#kpi-quarantine').text(qCount + 1);
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

    // 4. Restaurar de Cuarentena
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

    // 5. Guardar Configuración WAF
    $('#form-waf-settings').on('submit', function (e) {
        e.preventDefault();
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

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
});
