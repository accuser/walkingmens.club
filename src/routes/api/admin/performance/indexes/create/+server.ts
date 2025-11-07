/**
 * Create performance indexes API endpoint
 * POST /api/admin/performance/indexes/create
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { QueryOptimizerService } from '$lib/services/queryOptimizer';
import { getDatabase } from '$lib/config/database';
import { requireAuth } from '$lib/auth/middleware';

/**
 * POST /api/admin/performance/indexes/create
 * Create recommended indexes
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const { recommendations } = await request.json();

		if (!Array.isArray(recommendations)) {
			throw error(400, 'Recommendations array is required');
		}

		const db = getDatabase(platform);
		const optimizer = new QueryOptimizerService(db);

		// Create the recommended indexes
		const result = await optimizer.createRecommendedIndexes(recommendations);

		return json({
			success: true,
			data: {
				created: result.created,
				failed: result.failed,
				timestamp: new Date().toISOString()
			}
		});
	} catch (err) {
		console.error('Failed to create indexes:', err);
		throw error(500, 'Failed to create indexes');
	}
};
