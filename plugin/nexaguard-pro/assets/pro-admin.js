/**
 * NexaGuard PRO - Controlador Interactivo de Administración
 */

(function ($) {
    'use strict';

    $(document).ready(function () {
        var proData = window.nexaguardProData || {};

        // 1. Cambio de pestañas
        $('.nxg-tab-btn').on('click', function () {
            var tabId = $(this).data('tab');
            $('.nxg-tab-btn').removeClass('active');
            $(this).addClass('active');

            $('.nxg-tab-pane').removeClass('active');
            $('#' + tabId).addClass('active');
        });

        // 2. Activación de Licencia PRO
        $('#btn-activate-license').on('click', function () {
            var key = $('#pro-license-key').val().trim();
            if (!key) {
                alert('Por favor introduce tu clave de licencia.');
                return;
            }

            var $btn = $(this);
            $btn.prop('disabled', true).text('Validando en NexaGuard Cloud...');

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_activate_license',
                    license_key: key,
                    nonce: proData.nonce
                },
                success: function (res) {
                    if (res.success && res.data) {
                        alert('¡Licencia verificada con éxito!\n\nVe al plugin para que veas las funciones avanzadas que se activaron...\n\nGracias por confiar en NexaGuard Security PRO');
                        window.location.href = 'admin.php?page=nexaguard-security';
                    } else {
                        alert((res.data && res.data.message) ? res.data.message : 'Error al validar la licencia.');
                        $btn.prop('disabled', false).text('⚡ Validar & Activar Licencia');
                    }
                },
                error: function () {
                    alert('Error de conexión con el servidor. Por favor inténtalo de nuevo.');
                    $btn.prop('disabled', false).text('⚡ Validar & Activar Licencia');
                }
            });
        });

        // 3. Desactivación de Licencia
        $('#btn-deactivate-license').on('click', function () {
            if (!confirm('¿Estás seguro de que deseas desvincular esta licencia?')) return;

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_deactivate_license',
                    nonce: proData.nonce
                },
                success: function (res) {
                    alert('Licencia desvinculada.');
                    window.location.reload();
                }
            });
        });

        // 4. Reconstruir Archivo Vital Individual
        $('.nxg-btn-rebuild-single').on('click', function () {
            var file = $(this).data('file');
            if (!confirm('¿Deseas reconstruir el archivo /' + file + ' descargando la copia oficial inmaculada de WordPress.org? Se creará una copia de seguridad previa.')) {
                return;
            }

            var $btn = $(this);
            $btn.prop('disabled', true).text('Reconstruyendo...');

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_rebuild_vital',
                    file: file,
                    nonce: proData.nonce
                },
                success: function (res) {
                    if (res.success && res.data) {
                        alert(res.data.message || 'Archivo reconstruido exitosamente.');
                        window.location.reload();
                    } else {
                        alert((res.data && res.data.message) ? res.data.message : 'Error al reconstruir.');
                        $btn.prop('disabled', false).text('Reconstruir Copia Oficial');
                    }
                },
                error: function () {
                    alert('Error en la comunicación con el servidor.');
                    $btn.prop('disabled', false).text('Reconstruir Copia Oficial');
                }
            });
        });

        // 5. Reconstruir TODOS los Archivos Vitales
        $('#btn-rebuild-all-vital-pro').on('click', function () {
            if (!confirm('¿Deseas reconstruir TODOS los archivos vitales del núcleo (index.php, wp-load.php, wp-blog-header.php, wp-settings.php, version.php, etc.) con sus copias oficiales de WordPress.org? Se crearán respaldos en cuarentena de todos ellos.')) {
                return;
            }

            var $btn = $(this);
            $btn.prop('disabled', true).text('Reconstruyendo núcleo...');

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_rebuild_all_vital',
                    nonce: proData.nonce
                },
                success: function (res) {
                    if (res.success && res.data) {
                        alert(res.data.message + '\n\n' + (res.data.details ? res.data.details.join('\n') : ''));
                        window.location.reload();
                    } else {
                        alert((res.data && res.data.message) ? res.data.message : 'Error durante la reconstrucción.');
                        $btn.prop('disabled', false).text('🛠️ Reconstruir TODOS los Archivos Vitales');
                    }
                },
                error: function () {
                    alert('Error de conexión durante la reconstrucción.');
                    $btn.prop('disabled', false).text('🛠️ Reconstruir TODOS los Archivos Vitales');
                }
            });
        });

        // 6. Aplicar Endurecimiento Completo
        $('#btn-apply-full-hardening').on('click', function () {
            var $btn = $(this);
            $btn.prop('disabled', true).text('Aplicando blindaje...');

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_apply_hardening',
                    nonce: proData.nonce
                },
                success: function (res) {
                    if (res.success && res.data) {
                        alert(res.data.message || 'Blindaje aplicado con éxito.');
                        window.location.reload();
                    } else {
                        alert((res.data && res.data.message) ? res.data.message : 'Error al aplicar endurecimiento.');
                        $btn.prop('disabled', false).text('🔒 Aplicar Blindaje Completo');
                    }
                },
                error: function () {
                    alert('Error al comunicarse con el servidor.');
                    $btn.prop('disabled', false).text('🔒 Aplicar Blindaje Completo');
                }
            });
        });

        // 7. Regenerar Sales Criptográficas
        $('#btn-regenerate-salts').on('click', function () {
            if (!confirm('ADVERTENCIA: Regenerar las sales criptográficas cerrará la sesión de todos los usuarios actualmente conectados al sitio. ¿Deseas continuar?')) {
                return;
            }

            var $btn = $(this);
            $btn.prop('disabled', true).text('Regenerando sales...');

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_regenerate_salts',
                    nonce: proData.nonce
                },
                success: function (res) {
                    if (res.success && res.data) {
                        alert(res.data.message);
                        window.location.reload();
                    } else {
                        alert((res.data && res.data.message) ? res.data.message : 'Error al regenerar sales.');
                        $btn.prop('disabled', false).text('🔑 Regenerar Sales de Seguridad');
                    }
                },
                error: function () {
                    alert('Error en el servidor.');
                    $btn.prop('disabled', false).text('🔑 Regenerar Sales de Seguridad');
                }
            });
        });

        // 8. Erradicación Total en 1 Clic
        $('#btn-auto-remediate-pro').on('click', function () {
            if (!confirm('¿Iniciar protocolo de erradicación total? Este proceso aislará todas las webshells detectadas, restaurará los archivos vitales del núcleo y aplicará las directivas de blindaje.')) {
                return;
            }

            var $btn = $(this);
            $btn.prop('disabled', true).text('Ejecutando desinfección y blindaje...');

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_auto_remediate',
                    nonce: proData.nonce
                },
                success: function (res) {
                    if (res.success && res.data) {
                        alert(res.data.message + '\n\n' + (res.data.results && res.data.results.details ? res.data.results.details.join('\n') : ''));
                        window.location.reload();
                    } else {
                        alert((res.data && res.data.message) ? res.data.message : 'Error durante la erradicación.');
                        $btn.prop('disabled', false).text('⚡ Ejecutar Erradicación & Blindaje Total');
                    }
                },
                error: function () {
                    alert('Error de conexión durante la erradicación.');
                    $btn.prop('disabled', false).text('⚡ Ejecutar Erradicación & Blindaje Total');
                }
            });
        });

        // 9. Liberar IP de la Cárcel
        $('.btn-unjail-ip').on('click', function () {
            var ip = $(this).data('ip');
            var $row = $(this).closest('tr');

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_unjail_ip',
                    ip: ip,
                    nonce: proData.nonce
                },
                success: function (res) {
                    $row.fadeOut(300, function () { $(this).remove(); });
                }
            });
        });

        // 10. Vaciar Cárcel
        $('#btn-clear-jail').on('click', function () {
            if (!confirm('¿Deseas vaciar todas las IPs confinadas de la cárcel?')) return;

            $.ajax({
                url: proData.ajax_url,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'nexaguard_pro_clear_jail',
                    nonce: proData.nonce
                },
                success: function (res) {
                    window.location.reload();
                }
            });
        });
    });
})(jQuery);

