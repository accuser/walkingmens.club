/**
 * Subdomain health monitoring API endpoint
 * GET /api/admin/subdomains/health - Get health status of all configured subdomains
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth, requireAdminRole } from '$lib/auth';
import { getAllClubs, getServiceHealthStatus } from '$lib/clubs';

interface SubdomainHealthStatus {
	hostname: string;
	clubName: string;
	status: 'healthy' | 'degraded' | 'unhealthy';
	accessible: boolean;
	responseTime?: number;
	lastChecked: string;
	issues: string[];
}

/**
 * Check if a subdomain is accessible
 */
async function checkSubdomainHealth(
	hostname: string,
	clubName: string
): Promise<SubdomainHealthStatus> {
	const startTime = Date.now();
	const issues: string[] = [];
	let accessible = false;

	try {
		// In a real implementation, you might make an HTTP request to check accessibility
		// For now, we'll simulate the check based on system health
		const systemHealth = await getServiceHealthStatus();

		if (systemHealth.database) {
			accessible = true;
		} else if (systemHealth.fallback) {
			accessible = true;
			issues.push('Running on fallback data - some features may be limited');
		} else {
			accessible = false;
			issues.push('System unavailable - database and fallback both down');
		}

		const responseTime = Date.now() - startTime;

		// Determine overall status
		let status: 'healthy' | 'degraded' | 'unhealthy';
		if (!accessible) {
			status = 'unhealthy';
		} else if (issues.length > 0) {
			status = 'degraded';
		} else {
			status = 'healthy';
		}

		return {
			hostname,
			clubName,
			status,
			accessible,
			responseTime,
			lastChecked: new Date().toISOString(),
			issues
		};
	} catch (error) {
		return {
			hostname,
			clubName,
			status: 'unhealthy',
			accessible: false,
			lastChecked: new Date().toISOString(),
			issues: [`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
		};
	}
}

export const GET: RequestHandler = async (event) => {
	try {
		// Check authentication
		const authResult = await requireAuth(event);
		if (!authResult.success) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Check admin role
		const adminResult = await requireAdminRole(event);
		if (!adminResult.success) {
			return json({ error: 'Admin access required' }, { status: 403 });
		}

		// Get all clubs
		const clubs = await getAllClubs();

		// Check health of each subdomain
		const healthChecks = await Promise.all(
			clubs.map((club) => checkSubdomainHealth(club.hostname, club.name))
		);

		// Calculate summary statistics
		const summary = {
			total: healthChecks.length,
			healthy: healthChecks.filter((h) => h.status === 'healthy').length,
			degraded: healthChecks.filter((h) => h.status === 'degraded').length,
			unhealthy: healthChecks.filter((h) => h.status === 'unhealthy').length,
			accessible: healthChecks.filter((h) => h.accessible).length
		};

		// Get system health for context
		const systemHealth = await getServiceHealthStatus();

		return json({
			success: true,
			timestamp: new Date().toISOString(),
			summary,
			systemHealth: {
				database: systemHealth.database,
				fallback: systemHealth.fallback,
				cacheHitRate: systemHealth.cache.hitRate
			},
			subdomains: healthChecks.sort((a, b) => {
				// Sort by status (unhealthy first, then degraded, then healthy)
				const statusOrder = { unhealthy: 0, degraded: 1, healthy: 2 };
				return statusOrder[a.status] - statusOrder[b.status];
			})
		});
	} catch (error) {
		console.error('Subdomain health check API error:', error);
		return json(
			{
				error: 'Failed to check subdomain health',
				timestamp: new Date().toISOString()
			},
			{ status: 500 }
		);
	}
};
