/**
 * Admin logout API endpoint
 */

import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { AuthService } from '$lib/auth/authService';
import { clearAuthCookie } from '$lib/auth/middleware';
import { AUTH_CONFIG } from '$lib/auth/config';

export const POST: RequestHandler = async (event) => {
	try {
		// Get session cookie
		const sessionId = event.cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME);

		if (sessionId && event.platform?.env?.DB) {
			// Destroy session in database
			const authService = new AuthService(event.platform.env.DB);
			await authService.logout(sessionId);
		}

		// Clear authentication cookie
		clearAuthCookie(event);

		return json({ success: true });
	} catch (error) {
		console.error('Logout error:', error);

		// Still clear the cookie even if database operation fails
		clearAuthCookie(event);

		return json({ success: true }); // Always return success for logout
	}
};
