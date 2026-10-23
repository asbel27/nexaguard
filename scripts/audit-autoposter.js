const fs = require('fs');

const html = fs.readFileSync('POST-NETWORKSOCIAL/public/index.html', 'utf8');
const app = fs.readFileSync('POST-NETWORKSOCIAL/public/app.js', 'utf8');

const regex = /onclick="([a-zA-Z0-9_]+)\(/g;
let match;
const calledFns = new Set();
while ((match = regex.exec(html)) !== null) {
  calledFns.add(match[1]);
}

console.log('Total onclick functions:', calledFns.size);
for (const fn of calledFns) {
  const isDef = app.includes('function ' + fn) || app.includes(fn + ' =') || app.includes('window.' + fn);
  if (!isDef) {
    console.log('MISSING FUNCTION:', fn);
  }
}

// Check for syntax errors in app.js
try {
  new Function(app);
  console.log('app.js has valid JS syntax');
} catch (err) {
  console.error('app.js SYNTAX ERROR:', err);
}
