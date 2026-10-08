function itsecRecaptchav2Load() {
	class Captcha {
		$el;
		$form;
		id;

		constructor( el ) {
			this.$el = el;
			this.$form = el.closest( 'form' );
			this.listen();
		}

		listen() {
			this.$form.addEventListener( 'solid-captcha', this.onRequest.bind( this ) );
		}

		render() {
			this.id = grecaptcha.render( this.$el, {
				sitekey : this.$el.dataset.sitekey,
				theme   : this.$el.dataset.theme,
				callback: this.onFulfill.bind( this ),
			} );
		}

		onRequest() {
			const token = grecaptcha.getResponse( this.id );
			this.notify( token );
		}

		onFulfill( token ) {
			this.notify( token );
		}

		notify( token ) {
			const event = new CustomEvent( 'solid-captcha-response', { detail: token } );
			this.$form.dispatchEvent( event );
		}
	}


	var captchas = document.querySelectorAll( '.g-recaptcha' );

	for ( var i = 0; i < captchas.length; i++ ) {
		var captcha = new Captcha( captchas[i] );
		captcha.render();
	}
}
