<?php
namespace iThemesSecurity\Passwordless_Login;

use ITSEC_Passwordless_Login as Login;
use iThemesSecurity\Strauss\Pimple\Container;
use iThemesSecurity\User_Groups\Matcher;

return static function ( Container $c ) {
	$c['module.passwordless-login.files'] = [
		'active.php' => Login::class,
	];

	$c[ Login::class ] = static function ( Container $c ) {
		return new Login(
			$c[ Matcher::class ]
		);
	};
};
