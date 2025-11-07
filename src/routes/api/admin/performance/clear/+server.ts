/**
 * Clear performance metrics API endpoint
 * POST /api/admin/performance/clear
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { performanceMonitor } from '$lib/services/performanceMonitor';
import { requireAuth } from '$lib/auth/middleware';

/**
 * POST /api/admin/performance/clear
 * Clear performance metrics
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		performanceMonitor.clearMetrics();

		return json({
			success: true,
			message: 'Performance metrics cleared',
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		console.error('Failed to clear metrics:', err);
		throw error(500, 'Failed to clear metrics');
	}
};
