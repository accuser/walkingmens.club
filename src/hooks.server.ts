/**
 * SvelteKit server hooks
 * Handles server-side initialization and request processing
 */

import type { Handle } from '@sveltejs/kit';
import { initializeClubService } from '$lib/clubs/index';
import { AuthService } from '$lib/auth';

/**
 * Handle function runs on every server request
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Initialize club service with platform context if available
	if (event.platform) {
		initializeClubService(event.platform);
		
		// Initialize authentication system
		try {
			const authService = new AuthService(event.platform.env.DB);
			await authService.initializeDefaultAdmin();
		} catch (error) {
			console.error('Failed to initialize authentication:', error);
		}
	}

	// Continue with request processing
	const response = await resolve(event);
	
	return response;
};