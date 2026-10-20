const fs = require('fs');
const path = require('path');

['public/reparar-wordpress-hackeado/index.html', 'public/japanese-keyword-hack/index.html'].forEach(rel => {
  const p = path.resolve(__dirname, '..', rel);
  let s = fs.readFileSync(p, 'utf8');
  s = s.replace(/<a\s+<a\s+/g, '<a ');
  fs.writeFileSync(p, s, 'utf8');
});

console.log('[OK] Cleaned tag syntax');

