<?php
/**
 * This template is displayed when a user confirms approving or blocking a device.
 *
 * It is rendered by {@see ITSEC_Fingerprinting::handle_fingerprint_action_url()}.
 *
 * @var string $mode   Either 'approve' or 'deny'.
 * @var array  $device Device info from {@see ITSEC_Fingerprinting::get_fingerprint_info()}.
 * @var string $title
 * @var string $form_action
 * @var array  $form_inputs
 */
?>
<!DOCTYPE html>
<html <?php echo get_language_attributes(); ?>>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
	<meta name="viewport" content="width=device-width">
	<link href="<?php echo plugins_url( 'pro/fingerprinting/css/confirm.css', ITSEC_Core::get_plugin_file() ); ?>" type="text/css" rel="stylesheet">
	<?php
	add_filter( 'wp_robots', 'wp_robots_no_robots' );
	wp_robots();
	?>
	<title><?php echo esc_html( $title ); ?></title>
</head>
<body>
<div class="itsec-confirm-container">
	<div>
		<h2 class="itsec-confirm-heading">
			<?php if ( $mode === 'approve' ): ?>
				<?php esc_html_e( 'Do you recognize this device?', 'it-l10n-ithemes-security-pro' ) ?>
			<?php else: ?>
				<?php esc_html_e( 'Do you recognize this device?', 'it-l10n-ithemes-security-pro' ) ?>
			<?php endif; ?>
		</h2>
	</div>

	<div class="itsec-device">
		<?php if ( $device['map-medium'] ): ?>
			<img
				class="itsec-map"
				src="<?php echo esc_url( $device['map-medium'] ); ?>"
				alt="<?php esc_attr_e( 'Map of the device’s approximate location.', 'it-l10n-ithemes-security-pro' ); ?>"
			/>
		<?php endif; ?>
		<div class="itsec-device-details">
			<?php if ( $device['location'] ): ?>
				<div class="itsec-device-section">
					<p class="itsec-muted-text"><?php esc_html_e( 'Location', 'it-l10n-ithemes-security-pro' ); ?></p>
					<p class="itsec-bold-text"><?php echo esc_html( $device['location'] ); ?></p>
				</div>
			<?php endif; ?>
			<div class="itsec-device-section">
				<p class="itsec-muted-text"><?php esc_html_e( 'Occurred', 'it-l10n-ithemes-security-pro' ); ?></p>
				<p class="itsec-bold-text"><?php echo esc_html( $device['date-time'] ); ?></p>
			</div>
			<div class="itsec-device-section">
				<p class="itsec-muted-text"><?php esc_html_e( 'IP', 'it-l10n-ithemes-security-pro' ); ?></p>
				<p class="itsec-bold-text"><?php echo esc_html( $device['ip'] ); ?></p>
			</div>
			<div class="itsec-device-section">
				<p class="itsec-muted-text"><?php esc_html_e( 'Platform', 'it-l10n-ithemes-security-pro' ); ?></p>
				<p class="itsec-bold-text"><?php echo esc_html( $device['platform'] ); ?></p>
			</div>
			<div class="itsec-device-section">
				<p class="itsec-muted-text"><?php esc_html_e( 'Browser', 'it-l10n-ithemes-security-pro' ); ?></p>
				<p class="itsec-bold-text">
					<?php printf( '%s (%s)', esc_html( $device['browser'] ), esc_html( $device['browser_ver'] ) ); ?>
				</p>
			</div>
		</div>
	</div>

	<p class="itsec-muted-text">
		<?php if ( $mode === 'approve' ): ?>
			<?php esc_html_e( 'Confirm that do recognize this device. We will send you back to your site once confirmed or cancel this action and return to your site.', 'it-l10n-ithemes-security-pro' ); ?>
		<?php else: ?>
			<?php esc_html_e( 'Confirm that you do not recognize this device and want to secure your account. Or, cancel and return to your site.', 'it-l10n-ithemes-security-pro' ); ?>
		<?php endif; ?>
	</p>

	<form method="post" action="<?php echo esc_url( $form_action ) ?>" class="itsec-buttons">
		<?php foreach ( $form_inputs as $input => $value ): ?>
			<input type="hidden" name="<?php echo esc_attr( $input ); ?>" value="<?php echo esc_attr( $value ); ?>"/>
		<?php endforeach; ?>
		<a href="<?php echo esc_url( wp_login_url() ); ?>" class="itsec-button itsec-button-cancel">
			<?php if ( $mode === 'approve' ): ?>
				<?php esc_html_e( 'Cancel and return to site', 'it-l10n-ithemes-security-pro' ) ?>
			<?php else: ?>
				<?php esc_html_e( 'Cancel and return to site', 'it-l10n-ithemes-security-pro' ) ?>
			<?php endif; ?>
		</a>
		<button type="submit" class="itsec-button itsec-button-<?php echo esc_attr( $mode ); ?>">
			<?php if ( $mode === 'approve' ): ?>
				<?php esc_html_e( 'Yes, it was me', 'it-l10n-ithemes-security-pro' ) ?>
			<?php else: ?>
				<?php esc_html_e( 'No, secure account', 'it-l10n-ithemes-security-pro' ) ?>
			<?php endif; ?>
		</button>
	</form>
</div>
</body>
</html>
