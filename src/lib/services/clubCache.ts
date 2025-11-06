/**
 * Club cache service interface and implementation
 * Provides caching layer for club configurations with TTL support
 */

import type { ClubConfig } from '../clubs/types';

/**
 * Cache service interface for club configurations
 */
export interface ClubCacheService {
	get(key: string): Promise<ClubConfig | null>;
	set(key: string, club: ClubConfig, ttl?: number): Promise<void>;
	invalidate(key: string): Promise<void>;
	invalidateAll(): Promise<void>;
	warmCache(clubs: ClubConfig[]): Promise<void>;
	getStats(): CacheStats;
	generateHostnameKey(hostname: string): string;
	generateIdKey(id: string): string;
	generateAllClubsKey(): string;
}

/**
 * Cache statistics interface
 */
export interface CacheStats {
	size: number;
	hits: number;
	misses: number;
	hitRate: number;
	enabled: boolean;
}

/**
 * Cache entry with TTL support
 */
interface CacheEntry {
	data: ClubConfig;
	timestamp: number;
	ttl: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
	enabled: boolean;
	defaultTtlMs: number;
	maxSize: number;
	cleanupIntervalMs: number;
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
	enabled: true,
	defaultTtlMs: 3600000, // 1 hour
	maxSize: 1000,
	cleanupIntervalMs: 300000 // 5 minutes
};

/**
 * Memory-based cache implementation for club configurations
 * Uses Map for storage with TTL support and automatic cleanup
 */
export class MemoryClubCacheService implements ClubCacheService {
	private cache = new Map<string, CacheEntry>();
	private stats = {
		hits: 0,
		misses: 0
	};
	private cleanupTimer: NodeJS.Timeout | null = null;

	constructor(private config: CacheConfig = DEFAULT_CACHE_CONFIG) {
		if (this.config.enabled && this.config.cleanupIntervalMs > 0) {
			this.startCleanupTimer();
		}
	}

	/**
	 * Get club configuration from cache
	 */
	async get(key: string): Promise<ClubConfig | null> {
		if (!this.config.enabled) {
			return null;
		}

		const entry = this.cache.get(key);
		
		if (!entry) {
			this.stats.misses++;
			return null;
		}

		// Check if entry has expired
		const now = Date.now();
		if (now - entry.timestamp > entry.ttl) {
			this.cache.delete(key);
			this.stats.misses++;
			return null;
		}

		this.stats.hits++;
		return entry.data;
	}

	/**
	 * Set club configuration in cache with TTL
	 */
	async set(key: string, club: ClubConfig, ttl?: number): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		// Enforce max size by removing oldest entries
		if (this.cache.size >= this.config.maxSize) {
			this.evictOldestEntries();
		}

		const entry: CacheEntry = {
			data: club,
			timestamp: Date.now(),
			ttl: ttl || this.config.defaultTtlMs
		};

		this.cache.set(key, entry);
	}

	/**
	 * Invalidate specific cache entry
	 */
	async invalidate(key: string): Promise<void> {
		this.cache.delete(key);
	}

	/**
	 * Clear all cache entries
	 */
	async invalidateAll(): Promise<void> {
		this.cache.clear();
		this.stats.hits = 0;
		this.stats.misses = 0;
	}

	/**
	 * Warm cache with club configurations
	 * Preloads frequently accessed clubs into cache
	 */
	async warmCache(clubs: ClubConfig[]): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		const promises = clubs.map(club => {
			// Cache by hostname (most common lookup)
			const hostnameKey = this.generateHostnameKey(club.hostname);
			return this.set(hostnameKey, club);
		});

		await Promise.all(promises);
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		const totalRequests = this.stats.hits + this.stats.misses;
		const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

		return {
			size: this.cache.size,
			hits: this.stats.hits,
			misses: this.stats.misses,
			hitRate: Math.round(hitRate * 100) / 100,
			enabled: this.config.enabled
		};
	}

	/**
	 * Generate cache key for hostname lookup
	 */
	generateHostnameKey(hostname: string): string {
		return `club:hostname:${hostname}`;
	}

	/**
	 * Generate cache key for ID lookup
	 */
	generateIdKey(id: string): string {
		return `club:id:${id}`;
	}

	/**
	 * Generate cache key for all clubs
	 */
	generateAllClubsKey(): string {
		return 'clubs:all';
	}

	/**
	 * Start automatic cleanup timer
	 */
	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.cleanupExpiredEntries();
		}, this.config.cleanupIntervalMs);
	}

	/**
	 * Stop cleanup timer
	 */
	private stopCleanupTimer(): void {
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
			this.cleanupTimer = null;
		}
	}

	/**
	 * Remove expired entries from cache
	 */
	private cleanupExpiredEntries(): void {
		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (now - entry.timestamp > entry.ttl) {
				keysToDelete.push(key);
			}
		}

		keysToDelete.forEach(key => this.cache.delete(key));
	}

	/**
	 * Evict oldest entries when cache is full
	 */
	private evictOldestEntries(): void {
		const entriesToRemove = Math.max(1, Math.floor(this.config.maxSize * 0.1)); // Remove 10%
		const sortedEntries = Array.from(this.cache.entries())
			.sort(([, a], [, b]) => a.timestamp - b.timestamp);

		for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
			this.cache.delete(sortedEntries[i][0]);
		}
	}

	/**
	 * Shutdown the cache service
	 */
	shutdown(): void {
		this.stopCleanupTimer();
		this.cache.clear();
	}
}

