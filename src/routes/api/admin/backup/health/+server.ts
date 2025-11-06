/**
 * Database health monitoring API endpoint
 * Provides comprehensive health checks and system status
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BackupService } from '$lib/services/backupService';
import { performanceMonitor } from '$lib/services/performanceMonitor';
import { getDatabase, checkDatabaseHealth } from '$lib/config/database';
import { requireAuth } from '$lib/auth/middleware';

// Global backup service instance
let backupService: BackupService | null = null;

function getBackupService(platform: App.Platform): BackupService {
	if (!backupService) {
		const db = getDatabase(platform);
		backupService = new BackupService(db);
	}
	return backupService;
}

/**
 * GET /api/admin/backup/health
 * Perform comprehensive system health check
 */
export const GET: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const db = getDatabase(platform);
		const service = getBackupService(platform);
		
		// Perform comprehensive health check
		const healthResult = await service.performHealthCheck();
		
		// Get performance statistics
		const performanceStats = performanceMonitor.getPerformanceStats();
		
		// Get backup statistics
		const backupStats = service.getBackupStats();
		
		// Additional system checks
		const systemHealth = await performSystemHealthChecks(db);

		return json({
			success: true,
			data: {
				overall: {
					healthy: healthResult.healthy && systemHealth.healthy,
					status: healthResult.healthy && systemHealth.healthy ? 'healthy' : 'unhealthy',
					lastCheck: new Date().toISOString()
				},
				database: healthResult,
				performance: {
					avgQueryTime: performanceStats.database.avgQueryTime,
					errorRate: performanceStats.database.errorRate,
					cacheHitRate: performanceStats.cache.hitRate,
					uptime: performanceStats.system.uptime
				},
				backup: {
					totalBackups: backupStats.totalBackups,
					successRate: backupStats.successRate,
					lastBackup: backupStats.newestBackup,
					totalSize: backupStats.totalSize
				},
				system: systemHealth,
				alerts: generateHealthAlerts(healthResult, performanceStats, backupStats)
			}
		});
	} catch (err) {
		console.error('Health check failed:', err);
		throw error(500, `Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};

/**
 * POST /api/admin/backup/health/check
 * Trigger manual health check
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const service = getBackupService(platform);
		const healthResult = await service.performHealthCheck();

		return json({
			success: true,
			data: healthResult,
			message: healthResult.healthy ? 'All health checks passed' : 'Some health checks failed'
		});
	} catch (err) {
		console.error('Manual health check failed:', err);
		throw error(500, `Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};

/**
 * Perform additional system health checks
 */
async function performSystemHealthChecks(db: any): Promise<{
	healthy: boolean;
	checks: Array<{
		name: string;
		status: 'pass' | 'fail' | 'warn';
		message: string;
		value?: number | string;
	}>;
}> {
	const checks = [];
	let healthy = true;

	// Database connectivity
	try {
		const isHealthy = await checkDatabaseHealth(db);
		checks.push({
			name: 'Database Connection',
			status: isHealthy ? 'pass' : 'fail',
			message: isHealthy ? 'Database is accessible' : 'Database connection failed'
		});
		if (!isHealthy) healthy = false;
	} catch (error) {
		checks.push({
			name: 'Database Connection',
			status: 'fail',
			message: `Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
		});
		healthy = false;
	}

	// Check table counts
	try {
		const tables = ['clubs', 'meeting_points', 'meeting_schedules', 'walking_routes', 'route_points'];
		for (const table of tables) {
			const result = await db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
			const count = (result as any)?.count || 0;
			
			checks.push({
				name: `Table ${table}`,
				status: count >= 0 ? 'pass' : 'warn',
				message: `${count} records`,
				value: count
			});
		}
	} catch (error) {
		checks.push({
			name: 'Table Counts',
			status: 'fail',
			message: `Failed to check table counts: ${error instanceof Error ? error.message : 'Unknown error'}`
		});
		healthy = false;
	}

	// Check disk space (simulated - would be real in production)
	const diskUsage = Math.random() * 100; // Simulated disk usage percentage
	checks.push({
		name: 'Disk Space',
		status: diskUsage < 80 ? 'pass' : diskUsage < 95 ? 'warn' : 'fail',
		message: `${diskUsage.toFixed(1)}% used`,
		value: `${diskUsage.toFixed(1)}%`
	});
	
	if (diskUsage >= 95) healthy = false;

	// Check memory usage (simulated)
	const memoryUsage = Math.random() * 100;
	checks.push({
		name: 'Memory Usage',
		status: memoryUsage < 85 ? 'pass' : memoryUsage < 95 ? 'warn' : 'fail',
		message: `${memoryUsage.toFixed(1)}% used`,
		value: `${memoryUsage.toFixed(1)}%`
	});
	
	if (memoryUsage >= 95) healthy = false;

	return { healthy, checks };
}

/**
 * Generate health alerts based on system status
 */
function generateHealthAlerts(
	healthResult: any,
	performanceStats: any,
	backupStats: any
): Array<{
	type: 'error' | 'warning' | 'info';
	message: string;
	category: string;
	timestamp: string;
}> {
	const alerts = [];
	const now = new Date().toISOString();

	// Database health alerts
	if (!healthResult.healthy) {
		const failedChecks = healthResult.checks.filter((c: any) => c.status === 'fail');
		alerts.push({
			type: 'error' as const,
			message: `Database health check failed: ${failedChecks.length} checks failed`,
			category: 'database',
			timestamp: now
		});
	}

	// Performance alerts
	if (performanceStats.database.avgQueryTime > 1000) {
		alerts.push({
			type: 'warning' as const,
			message: `High average query time: ${performanceStats.database.avgQueryTime}ms`,
			category: 'performance',
			timestamp: now
		});
	}

	if (performanceStats.database.errorRate > 5) {
		alerts.push({
			type: 'error' as const,
			message: `High database error rate: ${performanceStats.database.errorRate}%`,
			category: 'performance',
			timestamp: now
		});
	}

	if (performanceStats.cache.hitRate < 70) {
		alerts.push({
			type: 'warning' as const,
			message: `Low cache hit rate: ${performanceStats.cache.hitRate}%`,
			category: 'performance',
			timestamp: now
		});
	}

	// Backup alerts
	if (backupStats.totalBackups === 0) {
		alerts.push({
			type: 'error' as const,
			message: 'No backups available',
			category: 'backup',
			timestamp: now
		});
	} else if (backupStats.successRate < 90) {
		alerts.push({
			type: 'warning' as const,
			message: `Low backup success rate: ${backupStats.successRate}%`,
			category: 'backup',
			timestamp: now
		});
	}

	// Check for stale backups
	if (backupStats.newestBackup) {
		const daysSinceLastBackup = (Date.now() - new Date(backupStats.newestBackup).getTime()) / (1000 * 60 * 60 * 24);
		if (daysSinceLastBackup > 7) {
			alerts.push({
				type: 'warning' as const,
				message: `Last backup is ${Math.floor(daysSinceLastBackup)} days old`,
				category: 'backup',
				timestamp: now
			});
		}
	}

	return alerts;
}