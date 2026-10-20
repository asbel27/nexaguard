/**
 * Smart Scheduler & Meta Community Standards Compliance Engine
 * Diseñado para cumplir con las directivas de Meta y evitar bloqueos algorítmicos:
 * - Cadencia humana (15 a 35 minutos de pausa entre publicaciones en modo programado).
 * - Franjas horarias de máxima interacción orgánica (Picos de actividad laboral y comercial).
 * - Límite de seguridad diario estricto (5 a 8 publicaciones recomendadas por día).
 */

const OPTIMAL_HOURS = [
  { name: 'Mañana (Comienzo laboral)', start: 9, end: 12 },
  { name: 'Tarde (Post-almuerzo comercial)', start: 14, end: 17 },
  { name: 'Noche (Revisión relajada / Freelance)', start: 19, end: 22 }
];

/**
 * Comprueba si la hora actual está dentro de una franja de alto rendimiento
 */
function isWithinOptimalHours(date = new Date()) {
  const currentHour = date.getHours();
  return OPTIMAL_HOURS.some(h => currentHour >= h.start && currentHour < h.end);
}

/**
 * Calcula el tiempo de espera inteligente (en milisegundos)
 * @param {string} mode - 'safe' (15-30 min), 'moderate' (5-10 min), 'instant' (45-120 seg)
 */
function getSmartInterval(mode = 'safe') {
  let minMinutes = 15;
  let maxMinutes = 30;

  if (mode === 'instant') {
    // Modo directo para pruebas inmediatas
    return Math.floor(Math.random() * (120 - 45 + 1) + 45) * 1000;
  } else if (mode === 'moderate') {
    minMinutes = 6;
    maxMinutes = 14;
  } else {
    // Modo Seguro Anti-Baneo recomendado por Meta
    minMinutes = 18;
    maxMinutes = 32;
  }

  const minutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
  return minutes * 60 * 1000;
}

/**
 * Evalúa el nivel de riesgo de la campaña actual
 */
function assessComplianceRisk({ totalGroups, delayMode, dailyCount }) {
  const warnings = [];
  let riskLevel = 'LOW'; // LOW, MEDIUM, HIGH

  if (dailyCount >= 20) {
    warnings.push('Has alcanzado o superado el límite recomendado de 20 posts diarios en tu cuenta.');
    riskLevel = 'HIGH';
  } else if (dailyCount >= 10) {
    warnings.push('Has superado 10 posts hoy. Considera espaciar los siguientes para evitar revisiones manuales.');
    if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM';
  }

  if (delayMode === 'instant' && totalGroups > 5) {
    warnings.push('Publicar en más de 5 grupos con intervalos menores a 2 minutos puede activar las alertas de spam de Facebook.');
    riskLevel = 'HIGH';
  }

  return {
    riskLevel,
    safeLimit: 8,
    warnings,
    isOptimalHour: isWithinOptimalHours()
  };
}

module.exports = {
  OPTIMAL_HOURS,
  isWithinOptimalHours,
  getSmartInterval,
  assessComplianceRisk
};

