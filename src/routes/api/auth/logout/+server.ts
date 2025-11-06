/**
 * Admin logout API endpoint
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthService, clearAuthCookie, AUTH_CONFIG } from '$lib/auth';

export const POST: RequestHandler = async ({ platform, cookies }) => {
	try {
		const sessionId = cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME);

		if (sessionId && platform?.env?.DB) {
			const authService = new AuthService(platform.env.DB);
			await authService.logout(sessionId);
		}

		// Clear session cookie
		clearAuthCookie({ cookies, url: new URL('http://localhost') } as any);

		return json({ success: true });
	} catch (error) {
		console.error('Logout API error:', error);
		// Still clear the cookie even if logout fails
		clearAuthCookie({ cookies, url: new URL('http://localhost') } as any);
		return json({ success: true });
	}
};