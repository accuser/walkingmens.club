#!/usr/bin/env tsx
/**
 * Club data migration script
 * Migrates static club configurations to Cloudflare D1 database
 *
 * Usage:
 *   npm run migrate:clubs [options]
 *
 * Options:
 *   --dry-run     Validate data without making changes
 *   --validate    Only validate data, don't migrate
 *   --rollback    Rollback to backup data (requires backup file)
 *   --backup-file Path to backup file for rollback
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Import club data and migration utilities
import { getStaticClubs } from '../src/lib/clubs/index';
import { ClubMigrationService } from '../src/lib/database/migration';
import type { ClubConfig } from '../src/lib/clubs/types';
import type { D1Database } from '../src/lib/database/types';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isValidateOnly = args.includes('--validate');
const isRollback = args.includes('--rollback');
const backupFileIndex = args.indexOf('--backup-file');
const backupFile = backupFileIndex !== -1 ? args[backupFileIndex + 1] : null;

/**
 * Mock D1 database for development/testing
 * In production, this would be replaced with actual Cloudflare D1 instance
 */
class MockD1Database implements D1Database {
	private data = new Map<string, unknown>();

	prepare() {
		const mockStatement = {
			bind: () => mockStatement,
			first: async () => null,
			all: async () => ({
				results: [],
				success: true,
				meta: {
					duration: 0,
					size_after: 0,
					rows_read: 0,
					rows_written: 0,
					last_row_id: 1,
					changed_db: false,
					changes: 0
				}
			}),
			run: async () => ({
				success: true,
				meta: {
					duration: 0,
					size_after: 0,
					rows_read: 0,
					rows_written: 0,
					last_row_id: 1,
					changed_db: false,
					changes: 0
				}
			})
		};
		return mockStatement;
	}

	async batch(statements: unknown[]) {
		return statements.map(() => ({
			success: true,
			meta: {
				duration: 0,
				size_after: 0,
				rows_read: 0,
				rows_written: 0,
				last_row_id: 1,
				changed_db: false,
				changes: 0
			}
		}));
	}

	async dump() {
		return new ArrayBuffer(0);
	}

	async exec() {
		return { count: 0, duration: 0 };
	}
}

/**
 * Create backup file
 */
function createBackupFile(clubs: ClubConfig[], filename?: string): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupFilename = filename || `club-backup-${timestamp}.json`;
	const backupPath = join(process.cwd(), 'backups', backupFilename);

	// Ensure backups directory exists
	const backupsDir = join(process.cwd(), 'backups');
	if (!existsSync(backupsDir)) {
		mkdirSync(backupsDir, { recursive: true });
	}

	writeFileSync(backupPath, JSON.stringify(clubs, null, 2));
	return backupPath;
}

/**
 * Load backup file
 */
function loadBackupFile(filename: string): ClubConfig[] {
	const backupPath = join(process.cwd(), 'backups', filename);

	if (!existsSync(backupPath)) {
		throw new Error(`Backup file not found: ${backupPath}`);
	}

	const backupData = readFileSync(backupPath, 'utf-8');
	return JSON.parse(backupData);
}

/**
 * Main migration function
 */
async function runMigration() {
	console.log('🚀 Club Data Migration Script');
	console.log('================================');

	try {
		// Initialize database (in production, this would be the actual D1 instance)
		const db = new MockD1Database();
		const migrationService = new ClubMigrationService(db);

		if (isRollback) {
			// Rollback operation
			if (!backupFile) {
				console.error('❌ Error: --backup-file is required for rollback operation');
				process.exit(1);
			}

			console.log(`📦 Loading backup from: ${backupFile}`);
			const backupData = loadBackupFile(backupFile);

			console.log(`🔄 Rolling back to backup with ${backupData.length} clubs...`);
			const result = await migrationService.rollbackMigration(backupData);

			if (result.success) {
				console.log('✅ Rollback completed successfully');
				console.log(`📊 Restored clubs: ${result.migratedClubs.join(', ')}`);
			} else {
				console.error('❌ Rollback failed:');
				result.errors.forEach((error) => console.error(`   - ${error}`));
				process.exit(1);
			}
		} else {
			// Forward migration
			console.log('📋 Loading static club data...');
			const staticClubs = getStaticClubs();
			console.log(`📊 Found ${staticClubs.length} clubs to migrate:`);
			staticClubs.forEach((club) => console.log(`   - ${club.id} (${club.hostname})`));

			if (staticClubs.length === 0) {
				console.log('ℹ️  No clubs found to migrate');
				return;
			}

			// Check current database status
			console.log('\n🔍 Checking database status...');
			const status = await migrationService.getMigrationStatus();
			console.log(`📊 Current database: ${status.databaseClubCount} clubs`);
			if (status.hasData) {
				console.log(`   Existing clubs: ${status.databaseClubs.join(', ')}`);
			}

			// Run migration
			const options = {
				dryRun: isDryRun,
				validateOnly: isValidateOnly,
				createBackup: !isDryRun && !isValidateOnly
			};

			if (isDryRun) {
				console.log('\n🧪 Running dry run (no changes will be made)...');
			} else if (isValidateOnly) {
				console.log('\n✅ Running validation only...');
			} else {
				console.log('\n🚀 Running migration...');
			}

			const result = await migrationService.migrateStaticData(staticClubs, options);

			if (result.success) {
				console.log('✅ Migration completed successfully');

				if (result.rollbackData && !isDryRun && !isValidateOnly) {
					const backupPath = createBackupFile(result.rollbackData);
					console.log(`💾 Backup created: ${backupPath}`);
				}

				if (result.migratedClubs.length > 0) {
					console.log(`📊 Processed clubs: ${result.migratedClubs.join(', ')}`);
				}

				// Verify data integrity if not dry run
				if (!isDryRun && !isValidateOnly) {
					console.log('\n🔍 Verifying data integrity...');
					const integrity = await migrationService.verifyDataIntegrity(staticClubs);

					if (integrity.isValid) {
						console.log('✅ Data integrity verification passed');
					} else {
						console.warn('⚠️  Data integrity issues found:');
						if (integrity.missingClubs.length > 0) {
							console.warn(`   Missing clubs: ${integrity.missingClubs.join(', ')}`);
						}
						if (integrity.mismatchedClubs.length > 0) {
							console.warn(`   Mismatched clubs: ${integrity.mismatchedClubs.join(', ')}`);
						}
						integrity.errors.forEach((error) => console.error(`   - ${error}`));
					}
				}
			} else {
				console.error('❌ Migration failed:');
				result.errors.forEach((error) => console.error(`   - ${error}`));
				process.exit(1);
			}
		}

		console.log('\n🎉 Migration script completed');
	} catch (error) {
		console.error('💥 Migration script failed:', error);
		process.exit(1);
	}
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
	console.log(`
Club Data Migration Script

Usage:
  npm run migrate:clubs [options]

Options:
  --dry-run           Validate data without making changes
  --validate          Only validate data, don't migrate  
  --rollback          Rollback to backup data
  --backup-file FILE  Path to backup file for rollback
  --help, -h          Show this help message

Examples:
  npm run migrate:clubs --dry-run
  npm run migrate:clubs --validate
  npm run migrate:clubs
  npm run migrate:clubs --rollback --backup-file club-backup-2024-01-01.json
`);
	process.exit(0);
}

// Run the migration
runMigration().catch((error) => {
	console.error('💥 Unhandled error:', error);
	process.exit(1);
});
