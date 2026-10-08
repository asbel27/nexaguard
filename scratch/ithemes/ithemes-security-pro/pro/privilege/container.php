<?php

namespace iThemesSecurity\Modules\Privilege\REST;

use iThemesSecurity\Strauss\Pimple\Container;

return static function ( Container $c ) {
	$c['module.privilege.files'] = [
		'rest.php' => REST::class,
	];

	$c[ REST::class ] = static function () {
		return new REST();
	};
};
