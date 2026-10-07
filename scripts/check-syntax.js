const fs = require('fs');
const path = require('path');

const files = [
  'nexaguard-security.php',
  'inc/scanner.php',
  'inc/cleaner.php',
  'inc/firewall.php',
  'inc/view-scanner.php',
  'inc/view-waf.php'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, '..', 'plugin', 'nexaguard-security', file);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');

  let inPhp = false;
  let curlies = 0;
  let parens = 0;
  let brackets = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < content.length; i++) {
    // Check PHP tag open/close
    if (!inPhp) {
      if (content.substr(i, 5).toLowerCase() === '<?php') {
        inPhp = true;
        i += 4;
        continue;
      }
      if (content.substr(i, 2) === '<?') {
        inPhp = true;
        i += 1;
        continue;
      }
      // If outside PHP, ignore characters (they are raw HTML/CSS/JS)
      continue;
    }

    // Inside PHP
    const ch = content[i];
    const next = content[i + 1] || '';

    // Check PHP close tag
    if (!inSingleQuote && !inDoubleQuote && !inLineComment && !inBlockComment) {
      if (ch === '?' && next === '>') {
        inPhp = false;
        i += 1;
        continue;
      }
    }

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingleQuote) {
      if (ch === '\\') {
        i++;
      } else if (ch === '\'') {
        inSingleQuote = false;
      }
      continue;
    }
    if (inDoubleQuote) {
      if (ch === '\\') {
        i++;
      } else if (ch === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '#') {
      inLineComment = true;
      continue;
    }

    if (ch === '\'') {
      inSingleQuote = true;
      continue;
    }
    if (ch === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (ch === '{') curlies++;
    if (ch === '}') curlies--;
    if (ch === '(') parens++;
    if (ch === ')') parens--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;

    if (curlies < 0 || parens < 0 || brackets < 0) {
      const line = content.substring(0, i).split('\n').length;
      console.log(`[MISMATCH] ${file} at line ${line}: curlies=${curlies}, parens=${parens}, brackets=${brackets}`);
    }
  }

  console.log(`[PHP-SYNTAX] ${file} -> curlies: ${curlies}, parens: ${parens}, brackets: ${brackets}, inSingleQuote: ${inSingleQuote}, inDoubleQuote: ${inDoubleQuote}`);
});

