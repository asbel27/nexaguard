const fs = require('fs');
const path = require('path');

const scannerPath = path.join(__dirname, '../plugin/nexaguard-security/inc/scanner.php');
let content = fs.readFileSync(scannerPath, 'utf8');

// Patch scan_recent_core_tampering
const target = 'foreach ($critical_core as $file) {\n            if (file_exists($file)) {\n                $mtime = filemtime($file);';
const repl = `global $wp_version;
        $locale = function_exists('get_locale') ? get_locale() : 'en_US';
        $cache_key = 'nexaguard_core_checksums_' . md5($wp_version . '_' . $locale);
        $checksums = get_transient($cache_key);
        if (!is_array($checksums)) $checksums = array();

        foreach ($critical_core as $file) {
            if (file_exists($file)) {
                $rel = str_replace(array(ABSPATH, '\\\\'), array('', '/'), $file);
                if (in_array($rel, $this->whitelist) || in_array($file, $this->whitelist)) continue;
                if (!empty($checksums) && isset($checksums[$rel])) {
                    $local_md5 = @md5_file($file);
                    if ($local_md5 !== false && $local_md5 === $checksums[$rel]) {
                        continue;
                    }
                }
                $mtime = filemtime($file);`;

// normalize line endings for matching
const normContent = content.replace(/\r\n/g, '\n');
const normTarget = target.replace(/\r\n/g, '\n');

if (normContent.includes(normTarget)) {
    const updated = normContent.replace(normTarget, repl);
    fs.writeFileSync(scannerPath, updated, 'utf8');
    console.log('✅ scan_recent_core_tampering patched with MD5 verification!');
} else {
    console.log('ℹ️ target pattern not found in scanner.php');
}

