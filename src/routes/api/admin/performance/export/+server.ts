/**
 * Export performance metrics API endpoint
 * GET /api/admin/performance/export
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { performanceMonitor } from '$lib/services/performanceMonitor';
import { requireAuth } from '$lib/auth/middleware';

/**
 * GET /api/admin/performance/export
 * Export performance metrics for analysis
 */
export const GET: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const metrics = performanceMonitor.exportMetrics();

		// Create CSV-like export format
		const exportData = {
			exportTime: new Date().toISOString(),
			metrics,
			summary: performanceMonitor.getPerformanceStats()
		};

		return new Response(JSON.stringify(exportData, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="performance-metrics-${Date.now()}.json"`
			}
		});
	} catch (err) {
		console.error('Failed to export metrics:', err);
		throw error(500, 'Failed to export metrics');
	}
};
