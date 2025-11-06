/**
 * Individual subdomain status API endpoint
 * GET /api/admin/subdomains/[hostname]/status - Check specific subdomain status
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

		const { hostname } = event.params;

		if (!hostname) {
			return json({ error: 'Hostname is required' }, { status: 400 });
		}

		const validationService = new HostnameValidationService(event.platform.env.DB);
		const status = await validationService.checkSubdomainStatus(hostname);

		return json({
			success: true,
			status
		});
	} catch (error) {
		console.error('Subdomain status check API error:', error);
		return json({ error: 'Failed to check subdomain status' }, { status: 500 });
	}
};
