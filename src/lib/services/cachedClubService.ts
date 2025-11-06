/**
 * Cached club service implementation
 * Wraps database service with caching layer using cache-aside pattern
 */

import type { ClubConfig } from '../clubs/types';
import type { ClubDatabaseService } from '../database/clubDatabase';
import type { ClubCacheService } from './clubCache';
import { createCacheService } from './clubCache';

/**
 * Configuration for cached club service
 */
export interface CachedServiceConfig {
	enableCaching: boolean;
	cacheWarmupOnStart: boolean;
	invalidateOnWrite: boolean;
	cacheTtlMs: number;
}

/**
 * Default configuration
 */
export const DEFAULT_CACHED_SERVICE_CONFIG: CachedServiceConfig = {
	enableCaching: true,
	cacheWarmupOnStart: true,
	invalidateOnWrite: true,
	cacheTtlMs: 3600000 // 1 hour
};

/**
 * Cached club service that implements cache-aside pattern
 * Provides caching layer over database operations for optimal performance
 */
export class CachedClubService implements ClubDatabaseService {
	private cacheService: ClubCacheService;
	private isWarmedUp = false;

	constructor(
		private databaseService: ClubDatabaseService,
		cacheService?: ClubCacheService,
		private config: CachedServiceConfig = DEFAULT_CACHED_SERVICE_CONFIG,
		private platform?: App.Platform
	) {
		this.cacheService =
			cacheService ||
			createCacheService(platform, {
				enabled: config.enableCaching,
				defaultTtlMs: config.cacheTtlMs
			});
	}

	/**
	 * Get club by hostname with caching
	 * Implements cache-aside pattern: check cache first, then database, then update cache
	 */
	async getClubByHostname(hostname: string): Promise<ClubConfig | null> {
		if (!this.config.enableCaching) {
			return this.databaseService.getClubByHostname(hostname);
		}

		const cacheKey = `club:hostname:${hostname}`;

		// Try cache first
		const cached = await this.cacheService.get(cacheKey);
		if (cached) {
			return cached;
		}

		// Cache miss - get from database
		const club = await this.databaseService.getClubByHostname(hostname);

		// Update cache if club found
		if (club) {
			await this.cacheService.set(cacheKey, club, this.config.cacheTtlMs);
		}

		return club;
	}

	/**
	 * Get all clubs with caching
	 * Caches individual clubs by hostname and uses a separate mechanism for the full list
	 */
	async getAllClubs(): Promise<ClubConfig[]> {
		if (!this.config.enableCaching) {
			return this.databaseService.getAllClubs();
		}

		// For getAllClubs, we'll use a different approach:
		// 1. Try to get from database (this is typically called less frequently)
		// 2. Cache individual clubs by hostname for future getClubByHostname calls

		const clubs = await this.databaseService.getAllClubs();

		// Cache individual clubs by hostname for future lookups
		if (clubs.length > 0) {
			const cachePromises = clubs.map((club) =>
				this.cacheService.set(`club:hostname:${club.hostname}`, club, this.config.cacheTtlMs)
			);
			await Promise.all(cachePromises);
		}

		return clubs;
	}

	/**
	 * Create club with cache invalidation
	 */
	async createClub(club: Omit<ClubConfig, 'id'>): Promise<ClubConfig> {
		const result = await this.databaseService.createClub(club);

		// Invalidate cache on write operations
		if (this.config.enableCaching && this.config.invalidateOnWrite) {
			await this.invalidateRelevantCache(result);
		}

		return result;
	}

	/**
	 * Update club with cache invalidation
	 */
	async updateClub(id: string, club: Partial<ClubConfig>): Promise<ClubConfig> {
		const result = await this.databaseService.updateClub(id, club);

		// Invalidate cache on write operations
		if (this.config.enableCaching && this.config.invalidateOnWrite) {
			await this.invalidateRelevantCache(result, id);
		}

		return result;
	}

	/**
	 * Delete club with cache invalidation
	 */
	async deleteClub(id: string): Promise<void> {
		// Get club before deletion to know which cache entries to invalidate
		let clubToDelete: ClubConfig | null = null;
		if (this.config.enableCaching && this.config.invalidateOnWrite) {
			try {
				// Try to get from cache first, then database
				const cacheKey = `club:id:${id}`;
				clubToDelete = await this.cacheService.get(cacheKey);

				if (!clubToDelete) {
					// Not in cache, need to get from database to know hostname for cache invalidation
					clubToDelete = await this.getClubById(id);
				}
			} catch (error) {
				console.warn('Could not retrieve club for cache invalidation:', error);
			}
		}

		await this.databaseService.deleteClub(id);

		// Invalidate cache on write operations
		if (this.config.enableCaching && this.config.invalidateOnWrite && clubToDelete) {
			await this.invalidateRelevantCache(clubToDelete, id);
		}
	}

	/**
	 * Validate hostname (no caching needed for this operation)
	 */
	async validateHostname(hostname: string): Promise<boolean> {
		return this.databaseService.validateHostname(hostname);
	}

	/**
	 * Migrate static data (no caching needed for this operation)
	 */
	async migrateStaticData(): Promise<void> {
		const result = await this.databaseService.migrateStaticData();

		// Clear all cache after migration
		if (this.config.enableCaching) {
			await this.cacheService.invalidateAll();
			this.isWarmedUp = false;
		}

		return result;
	}

	/**
	 * Warm up cache with all clubs
	 * Preloads frequently accessed data into cache
	 */
	async warmCache(): Promise<void> {
		if (!this.config.enableCaching || this.isWarmedUp) {
			return;
		}

		try {
			const clubs = await this.databaseService.getAllClubs();
			await this.cacheService.warmCache(clubs);
			this.isWarmedUp = true;
		} catch (error) {
			console.error('Cache warmup failed:', error);
		}
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return this.cacheService.getStats();
	}

	/**
	 * Clear all cache
	 */
	async clearCache(): Promise<void> {
		await this.cacheService.invalidateAll();
		this.isWarmedUp = false;
	}

	/**
	 * Private helper: Get club by ID (for internal use)
	 */
	private async getClubById(id: string): Promise<ClubConfig | null> {
		// This is a simplified implementation - in a real scenario,
		// we might want to add a getClubById method to the database service
		const clubs = await this.databaseService.getAllClubs();
		return clubs.find((club) => club.id === id) || null;
	}

	/**
	 * Private helper: Invalidate relevant cache entries after write operations
	 */
	private async invalidateRelevantCache(club: ClubConfig, oldId?: string): Promise<void> {
		const keysToInvalidate = [
			// Invalidate by hostname
			`club:hostname:${club.hostname}`,
			// Invalidate by ID
			`club:id:${club.id}`
		];

		// If updating and ID might have changed, also invalidate old ID
		if (oldId && oldId !== club.id) {
			keysToInvalidate.push(`club:id:${oldId}`);
		}

		const invalidationPromises = keysToInvalidate.map((key) => this.cacheService.invalidate(key));

		await Promise.all(invalidationPromises);
	}

	/**
	 * Initialize the service (warm cache if configured)
	 */
	async initialize(): Promise<void> {
		if (this.config.cacheWarmupOnStart) {
			await this.warmCache();
		}
	}

	/**
	 * Shutdown the service
	 */
	async shutdown(): Promise<void> {
		if (
			this.cacheService &&
			typeof (this.cacheService as { shutdown?: () => void }).shutdown === 'function'
		) {
			(this.cacheService as { shutdown: () => void }).shutdown();
		}
	}
}
