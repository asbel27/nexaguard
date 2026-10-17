=== NexaGuard Security ===
Contributors: asbel27
Donate link: https://www.nexaguards.com
Tags: security, malware, scanner, firewall, waf
Requires at least: 5.8
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.5.6
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Expert cybersecurity suite for WordPress: deep forensic file and database scanner, backdoor eradication, core checksum verification, webshell quarantine, and real-time firewall (WAF).

== Description ==

**NexaGuard Security** is an advanced, lightweight cybersecurity solution engineered to protect WordPress websites against sophisticated intrusions, code injections, and emerging web threats.

Unlike bulky security plugins that overwhelm your database and slow down page loading, NexaGuard uses an optimized heuristic engine and cryptographic checksums to audit source code, core files, and database options without overloading your shared hosting or VPS.

### 🛡️ Key Features

* **Deep Forensic Scanner:** Audits the root directory, themes, plugins, mu-plugins, uploads, and wp_options for malicious code.
* **Neutralize ClearFake, EtherHiding & ClickFix:** Detects injected base64 scripts, malicious blockchain RPC calls, and fake Cloudflare captcha popups.
* **Core Integrity Monitor (Sentinel):** Compares core WordPress files directly against official WordPress.org cryptographic hashes to flag unauthorized modifications instantly.
* **One-Click Eradication:** Cleans malicious code injections and webshells while automatically preserving backups for single-click rollback.
* **Hardened Quarantine:** Moves infected files and backdoors to an isolated directory protected with `Deny from all` directives.
* **Real-Time Firewall (WAF):** Blocks SQL injections (SQLi), Cross-Site Scripting (XSS), Directory Traversal, and unauthorized execution of PHP scripts in the uploads folder.
* **Perimeter Hardening:** Disables PHP execution in `/uploads/`, blocks XML-RPC attacks, disables file editing in the admin panel, and prevents user enumeration.

== Installation ==

1. Upload the `nexaguard-security` folder to your `/wp-content/plugins/` directory, or upload the `.zip` file via **Plugins > Add New > Upload Plugin**.
2. Activate the plugin through the **Plugins** screen in WordPress.
3. Navigate to **NexaGuard** in the WordPress administration sidebar.
4. Click **Start Forensic Scan** to audit and secure your site.

== Frequently Asked Questions ==

= Will NexaGuard slow down my site? =
No. NexaGuard is built with performance in mind. The forensic scanner processes files in controlled, paced batches with dynamic pauses to keep CPU and memory usage minimal.

= What happens if NexaGuard detects an infected file? =
You can isolate the file in a hardened quarantine directory or automatically clean the malicious injection with a single click. A backup is created before any modification so you can roll back at any time.

= Does this plugin require an external service to work? =
No. The core functionality—local forensic scanner, WordPress core integrity verification, quarantine, and essential firewall rules—is 100% free and runs locally on your server. Optionally, you may connect a PRO license to NexaGuard Threat Cloud (https://www.nexaguards.com) to receive real-time zero-day signature updates and remote incident response.

== External Service ==

This plugin may optionally connect to the NexaGuard Threat Intelligence Cloud (https://www.nexaguards.com) to verify PRO licenses and receive cloud threat signatures.

* **Service:** NexaGuard Threat Intelligence & License Gateway
* **URL:** https://www.nexaguards.com
* **Data transmitted:** Site URL / domain name and license key (if configured) to validate updates.
* **Terms of Service:** https://www.nexaguards.com/terminos
* **Privacy Policy:** https://www.nexaguards.com/privacidad

== Screenshots ==

1. NexaGuard Dashboard: threat summary, firewall status, and quick scan access.
2. Deep Forensic Scanner identifying backdoors and injected malware.
3. Core Sentinel verifying file integrity against official WordPress.org checksums.
4. Real-time WAF firewall rules and security hardening settings.

== Changelog ==

= 1.5.6 =
* Compatibility update for WordPress 6.7 and PHP 8.2+.
* Intuitive tab reorganization: Core Sentinel and 24H Vigilance positioned alongside Forensic Scanner.
* Enhanced heuristic detection for ClearFake, ClickFix, and Web3 smart contract injectors.
* Optimized quarantine backup and rollback management.

= 1.5.5 =
* Introduced Core Sentinel to verify core WordPress files against official checksums.
* Enhanced rollback system to restore modified files with one click.

= 1.5.0 =
* Initial release of the unified NexaGuard Security Suite.
