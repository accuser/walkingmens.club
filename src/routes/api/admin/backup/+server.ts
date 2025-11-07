/**
 * Backup and disaster recovery API endpoints
 * Provides backup creation, restoration, and health monitoring functionality
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BackupService } from '$lib/services/backupService';
import { getDatabase } from '$lib/config/database';
import { requireAuth } from '$lib/auth/middleware';

// Global backup service instance (in production, this would be properly managed)
let backupService: BackupService | null = null;

function getBackupService(platform: App.Platform): BackupService {
	if (!backupService) {
		const db = getDatabase(platform);
		backupService = new BackupService(db);
	}
	return backupService;
}

/**
 * GET /api/admin/backup
 * Get backup history and statistics
 */
export const GET: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const service = getBackupService(platform);

		const history = service.getBackupHistory();
		const stats = service.getBackupStats();

		return json({
			success: true,
			data: {
				history,
				stats,
				timestamp: new Date().toISOString()
			}
		});
	} catch (err) {
		console.error('Failed to get backup information:', err);
		throw error(500, 'Failed to retrieve backup information');
	}
};

/**
 * POST /api/admin/backup/create
 * Create a new backup
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const { type = 'manual' } = await request.json().catch(() => ({}));

		if (!['full', 'manual'].includes(type)) {
			throw error(400, 'Invalid backup type. Must be "full" or "manual"');
		}

		const service = getBackupService(platform);
		const backup = await service.createFullBackup(type);

		return json({
			success: true,
			data: {
				backup,
				message: `Backup ${backup.id} created successfully`
			}
		});
	} catch (err) {
		console.error('Backup creation failed:', err);
		throw error(
			500,
			`Backup creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
		);
	}
};
