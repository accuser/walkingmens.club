/**
 * Admin layout server load function
 * Handles authentication and authorization for admin routes
 */

import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/auth/middleware';

export const load: LayoutServerLoad = async (event) => {
	// Check authentication
	const authResult = await requireAuth(event);

	if (!authResult.authenticated) {
		// Redirect to login page
		throw redirect(302, '/admin/login');
	}

	// Return user data for the layout
	return {
		user: authResult.user
	};
};
