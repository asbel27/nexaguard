<?php

namespace iThemesSecurity\User_Security_Check;

use iThemesSecurity\Strauss\Pimple\Container;
use iThemesSecurity\User_Security_Check\REST\Inactive_Users_Scan;
use iThemesSecurity\User_Security_Check\REST\REST;

return static function ( Container $c ) {
	$c['module.user-security-check.files'] = [
		'rest.php' => REST::class,
	];

	$c->extend( 'dashboard.cards', function ( $cards ) {
		$cards[] = new \ITSEC_Dashboard_Card_Security_Profile_List();
		$cards[] = new \ITSEC_Dashboard_Card_Security_Profile_Pinned();

		return $cards;
	} );

	$c[ Inactive_Users_Scan::class ] = static function () {
		return new Inactive_Users_Scan();
	};

	$c[ REST::class ] = static function ( Container $c ) {
		return new REST(
			$c[ Inactive_Users_Scan::class ]
		);
	};
};
