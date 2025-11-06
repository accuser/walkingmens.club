/**
 * Subdomain status API endpoint
 * GET /api/admin/subdomains/status - Get status of all configured subdomains
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, requireAdminRole } from '$lib/auth';
import { HostnameValidationService } from '$lib/admin/hostnameValidation';

export const GET: RequestHandler = async (event) => {
	try {
		// Check authentication
		const authResult = await requireAuth(event);
		if (!authResult.authenticated || !authResult.user) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Check admin role
		if (!requireAdminRole(authResult.user)) {
			return json({ error: 'Admin access required' }, { status: 403 });
		}

		if (!event.platform?.env?.DB) {
			return json({ error: 'Database not available' }, { status: 500 });
		}

		const validationService = new HostnameValidationService(event.platform.env.DB);
		const statuses = await validationService.getAllSubdomainStatuses();

		return json({
			success: true,
			subdomains: statuses
		});
	} catch (error) {
		console.error('Subdomain status API error:', error);
		return json({ error: 'Failed to get subdomain statuses' }, { status: 500 });
	}
};
