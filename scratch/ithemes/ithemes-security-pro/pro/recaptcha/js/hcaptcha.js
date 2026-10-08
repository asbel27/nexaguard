/* global hcaptcha */

window.itsecHCaptchaLoad = () => (function ( $, config ) {
	const submit = function ( $form, id ) {
		return function ( e ) {
			const token = hcaptcha.getResponse( id );

			if ( !token ) {
				e?.preventDefault();
				return;
			}

			$form.off( 'submit.itsecRecaptcha' );
			$form.off( 'click.itsecRecaptcha' );

			const $input = $( ':input[name="h-captcha-response"]', $form );

			if ( $input.length ) {
				$input.val( token );
			} else {
				$( '<input type="hidden">' ).attr( {
					name : 'h-captcha-response',
					value: token,
				} ).appendTo( $form );
			}

			const responseEvent = new CustomEvent( 'solid-captcha-response', { detail: token } );
			$form.get( 0 ).dispatchEvent( responseEvent );
		}
	};

	$( function () {
		$( '.itsec-h-captcha' ).each( function () {
			const $captcha = $( this );
			const $form = $captcha.parents( 'form' ),
				captchaId = $captcha.attr( 'id' );

			const clientId = hcaptcha.render( captchaId, {
				...config,
				callback() {
					submit( $form, clientId )();
				},
			} );

			$form.on( 'submit.itsecRecaptcha', submit( $form, clientId ) );
			$form.on( 'solid-captcha', submit( $form, clientId ) );
		} );
	} );
})( jQuery, window.itsecRecaptcha.config );
