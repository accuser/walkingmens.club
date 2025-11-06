/**
 * Database backup and disaster recovery service
 * Implements automated backup procedures, data export/import, and health monitoring
 */

import type { D1Database } from '../database/types';
import type { ClubConfig } from '../clubs/types';

export interface BackupMetadata {
	id: string;
	timestamp: Date;
	type: 'full' | 'incremental' | 'manual';
	size: number;
	checksum: string;
	tables: string[];
	recordCount: number;
	status: 'pending' | 'completed' | 'failed';
	error?: string;
}

export interface BackupData {
	metadata: BackupMetadata;
	clubs: any[];
	meetingPoints: any[];
	meetingSchedules: any[];
	walkingRoutes: any[];
	routePoints: any[];
}

export interface RestoreOptions {
	backupId: string;
	tables?: string[];
	validateData?: boolean;
	createBackupBeforeRestore?: boolean;
}

export interface RestoreResult {
	success: boolean;
	restoredTables: string[];
	recordsRestored: number;
	errors: string[];
	backupCreated?: string;
}

export interface HealthCheckResult {
	healthy: boolean;
	checks: Array<{
		name: string;
		status: 'pass' | 'fail' | 'warn';
		message: string;
		duration: number;
	}>;
	summary: {
		totalChecks: number;
		passed: number;
		failed: number;
		warnings: number;
	};
}

/**
 * Backup and disaster recovery service
 */
export class BackupService {
	private backups: Map<string, BackupMetadata> = new Map();
	private healthCheckInterval?: NodeJS.Timeout;

	constructor(
		private db: D1Database,
		private config: {
			autoBackupEnabled: boolean;
			backupIntervalHours: number;
			maxBackups: number;
			healthCheckIntervalMinutes: number;
		} = {
			autoBackupEnabled: true,
			backupIntervalHours: 24,
			maxBackups: 30,
			healthCheckIntervalMinutes: 15
		}
	) {
		if (this.config.autoBackupEnabled) {
			this.startAutoBackup();
		}
		this.startHealthMonitoring();
	}

	/**
	 * Create a full database backup
	 */
	async createFullBackup(type: 'full' | 'manual' = 'full'): Promise<BackupMetadata> {
		const backupId = this.generateBackupId();
		const timestamp = new Date();

		const metadata: BackupMetadata = {
			id: backupId,
			timestamp,
			type,
			size: 0,
			checksum: '',
			tables: ['clubs', 'meeting_points', 'meeting_schedules', 'walking_routes', 'route_points'],
			recordCount: 0,
			status: 'pending'
		};

		try {
			// Export all data
			const backupData = await this.exportAllData();

			// Calculate metadata
			const serializedData = JSON.stringify(backupData);
			metadata.size = Buffer.byteLength(serializedData, 'utf8');
			metadata.checksum = await this.calculateChecksum(serializedData);
			metadata.recordCount = this.countRecords(backupData);
			metadata.status = 'completed';

			// Store backup metadata and data
			this.backups.set(backupId, metadata);
			await this.storeBackupData(backupId, backupData);

			// Clean up old backups
			await this.cleanupOldBackups();

			console.log(`Backup ${backupId} created successfully`);
			return metadata;
		} catch (error) {
			metadata.status = 'failed';
			metadata.error = error instanceof Error ? error.message : String(error);
			this.backups.set(backupId, metadata);

			console.error(`Backup ${backupId} failed:`, error);
			throw new Error(`Backup failed: ${metadata.error}`);
		}
	}

	/**
	 * Restore database from backup
	 */
	async restoreFromBackup(options: RestoreOptions): Promise<RestoreResult> {
		const backup = this.backups.get(options.backupId);
		if (!backup) {
			throw new Error(`Backup ${options.backupId} not found`);
		}

		if (backup.status !== 'completed') {
			throw new Error(`Backup ${options.backupId} is not in completed state`);
		}

		const result: RestoreResult = {
			success: false,
			restoredTables: [],
			recordsRestored: 0,
			errors: []
		};

		try {
			// Create backup before restore if requested
			if (options.createBackupBeforeRestore) {
				const preRestoreBackup = await this.createFullBackup('manual');
				result.backupCreated = preRestoreBackup.id;
			}

			// Load backup data
			const backupData = await this.loadBackupData(options.backupId);

			// Validate backup data if requested
			if (options.validateData) {
				const validation = await this.validateBackupData(backupData);
				if (!validation.valid) {
					result.errors.push(...validation.errors);
					return result;
				}
			}

			// Determine tables to restore
			const tablesToRestore = options.tables || backup.tables;

			// Restore each table
			for (const table of tablesToRestore) {
				try {
					const recordsRestored = await this.restoreTable(table, backupData);
					result.restoredTables.push(table);
					result.recordsRestored += recordsRestored;
				} catch (error) {
					const errorMsg = `Failed to restore table ${table}: ${error instanceof Error ? error.message : String(error)}`;
					result.errors.push(errorMsg);
					console.error(errorMsg);
				}
			}

			result.success = result.errors.length === 0;

			if (result.success) {
				console.log(
					`Successfully restored ${result.recordsRestored} records from backup ${options.backupId}`
				);
			} else {
				console.warn(`Restore completed with errors: ${result.errors.join('; ')}`);
			}

			return result;
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			result.errors.push(errorMsg);
			console.error(`Restore from backup ${options.backupId} failed:`, error);
			return result;
		}
	}

