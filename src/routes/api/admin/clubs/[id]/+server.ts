/**
 * Admin API endpoints for individual club management
 * GET /api/admin/clubs/[id] - Get specific club
 * PUT /api/admin/clubs/[id] - Update club
 * DELETE /api/admin/clubs/[id] - Delete club
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, requireAdminRole } from '$lib/auth';
import { D1ClubDatabaseService } from '$lib/database/clubDatabase';
import { ValidationError } from '$lib/database/validation';
import { HostnameValidationService } from '$lib/admin/hostnameValidation';

/**
 * GET /api/admin/clubs/[id] - Get specific club
 */
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

		const { id } = event.params;
		const clubService = new D1ClubDatabaseService(event.platform.env.DB);

		// Try to get club by ID first, then by hostname as fallback
		let club = await clubService.getClubByHostname(id); // Using hostname as ID for now

		if (!club) {
			return json({ error: 'Club not found' }, { status: 404 });
		}

		return json({
			success: true,
			club
		});
	} catch (error) {
		console.error('Get club API error:', error);
		return json({ error: 'Failed to fetch club' }, { status: 500 });
	}
};

/**
 * PUT /api/admin/clubs/[id] - Update club
 */
export const PUT: RequestHandler = async (event) => {
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

		const { id } = event.params;
		const updates = await event.request.json();

		// Validate hostname if it's being updated
		if (updates.hostname) {
			const hostnameService = new HostnameValidationService(event.platform.env.DB);
			const hostnameValidation = await hostnameService.validateHostname(updates.hostname);

			if (!hostnameValidation.valid) {
				return json(
					{
						error: hostnameValidation.error || 'Invalid hostname',
						suggestions: hostnameValidation.suggestions
					},
					{ status: 400 }
				);
			}
		}

		const clubService = new D1ClubDatabaseService(event.platform.env.DB);

		try {
			const updatedClub = await clubService.updateClub(id, updates);

			return json({
				success: true,
				club: updatedClub
			});
		} catch (error) {
			if (error instanceof ValidationError) {
				return json({ error: error.message }, { status: 400 });
			}
			if (error instanceof Error && error.message.includes('not found')) {
				return json({ error: 'Club not found' }, { status: 404 });
			}
			throw error;
		}
	} catch (error) {
		console.error('Update club API error:', error);
		return json({ error: 'Failed to update club' }, { status: 500 });
	}
};

/**
 * DELETE /api/admin/clubs/[id] - Delete club
 */
export const DELETE: RequestHandler = async (event) => {
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

		const { id } = event.params;
		const clubService = new D1ClubDatabaseService(event.platform.env.DB);

		try {
			await clubService.deleteClub(id);

			return json({
				success: true,
				message: 'Club deleted successfully'
			});
		} catch (error) {
			if (error instanceof Error && error.message.includes('not found')) {
				return json({ error: 'Club not found' }, { status: 404 });
			}
			throw error;
		}
	} catch (error) {
		console.error('Delete club API error:', error);
		return json({ error: 'Failed to delete club' }, { status: 500 });
	}
};
