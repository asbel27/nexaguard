/**
 * Spintax Processing Engine
 * Soporta anidamiento: {opcion1|opcion2|{sub1|sub2}}
 * Genera variaciones de texto únicas para evitar que Facebook marque el contenido como duplicado/spam.
 */

function parseSpintax(text) {
  if (!text || typeof text !== 'string') return '';

  const regex = /\{([^{}]+)\}/;
  let matches;

  while ((matches = regex.exec(text)) !== null) {
    const choices = matches[1].split('|');
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    text = text.replace(matches[0], randomChoice);
  }

  return text;
}

/**
 * Calcula aproximadamente cuántas combinaciones únicas produce una plantilla Spintax
 */
function countSpintaxVariations(text) {
  if (!text) return 1;
  const matches = text.match(/\{([^{}]+)\}/g);
  if (!matches) return 1;

  let total = 1;
  for (const m of matches) {
    const opts = m.slice(1, -1).split('|').length;
    total *= opts;
  }
  return total;
}

module.exports = {
  parseSpintax,
  countSpintaxVariations
};
