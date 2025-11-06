/**
 * Hostname validation API endpoint
 * POST /api/admin/hostname/validate - Validate hostname availability and format
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, requireAdminRole } from '$lib/auth';
import { HostnameValidationService } from '$lib/admin/hostnameValidation';

export const POST: RequestHandler = async (event) => {
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

		const { hostname } = await event.request.json();

		if (!hostname) {
			return json({ error: 'Hostname is required' }, { status: 400 });
		}

		const validationService = new HostnameValidationService(event.platform.env.DB);
		const result = await validationService.validateHostname(hostname);

		return json({
			success: true,
			validation: result
		});
	} catch (error) {
		console.error('Hostname validation API error:', error);
		return json({ error: 'Failed to validate hostname' }, { status: 500 });
	}
};