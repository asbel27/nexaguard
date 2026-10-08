<?php

use iThemesSecurity\Strauss\Pimple\Container;
use iThemesSecurity\Modules\Fingerprinting\REST;

return static function ( Container $c ) {
	$c['module.fingerprinting.files'] = [
		'active.php' => ITSEC_Fingerprinting::class,
	];

	\ITSEC_Lib::extend_if_able( $c, 'dashboard.cards', function ( $cards ) {
		$cards[] = new ITSEC_Dashboard_Card_Line_Graph( 'fingerprinting', __( 'Trusted Devices', 'it-l10n-ithemes-security-pro' ), [
			[
				'events' => 'fingerprint-status-approved',
				'label'  => __( 'Approved', 'it-l10n-ithemes-security-pro' ),
			],
			[
				'events' => 'fingerprint-status-approved',
				'label'  => __( 'Approved', 'it-l10n-ithemes-security-pro' ),
			],
			[
				'events' => 'fingerprint-status-auto-approved',
				'label'  => __( 'Auto-Approved', 'it-l10n-ithemes-security-pro' ),
			],
			[
				'events' => 'fingerprint-status-denied',
				'label'  => __( 'Blocked', 'it-l10n-ithemes-security-pro' ),
			],
		] );

		return $cards;
	} );

	\ITSEC_Lib::extend_if_able( $c, 'rest.controllers', function ( $controllers, Container $c ) {
		$controllers[] = $c[ REST\Devices::class ];

		return $controllers;
	} );

	$c[ ITSEC_Fingerprinting::class ] = static function () {
		return new ITSEC_Fingerprinting();
	};

	$c[ REST\Devices::class ] = static function ( Container $c ) {
		return new REST\Devices( $c[ ITSEC_Fingerprinting::class ] );
	};
};