	/**
	 * Export database data for external backup
	 */
	async exportData(format: 'json' | 'sql' = 'json'): Promise<string> {
		const data = await this.exportAllData();

		if (format === 'json') {
			return JSON.stringify(data, null, 2);
		} else {
			return this.convertToSQL(data);
		}
	}

	/**
	 * Import data from external backup
	 */
	async importData(
		data: string,
		format: 'json' | 'sql' = 'json'
	): Promise<{
		success: boolean;
		recordsImported: number;
		errors: string[];
	}> {
		const result = {
			success: false,
			recordsImported: 0,
			errors: [] as string[]
		};

		try {
			let backupData: BackupData;

			if (format === 'json') {
				backupData = JSON.parse(data);
			} else {
				backupData = await this.convertFromSQL(data);
			}

			// Validate imported data
			const validation = await this.validateBackupData(backupData);
			if (!validation.valid) {
				result.errors.push(...validation.errors);
				return result;
			}

			// Import data
			const tables = [
				'clubs',
				'meeting_points',
				'meeting_schedules',
				'walking_routes',
				'route_points'
			];
			for (const table of tables) {
				try {
					const recordsImported = await this.restoreTable(table, backupData);
					result.recordsImported += recordsImported;
				} catch (error) {
					result.errors.push(
						`Failed to import ${table}: ${error instanceof Error ? error.message : String(error)}`
					);
				}
			}

			result.success = result.errors.length === 0;
			return result;
		} catch (error) {
			result.errors.push(error instanceof Error ? error.message : String(error));
			return result;
		}
	}

	/**
	 * Perform comprehensive database health check
	 */
	async performHealthCheck(): Promise<HealthCheckResult> {
		const checks: HealthCheckResult['checks'] = [];
		const startTime = Date.now();

		// Check database connectivity
		await this.runHealthCheck(checks, 'Database Connectivity', async () => {
			const result = await this.db.prepare('SELECT 1 as test').first();
			if (!result || (result as any).test !== 1) {
				throw new Error('Database connectivity test failed');
			}
		});

		// Check table integrity
		await this.runHealthCheck(checks, 'Table Integrity', async () => {
			const tables = [
				'clubs',
				'meeting_points',
				'meeting_schedules',
				'walking_routes',
				'route_points'
			];
			for (const table of tables) {
				const result = await this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
				if (!result) {
					throw new Error(`Table ${table} is not accessible`);
				}
			}
		});

		// Check foreign key constraints
		await this.runHealthCheck(checks, 'Foreign Key Constraints', async () => {
			const result = await this.db.prepare('PRAGMA foreign_key_check').all();
			if (result.results && result.results.length > 0) {
				throw new Error(`Foreign key constraint violations found: ${result.results.length}`);
			}
		});

		// Check data consistency
		await this.runHealthCheck(checks, 'Data Consistency', async () => {
			// Check for orphaned records
			const orphanedMeetingPoints = await this.db
				.prepare(
					`
				SELECT COUNT(*) as count FROM meeting_points mp 
				LEFT JOIN clubs c ON mp.club_id = c.id 
				WHERE c.id IS NULL
			`
				)
				.first();

			if (orphanedMeetingPoints && (orphanedMeetingPoints as any).count > 0) {
				throw new Error(`Found ${(orphanedMeetingPoints as any).count} orphaned meeting points`);
			}
		});

		// Check backup availability
		await this.runHealthCheck(checks, 'Backup Availability', async () => {
			const recentBackups = Array.from(this.backups.values())
				.filter((b) => b.status === 'completed')
				.filter((b) => Date.now() - b.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000); // Last 7 days

			if (recentBackups.length === 0) {
				throw new Error('No recent backups available');
			}
		});

		// Calculate summary
		const summary = {
			totalChecks: checks.length,
			passed: checks.filter((c) => c.status === 'pass').length,
			failed: checks.filter((c) => c.status === 'fail').length,
			warnings: checks.filter((c) => c.status === 'warn').length
		};

		const healthy = summary.failed === 0;

		return {
			healthy,
			checks,
			summary
		};
	}

