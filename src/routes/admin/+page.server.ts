/**
 * Admin dashboard server load function
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// Basic dashboard data - can be expanded later
	return {
		stats: {
			totalClubs: 0, // Will be populated when club management is implemented
			activeSubdomains: 0,
			lastUpdated: new Date().toISOString()
		}
	};
};