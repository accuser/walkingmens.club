/**
 * Resilient club service with fallback mechanisms and error handling
 * Wraps the database service with connection management, caching, and fallback to static data
 */

import type { ClubConfig } from '../clubs/types';
import { D1ClubDatabaseService, type ClubDatabaseService } from './clubDatabase';
import { DatabaseConnectionManager, DatabaseUnavailableError } from './connectionManager';
import { getDatabase } from '../config/database';
import {
	CachedClubService,
	type CachedServiceConfig,
	DEFAULT_CACHED_SERVICE_CONFIG
} from '../services/cachedClubService';
import { createCacheService } from '../services/clubCache';

/**
 * Fallback data provider interface
 */
export interface FallbackDataProvider {
	getClubByHostname(hostname: string): ClubConfig | undefined;
	getAllClubs(): ClubConfig[];
}

/**
 * Service configuration
 */
interface ResilientServiceConfig {
	enableFallback: boolean;
	fallbackTimeoutMs: number;
	cacheConfig: CachedServiceConfig;
}

const DEFAULT_CONFIG: ResilientServiceConfig = {
	enableFallback: true,
	fallbackTimeoutMs: 2000,
	cacheConfig: DEFAULT_CACHED_SERVICE_CONFIG
};

/**
 * Resilient club service with fallback mechanisms
 */
export class ResilientClubService implements ClubDatabaseService {
	private connectionManager: DatabaseConnectionManager;
	private databaseService: D1ClubDatabaseService | null = null;
	private cachedService: CachedClubService | null = null;
	private isInitialized = false;

	constructor(
		private platform: App.Platform | undefined,
		private fallbackProvider: FallbackDataProvider | null = null,
		private config: ResilientServiceConfig = DEFAULT_CONFIG
	) {
		this.connectionManager = new DatabaseConnectionManager();
	}

	/**
	 * Initialize the service
	 */
	private async initialize(): Promise<void> {
		if (this.isInitialized) return;

		try {
			if (this.platform) {
				const db = getDatabase(this.platform);
				this.databaseService = new D1ClubDatabaseService(db);

				// Wrap database service with caching layer
				const cacheService = createCacheService(this.platform, {
					enabled: this.config.cacheConfig.enableCaching,
					defaultTtlMs: this.config.cacheConfig.cacheTtlMs
				});

				this.cachedService = new CachedClubService(
					this.databaseService,
					cacheService,
					this.config.cacheConfig,
					this.platform
				);

				// Initialize cached service (warm cache if configured)
				await this.cachedService.initialize();

				this.isInitialized = true;
			} else {
				console.warn('Platform not available, running in fallback mode');
			}
		} catch (error) {
			console.error('Failed to initialize database service:', error);
			if (!this.config.enableFallback) {
				throw error;
			}
		}
	}

	/**
	 * Get club by hostname with fallback
	 */
	async getClubByHostname(hostname: string): Promise<ClubConfig | null> {
		await this.initialize();

		// Try cached database service first
		if (this.cachedService) {
			try {
				const result = await this.executeWithFallback(
					() => this.cachedService!.getClubByHostname(hostname),
					() => this.fallbackProvider?.getClubByHostname(hostname) || null,
					`getClubByHostname(${hostname})`
				);

				// Log successful database access for monitoring
				if (result) {
					console.log(`Club found via database: ${hostname} -> ${result.name}`);
				}

				return result;
			} catch (error) {
				console.error('Database operation failed, using fallback:', error);
				const fallbackResult = this.fallbackProvider?.getClubByHostname(hostname) || null;

				if (fallbackResult) {
					console.warn(`Club found via fallback: ${hostname} -> ${fallbackResult.name}`);
				} else {
					console.warn(`Club not found in database or fallback: ${hostname}`);
				}

				return fallbackResult;
			}
		}

		// Fallback only
		const fallbackResult = this.fallbackProvider?.getClubByHostname(hostname) || null;
		if (fallbackResult) {
			console.log(`Club found via fallback only: ${hostname} -> ${fallbackResult.name}`);
		} else {
			console.log(`Club not found in fallback: ${hostname}`);
		}

		return fallbackResult;
	}

	/**
	 * Get all clubs with fallback
	 */
	async getAllClubs(): Promise<ClubConfig[]> {
		await this.initialize();

		// Try cached database service first
		if (this.cachedService) {
			try {
				const result = await this.executeWithFallback(
					() => this.cachedService!.getAllClubs(),
					() => this.fallbackProvider?.getAllClubs() || [],
					'getAllClubs'
				);

				return result;
			} catch (error) {
				console.error('Database operation failed, using fallback:', error);
				return this.fallbackProvider?.getAllClubs() || [];
			}
		}

		// Fallback only
		return this.fallbackProvider?.getAllClubs() || [];
	}

