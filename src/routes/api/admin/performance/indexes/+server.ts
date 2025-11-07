/**
 * Performance indexes API endpoint
 * GET /api/admin/performance/indexes
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { QueryOptimizerService } from '$lib/services/queryOptimizer';
import { getDatabase } from '$lib/config/database';
import { requireAuth } from '$lib/auth/middleware';

/**
 * GET /api/admin/performance/indexes
 * Get index recommendations
 */
export const GET: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const db = getDatabase(platform);
		const optimizer = new QueryOptimizerService(db);

		// Get index recommendations
		const recommendations = await optimizer.getIndexRecommendations();

		// Get database statistics
		const dbStats = await optimizer.getDatabaseStats();

		return json({
			success: true,
			data: {
				recommendations,
				dbStats,
				timestamp: new Date().toISOString()
			}
		});
	} catch (err) {
		console.error('Failed to get index recommendations:', err);
		throw error(500, 'Failed to retrieve index recommendations');
	}
};
