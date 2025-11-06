/**
 * Core database service for club management operations
 * Implements CRUD operations for ClubConfig using Cloudflare D1
 */

import type { ClubConfig } from '../clubs/types';
import type { D1Database } from './types';
import type {
	ClubEntity,
	MeetingPointEntity,
	MeetingScheduleEntity,
	WalkingRouteEntity,
	RoutePointEntity,
	ClubWithRelationsEntity
} from './entities';
import { mapEntitiesToClubConfig, mapClubConfigToEntities } from './mappers';
import { validateClubConfig, ValidationError } from './validation';
import { DATABASE_CONFIG } from '../config/database';
import { performanceMonitor } from '../services/performanceMonitor';

/**
 * Database service interface for club operations
 */
export interface ClubDatabaseService {
	getClubByHostname(hostname: string): Promise<ClubConfig | null>;
	getAllClubs(): Promise<ClubConfig[]>;
	createClub(club: Omit<ClubConfig, 'id'>): Promise<ClubConfig>;
	updateClub(id: string, club: Partial<ClubConfig>): Promise<ClubConfig>;
	deleteClub(id: string): Promise<void>;
	validateHostname(hostname: string): Promise<boolean>;
	isHostnameConfigured?(hostname: string): Promise<boolean>;
	migrateStaticData(): Promise<void>;
}

/**
 * Cloudflare D1 implementation of ClubDatabaseService
 */
export class D1ClubDatabaseService implements ClubDatabaseService {
	constructor(private db: D1Database) {}

	/**
	 * Get club configuration by hostname
	 */
	async getClubByHostname(hostname: string): Promise<ClubConfig | null> {
		const startTime = Date.now();
		try {
			const clubData = await this.getClubWithRelations('SELECT * FROM clubs WHERE hostname = ?', [
				hostname
			]);

			const duration = Date.now() - startTime;
			performanceMonitor.recordQuery({
				queryType: 'getClubByHostname',
				duration,
				success: true,
				rowsAffected: clubData ? 1 : 0
			});

			return clubData ? mapEntitiesToClubConfig(clubData) : null;
		} catch (error) {
			const duration = Date.now() - startTime;
			performanceMonitor.recordQuery({
				queryType: 'getClubByHostname',
				duration,
				success: false,
				error: error instanceof Error ? error.message : String(error)
			});

			console.error('Error fetching club by hostname:', error);
			throw new Error(`Failed to fetch club with hostname: ${hostname}`);
		}
	}

	/**
	 * Get all club configurations
	 */
	async getAllClubs(): Promise<ClubConfig[]> {
		const startTime = Date.now();
		try {
			const clubsResult = await this.db
				.prepare('SELECT * FROM clubs ORDER BY name')
				.all<ClubEntity>();

			if (!clubsResult.results || clubsResult.results.length === 0) {
				const duration = Date.now() - startTime;
				performanceMonitor.recordQuery({
					queryType: 'getAllClubs',
					duration,
					success: true,
					rowsAffected: 0
				});
				return [];
			}

			const clubs: ClubConfig[] = [];

			for (const club of clubsResult.results) {
				const clubData = await this.getClubWithRelations('SELECT * FROM clubs WHERE id = ?', [
					club.id
				]);

				if (clubData) {
					clubs.push(mapEntitiesToClubConfig(clubData));
				}
			}

			const duration = Date.now() - startTime;
			performanceMonitor.recordQuery({
				queryType: 'getAllClubs',
				duration,
				success: true,
				rowsAffected: clubs.length
			});

			return clubs;
		} catch (error) {
			const duration = Date.now() - startTime;
			performanceMonitor.recordQuery({
				queryType: 'getAllClubs',
				duration,
				success: false,
				error: error instanceof Error ? error.message : String(error)
			});

			console.error('Error fetching all clubs:', error);
			throw new Error('Failed to fetch all clubs');
		}
	}

