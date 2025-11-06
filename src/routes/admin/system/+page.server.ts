/**
 * System status page server load function
 * Provides initial system health data for the admin system status page
 */

import type { PageServerLoad } from './$types';
import { requireAuth, requireAdminRole } from '$lib/auth/middleware';
import { getServiceHealthStatus } from '$lib/clubs';

export const load: PageServerLoad = async (event) => {
	// Check authentication
	const authResult = await requireAuth(event);
	if (!authResult.success) {
		throw new Error('Authentication required');
	}

	// Check admin role
	const adminResult = await requireAdminRole(event);
	if (!adminResult.success) {
		throw new Error('Admin access required');
	}

	try {
		// Get initial system health status
		const healthStatus = await getServiceHealthStatus();
		
		return {
			initialHealthStatus: healthStatus,
			timestamp: new Date().toISOString()
		};
		
	} catch (error) {
		console.error('Failed to load system status:', error);
		
		// Return minimal data if health check fails
		return {
			initialHealthStatus: {
				database: false,
				fallback: false,
				cache: { size: 0, enabled: false, hits: 0, misses: 0, hitRate: 0 },
				connections: { totalConnections: 0, activeConnections: 0, healthyConnections: 0 }
			},
			timestamp: new Date().toISOString(),
			error: 'Failed to retrieve system health status'
		};
	}
};