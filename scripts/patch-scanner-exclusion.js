const fs = require('fs');
const path = require('path');

const scannerPath = path.join(__dirname, '../plugin/nexaguard-security/inc/scanner.php');
let content = fs.readFileSync(scannerPath, 'utf8');

// 1. Reemplazar la exclusión de plugins
content = content.replace(
    /strpos\(\$rel,\s*'nexaguard-security'\)\s*!==\s*false/g,
    "stripos($rel, 'nexaguard') !== false"
);

// 2. Proteger check_file_content para que descarte cualquier archivo que pertenezca a nexaguard
const targetFunc = "private function check_file_content($filepath, $location = '') {";
const replacementFunc = `private function check_file_content($filepath, $location = '') {
        $rel_check = str_replace(array(ABSPATH, '\\\\'), array('', '/'), $filepath);
        if (stripos($rel_check, 'nexaguard') !== false) {
            return;
        }`;

if (content.includes(targetFunc) && !content.includes('$rel_check')) {
    content = content.replace(targetFunc, replacementFunc);
    console.log('✅ check_file_content patched successfully.');
} else {
    console.log('ℹ️ check_file_content already patched or pattern differs.');
}

// 3. Proteger cleaner.php
const cleanerPath = path.join(__dirname, '../plugin/nexaguard-security/inc/cleaner.php');
let cleanerContent = fs.readFileSync(cleanerPath, 'utf8');
cleanerContent = cleanerContent.replace(
    /\$protected_essential_plugins\s*=\s*array\('nexaguard-security'/g,
    "$protected_essential_plugins = array('nexaguard-security', 'nexaguard-malware-scanner', 'nexaguard-pro', 'nexaguard-malware-scanner-pro'"
);
fs.writeFileSync(cleanerPath, cleanerContent, 'utf8');
console.log('✅ cleaner.php patched successfully.');

fs.writeFileSync(scannerPath, content, 'utf8');
console.log('✅ scanner.php patched successfully.');
