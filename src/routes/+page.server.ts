import { error } from '@sveltejs/kit';
import { getClubByHostname, getAllClubs } from '$lib/clubs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const hostname = url.hostname;

	// For main domain or localhost, show landing page with all clubs
	if (hostname === 'walkingmens.club' || hostname === 'localhost') {
		return {
			clubs: getAllClubs(),
			club: null
		};
	}

	// For subdomains, show specific club
	const club = getClubByHostname(hostname);

	if (!club) {
		throw error(404, {
			message: `No walking club found for ${hostname}`
		});
	}

	return {
		club,
		clubs: null
	};
};
