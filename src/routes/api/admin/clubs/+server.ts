/**
 * Admin API endpoints for club management
 * GET /api/admin/clubs - List all clubs
 * POST /api/admin/clubs - Create new club
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, requireAdminRole } from '$lib/auth';
import { D1ClubDatabaseService } from '$lib/database/clubDatabase';
import { ValidationError } from '$lib/database/validation';
import { HostnameValidationService } from '$lib/admin/hostnameValidation';

/**
 * GET /api/admin/clubs - List all clubs
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

		const clubService = new D1ClubDatabaseService(event.platform.env.DB);
		const clubs = await clubService.getAllClubs();

		return json({
			success: true,
			clubs: clubs.map((club) => ({
				...club,
				// Add metadata for admin interface
				createdAt: new Date().toISOString(), // This would come from database in real implementation
				updatedAt: new Date().toISOString()
			}))
		});
	} catch (error) {
		console.error('Get clubs API error:', error);
		return json({ error: 'Failed to fetch clubs' }, { status: 500 });
	}
};

/**
 * POST /api/admin/clubs - Create new club
 */
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

		const clubData = await event.request.json();

		// Validate required fields
		if (!clubData.name || !clubData.location || !clubData.hostname) {
			return json(
				{
					error: 'Missing required fields: name, location, hostname'
				},
				{ status: 400 }
			);
		}

		// Validate hostname
		const hostnameService = new HostnameValidationService(event.platform.env.DB);
		const hostnameValidation = await hostnameService.validateHostname(clubData.hostname);

		if (!hostnameValidation.valid || !hostnameValidation.available) {
			return json(
				{
					error: hostnameValidation.error || 'Invalid hostname',
					suggestions: hostnameValidation.suggestions
				},
				{ status: 400 }
			);
		}

		const clubService = new D1ClubDatabaseService(event.platform.env.DB);

		try {
			const newClub = await clubService.createClub(clubData);

			return json(
				{
					success: true,
					club: newClub
				},
				{ status: 201 }
			);
		} catch (error) {
			if (error instanceof ValidationError) {
				return json({ error: error.message }, { status: 400 });
			}
			throw error;
		}
	} catch (error) {
		console.error('Create club API error:', error);
		return json({ error: 'Failed to create club' }, { status: 500 });
	}
};
