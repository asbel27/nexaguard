const fs = require('fs');
const path = require('path');

function fixFile(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  let s = fs.readFileSync(fullPath, 'utf8');

  // Replace favicon / assets paths
  s = s.replace(/href="\/brand\//g, 'href="../brand/');

  // Replace anchor links
  s = s.replace(/href="\/#([a-zA-Z0-9_-]+)"/g, 'href="../index.html#$1"');
  s = s.replace(/href="\/downloads\//g, 'href="../downloads/');
  s = s.replace(/href="\/japanese-keyword-hack\/"/g, 'href="../japanese-keyword-hack/index.html"');
  s = s.replace(/href="\/reparar-wordpress-hackeado\/"/g, 'href="../reparar-wordpress-hackeado/index.html"');
  s = s.replace(/href="\/"/g, 'href="../index.html"');

  // Update JS redirections
  s = s.replace(
    /window\.location\.href = '\/\?scan=' \+ encodeURIComponent\(clean\) \+ '#escaner';/g,
    "var base = (window.location.protocol === 'file:') ? '../index.html' : '/'; window.location.href = base + '?scan=' + encodeURIComponent(clean) + '#escaner';"
  );

  s = s.replace(
    /window\.location\.href = '\/\?scan=' \+ encodeURIComponent\(val\) \+ '#escaner';/g,
    "var base = (window.location.protocol === 'file:') ? '../index.html' : '/'; window.location.href = base + '?scan=' + encodeURIComponent(val) + '#escaner';"
  );

  s = s.replace(
    /window\.location\.href = '\/#escaner';/g,
    "var base = (window.location.protocol === 'file:') ? '../index.html#escaner' : '/#escaner'; window.location.href = base;"
  );

  fs.writeFileSync(fullPath, s, 'utf8');
  console.log(`[OK] Updated ${relPath}`);
}

fixFile('public/reparar-wordpress-hackeado/index.html');
fixFile('public/japanese-keyword-hack/index.html');

// Also update public/index.html footer links so they work locally as well
const indexPath = path.resolve(__dirname, '..', 'public/index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');
indexHtml = indexHtml.replace('href="/reparar-wordpress-hackeado/"', 'href="reparar-wordpress-hackeado/index.html"');
indexHtml = indexHtml.replace('href="/japanese-keyword-hack/"', 'href="japanese-keyword-hack/index.html"');
fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('[OK] Updated public/index.html footer links');
