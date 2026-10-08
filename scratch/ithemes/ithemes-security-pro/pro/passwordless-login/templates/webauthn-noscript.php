<noscript>
	<div class="notice notice-warning notice-alt">
		<p>
			<?php esc_html_e( 'Passkeys require JavaScript.', 'it-l10n-ithemes-security-pro' ); ?>
			<?php if ( in_array( 'magic', $methods, true ) ): ?>
				<?php esc_html_e( 'If you cannot enable JavaScript, log in with a Magic Link or Password instead.', 'it-l10n-ithemes-security-pro' ); ?>
			<?php else: ?>
				<?php esc_html_e( 'If you cannot enable JavaScript, log in with a Password instead.', 'it-l10n-ithemes-security-pro' ); ?>
			<?php endif; ?>
		</p>
	</div>
</noscript>
