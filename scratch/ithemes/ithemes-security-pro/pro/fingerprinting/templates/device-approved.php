<?php
/**
 * This template is displayed after a user has approved the device.
 *
 * It is rendered by {@see ITSEC_Fingerprinting::handle_fingerprint_action_url()}.
 *
 * @var bool   $can_manage
 * @var string $title
 */
?>
<!DOCTYPE html>
<html <?php echo get_language_attributes(); ?>>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
	<meta name="viewport" content="width=device-width">
	<link href="<?php echo plugins_url( 'pro/fingerprinting/css/device-approved.css', ITSEC_Core::get_plugin_file() ); ?>" type="text/css" rel="stylesheet">
	<?php
	add_filter( 'wp_robots', 'wp_robots_no_robots' );
	wp_robots();
	?>
	<title><?php echo esc_html( $title ); ?></title>
</head>
<body>
<div class="itsec-modal-container">
	<div class="itsec-confirmation-container" data-is-front="<?php echo esc_attr( ! is_admin() ); ?>">
		<img class="itsec-confirmation-image" src="<?php echo esc_url(plugins_url('core/packages/style-guide/src/assets/device_confirmed.svg', ITSEC_Core::get_plugin_file() ) );?>" alt=""/>
	</div>
	<div class="itsec-modal-section">
		<h2 class="itsec-modal-heading"><?php esc_html_e( 'Device confirmed', 'it-l10n-ithemes-security-pro' ); ?></h2>
		<p class="itsec-muted-text">
			<?php esc_html_e( 'You have successfully recognized this device.', 'it-l10n-ithemes-security-pro' ); ?>
			<?php if ( $can_manage ): ?>
				<?php esc_html_e( 'Remember, you can always edit the devices used to login to this account in Profile settings.', 'it-l10n-ithemes-security-pro' ); ?>
			<?php endif; ?>
		</p>
	</div>

	<div class="itsec-modal-section">
		<p class="itsec-bold-text"><?php esc_html_e( 'Learn more', 'it-l10n-ithemes-security-pro' ); ?></p>
		<a href="https://go.solidwp.com/unrecognized-login-mode" class="itsec-link-container">
			<p class="itsec-muted-text"><?php esc_html_e( 'Learn more about Trusted Devices, and the unrecognized login mode', 'it-l10n-ithemes-security-pro' ); ?></p>
			<img src="<?php echo esc_url(plugins_url('core/packages/style-guide/src/assets/chevron_right.svg', ITSEC_Core::get_plugin_file() ) );?>" alt=""/>
		</a>
	</div>

	<div class="itsec-actions">
		<a href="<?php echo esc_url( home_url() ); ?>" class="itsec-cancel"><?php esc_html_e( 'Return to site', 'it-l10n-ithemes-security-pro' ); ?></a>

		<?php if ( $can_manage ): ?>
			<a href="<?php echo esc_url( admin_url( 'profile.php' ) ) ?>" class="itsec-edit"><?php esc_html_e( 'Edit device status in Profile settings', 'it-l10n-ithemes-security-pro' ); ?></a>
		<?php endif; ?>
	</div>
</div>
</body>
</html>
