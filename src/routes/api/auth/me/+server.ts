/**
 * Get current authenticated user API endpoint
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/auth';

export const GET: RequestHandler = async (event) => {
	try {
		const authResult = await requireAuth(event);

		if (!authResult.authenticated || !authResult.user) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		return json({
			user: {
				id: authResult.user.id,
				username: authResult.user.username,
				email: authResult.user.email,
				role: authResult.user.role,
				lastLoginAt: authResult.user.lastLoginAt
			}
		});
	} catch (error) {
		console.error('Get user API error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
