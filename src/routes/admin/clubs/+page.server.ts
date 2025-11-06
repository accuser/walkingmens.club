/**
 * Admin clubs list page server load function
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	try {
		// Fetch clubs from API
		const response = await fetch(`${event.url.origin}/api/admin/clubs`, {
			headers: {
				cookie: event.request.headers.get('cookie') || ''
			}
		});

		if (!response.ok) {
			if (response.status === 401) {
				// This should be handled by the layout, but just in case
				throw error(401, 'Authentication required');
			}
			throw error(response.status, 'Failed to fetch clubs');
		}

		const data = await response.json();
		
		return {
			clubs: data.clubs || []
		};
	} catch (err) {
		console.error('Error loading clubs:', err);
		throw error(500, 'Failed to load clubs');
	}
};