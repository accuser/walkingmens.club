/**
 * Admin login API endpoint
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthService, setAuthCookie } from '$lib/auth';

export const POST: RequestHandler = async ({ request, platform, cookies, getClientAddress }) => {
	try {
		if (!platform?.env?.DB) {
			return json({ error: 'Database not available' }, { status: 500 });
		}

		const { username, password } = await request.json();

		if (!username || !password) {
			return json({ error: 'Username and password are required' }, { status: 400 });
		}

		const authService = new AuthService(platform.env.DB);
		const clientIP = getClientAddress();
		const userAgent = request.headers.get('user-agent') || undefined;

		const result = await authService.login(
			{ username, password },
			clientIP,
			userAgent
		);

		if (!result.success || !result.session) {
			return json({ error: result.error || 'Login failed' }, { status: 401 });
		}

		// Set session cookie
		setAuthCookie({ cookies, url: new URL(request.url) } as any, result.session.id);

		return json({
			success: true,
			user: {
				id: result.user!.id,
				username: result.user!.username,
				email: result.user!.email,
				role: result.user!.role
			}
		});
	} catch (error) {
		console.error('Login API error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};