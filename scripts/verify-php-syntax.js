const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let openBraces = 0;
  let openParens = 0;
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1] || '';

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inComment) {
      if (c === '*' && next === '/') {
        inComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (c === '\\') {
        i++; // skip escaped char
        continue;
      }
      if (c === stringChar) {
        inString = false;
      }
      continue;
    }

    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inComment = true;
      i++;
      continue;
    }
    if (c === '#' && content[i-1] === '\n') {
      inLineComment = true;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      stringChar = c;
      continue;
    }

    if (c === '{') openBraces++;
    if (c === '}') openBraces--;
    if (c === '(') openParens++;
    if (c === ')') openParens--;
  }

  return { openBraces, openParens };
}

const dirs = [
  path.join(__dirname, '..', 'plugin', 'nexaguard-pro'),
  path.join(__dirname, '..', 'plugin', 'nexaguard-pro', 'inc'),
  path.join(__dirname, '..', 'plugin', 'nexaguard-security'),
  path.join(__dirname, '..', 'plugin', 'nexaguard-security', 'inc')
];

let allOk = true;
dirs.forEach(d => {
  if (fs.existsSync(d)) {
    fs.readdirSync(d).forEach(f => {
      if (f.endsWith('.php')) {
        const full = path.join(d, f);
        const res = checkFile(full);
        if (res.openBraces !== 0 || res.openParens !== 0) {
          console.error(`❌ Mismatch in ${f}: braces=${res.openBraces}, parens=${res.openParens}`);
          allOk = false;
        } else {
          console.log(`✅ ${f} OK (braces and parens balanced)`);
        }
      }
    });
  }
});

if (allOk) {
  console.log('🎉 All PRO PHP files passed structure verification!');
}

