/**
 * Database export API endpoint
 * GET /api/admin/backup/export
 */

import { error } from '@sveltejs/kit';
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
 * GET /api/admin/backup/export
 * Export database data
 */
export const GET: RequestHandler = async ({ platform, request, url }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const format = url.searchParams.get('format') || 'json';

		if (!['json', 'sql'].includes(format)) {
			throw error(400, 'Invalid format. Must be "json" or "sql"');
		}

		const service = getBackupService(platform);
		const exportData = await service.exportData(format as 'json' | 'sql');

		const contentType = format === 'json' ? 'application/json' : 'text/sql';
		const filename = `club-data-export-${Date.now()}.${format}`;

		return new Response(exportData, {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (err) {
		console.error('Data export failed:', err);
		throw error(500, `Data export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};
