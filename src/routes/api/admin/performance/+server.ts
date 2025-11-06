/**
 * Performance monitoring API endpoints
 * Provides access to performance metrics, query analysis, and optimization recommendations
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { performanceMonitor } from '$lib/services/performanceMonitor';
import { QueryOptimizerService } from '$lib/services/queryOptimizer';
import { compressionService } from '$lib/services/compressionService';
import { getDatabase } from '$lib/config/database';
import { requireAuth } from '$lib/auth/middleware';

/**
 * GET /api/admin/performance
 * Get comprehensive performance statistics
 */
export const GET: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		// Get performance statistics
		const stats = performanceMonitor.getPerformanceStats();

		// Get performance alerts
		const alerts = performanceMonitor.getPerformanceAlerts();

		// Get optimization recommendations
		const recommendations = performanceMonitor.getOptimizationRecommendations();

		// Get compression statistics
		const compressionStats = compressionService.getCompressionStats();

		// Get slow queries
		const slowQueries = performanceMonitor.getSlowQueries(10);

		return json({
			success: true,
			data: {
				stats,
				alerts,
				recommendations,
				compressionStats,
				slowQueries,
				timestamp: new Date().toISOString()
			}
		});
	} catch (err) {
		console.error('Failed to get performance statistics:', err);
		throw error(500, 'Failed to retrieve performance data');
	}
};

/**
 * POST /api/admin/performance/analyze
 * Analyze specific query performance
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const { query } = await request.json();

		if (!query || typeof query !== 'string') {
			throw error(400, 'Query parameter is required');
		}

		const db = getDatabase(platform);
		const optimizer = new QueryOptimizerService(db);

		// Analyze the query
		const analysis = await optimizer.analyzeQuery(query);

		// Get optimization suggestions
		const optimization = optimizer.optimizeQuery(query);

		return json({
			success: true,
			data: {
				analysis,
				optimization,
				timestamp: new Date().toISOString()
			}
		});
	} catch (err) {
		console.error('Query analysis failed:', err);
		throw error(500, 'Query analysis failed');
	}
};

/**
 * GET /api/admin/performance/indexes
 * Get index recommendations
 */
export const GET_indexes: RequestHandler = async ({ platform, request }) => {
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

/**
 * POST /api/admin/performance/indexes/create
 * Create recommended indexes
 */
export const POST_createIndexes: RequestHandler = async ({ platform, request }) => {
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

/**
 * POST /api/admin/performance/clear
 * Clear performance metrics
 */
export const POST_clear: RequestHandler = async ({ platform, request }) => {
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

/**
 * GET /api/admin/performance/export
 * Export performance metrics for analysis
 */
export const GET_export: RequestHandler = async ({ platform, request }) => {
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
