/**
 * WordPress dependencies
 */
import { forwardRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { PRIMARYS } from '@ithemes/security-style-guide';
import { StyledRecipient, StyledAvatar, StyledRecipientAbbr, StyledRecipientText } from './styles';

const sumChars = ( str ) => {
	let sum = 0;

	for ( let i = 0; i < str.length; i++ ) {
		sum += str.charCodeAt( i );
	}

	return sum;
};

function Recipient( { avatar, label, slug }, ref ) {
	if ( avatar ) {
		return (
			<StyledRecipient ref={ ref }>
				<StyledAvatar src={ avatar } alt="" />
			</StyledRecipient>
		);
	}

	if ( label ) {
		const backgroundColor = PRIMARYS[ sumChars( slug ) % PRIMARYS.length ];
		const parts = label.split( ' ' );
		const abbr = parts.length === 1 ? label.substring( 0, 2 ) : parts[ 0 ].substring( 0, 1 ).toUpperCase() +
			parts[ 1 ].substring( 0, 1 ).toUpperCase();

		return (
			<StyledRecipientAbbr backgroundColor={ backgroundColor } ref={ ref }>
				<StyledRecipientText>{ abbr }</StyledRecipientText>
			</StyledRecipientAbbr>
		);
	}

	return null;
}

export default forwardRef( Recipient );
