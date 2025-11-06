/**
 * System health monitoring endpoint
 * GET /api/health - Get system health status
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceHealthStatus } from '$lib/clubs';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const healthStatus = await getServiceHealthStatus();

		// Determine overall system status
		const isHealthy = healthStatus.database || healthStatus.fallback;
		const status = isHealthy ? 'healthy' : 'unhealthy';

		// Include detailed metrics
		const response = {
			status,
			timestamp: new Date().toISOString(),
			services: {
				database: {
					available: healthStatus.database,
					status: healthStatus.database ? 'up' : 'down'
				},
				fallback: {
					available: healthStatus.fallback,
					status: healthStatus.fallback ? 'up' : 'down'
				},
				cache: {
					enabled: healthStatus.cache.enabled,
					size: healthStatus.cache.size,
					hitRate: healthStatus.cache.hitRate,
					hits: healthStatus.cache.hits,
					misses: healthStatus.cache.misses
				}
			},
			connections: healthStatus.connections
		};

		// Return appropriate HTTP status
		const httpStatus = isHealthy ? 200 : 503;

		return json(response, {
			status: httpStatus,
			headers: {
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0'
			}
		});
	} catch (error) {
		console.error('Health check endpoint error:', error);

		return json(
			{
				status: 'error',
				timestamp: new Date().toISOString(),
				error: 'Failed to retrieve system health status',
				services: {
					database: { available: false, status: 'unknown' },
					fallback: { available: false, status: 'unknown' },
					cache: { enabled: false, size: 0, hitRate: 0, hits: 0, misses: 0 }
				}
			},
			{
				status: 503,
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
					Pragma: 'no-cache',
					Expires: '0'
				}
			}
		);
	}
};
