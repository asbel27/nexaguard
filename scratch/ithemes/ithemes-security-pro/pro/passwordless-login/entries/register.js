/**
 * WordPress dependencies
 */
import domReady from '@wordpress/dom-ready';
import { __, sprintf } from '@wordpress/i18n';
import { isEmail } from '@wordpress/url';

/**
 * Internal dependencies
 */
import { registerCredential, isAvailable } from '@ithemes/security.webauthn.utils';

class PasswordlessRegistration {
	captchaToken;
	hasCaptcha;
	$el;
	$elements = {};
	notices = {};
	continueUrl;
	registering;

	constructor( el, notices ) {
		this.$el = el;
		this.notices = notices;
	}

	init( { continueUrl, hasCaptcha = false } ) {
		this.hasCaptcha = hasCaptcha;
		this.continueUrl = continueUrl;

		const button = this.$el.querySelector( '.itsec-webauthn-register__submit' );

		if ( ! button || ! isAvailable() ) {
			if ( button ) {
				button.remove();
			}
			return;
		}

		this.$elements.button = button;
		this.setUpUI();

		this.$el.addEventListener( 'solid-captcha-response', this.onCaptcha.bind( this ) );
		this.$elements.button.addEventListener( 'click', this.onRegister.bind( this ) );
		this.$el.querySelector( 'input[name="wp-submit"]' ).addEventListener( 'click', this.onNativeRegister.bind( this ) );
	}

	setUpUI() {
		// Hide the username input field and its label.
		this.$elements.username = document.getElementById( 'user_login' );
		this.$elements.username.style.display = 'none';

		const labelList = this.$el.querySelectorAll( '[for="user_login"]' );
		labelList.forEach( function( label ) {
			label.style.display = 'none';
		} );

		// Add a message to the top of the form.
		const passwordlessMessage = document.createElement( 'p' );
		passwordlessMessage.classList.add( 'itsec-pwls-register__title' );
		passwordlessMessage.innerText = __( 'This site uses Passwordless Registration', 'it-l10n-ithemes-security-pro' );
		this.$el.prepend( passwordlessMessage );

		this.$el.querySelector( 'input[name="wp-submit"]' ).type = 'button';

		this.$elements.email = document.getElementById( 'user_email' );
		this.$elements.email.addEventListener( 'input', this.validateEmail.bind( this ) );
		this.$elements.email.addEventListener( 'focus', this.validateEmail.bind( this ) );
		this.$elements.email.focus();
	}

	onCaptcha( e ) {
		this.captchaToken = e.detail;
	}

	async onRegister() {
		if ( this.registering ) {
			return;
		}

		this.notices.removeNotices();

		// Validate the Email.
		if ( ! this.isValidEmail( this.$elements.email ) ) {
			this.displayNoticeType( 'email' );
			return;
		}

		this.registering = true;

		if ( this.hasCaptcha ) {
			this.$el.dispatchEvent( new Event( 'solid-captcha' ) );

			if ( ! this.captchaToken ) {
				await this.waitForToken();
			}
		}

		try {
			await registerCredential( {
				authenticatorSelection: {
					residentKey: 'preferred',
				},
				email: this.$elements.email.value,
				captcha: this.captchaToken,
			} );
			// Redirect to login page with success message.
			window.location.href = this.continueUrl;
		} catch ( error ) {
			this.displayNoticeType( 'registration', error?.message || '' );
		}

		this.registering = false;
	}

	onNativeRegister() {
		this.$el.submit();
	}

	waitForToken() {
		return new Promise( ( resolve ) => {
			this.$el.addEventListener( 'solid-captcha-response', () => {
				resolve();
			} );
		} );
	}

	// Display a notice based on the type of error.
	displayNoticeType( messageType, details ) {
		this.notices.removeNotices();
		let message;

		// "Message Types" exist to prevent invalid input from being displayed.
		if ( 'email' === messageType ) {
			message = __( 'Please enter a valid email address.', 'it-l10n-ithemes-security-pro' );
		} else if ( 'registration' === messageType ) {
			message = __( 'Passkey Registration failed.', 'it-l10n-ithemes-security-pro' );
		} else {
			return;
		}

		if ( details ) {
			message += '\n' + details;
		}

		// translators: %s: Error message.
		message = sprintf( __( 'Error: %s', 'it-l10n-ithemes-security-pro' ), message );

		this.notices.addErrorNotice( message );
	}

	validateEmail( e ) {
		if ( this.isValidEmail( e.target ) ) {
			this.$elements.button.disabled = false;

			// Autofill the username field with the email.
			this.$elements.username.value = e.target.value;
		} else {
			this.$elements.button.disabled = true;
			this.notices.removeNotices();
		}
	}

	isValidEmail( el ) {
		return el.value && isEmail( el.value );
	}
}

class PasswordlessRegistrationNotices {
	$el;

	constructor( el ) {
		this.$el = el;
	}

	addErrorNotice( message ) {
		this.addNotice( message, 'error' );
	}

	addNotice( message, type = 'info' ) {
		if ( ! this.$el ) {
			return;
		}

		// Prepare the Message.
		const paragraph = document.createElement( 'p' );
		paragraph.innerText = message;

		const notice = document.createElement( 'div' );
		notice.classList.add( 'itsec-notice', 'notice', 'notice-' + type, 'message', 'register' );
		notice.appendChild( paragraph );

		this.$el.append( notice );
	}

	removeNotices() {
		const notices = this.$el.getElementsByClassName( 'itsec-notice' );
		for ( let i = 0; i < notices.length; i++ ) {
			notices[ i ].remove();
		}
	}
}

export const init = ( hasCaptcha, continueUrl ) => {
	domReady( async () => {
		const registerForm = document.getElementById( 'registerform' );
		if ( ! registerForm ) {
			return;
		}

		// Add the notices container.
		const formWrapper = document.getElementById( 'login' );
		const noticeContainer = document.createElement( 'div' );
		noticeContainer.classList.add( 'itsec-notice-container' );
		formWrapper.insertBefore( noticeContainer, registerForm );

		const notices = new PasswordlessRegistrationNotices( noticeContainer );
		const app = new PasswordlessRegistration( registerForm, notices );
		app.init( { continueUrl, hasCaptcha } );
	} );
};
