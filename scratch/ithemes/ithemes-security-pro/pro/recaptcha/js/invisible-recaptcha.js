/* global grecaptcha */

function itsecInvisibleRecaptchaLoad() {

	var opts = {};

	var captchas = jQuery( '.g-recaptcha' );

	var submit = function ( $form, id, isClick, eventOnly = false ) {
		return function ( e ) {

			if ( itsecRecaptchaHasUserFacingError() ) {
				return;
			}

			opts[id] = { eventOnly };

			e.preventDefault();
			grecaptcha.execute( id );

			if ( isClick ) {
				jQuery( '<input type="hidden">' ).attr( {
					name : jQuery( this ).attr( 'name' ),
					value: jQuery( this ).val()
				} ).appendTo( $form );
			}
		}
	};

	var callback = function ( $form ) {
		var cb = function ( token ) {
			$form.off( 'submit.itsecRecaptcha' );
			$form.off( 'click.itsecRecaptcha' );
			$form.off( 'solid-captcha' );

			const responseEvent = new CustomEvent( 'solid-captcha-response', { detail: token } );
			$form.get( 0 ).dispatchEvent( responseEvent );

			jQuery( ':input[name="g-recaptcha-response"]', $form ).val( token );

			if ( opts[cb.clientId]?.eventOnly ) {
				return;
			}

			// Properly submit forms that have an input with a name of "submit".
			if ( jQuery( ':input[name="submit"]', $form ).length ) {
				HTMLFormElement.prototype.submit.call( $form.get( 0 ) );
			} else {
				$form.trigger( 'submit' );
			}
		};

		return cb;
	};

	jQuery.each( captchas, function ( i, el ) {
		var $captcha = jQuery( el );

		var $form = $captcha.parents( 'form' ), captchaId = $captcha.attr( 'id' );
		var cb = callback( $form );

		var clientId = grecaptcha.render( captchaId, {
			sitekey : $captcha.data( 'sitekey' ),
			callback: cb,
			size    : 'invisible'
		} );
		cb.clientId = clientId;

		$form.on( 'submit.itsecRecaptcha', 'form', submit( $form, clientId, false ) );
		$form.on( 'click.itsecRecaptcha', ':submit', submit( $form, clientId, true ) );
		$form.on( 'solid-captcha', submit( $form, clientId, false, true ) );
	} );
}

function itsecRecaptchaHasUserFacingError() {
	return 0 !== jQuery( '.grecaptcha-user-facing-error' ).length && '' !== jQuery( '.grecaptcha-user-facing-error' ).first().html();
}
