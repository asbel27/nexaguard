(function ( $, config ) {
	$( function () {
		$( document ).on( 'change', '.itsec-recaptcha-opt-in__agree input', function (e) {
			var $optins = $( '.itsec-recaptcha-opt-in' )
				.addClass( 'itsec-recaptcha-opt-in--loading' );

			$.ajax( {
				url     : config.sdk,
				dataType: 'script',
				cache   : true,
				success : function () {
					const render = [];

					$optins.each( function () {
						var $optin = $( this );
						$optin.parents( 'form' ).append( $( '<input type="hidden">' ).attr( {
							name : 'recaptcha-opt-in',
							value: 'true',
						} ) );

						var $template = $( '.itsec-recaptcha-opt-in__template', $optin );
						render.push( new Promise( function ( resolve ) {
							setTimeout( function () {
								$optin.replaceWith( $template.html() );
								resolve();
							}, 1000 )
						} ) );
					} );

					const load = function() {
						if ( config.load && window[config.load] ) {
							if ( window.grecaptcha ) {
								window.grecaptcha.ready( window[config.load] );
							} else {
								window[config.load]();
							}
						}
					};

					Promise.allSettled( render ).then( load );
				},
			} );
		} );
	} );
})( jQuery, window['ITSECRecaptchaOptIn'] );
