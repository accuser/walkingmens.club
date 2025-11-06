/**
 * Resilient club service with fallback mechanisms and error handling
 * Wraps the database service with connection management and fallback to static data
 */

import type { ClubConfig } from '../clubs/types';
import { D1ClubDatabaseService, type ClubDatabaseService } from './clubDatabase';
import { DatabaseConnectionManager, DatabaseUnavailableError, DatabaseConnectionError } from './connectionManager';
import { getDatabase } from '../config/database';

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
	cacheEnabled: boolean;
	cacheTtlMs: number;
}

const DEFAULT_CONFIG: ResilientServiceConfig = {
	enableFallback: true,
	fallbackTimeoutMs: 2000,
	cacheEnabled: true,
	cacheTtlMs: 3600000 // 1 hour
};

/**
 * Cache entry
 */
interface CacheEntry<T> {
	data: T;
	timestamp: number;
	ttl: number;
}

/**
 * Resilient club service with fallback mechanisms
 */
export class ResilientClubService implements ClubDatabaseService {
	private connectionManager: DatabaseConnectionManager;
	private databaseService: D1ClubDatabaseService | null = null;
	private cache = new Map<string, CacheEntry<any>>();
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

		const cacheKey = `club:hostname:${hostname}`;
		
		// Try cache first
		if (this.config.cacheEnabled) {
			const cached = this.getFromCache<ClubConfig | null>(cacheKey);
			if (cached !== undefined) {
				return cached;
			}
		}

		// Try database
		if (this.databaseService) {
			try {
				const result = await this.executeWithFallback(
					() => this.databaseService!.getClubByHostname(hostname),
					() => this.fallbackProvider?.getClubByHostname(hostname) || null,
					`getClubByHostname(${hostname})`
				);

				// Cache the result
				if (this.config.cacheEnabled) {
					this.setCache(cacheKey, result, this.config.cacheTtlMs);
				}

				return result;
			} catch (error) {
				console.error('Database operation failed, using fallback:', error);
				return this.fallbackProvider?.getClubByHostname(hostname) || null;
			}
		}

		// Fallback only
		return this.fallbackProvider?.getClubByHostname(hostname) || null;
	}

	/**
	 * Get all clubs with fallback
	 */
	async getAllClubs(): Promise<ClubConfig[]> {
		await this.initialize();

		const cacheKey = 'clubs:all';
		
		// Try cache first
		if (this.config.cacheEnabled) {
			const cached = this.getFromCache<ClubConfig[]>(cacheKey);
			if (cached !== undefined) {
				return cached;
			}
		}

		// Try database
		if (this.databaseService) {
			try {
				const result = await this.executeWithFallback(
					() => this.databaseService!.getAllClubs(),
					() => this.fallbackProvider?.getAllClubs() || [],
					'getAllClubs'
				);

				// Cache the result
				if (this.config.cacheEnabled) {
					this.setCache(cacheKey, result, this.config.cacheTtlMs);
				}

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

		if (!this.databaseService) {
			throw new DatabaseUnavailableError('Database service not available for write operations');
		}

		try {
			const result = await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				(db) => new D1ClubDatabaseService(db).createClub(club),
				'createClub'
			);

			// Invalidate relevant cache entries
			this.invalidateCache(['clubs:all', `club:hostname:${result.hostname}`]);

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

		if (!this.databaseService) {
			throw new DatabaseUnavailableError('Database service not available for write operations');
		}

		try {
			const result = await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				(db) => new D1ClubDatabaseService(db).updateClub(id, club),
				`updateClub(${id})`
			);

			// Invalidate relevant cache entries
			this.invalidateCache(['clubs:all', `club:hostname:${result.hostname}`, `club:id:${id}`]);

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

		if (!this.databaseService) {
			throw new DatabaseUnavailableError('Database service not available for write operations');
		}

		try {
			await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				(db) => new D1ClubDatabaseService(db).deleteClub(id),
				`deleteClub(${id})`
			);

			// Invalidate relevant cache entries
			this.invalidateCache(['clubs:all', `club:id:${id}`]);
		} catch (error) {
			console.error('Failed to delete club:', error);
			throw error;
		}
	}

	/**
	 * Validate hostname
	 */
	async validateHostname(hostname: string): Promise<boolean> {
		await this.initialize();

		if (!this.databaseService) {
			// In fallback mode, check against fallback data
			return !this.fallbackProvider?.getClubByHostname(hostname);
		}

		try {
			return await this.connectionManager.executeWithRetry(
				getDatabase(this.platform!),
				(db) => new D1ClubDatabaseService(db).validateHostname(hostname),
				`validateHostname(${hostname})`
			);
		} catch (error) {
			console.error('Failed to validate hostname:', error);
			// Fallback to checking against fallback data
			return !this.fallbackProvider?.getClubByHostname(hostname);
		}
	}

	/**
	 * Migrate static data
	 */
	async migrateStaticData(): Promise<void> {
		await this.initialize();

		if (!this.databaseService) {
			throw new DatabaseUnavailableError('Database service not available for migration');
		}

		return this.databaseService.migrateStaticData();
	}

	/**
	 * Execute operation with fallback
	 */
	private async executeWithFallback<T>(
		databaseOperation: () => Promise<T>,
		fallbackOperation: () => T,
		operationName: string
	): Promise<T> {
		if (!this.databaseService) {
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
	 * Cache management
	 */
	private getFromCache<T>(key: string): T | undefined {
		const entry = this.cache.get(key);
		if (!entry) return undefined;

		const now = Date.now();
		if (now - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			return undefined;
		}

		return entry.data as T;
	}

	private setCache<T>(key: string, data: T, ttl: number): void {
		this.cache.set(key, {
			data,
			timestamp: Date.now(),
			ttl
		});
	}

	private invalidateCache(keys: string[]): void {
		keys.forEach(key => this.cache.delete(key));
	}

	/**
	 * Clear all cache
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get service health status
	 */
	async getHealthStatus(): Promise<{
		database: boolean;
		fallback: boolean;
		cache: { size: number; enabled: boolean };
		connections: ReturnType<DatabaseConnectionManager['getPoolStats']>;
	}> {
		await this.initialize();

		let databaseHealthy = false;
		if (this.databaseService && this.platform) {
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

		return {
			database: databaseHealthy,
			fallback: !!this.fallbackProvider,
			cache: {
				size: this.cache.size,
				enabled: this.config.cacheEnabled
			},
			connections: this.connectionManager.getPoolStats()
		};
	}

	/**
	 * Shutdown the service
	 */
	async shutdown(): Promise<void> {
		await this.connectionManager.shutdown();
		this.clearCache();
		this.isInitialized = false;
	}
}