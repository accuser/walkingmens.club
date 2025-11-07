/**
 * Individual backup API endpoint
 * DELETE /api/admin/backup/[id]
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
 * DELETE /api/admin/backup/[id]
 * Delete a backup
 */
export const DELETE: RequestHandler = async ({ platform, request, params }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const backupId = params.id;
		if (!backupId) {
			throw error(400, 'Backup ID is required');
		}

		const service = getBackupService(platform);
		await service.deleteBackup(backupId);

		return json({
			success: true,
			message: `Backup ${backupId} deleted successfully`
		});
	} catch (err) {
		console.error('Backup deletion failed:', err);
		throw error(
			500,
			`Backup deletion failed: ${err instanceof Error ? err.message : 'Unknown error'}`
		);
	}
};
