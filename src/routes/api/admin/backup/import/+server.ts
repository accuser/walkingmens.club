/**
 * Database import API endpoint
 * POST /api/admin/backup/import
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
 * POST /api/admin/backup/import
 * Import database data
 */
export const POST: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const format = (formData.get('format') as string) || 'json';

		if (!file) {
			throw error(400, 'File is required');
		}

		if (!['json', 'sql'].includes(format)) {
			throw error(400, 'Invalid format. Must be "json" or "sql"');
		}

		const data = await file.text();
		const service = getBackupService(platform);
		const result = await service.importData(data, format as 'json' | 'sql');

		return json({
			success: result.success,
			data: result,
			message: result.success
				? `Successfully imported ${result.recordsImported} records`
				: `Import completed with errors: ${result.errors.join('; ')}`
		});
	} catch (err) {
		console.error('Data import failed:', err);
		throw error(500, `Data import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
