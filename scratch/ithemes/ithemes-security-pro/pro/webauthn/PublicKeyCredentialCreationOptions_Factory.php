<?php

namespace iThemesSecurity\WebAuthn;

use iThemesSecurity\Lib\Result;
use iThemesSecurity\WebAuthn\DTO\AuthenticatorSelectionCriteria;
use iThemesSecurity\WebAuthn\DTO\PublicKeyCredentialUserEntity;
use iThemesSecurity\WebAuthn\DTO\PublicKeyCredentialCreationOptions;

interface PublicKeyCredentialCreationOptions_Factory {

	/**
	 * Makes a Creation Options dictionary for the given user.
	 *
	 * @param PublicKeyCredentialUserEntity       $user
	 * @param AuthenticatorSelectionCriteria|null $authenticator_selection
	 *
	 * @return Result<PublicKeyCredentialCreationOptions>
	 */
	public function make( PublicKeyCredentialUserEntity $user, AuthenticatorSelectionCriteria $authenticator_selection ): Result;
}
