/**
 * SvelteKit server hooks
 * Handles server-side initialization and request processing
 */

import type { Handle } from '@sveltejs/kit';
import { initializeClubService } from '$lib/clubs/index';

/**
 * Handle function runs on every server request
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Initialize club service with platform context if available
	if (event.platform) {
		initializeClubService(event.platform);
	}

	// Continue with request processing
	const response = await resolve(event);
	
	return response;
};