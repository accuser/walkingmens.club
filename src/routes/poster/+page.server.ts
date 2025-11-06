import { error } from '@sveltejs/kit';
import { getClubByHostname, getServiceHealthStatus } from '$lib/clubs';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const hostname = url.hostname;

	// Poster only works on subdomains, not the main landing page
	if (hostname === 'walkingmens.club' || hostname === 'localhost') {
		throw error(404, {
			message: 'Poster generation is only available for individual club pages'
		});
	}

	try {
		const club = await getClubByHostname(hostname);

		if (!club) {
			// Check if database is available to provide better error messaging
			const healthStatus = await getServiceHealthStatus();
			
			if (!healthStatus.database && !healthStatus.fallback) {
				// System is completely down
				throw error(503, {
					message: 'Service temporarily unavailable. Please try again later.',
					details: 'The club configuration system is currently unavailable.'
				});
			} else if (!healthStatus.database && healthStatus.fallback) {
				// Database down but fallback available - club might exist in database but not in fallback
				throw error(404, {
					message: `Club configuration temporarily unavailable for ${hostname}`,
					details: 'The club may exist but cannot be accessed due to a temporary system issue. Please try again later.'
				});
			} else {
				// Database available but club not found - definitive 404
				throw error(404, {
					message: `No walking club found for ${hostname}`,
					details: 'This subdomain is not configured for any walking club. Please check the URL or contact support.'
				});
			}
		}

		// Pass the club URL to the client for QR code generation
		const clubUrl = `https://${club.hostname}`;

		return {
			club,
			clubUrl
		};
		
	} catch (err) {
		// If it's already an HTTP error, re-throw it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		
		// For unexpected errors, provide a generic error response
		console.error('Unexpected error in poster page load:', err);
		throw error(500, {
			message: 'An unexpected error occurred',
			details: 'Please try again later or contact support if the problem persists.'
		});
	}
};