	/**
	 * Create club (database only, no fallback)
	 */
	async createClub(club: Omit<ClubConfig, 'id'>): Promise<ClubConfig> {
		await this.initialize();

		if (!this.cachedService) {
			throw new DatabaseUnavailableError('Database service not available for write operations');
		}

		try {
			const result = await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				() => this.cachedService!.createClub(club),
				'createClub'
			);

			return result;
		} catch (error) {
			console.error('Failed to create club:', error);
			throw error;
		}
	}

	/**
	 * Update club (database only, no fallback)
	 */
	async updateClub(id: string, club: Partial<ClubConfig>): Promise<ClubConfig> {
		await this.initialize();

		if (!this.cachedService) {
			throw new DatabaseUnavailableError('Database service not available for write operations');
		}

		try {
			const result = await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				() => this.cachedService!.updateClub(id, club),
				`updateClub(${id})`
			);

			return result;
		} catch (error) {
			console.error('Failed to update club:', error);
			throw error;
		}
	}

	/**
	 * Delete club (database only, no fallback)
	 */
	async deleteClub(id: string): Promise<void> {
		await this.initialize();

		if (!this.cachedService) {
			throw new DatabaseUnavailableError('Database service not available for write operations');
		}

		try {
			await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				() => this.cachedService!.deleteClub(id),
				`deleteClub(${id})`
			);
		} catch (error) {
			console.error('Failed to delete club:', error);
			throw error;
		}
	}

	/**
	 * Validate hostname (check if it's available for use)
	 */
	async validateHostname(hostname: string): Promise<boolean> {
		await this.initialize();

		if (!this.cachedService) {
			// In fallback mode, check against fallback data
			return !this.fallbackProvider?.getClubByHostname(hostname);
		}

		try {
			return await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				() => this.cachedService!.validateHostname(hostname),
				`validateHostname(${hostname})`
			);
		} catch (error) {
			console.error('Failed to validate hostname:', error);
			// Fallback to checking against fallback data
			return !this.fallbackProvider?.getClubByHostname(hostname);
		}
	}

	/**
	 * Check if a hostname is configured (exists in system)
	 */
	async isHostnameConfigured(hostname: string): Promise<boolean> {
		await this.initialize();

		// Try database first
		if (this.cachedService) {
			try {
				const club = await this.cachedService.getClubByHostname(hostname);
				return club !== null;
			} catch (error) {
				console.warn('Database check failed for hostname configuration:', error);
			}
		}

		// Fallback check
		const fallbackClub = this.fallbackProvider?.getClubByHostname(hostname);
		return fallbackClub !== undefined;
	}

	/**
	 * Migrate static data
	 */
	async migrateStaticData(): Promise<void> {
		await this.initialize();

		if (!this.cachedService) {
			throw new DatabaseUnavailableError('Database service not available for migration');
		}

		return this.cachedService.migrateStaticData();
	}

	/**
	 * Execute operation with fallback
	 */
	private async executeWithFallback<T>(
		databaseOperation: () => Promise<T>,
		fallbackOperation: () => T,
		operationName: string
	): Promise<T> {
		if (!this.cachedService) {
			return fallbackOperation();
		}

		try {
			return await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				() => databaseOperation(),
				operationName
			);
		} catch (error) {
			if (this.config.enableFallback && this.fallbackProvider) {
				console.warn(`${operationName} failed, using fallback:`, error);
				return fallbackOperation();
			}
			throw error;
		}
	}

	/**
	 * Clear all cache
	 */
	async clearCache(): Promise<void> {
		if (this.cachedService) {
			await this.cachedService.clearCache();
		}
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return (
			this.cachedService?.getCacheStats() || {
				size: 0,
				hits: 0,
				misses: 0,
				hitRate: 0,
				enabled: false
			}
		);
	}

	/**
	 * Get service health status
	 */
	async getHealthStatus(): Promise<{
		database: boolean;
		fallback: boolean;
		cache: { size: number; enabled: boolean; hits: number; misses: number; hitRate: number };
		connections: ReturnType<DatabaseConnectionManager['getPoolStats']>;
	}> {
		await this.initialize();

		let databaseHealthy = false;
		if (this.cachedService && this.platform) {
			try {
				const db = getDatabase(this.platform);
				databaseHealthy = await this.connectionManager.executeWithRetry(
					db,
					async (db) => {
						const result = await db.prepare('SELECT 1 as health').first<{ health: number }>();
						return result?.health === 1;
					},
					'healthCheck'
				);
			} catch (error) {
				console.error('Health check failed:', error);
			}
		}

		const cacheStats = this.getCacheStats();

		return {
			database: databaseHealthy,
			fallback: !!this.fallbackProvider,
			cache: cacheStats,
			connections: this.connectionManager.getPoolStats()
		};
	}

	/**
	 * Shutdown the service
	 */
	async shutdown(): Promise<void> {
		await this.connectionManager.shutdown();

		if (this.cachedService) {
			await this.cachedService.shutdown();
		}

		this.isInitialized = false;
	}
}
