<?php

namespace iThemesSecurity\Version_Management;

use iThemesSecurity\Strauss\Pimple\Container;
use iThemesSecurity\Version_Management\REST\Old_Site_Scan;
use iThemesSecurity\Version_Management\REST\REST;

return static function ( Container $c ) {
	$c['module.version-management.files'] = [
		'rest.php' => REST::class,
	];

	\ITSEC_Lib::extend_if_able( $c, 'dashboard.cards', function ( $cards ) {
		require_once __DIR__ . '/cards/class-itsec-dashboard-card-version-management.php';
		$cards[] = new \ITSEC_Dashboard_Card_Version_Management();

		return $cards;
	} );

	$c[ Old_Site_Scan::class ] = static function () {
		return new Old_Site_Scan();
	};

	$c[ REST::class ] = static function ( Container $c ) {
		return new REST(
			$c[ Old_Site_Scan::class ]
		);
	};
};
