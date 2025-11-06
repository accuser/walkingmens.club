/**
 * Data migration utilities for transferring static club data to D1 database
 * Provides migration, validation, and rollback capabilities
 */

import type { ClubConfig } from '../clubs/types';
import type { D1Database } from './types';
import { D1ClubDatabaseService } from './clubDatabase';
import { ValidationError } from './validation';

/**
 * Migration result interface
 */
export interface MigrationResult {
	success: boolean;
	migratedClubs: string[];
	errors: string[];
	rollbackData?: ClubConfig[];
}

/**
 * Migration options interface
 */
export interface MigrationOptions {
	dryRun?: boolean;
	validateOnly?: boolean;
	createBackup?: boolean;
}

/**
 * Club data migration service
 */
export class ClubMigrationService {
	private dbService: D1ClubDatabaseService;

	constructor(private db: D1Database) {
		this.dbService = new D1ClubDatabaseService(db);
	}

	/**
	 * Migrate static club data to database
	 */
	async migrateStaticData(
		staticClubs: ClubConfig[],
		options: MigrationOptions = {}
	): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			migratedClubs: [],
			errors: []
		};

		try {
			// Validate input data
			const validationErrors = await this.validateStaticData(staticClubs);
			if (validationErrors.length > 0) {
				result.errors = validationErrors;
				return result;
			}

			// Create backup if requested
			if (options.createBackup) {
				result.rollbackData = await this.createBackup();
			}

			// Dry run - just validate without making changes
			if (options.dryRun || options.validateOnly) {
				result.success = true;
				result.migratedClubs = staticClubs.map(club => club.id);
				return result;
			}

			// Perform actual migration
			for (const club of staticClubs) {
				try {
					// Check if club already exists
					const existingClub = await this.dbService.getClubByHostname(club.hostname);
					
					if (existingClub) {
						// Update existing club
						await this.dbService.updateClub(existingClub.id, club);
						result.migratedClubs.push(`${club.id} (updated)`);
					} else {
						// Create new club
						await this.dbService.createClub(club);
						result.migratedClubs.push(`${club.id} (created)`);
					}
				} catch (error) {
					const errorMessage = `Failed to migrate club ${club.id}: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`;
					result.errors.push(errorMessage);
					console.error(errorMessage, error);
				}
			}

			result.success = result.errors.length === 0;
			return result;

		} catch (error) {
			const errorMessage = `Migration failed: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`;
			result.errors.push(errorMessage);
			console.error(errorMessage, error);
			return result;
		}
	}

	/**
	 * Validate static club data before migration
	 */
	async validateStaticData(clubs: ClubConfig[]): Promise<string[]> {
		const errors: string[] = [];

		if (!clubs || clubs.length === 0) {
			errors.push('No club data provided for migration');
			return errors;
		}

		// Check for duplicate IDs
		const ids = clubs.map(club => club.id);
		const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
		if (duplicateIds.length > 0) {
			errors.push(`Duplicate club IDs found: ${duplicateIds.join(', ')}`);
		}

		// Check for duplicate hostnames
		const hostnames = clubs.map(club => club.hostname);
		const duplicateHostnames = hostnames.filter((hostname, index) => hostnames.indexOf(hostname) !== index);
		if (duplicateHostnames.length > 0) {
			errors.push(`Duplicate hostnames found: ${duplicateHostnames.join(', ')}`);
		}

		// Validate each club configuration
		for (const club of clubs) {
			try {
				// Import validation function dynamically to avoid circular dependencies
				const { validateClubConfig } = await import('./validation');
				validateClubConfig(club);
			} catch (error) {
				if (error instanceof ValidationError) {
					errors.push(`Club ${club.id}: ${error.message}`);
				} else {
					errors.push(`Club ${club.id}: Validation failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
				}
			}
		}

		// Check for hostname conflicts with existing database entries
		for (const club of clubs) {
			try {
				const isAvailable = await this.dbService.validateHostname(club.hostname);
				if (!isAvailable) {
					// Check if it's the same club (update scenario)
					const existingClub = await this.dbService.getClubByHostname(club.hostname);
					if (existingClub && existingClub.id !== club.id) {
						errors.push(`Hostname ${club.hostname} is already in use by club ${existingClub.id}`);
					}
				}
			} catch (error) {
				errors.push(`Failed to validate hostname ${club.hostname}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}

		return errors;
	}

	/**
	 * Create backup of existing database data
	 */
	async createBackup(): Promise<ClubConfig[]> {
		try {
			return await this.dbService.getAllClubs();
		} catch (error) {
			console.error('Failed to create backup:', error);
			throw new Error(`Backup creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Rollback migration using backup data
	 */
	async rollbackMigration(backupData: ClubConfig[]): Promise<MigrationResult> {
		const result: MigrationResult = {
			success: false,
			migratedClubs: [],
			errors: []
		};

		try {
			// Clear existing data
			await this.clearAllClubs();

			// Restore backup data
			for (const club of backupData) {
				try {
					await this.dbService.createClub(club);
					result.migratedClubs.push(club.id);
				} catch (error) {
					const errorMessage = `Failed to restore club ${club.id}: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`;
					result.errors.push(errorMessage);
					console.error(errorMessage, error);
				}
			}

			result.success = result.errors.length === 0;
			return result;

		} catch (error) {
			const errorMessage = `Rollback failed: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`;
			result.errors.push(errorMessage);
			console.error(errorMessage, error);
			return result;
		}
	}

	/**
	 * Clear all clubs from database (used for rollback)
	 */
	private async clearAllClubs(): Promise<void> {
		try {
			// Get all club IDs
			const clubs = await this.dbService.getAllClubs();
			
			// Delete each club (cascade will handle related records)
			for (const club of clubs) {
				await this.dbService.deleteClub(club.id);
			}
		} catch (error) {
			throw new Error(`Failed to clear clubs: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get migration status and statistics
	 */
	async getMigrationStatus(): Promise<{
		databaseClubCount: number;
		databaseClubs: string[];
		hasData: boolean;
	}> {
		try {
			const clubs = await this.dbService.getAllClubs();
			return {
				databaseClubCount: clubs.length,
				databaseClubs: clubs.map(club => club.id),
				hasData: clubs.length > 0
			};
		} catch (error) {
			console.error('Failed to get migration status:', error);
			return {
				databaseClubCount: 0,
				databaseClubs: [],
				hasData: false
			};
		}
	}

	/**
	 * Verify data integrity after migration
	 */
	async verifyDataIntegrity(originalClubs: ClubConfig[]): Promise<{
		isValid: boolean;
		missingClubs: string[];
		mismatchedClubs: string[];
		errors: string[];
	}> {
		const result = {
			isValid: true,
			missingClubs: [] as string[],
			mismatchedClubs: [] as string[],
			errors: [] as string[]
		};

		try {
			const migratedClubs = await this.dbService.getAllClubs();
			const migratedClubsMap = new Map(migratedClubs.map(club => [club.id, club]));

			// Check for missing clubs
			for (const originalClub of originalClubs) {
				const migratedClub = migratedClubsMap.get(originalClub.id);
				
				if (!migratedClub) {
					result.missingClubs.push(originalClub.id);
					result.isValid = false;
					continue;
				}

				// Verify key data matches
				if (!this.compareClubData(originalClub, migratedClub)) {
					result.mismatchedClubs.push(originalClub.id);
					result.isValid = false;
				}
			}

		} catch (error) {
			const errorMessage = `Data integrity verification failed: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`;
			result.errors.push(errorMessage);
			result.isValid = false;
		}

		return result;
	}

	/**
	 * Compare club data for integrity verification
	 */
	private compareClubData(original: ClubConfig, migrated: ClubConfig): boolean {
		// Compare essential fields
		return (
			original.id === migrated.id &&
			original.name === migrated.name &&
			original.hostname === migrated.hostname &&
			original.location === migrated.location &&
			original.meetingPoint.name === migrated.meetingPoint.name &&
			original.meetingPoint.postcode === migrated.meetingPoint.postcode &&
			Math.abs(original.meetingPoint.coordinates.lat - migrated.meetingPoint.coordinates.lat) < 0.000001 &&
			Math.abs(original.meetingPoint.coordinates.lng - migrated.meetingPoint.coordinates.lng) < 0.000001 &&
			original.schedule.day === migrated.schedule.day &&
			original.schedule.time === migrated.schedule.time &&
			original.route.name === migrated.route.name &&
			original.route.points.length === migrated.route.points.length
		);
	}
}

/**
 * Convenience function to create migration service
 */
export function createMigrationService(db: D1Database): ClubMigrationService {
	return new ClubMigrationService(db);
}