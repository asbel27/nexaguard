=== NexaGuard – Malware Scanner & Web Security ===
Contributors: asbel27
Donate link: https://www.nexaguards.com
Tags: security, malware scanner, malware cleaner, anti malware, firewall
Requires at least: 5.8
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.5.7
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Deep forensic malware scanner, core integrity monitor, webshell quarantine, and hardened perimeter security defense for WordPress sites.

== Description ==

**NexaGuard – Malware Scanner & Web Security** is an advanced, lightweight cybersecurity solution engineered to protect WordPress websites against sophisticated intrusions, code injections, and emerging web threats.

NexaGuard uses an optimized heuristic engine and cryptographic checksums to audit source code, core files, and database options with high efficiency and minimal resource usage.

### 🛡️ Key Features

* **Deep Forensic Scanner:** Audits the root directory, themes, plugins, mu-plugins, uploads, and wp_options for malicious code and spam injections (such as Japanese keyword hack and gambling SEO spam).
* **Detect ClearFake, EtherHiding & ClickFix:** Flags injected base64 scripts, malicious blockchain RPC calls, and fake captcha popups.
* **Core Integrity Monitor (Sentinel):** Compares core WordPress files directly against official WordPress.org cryptographic hashes to flag unauthorized modifications instantly.
* **Malware Quarantine & Eradication:** Safely isolates infected files into a protected quarantine directory with rollback capabilities.
* **Perimeter Hardening:** Disables PHP execution in `/uploads/`, blocks directory browsing (Options -Indexes), disables file editing in the admin panel, and prevents unauthorized user enumeration.

== Installation ==

1. Upload the `nexaguard-malware-scanner` folder to your `/wp-content/plugins/` directory, or upload the `.zip` file via **Plugins > Add New > Upload Plugin**.
2. Activate the plugin through the **Plugins** screen in WordPress.
3. Navigate to **NexaGuard** in the WordPress administration sidebar.
4. Click **Start Forensic Scan** to audit and secure your site.

== Frequently Asked Questions ==

= Will NexaGuard slow down my site? =
No. NexaGuard is built with performance in mind. The forensic scanner processes files in controlled batches with dynamic pauses to keep CPU and memory usage minimal.

= What happens if NexaGuard detects an infected file? =
You can isolate the file in a hardened quarantine directory or clean the malicious injection. A backup is created before any modification so you can roll back at any time.

= Does this plugin require an external service to work? =
No. The core functionality—local forensic scanner, WordPress core integrity verification, quarantine, and essential perimeter hardening rules—is 100% free and runs locally on your server. Optionally, you may enable Cloud Threat Intelligence in settings to receive updated malware signatures from NexaGuard Cloud.

== External Services ==

This plugin can connect to the following external services:

1. **WordPress.org Core Checksum API**
* **Service:** Official WordPress Core Cryptographic Checksum API
* **URL:** https://api.wordpress.org/core/checksums/1.0/
* **Purpose:** Allows Sentinel to verify the integrity of your WordPress installation by comparing local core files with official hashes.
* **Data transmitted:** WordPress core version and locale (e.g., `version=6.7&locale=en_US`). No personal or site data is transmitted.
* **Privacy Policy:** https://wordpress.org/about/privacy/

2. **NexaGuard Threat Intelligence Cloud (Optional / Opt-in)**
* **Service:** NexaGuard Threat Intelligence Feed
* **URL:** https://www.nexaguards.com/api/threat-intel
* **Purpose:** Downloads updated malware heuristic signatures. This service is completely optional and disabled by default; it only connects if the administrator explicitly enables "Cloud Threat Intelligence" in NexaGuard Settings.
* **Data transmitted:** Site domain name and client user-agent.
* **Terms of Service:** https://www.nexaguards.com/terminos
* **Privacy Policy:** https://www.nexaguards.com/privacidad

== Screenshots ==

1. NexaGuard Dashboard: threat summary, scan controls, and perimeter defense status.
2. Deep Forensic Scanner identifying backdoors, webshells, and SEO spam injections.
3. Core Sentinel verifying file integrity against official WordPress.org checksums.
4. Perimeter security hardening settings and directory protections.

== Changelog ==

= 1.5.7 =
* Updated plugin display name to "NexaGuard – Malware Scanner & Web Security" and slug to "nexaguard-malware-scanner".
* 100% GPL compliance update: unlocked all local perimeter hardening rules and scanner capabilities.
* Documented external services (WordPress.org Checksums API and NexaGuard Threat Intel).
* Threat Intelligence Feed is now strictly opt-in via settings.
* Relocated all quarantine and backup storage exclusively to protected uploads directory.
* Sanitized file paths and hardened database option cleanup against arbitrary operations.
* Sentinel now masks wp-config.php hashes to protect authentication keys and salts.
* Enqueued login styles using wp_add_inline_style() and eliminated raw inline styles.
* Fixed transient prefixes to standard nexaguard_ namespace.

= 1.5.6 =
* Compatibility update for WordPress 7.1 and PHP 8.2+.
* Intuitive tab reorganization: Core Sentinel and 24H Vigilance positioned alongside Forensic Scanner.
* Enhanced heuristic detection for ClearFake, ClickFix, and Web3 smart contract injectors.
* Optimized quarantine backup and rollback management.

= 1.5.0 =
* Initial release of the unified NexaGuard Security Suite.