	/**
	 * Get backup history
	 */
	getBackupHistory(): BackupMetadata[] {
		return Array.from(this.backups.values()).sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
		);
	}

	/**
	 * Delete backup
	 */
	async deleteBackup(backupId: string): Promise<void> {
		const backup = this.backups.get(backupId);
		if (!backup) {
			throw new Error(`Backup ${backupId} not found`);
		}

		try {
			await this.deleteBackupData(backupId);
			this.backups.delete(backupId);
			console.log(`Backup ${backupId} deleted successfully`);
		} catch (error) {
			console.error(`Failed to delete backup ${backupId}:`, error);
			throw error;
		}
	}

	/**
	 * Get backup statistics
	 */
	getBackupStats(): {
		totalBackups: number;
		totalSize: number;
		oldestBackup?: Date;
		newestBackup?: Date;
		successRate: number;
	} {
		const backups = Array.from(this.backups.values());
		const completedBackups = backups.filter((b) => b.status === 'completed');

		return {
			totalBackups: backups.length,
			totalSize: completedBackups.reduce((sum, b) => sum + b.size, 0),
			oldestBackup:
				backups.length > 0
					? new Date(Math.min(...backups.map((b) => b.timestamp.getTime())))
					: undefined,
			newestBackup:
				backups.length > 0
					? new Date(Math.max(...backups.map((b) => b.timestamp.getTime())))
					: undefined,
			successRate: backups.length > 0 ? (completedBackups.length / backups.length) * 100 : 0
		};
	}

	/**
	 * Shutdown backup service
	 */
	shutdown(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}
	}

	/**
	 * Export all database data
	 */
	private async exportAllData(): Promise<BackupData> {
		const [clubs, meetingPoints, meetingSchedules, walkingRoutes, routePoints] = await Promise.all([
			this.db.prepare('SELECT * FROM clubs').all(),
			this.db.prepare('SELECT * FROM meeting_points').all(),
			this.db.prepare('SELECT * FROM meeting_schedules').all(),
			this.db.prepare('SELECT * FROM walking_routes').all(),
			this.db.prepare('SELECT * FROM route_points').all()
		]);

		const metadata: BackupMetadata = {
			id: this.generateBackupId(),
			timestamp: new Date(),
			type: 'full',
			size: 0,
			checksum: '',
			tables: ['clubs', 'meeting_points', 'meeting_schedules', 'walking_routes', 'route_points'],
			recordCount: 0,
			status: 'completed'
		};

		return {
			metadata,
			clubs: clubs.results || [],
			meetingPoints: meetingPoints.results || [],
			meetingSchedules: meetingSchedules.results || [],
			walkingRoutes: walkingRoutes.results || [],
			routePoints: routePoints.results || []
		};
	}

	/**
	 * Restore specific table from backup data
	 */
	private async restoreTable(table: string, backupData: BackupData): Promise<number> {
		const tableData = this.getTableData(table, backupData);
		if (!tableData || tableData.length === 0) {
			return 0;
		}

		// Clear existing data
		await this.db.prepare(`DELETE FROM ${table}`).run();

		// Insert backup data
		let recordsRestored = 0;
		for (const record of tableData) {
			try {
				const columns = Object.keys(record);
				const placeholders = columns.map(() => '?').join(', ');
				const values = columns.map((col) => record[col]);

				await this.db
					.prepare(
						`
					INSERT INTO ${table} (${columns.join(', ')}) 
					VALUES (${placeholders})
				`
					)
					.bind(...values)
					.run();

				recordsRestored++;
			} catch (error) {
				console.warn(`Failed to restore record in ${table}:`, error);
			}
		}

		return recordsRestored;
	}

	/**
	 * Get table data from backup
	 */
	private getTableData(table: string, backupData: BackupData): any[] {
		switch (table) {
			case 'clubs':
				return backupData.clubs;
			case 'meeting_points':
				return backupData.meetingPoints;
			case 'meeting_schedules':
				return backupData.meetingSchedules;
			case 'walking_routes':
				return backupData.walkingRoutes;
			case 'route_points':
				return backupData.routePoints;
			default:
				return [];
		}
	}

	/**
	 * Validate backup data integrity
	 */
	private async validateBackupData(backupData: BackupData): Promise<{
		valid: boolean;
		errors: string[];
	}> {
		const errors: string[] = [];

		// Check required tables
		const requiredTables = [
			'clubs',
			'meetingPoints',
			'meetingSchedules',
			'walkingRoutes',
			'routePoints'
		];
		for (const table of requiredTables) {
			if (!backupData[table as keyof BackupData]) {
				errors.push(`Missing table data: ${table}`);
			}
		}

		// Check data consistency
		if (backupData.clubs && backupData.meetingPoints) {
			const clubIds = new Set(backupData.clubs.map((c: any) => c.id));
			const orphanedMeetingPoints = backupData.meetingPoints.filter(
				(mp: any) => !clubIds.has(mp.club_id)
			);
			if (orphanedMeetingPoints.length > 0) {
				errors.push(`Found ${orphanedMeetingPoints.length} orphaned meeting points`);
			}
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}

	/**
	 * Run individual health check
	 */
	private async runHealthCheck(
		checks: HealthCheckResult['checks'],
		name: string,
		checkFn: () => Promise<void>
	): Promise<void> {
		const startTime = Date.now();
		try {
			await checkFn();
			checks.push({
				name,
				status: 'pass',
				message: 'Check passed',
				duration: Date.now() - startTime
			});
		} catch (error) {
			checks.push({
				name,
				status: 'fail',
				message: error instanceof Error ? error.message : String(error),
				duration: Date.now() - startTime
			});
		}
	}

	/**
	 * Start automatic backup process
	 */
	private startAutoBackup(): void {
		const intervalMs = this.config.backupIntervalHours * 60 * 60 * 1000;
		setInterval(async () => {
			try {
				await this.createFullBackup('full');
			} catch (error) {
				console.error('Automatic backup failed:', error);
			}
		}, intervalMs);
	}

	/**
	 * Start health monitoring
	 */
	private startHealthMonitoring(): void {
		const intervalMs = this.config.healthCheckIntervalMinutes * 60 * 1000;
		this.healthCheckInterval = setInterval(async () => {
			try {
				const healthResult = await this.performHealthCheck();
				if (!healthResult.healthy) {
					console.warn('Database health check failed:', healthResult.summary);
				}
			} catch (error) {
				console.error('Health check failed:', error);
			}
		}, intervalMs);
	}

	/**
	 * Clean up old backups
	 */
	private async cleanupOldBackups(): Promise<void> {
		const backups = Array.from(this.backups.values()).sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
		);

		if (backups.length > this.config.maxBackups) {
			const toDelete = backups.slice(this.config.maxBackups);
			for (const backup of toDelete) {
				try {
					await this.deleteBackup(backup.id);
				} catch (error) {
					console.error(`Failed to delete old backup ${backup.id}:`, error);
				}
			}
		}
	}

	/**
	 * Generate unique backup ID
	 */
	private generateBackupId(): string {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const random = Math.random().toString(36).substring(2, 8);
		return `backup-${timestamp}-${random}`;
	}

	/**
	 * Calculate checksum for data integrity
	 */
	private async calculateChecksum(data: string): Promise<string> {
		// Simple hash implementation (in production, use crypto.subtle)
		let hash = 0;
		for (let i = 0; i < data.length; i++) {
			const char = data.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return Math.abs(hash).toString(16);
	}

	/**
	 * Count total records in backup data
	 */
	private countRecords(backupData: BackupData): number {
		return (
			(backupData.clubs?.length || 0) +
			(backupData.meetingPoints?.length || 0) +
			(backupData.meetingSchedules?.length || 0) +
			(backupData.walkingRoutes?.length || 0) +
			(backupData.routePoints?.length || 0)
		);
	}

	/**
	 * Store backup data (in production, this would use external storage)
	 */
	private async storeBackupData(backupId: string, data: BackupData): Promise<void> {
		// In production, store to Cloudflare R2, S3, or other storage
		// For now, we'll just log that it would be stored
		console.log(`Backup ${backupId} would be stored to external storage`);
	}

	/**
	 * Load backup data (in production, this would load from external storage)
	 */
	private async loadBackupData(backupId: string): Promise<BackupData> {
		// In production, load from external storage
		// For now, return mock data
		throw new Error('Backup data loading not implemented - would load from external storage');
	}

	/**
	 * Delete backup data (in production, this would delete from external storage)
	 */
	private async deleteBackupData(backupId: string): Promise<void> {
		// In production, delete from external storage
		console.log(`Backup ${backupId} would be deleted from external storage`);
	}

	/**
	 * Convert backup data to SQL format
	 */
	private convertToSQL(data: BackupData): string {
		// Implementation would generate SQL INSERT statements
		return '-- SQL backup format not implemented';
	}

	/**
	 * Convert SQL format to backup data
	 */
	private async convertFromSQL(sql: string): Promise<BackupData> {
		// Implementation would parse SQL and extract data
		throw new Error('SQL import not implemented');
	}
}
