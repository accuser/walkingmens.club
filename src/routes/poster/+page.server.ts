import { error } from '@sveltejs/kit';
import { getClubByHostname } from '$lib/clubs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const hostname = url.hostname;

	// Poster only works on subdomains, not the main landing page
	if (hostname === 'walkingmens.club' || hostname === 'localhost') {
		throw error(404, {
			message: 'Poster generation is only available for individual club pages'
		});
	}

	const club = await getClubByHostname(hostname);

	if (!club) {
		throw error(404, {
			message: `No walking club found for ${hostname}`
		});
	}

	// Pass the club URL to the client for QR code generation
	const clubUrl = `https://${club.hostname}`;

	return {
		club,
		clubUrl
	};
};
