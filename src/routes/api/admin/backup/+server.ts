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
		throw error(500, `Backup creation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};

/**
 * POST /api/admin/backup/restore
 * Restore from backup
 */
export const POST_restore: RequestHandler = async ({ platform, request }) => {
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
		throw error(500, `Backup deletion failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
	}
};

/**
 * GET /api/admin/backup/export
 * Export database data
 */
export const GET_export: RequestHandler = async ({ platform, request, url }) => {
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

/**
 * POST /api/admin/backup/import
 * Import database data
 */
export const POST_import: RequestHandler = async ({ platform, request }) => {
	// Require admin authentication
	const authResult = await requireAuth(request, platform);
	if (!authResult.success) {
		throw error(401, 'Authentication required');
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const format = formData.get('format') as string || 'json';
		
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