/**
 * Cloudflare KV-based cache implementation
 * Uses Cloudflare KV for distributed caching across edge locations
 */
export class CloudflareKVCacheService implements ClubCacheService {
	private stats = {
		hits: 0,
		misses: 0
	};

	constructor(
		private kv: KVNamespace,
		private config: CacheConfig = DEFAULT_CACHE_CONFIG
	) {}

	/**
	 * Get club configuration from KV cache
	 */
	async get(key: string): Promise<ClubConfig | null> {
		if (!this.config.enabled) {
			return null;
		}

		try {
			const cached = await this.kv.get(key, 'json');
			
			if (!cached) {
				this.stats.misses++;
				return null;
			}

			this.stats.hits++;
			return cached as ClubConfig;
		} catch (error) {
			console.error('KV cache get error:', error);
			this.stats.misses++;
			return null;
		}
	}

	/**
	 * Set club configuration in KV cache with TTL
	 */
	async set(key: string, club: ClubConfig, ttl?: number): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		try {
			const expirationTtl = Math.floor((ttl || this.config.defaultTtlMs) / 1000);
			await this.kv.put(key, JSON.stringify(club), {
				expirationTtl
			});
		} catch (error) {
			console.error('KV cache set error:', error);
		}
	}

	/**
	 * Invalidate specific cache entry
	 */
	async invalidate(key: string): Promise<void> {
		try {
			await this.kv.delete(key);
		} catch (error) {
			console.error('KV cache invalidate error:', error);
		}
	}

	/**
	 * Clear all cache entries (not supported in KV, would need prefix-based deletion)
	 */
	async invalidateAll(): Promise<void> {
		console.warn('KV cache invalidateAll not implemented - would require prefix-based deletion');
		this.stats.hits = 0;
		this.stats.misses = 0;
	}

	/**
	 * Warm cache with club configurations
	 */
	async warmCache(clubs: ClubConfig[]): Promise<void> {
		if (!this.config.enabled) {
			return;
		}

		const promises = clubs.map(club => {
			const hostnameKey = this.generateHostnameKey(club.hostname);
			return this.set(hostnameKey, club);
		});

		await Promise.all(promises);
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		const totalRequests = this.stats.hits + this.stats.misses;
		const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

		return {
			size: -1, // KV doesn't provide size information
			hits: this.stats.hits,
			misses: this.stats.misses,
			hitRate: Math.round(hitRate * 100) / 100,
			enabled: this.config.enabled
		};
	}

	/**
	 * Generate cache key for hostname lookup
	 */
	generateHostnameKey(hostname: string): string {
		return `club:hostname:${hostname}`;
	}

	/**
	 * Generate cache key for ID lookup
	 */
	generateIdKey(id: string): string {
		return `club:id:${id}`;
	}

	/**
	 * Generate cache key for all clubs
	 */
	generateAllClubsKey(): string {
		return 'clubs:all';
	}
}

/**
 * Factory function to create appropriate cache service based on environment
 */
export function createCacheService(
	platform?: App.Platform,
	config?: Partial<CacheConfig>
): ClubCacheService {
	const finalConfig = { ...DEFAULT_CACHE_CONFIG, ...config };

	// Use KV cache if available in Cloudflare environment
	if (platform?.env?.CLUB_CACHE) {
		return new CloudflareKVCacheService(platform.env.CLUB_CACHE, finalConfig);
	}

	// Fallback to memory cache
	return new MemoryClubCacheService(finalConfig);
}