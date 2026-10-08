/* global turnstile */

window.itsecCloudFlareTurnstileLoad = () =>
	(function ( $, config ) {
		const submit = function ( $form, id ) {
			return function ( e ) {
				const token = turnstile.getResponse( id );

				if ( !token ) {
					e.preventDefault();
					return;
				}

				$form.off( 'submit.itsecRecaptcha' );
				$form.off( 'click.itsecRecaptcha' );

				const $input = $( ':input[name="cf-turnstile-response"]', $form );

				if ( $input.length ) {
					$input.val( token );
				} else {
					$( '<input type="hidden">' ).attr( {
						name : 'cf-turnstile-response',
						value: token,
					} ).appendTo( $form );
				}
				const responseEvent = new CustomEvent( 'solid-captcha-response', { detail: token } );
				$form.get(0).dispatchEvent( responseEvent );
			};
		};

		$( function () {
			$( '.itsec-cf-turnstile' ).each( function () {
				const $captcha = $( this );
				const $form = $captcha.parents( 'form' ),
					captchaId = $captcha.attr( 'id' );

				const clientId = turnstile.render( '#' + captchaId, {
					...config,
				} );

				$form.on( 'submit.itsecRecaptcha', submit( $form, clientId ) );
				$form.on( 'solid-captcha', submit( $form, clientId ) );
			} );
		} );
	})( jQuery, window.itsecRecaptcha.config );
