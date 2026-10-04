<?php
if (!defined('ABSPATH')) {
    exit;
}
$license = get_option('nexaguard_license_data', null);
$has_license = !empty($license) && !empty($license['valid']) && !empty($license['key']);
?>

<!-- Modal de Conversión: Plan PRO vs Especialista en Ciberseguridad (Plan Rescate) -->
<div id="clean-upgrade-modal" class="ng-modal" style="display:none;">
    <div class="ng-modal-box clean-upgrade-box">
        <div class="cum-head">
            <span class="cum-tag">🛡️ ELEVA LA SEGURIDAD DE TU SITIO WEB</span>
            <h3 id="cum-modal-title">Desbloquea la Protección Total y Vigilancia de tu Web</h3>
            <p id="cum-modal-desc">El <strong>Sistema de Vigilancia 24H con Radar</strong>, el <strong>Blindaje WAF en Vivo</strong> y la <strong>Erradicación con 1 Clic</strong> están reservados para licencias PRO o la intervención de nuestros expertos en ciberseguridad. Elige tu opción:</p>
        </div>

        <div class="cum-grid">
            <!-- Opción 1: Plan Security Pro -->
            <div class="cum-card cum-card-pro">
                <div class="cum-card-badge">MÁS POPULAR · $9.99 / MES</div>
                <h4>Plan NexaGuard Security PRO</h4>
                <div class="cum-price"><b>$9.99</b> <span>USD / mes</span></div>
                <ul class="cum-features">
                    <li>✓ <strong>Sistema de Vigilancia 24 Horas</strong> con radar táctico continuo activo</li>
                    <li>✓ <strong>Blindaje y Cortafuegos WAF</strong> con filtro Anti-ClearFake en vivo</li>
                    <li>✓ <strong>Erradicación con 1 Clic</strong> de todas las amenazas detectadas</li>
                    <li>✓ <strong>Zero-Day Cloud Threat Intel:</strong> Bloquea ataques nuevos</li>
                    <li>✓ <strong>Prevención de Reinfecciones</strong> y blindaje perimetral</li>
                </ul>
                <a href="https://www.nexaguards.com/#planes" target="_blank" class="btn-ng btn-ng-primary" style="width:100%;text-align:center;justify-content:center">Adquirir Plan PRO ($9.99/mes)</a>
                <button type="button" class="btn-ng btn-ng-link btn-switch-to-key" style="margin-top:8px;color:#ffcf33;font-size:0.82rem;width:100%;text-align:center">Ya tengo mi clave de licencia ›</button>
            </div>

            <!-- Opción 2: Especialista en Ciberseguridad / Plan Rescate -->
            <div class="cum-card cum-card-rescate">
                <div class="cum-card-badge-o">ESPECIALISTA EN CIBERSEGURIDAD · $99</div>
                <h4>Ayuda de un Especialista Forense</h4>
                <div class="cum-price"><b>$99</b> <span>USD · Pago Único</span></div>
                <ul class="cum-features">
                    <li>✓ <strong>Limpieza Humana Completa</strong> por ingenieros en ciberseguridad</li>
                    <li>✓ <strong>Reparación de Errores Críticos:</strong> Web operativa al 100%</li>
                    <li>✓ <strong>Deslistado Urgente de Listas Negras:</strong> Google y antivirus</li>
                    <li>✓ <strong>Auditoría Forense Profunda:</strong> Cerramos la brecha de entrada</li>
                    <li>✓ <strong>Garantía Total de 30 Días:</strong> Si vuelve, lo limpiamos gratis</li>
                </ul>
                <a href="https://www.nexaguards.com/#contacto" target="_blank" class="btn-ng btn-ng-danger" style="width:100%;text-align:center;justify-content:center">👨‍💻 Solicitar Especialista (Plan Rescate $99)</a>
                <p style="font-size:0.78rem;color:#8f9fc7;margin-top:8px;text-align:center">Intervención prioritaria urgente en menos de 1 a 2 horas</p>
            </div>
        </div>

        <div class="cum-foot">
            <button type="button" id="btn-close-clean-modal" class="btn-ng btn-ng-outline">Cerrar</button>
        </div>
    </div>
</div>

<!-- Modal de Cambio / Ingreso de Licencia -->
<div id="license-modal" class="ng-modal" style="display:none;">
    <div class="ng-modal-box">
        <h3>🔑 Activar Licencia NexaGuard Pro</h3>
        <p>Introduce tu clave de licencia oficial obtenida tras la compra de tu plan en NexaGuard:</p>
        <div class="ng-modal-fld">
            <input type="text" id="input-license-key" class="in-ng" placeholder="Ej: NXG-PRO-XXXX-XXXX" value="<?php echo esc_attr($has_license ? $license['key'] : ''); ?>">
        </div>
        <p id="license-modal-msg" class="modal-msg"></p>
        <div class="ng-modal-acts">
            <button type="button" id="btn-save-license" class="btn-ng btn-ng-primary">Verificar y Guardar</button>
            <button type="button" id="btn-close-license" class="btn-ng btn-ng-outline">Cancelar</button>
        </div>
    </div>
</div>