	/**
	 * Create a new club configuration
	 */
	async createClub(clubData: Omit<ClubConfig, 'id'>): Promise<ClubConfig> {
		// Generate ID if not provided
		const clubConfig: ClubConfig = {
			...clubData,
			id: this.generateClubId(clubData.name)
		};

		// Validate the club configuration
		validateClubConfig(clubConfig);

		// Check hostname uniqueness
		const existingClub = await this.getClubByHostname(clubConfig.hostname);
		if (existingClub) {
			throw new ValidationError(`Hostname ${clubConfig.hostname} is already in use`);
		}

		try {
			const entities = mapClubConfigToEntities(clubConfig);

			// Use transaction to ensure data consistency
			const result = await this.db.batch([
				// Insert club
				this.db
					.prepare(
						`
					INSERT INTO clubs (id, name, location, hostname, description, contact_email, contact_phone, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
				`
					)
					.bind(
						entities.club.id,
						entities.club.name,
						entities.club.location,
						entities.club.hostname,
						entities.club.description,
						entities.club.contact_email,
						entities.club.contact_phone
					),

				// Insert meeting point
				this.db
					.prepare(
						`
					INSERT INTO meeting_points (club_id, name, address, postcode, lat, lng, what3words)
					VALUES (?, ?, ?, ?, ?, ?, ?)
				`
					)
					.bind(
						entities.meetingPoint.club_id,
						entities.meetingPoint.name,
						entities.meetingPoint.address,
						entities.meetingPoint.postcode,
						entities.meetingPoint.lat,
						entities.meetingPoint.lng,
						entities.meetingPoint.what3words
					),

				// Insert schedule
				this.db
					.prepare(
						`
					INSERT INTO meeting_schedules (club_id, day, time, frequency)
					VALUES (?, ?, ?, ?)
				`
					)
					.bind(
						entities.schedule.club_id,
						entities.schedule.day,
						entities.schedule.time,
						entities.schedule.frequency
					),

				// Insert route
				this.db
					.prepare(
						`
					INSERT INTO walking_routes (club_id, name, description, distance, duration, difficulty)
					VALUES (?, ?, ?, ?, ?, ?)
				`
					)
					.bind(
						entities.route.club_id,
						entities.route.name,
						entities.route.description,
						entities.route.distance,
						entities.route.duration,
						entities.route.difficulty
					)
			]);

			// Get the route ID from the insert result
			const routeId = result[3].meta.last_row_id;

			// Insert route points
			if (entities.routePoints.length > 0) {
				const routePointInserts = entities.routePoints.map((point) =>
					this.db
						.prepare(
							`
						INSERT INTO route_points (route_id, sequence_order, lat, lng)
						VALUES (?, ?, ?, ?)
					`
						)
						.bind(routeId, point.sequence_order, point.lat, point.lng)
				);

				await this.db.batch(routePointInserts);
			}

			return clubConfig;
		} catch (error) {
			console.error('Error creating club:', error);
			throw new Error(
				`Failed to create club: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Update an existing club configuration
	 */
	async updateClub(id: string, updates: Partial<ClubConfig>): Promise<ClubConfig> {
		// Get existing club
		const existingClub = await this.getClubById(id);
		if (!existingClub) {
			throw new Error(`Club with ID ${id} not found`);
		}

		// Merge updates with existing data
		const updatedClub: ClubConfig = { ...existingClub, ...updates, id };

		// Validate the updated configuration
		validateClubConfig(updatedClub);

		// Check hostname uniqueness if hostname is being updated
		if (updates.hostname && updates.hostname !== existingClub.hostname) {
			const existingWithHostname = await this.getClubByHostname(updates.hostname);
			if (existingWithHostname) {
				throw new ValidationError(`Hostname ${updates.hostname} is already in use`);
			}
		}

		try {
			const entities = mapClubConfigToEntities(updatedClub);

			// Use transaction for consistency
			await this.db.batch([
				// Update club
				this.db
					.prepare(
						`
					UPDATE clubs 
					SET name = ?, location = ?, hostname = ?, description = ?, 
						contact_email = ?, contact_phone = ?, updated_at = datetime('now')
					WHERE id = ?
				`
					)
					.bind(
						entities.club.name,
						entities.club.location,
						entities.club.hostname,
						entities.club.description,
						entities.club.contact_email,
						entities.club.contact_phone,
						id
					),

				// Update meeting point
				this.db
					.prepare(
						`
					UPDATE meeting_points 
					SET name = ?, address = ?, postcode = ?, lat = ?, lng = ?, what3words = ?
					WHERE club_id = ?
				`
					)
					.bind(
						entities.meetingPoint.name,
						entities.meetingPoint.address,
						entities.meetingPoint.postcode,
						entities.meetingPoint.lat,
						entities.meetingPoint.lng,
						entities.meetingPoint.what3words,
						id
					),

				// Update schedule
				this.db
					.prepare(
						`
					UPDATE meeting_schedules 
					SET day = ?, time = ?, frequency = ?
					WHERE club_id = ?
				`
					)
					.bind(entities.schedule.day, entities.schedule.time, entities.schedule.frequency, id),

				// Update route
				this.db
					.prepare(
						`
					UPDATE walking_routes 
					SET name = ?, description = ?, distance = ?, duration = ?, difficulty = ?
					WHERE club_id = ?
				`
					)
					.bind(
						entities.route.name,
						entities.route.description,
						entities.route.distance,
						entities.route.duration,
						entities.route.difficulty,
						id
					)
			]);

			// Update route points - delete existing and insert new ones
			const routeResult = await this.db
				.prepare('SELECT id FROM walking_routes WHERE club_id = ?')
				.bind(id)
				.first<{ id: number }>();

			if (routeResult) {
				// Delete existing route points
				await this.db
					.prepare('DELETE FROM route_points WHERE route_id = ?')
					.bind(routeResult.id)
					.run();

				// Insert new route points
				if (entities.routePoints.length > 0) {
					const routePointInserts = entities.routePoints.map((point) =>
						this.db
							.prepare(
								`
							INSERT INTO route_points (route_id, sequence_order, lat, lng)
							VALUES (?, ?, ?, ?)
						`
							)
							.bind(routeResult.id, point.sequence_order, point.lat, point.lng)
					);

					await this.db.batch(routePointInserts);
				}
			}

			return updatedClub;
		} catch (error) {
			console.error('Error updating club:', error);
			throw new Error(
				`Failed to update club: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Delete a club configuration
	 */
	async deleteClub(id: string): Promise<void> {
		try {
			// Check if club exists
			const existingClub = await this.getClubById(id);
			if (!existingClub) {
				throw new Error(`Club with ID ${id} not found`);
			}

			// Delete club (cascade will handle related records)
			const result = await this.db.prepare('DELETE FROM clubs WHERE id = ?').bind(id).run();

			if (result.meta.changes === 0) {
				throw new Error(`Failed to delete club with ID ${id}`);
			}
		} catch (error) {
			console.error('Error deleting club:', error);
			throw new Error(
				`Failed to delete club: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Validate if hostname is available
	 */
	async validateHostname(hostname: string): Promise<boolean> {
		try {
			const result = await this.db
				.prepare('SELECT COUNT(*) as count FROM clubs WHERE hostname = ?')
				.bind(hostname)
				.first<{ count: number }>();

			return result?.count === 0;
		} catch (error) {
			console.error('Error validating hostname:', error);
			return false;
		}
	}

	/**
	 * Migrate static data to database
	 */
	async migrateStaticData(): Promise<void> {
		// Import static clubs data
		const { getStaticClubs } = await import('../clubs/index');
		const staticClubs = getStaticClubs();

		if (staticClubs.length === 0) {
			console.log('No static clubs found to migrate');
			return;
		}

		// Import migration service
		const { ClubMigrationService } = await import('./migration');
		const migrationService = new ClubMigrationService(this.db);

		// Perform migration with backup
		const result = await migrationService.migrateStaticData(staticClubs, {
			createBackup: true
		});

		if (!result.success) {
			throw new Error(`Migration failed: ${result.errors.join('; ')}`);
		}

		console.log(
			`Migration completed successfully. Migrated clubs: ${result.migratedClubs.join(', ')}`
		);
	}

	/**
	 * Private helper: Get club by ID
	 */
	private async getClubById(id: string): Promise<ClubConfig | null> {
		const clubData = await this.getClubWithRelations('SELECT * FROM clubs WHERE id = ?', [id]);

		return clubData ? mapEntitiesToClubConfig(clubData) : null;
	}

	/**
	 * Private helper: Get club with all related data
	 */
	private async getClubWithRelations(
		clubQuery: string,
		params: unknown[]
	): Promise<ClubWithRelationsEntity | null> {
		const club = await this.db
			.prepare(clubQuery)
			.bind(...params)
			.first<ClubEntity>();

		if (!club) {
			return null;
		}

		// Get related data
		const [meetingPoint, schedule, route] = await Promise.all([
			this.db
				.prepare('SELECT * FROM meeting_points WHERE club_id = ?')
				.bind(club.id)
				.first<MeetingPointEntity>(),
			this.db
				.prepare('SELECT * FROM meeting_schedules WHERE club_id = ?')
				.bind(club.id)
				.first<MeetingScheduleEntity>(),
			this.db
				.prepare('SELECT * FROM walking_routes WHERE club_id = ?')
				.bind(club.id)
				.first<WalkingRouteEntity>()
		]);

		if (!meetingPoint || !schedule || !route) {
			throw new Error(`Incomplete club data for club ID: ${club.id}`);
		}

		// Get route points
		const routePointsResult = await this.db
			.prepare('SELECT * FROM route_points WHERE route_id = ? ORDER BY sequence_order')
			.bind(route.id)
			.all<RoutePointEntity>();

		const routePoints = routePointsResult.results || [];

		return {
			club,
			meetingPoint,
			schedule,
			route,
			routePoints
		};
	}

	/**
	 * Private helper: Generate club ID from name
	 */
	private generateClubId(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
	}
}
