/**
 * Admin login page server load and actions
 */

import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import { AuthService } from '$lib/auth/authService';
import { setAuthCookie, requireAuth } from '$lib/auth/middleware';

export const load: PageServerLoad = async (event) => {
	// Check if user is already authenticated
	const authResult = await requireAuth(event);

	if (authResult.authenticated) {
		// Redirect to admin dashboard if already logged in
		throw redirect(302, '/admin');
	}

	return {};
};

export const actions: Actions = {
	login: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username')?.toString();
		const password = formData.get('password')?.toString();

		if (!username || !password) {
			return fail(400, {
				error: 'Username and password are required',
				username
			});
		}

		if (!event.platform?.env?.DB) {
			return fail(500, {
				error: 'Database not available',
				username
			});
		}

		try {
			const authService = new AuthService(event.platform.env.DB);

			// Initialize default admin if needed
			await authService.initializeDefaultAdmin();

			const result = await authService.login(
				{ username, password },
				event.getClientAddress(),
				event.request.headers.get('user-agent') || undefined
			);

			if (!result.success) {
				return fail(401, {
					error: result.error || 'Login failed',
					username
				});
			}

			if (!result.session) {
				return fail(500, {
					error: 'Failed to create session',
					username
				});
			}

			// Set authentication cookie
			setAuthCookie(event, result.session.id);

			// Redirect to admin dashboard
			throw redirect(302, '/admin');
		} catch (error) {
			console.error('Login action error:', error);
			return fail(500, {
				error: 'An unexpected error occurred',
				username
			});
		}
	}
};
