/**
 * Backup restore API endpoint
 * POST /api/admin/backup/restore
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BackupService } from '$lib/services/backupService';
import { getDatabase } from '$lib/config/database';
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
 * POST /api/admin/backup/restore
 * Restore from backup
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const {
			backupId,
			tables,
			validateData = true,
			createBackupBeforeRestore = true
		} = await request.json();

		if (!backupId) {
			throw error(400, 'Backup ID is required');
		}

		const service = getBackupService(platform);
		const result = await service.restoreFromBackup({
			backupId,
			tables,
			validateData,
			createBackupBeforeRestore
		});

		return json({
			success: result.success,
			data: result,
			message: result.success
				? `Successfully restored ${result.recordsRestored} records`
				: `Restore completed with errors: ${result.errors.join('; ')}`
		});
	} catch (err) {
		console.error('Restore failed:', err);
		throw error(500, `Restore failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
