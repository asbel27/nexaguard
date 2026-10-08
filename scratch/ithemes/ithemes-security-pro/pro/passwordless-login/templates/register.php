<?php
/**
 * Template for the registration form.
 *
 * @package iThemes Security
 */

?>

<?php if ( in_array( 'webauthn', $methods, true ) ) : ?>
	<button id="itsec-webauthn-register__submit" class="itsec-webauthn-register__submit itsec-webauthn-register__submit-webauthn fade-if-no-js" name="itsec_webauthn_register" type="button" value="" disabled="disabled">
		<?php esc_html_e( 'Register with Passkey', 'it-l10n-ithemes-security-pro' ); ?>
	</button>
	<?php require __DIR__ . '/webauthn-noscript.php'; ?>
	<?php require __DIR__ . '/or.php'; ?>
<?php endif; ?>
