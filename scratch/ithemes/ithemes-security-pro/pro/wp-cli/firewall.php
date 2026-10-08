<?php

namespace iThemesSecurity\WP_CLI;

use iThemesSecurity\Modules\Firewall\Rules\Repository;
use iThemesSecurity\Modules\Firewall\Rules\Rule;
use iThemesSecurity\Modules\Firewall\Rules\Rules_Options;
use function WP_CLI\Utils\get_flag_value;

class Firewall_Rule_Command {
	private const DEFAULT_COLUMNS = [
		'id',
		'name',
		'provider',
		'provider_ref',
		'vulnerability',
		'config',
		'created_at',
		'paused_at',
	];

	/** @var Repository */
	private $rules;

	public function __construct( Repository $rules ) { $this->rules = $rules; }

	/**
	 * List firewall rules.
	 *
	 * ## OPTIONS
	 *
	 *  [--field=<field>]
	 *  : Prints the value of a single field for each log item.
	 *
	 *  [--fields=<fields>]
	 *  : Limit the output to specific fields.
	 *
	 *  [--format=<format>]
	 *  : Render output in a particular format.
	 *  ---
	 *  default: table
	 *  options:
	 *    - table
	 *    - csv
	 *    - ids
	 *    - json
	 *    - count
	 *    - yaml
	 *  ---
	 */
	public function list( $args, $assoc_args ) {
		$fields = get_flag_value( $assoc_args, 'fields', self::DEFAULT_COLUMNS );
		$field  = get_flag_value( $assoc_args, 'field' );
		$format = get_flag_value( $assoc_args, 'format', 'table' );

		$found_rules = $this->rules->get_rules( new Rules_Options() );

		if ( ! $found_rules->is_success() ) {
			$found_rules->for_wp_cli();
		}

		if ( 'ids' === $format ) {
			echo implode( ' ', array_map( function ( Rule $rule ) {
				return $rule->get_id();
			}, $found_rules->get_data() ) );
		} elseif ( 'count' === $format ) {
			echo count( $found_rules->get_data() );
		} else {
			$format_args = [
				'format' => $format,
				'fields' => $fields,
				'field'  => $field,
			];
			$formatter   = new \WP_CLI\Formatter( $format_args );
			$formatter->display_items( array_map( [ $this, 'format_item' ], $found_rules->get_data() ) );
		}
	}

	private function format_item( Rule $rule ) {
		return [
			'id'            => $rule->get_id(),
			'name'          => $rule->get_name(),
			'provider'      => $rule->get_provider(),
			'provider_ref'  => $rule->get_provider_ref(),
			'vulnerability' => $rule->get_vulnerability(),
			'config'        => $rule->get_config(),
			'created_at'    => $rule->get_created_at()->format( 'Y-m-d H:i:s' ),
			'paused_at'     => $rule->get_paused_at() ? $rule->get_paused_at()->format( 'Y-m-d H:i:s' ) : '',
		];
	}
}

\WP_CLI::add_command( 'itsec firewall rule', new Firewall_Rule_Command(
	\ITSEC_Modules::get_container()->get( Repository::class ),
) );
