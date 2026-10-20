const fs = require('fs');
const path = require('path');

function updateLandingCtas(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let s = fs.readFileSync(fullPath, 'utf8');

  // Change all buy/rescue CTA buttons to point to #planes
  // 1. Hero buy button
  s = s.replace(/href="\.\.\/index\.html#contacto"(.*?class="btn btn-red"[^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, content) => {
    return `<a href="../index.html#planes"${attrs}>${content}</a>`;
  });

  // 2. Pricing card / buy now button
  s = s.replace(/href="\.\.\/index\.html#contacto"(.*?class="btn btn-y"[^>]*style="width:100%"[^>]*)>([\s\S]*?)<\/a>/gi, (match, attrs, content) => {
    return `<a href="../index.html#planes"${attrs}>${content}</a>`;
  });

  // 3. Nav "Rescate Urgente" button
  s = s.replace(/<a href="\.\.\/index\.html#contacto" class="btn (btn-red|btn-y)">Rescate Urgente<\/a>/gi, '<a href="../index.html#planes" class="btn $1">Ver Planes</a>');

  fs.writeFileSync(fullPath, s, 'utf8');
  console.log(`[OK] Updated buy/rescue buttons in ${relPath} to point to #planes`);
}

updateLandingCtas('public/reparar-wordpress-hackeado/index.html');
updateLandingCtas('public/japanese-keyword-hack/index.html');

