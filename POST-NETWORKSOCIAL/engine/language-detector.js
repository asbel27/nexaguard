/**
 * NexaGuard Multilingual & Linguistic Intelligence Engine
 * Detecta automáticamente el idioma de grupos de Facebook, comentarios y publicaciones
 * (Español, Inglés, Portugués, Francés, Alemán, Italiano) de forma 100% offline y sin APIs de pago.
 */

const STOP_WORDS = {
  es: [
    'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'para', 'con', 'por', 'que', 'como',
    'es', 'son', 'este', 'esta', 'web', 'sitio', 'seguridad', 'hola', 'grupo', 'ayuda', 'gracias',
    'amigos', 'desarrolladores', 'comunidad', 'publicacion', 'pantalla', 'roja', 'desinfeccion'
  ],
  en: [
    'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'in', 'to', 'for', 'with', 'from', 'by',
    'this', 'that', 'are', 'was', 'as', 'it', 'website', 'wordpress', 'security', 'developers',
    'group', 'help', 'thanks', 'free', 'malware', 'hack', 'clean', 'scanner', 'community'
  ],
  pt: [
    'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'para',
    'com', 'por', 'que', 'como', 'e', 'sao', 'este', 'esta', 'site', 'seguranca', 'ola', 'grupo',
    'ajuda', 'obrigado', 'desenvolvedores', 'comunidade', 'brasil', 'portugal'
  ],
  fr: [
    'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'en', 'dans', 'pour', 'avec', 'par', 'qui',
    'que', 'est', 'sont', 'ce', 'cette', 'site', 'securite', 'bonjour', 'groupe', 'merci',
    'developpeurs', 'communaute', 'france'
  ],
  de: [
    'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'in', 'im', 'fur', 'mit',
    'von', 'bei', 'und', 'ist', 'sind', 'dieser', 'webseite', 'sicherheit', 'hallo', 'gruppe',
    'danke', 'entwickler', 'deutschland'
  ],
  it: [
    'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'del', 'della', 'in', 'per',
    'con', 'da', 'su', 'che', 'e', 'sono', 'questo', 'sito', 'sicurezza', 'ciao', 'gruppo',
    'grazie', 'sviluppatori', 'comunita', 'italia'
  ]
};

const LANGUAGE_NAMES = {
  es: 'Español',
  en: 'English (Inglés)',
  pt: 'Português (Portugués)',
  fr: 'Français (Francés)',
  de: 'Deutsch (Alemán)',
  it: 'Italiano (Italiano)'
};

/**
 * Detecta el idioma predominante de un texto o título de grupo
 * @param {string} text - Texto del nombre del grupo, descripción o comentario
 * @returns {'es' | 'en' | 'pt' | 'fr' | 'de' | 'it'}
 */
function detectLanguage(text = '') {
  if (!text || typeof text !== 'string') return 'es';

  const clean = text.toLowerCase().replace(/[^a-záéíóúüñãõâêîôûàèìòùäöß\s]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 1);

  if (words.length === 0) return 'es';

  // Marcadores explícitos por nombre de país o idioma
  if (/\b(usa|uk|global|english|worldwide|us|united states|australia|canada)\b/i.test(text)) return 'en';
  if (/\b(brasil|brazil|portugues|portugal|pt-br)\b/i.test(text)) return 'pt';
  if (/\b(france|francais|quebec|paris)\b/i.test(text)) return 'fr';
  if (/\b(deutsch|deutschland|austria|germany|schweiz)\b/i.test(text)) return 'de';
  if (/\b(italia|italiano|roma|milano)\b/i.test(text)) return 'it';
  if (/\b(españa|spain|latam|mexico|colombia|argentina|peru|chile|español|castellano)\b/i.test(text)) return 'es';

  const scores = { es: 0, en: 0, pt: 0, fr: 0, de: 0, it: 0 };

  words.forEach(w => {
    for (const [lang, list] of Object.entries(STOP_WORDS)) {
      if (list.includes(w)) {
        scores[lang]++;
      }
    }
  });

  // Elegir el idioma con mayor puntuación
  let bestLang = 'es';
  let maxScore = 0;

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestLang = lang;
    }
  }

  // Si no hay palabras suficientes y contiene palabras clave en inglés comunes en tech
  if (maxScore === 0) {
    if (/\b(developers|community|security|plugins|themes|coding|agency|freelancers|tips)\b/i.test(clean)) {
      return 'en';
    }
    return 'es'; // Por defecto español
  }

  return bestLang;
}

function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || 'Español';
}

module.exports = {
  detectLanguage,
  getLanguageName,
  LANGUAGE_NAMES
};
