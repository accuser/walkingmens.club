import { error } from '@sveltejs/kit';
import { getClubByHostname } from '$lib/clubs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const hostname = url.hostname;
	const club = getClubByHostname(hostname);

	if (!club) {
		throw error(404, {
			message: `No walking club found for ${hostname}`
		});
	}

	return {
		club
	};
};
