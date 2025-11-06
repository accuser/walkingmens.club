/**
 * Tests for club cache service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryClubCacheService, type CacheConfig } from './clubCache';
import type { ClubConfig } from '../clubs/types';

describe('MemoryClubCacheService', () => {
	let cacheService: MemoryClubCacheService;
	let mockClub: ClubConfig;

	beforeEach(() => {
		const config: CacheConfig = {
			enabled: true,
			defaultTtlMs: 1000, // 1 second for testing
			maxSize: 10,
			cleanupIntervalMs: 0 // Disable automatic cleanup for tests
		};
		cacheService = new MemoryClubCacheService(config);

		mockClub = {
			id: 'test-club',
			name: 'Test Club',
			location: 'Test Location',
			hostname: 'test.example.com',
			meetingPoint: {
				name: 'Test Meeting Point',
				address: 'Test Address',
				postcode: 'TE5T 1NG',
				coordinates: { lat: 50.0, lng: -4.0 }
			},
			schedule: {
				day: 'Sunday',
				time: '10:00'
			},
			route: {
				name: 'Test Route',
				description: 'A test walking route',
				points: [
					{ lat: 50.0, lng: -4.0 },
					{ lat: 50.1, lng: -4.1 }
				]
			}
		};
	});

	afterEach(() => {
		cacheService.shutdown();
	});

	it('should store and retrieve club from cache', async () => {
		const key = 'test-key';

		// Initially should return null
		const initial = await cacheService.get(key);
		expect(initial).toBeNull();

		// Set club in cache
		await cacheService.set(key, mockClub);

		// Should retrieve the club
		const retrieved = await cacheService.get(key);
		expect(retrieved).toEqual(mockClub);
	});

	it('should respect TTL and expire entries', async () => {
		const key = 'test-key';

		// Set with short TTL
		await cacheService.set(key, mockClub, 100); // 100ms

		// Should be available immediately
		const immediate = await cacheService.get(key);
		expect(immediate).toEqual(mockClub);

		// Wait for expiration
		await new Promise((resolve) => setTimeout(resolve, 150));

		// Should be expired
		const expired = await cacheService.get(key);
		expect(expired).toBeNull();
	});

	it('should invalidate specific entries', async () => {
		const key = 'test-key';

		await cacheService.set(key, mockClub);

		// Should be available
		const beforeInvalidate = await cacheService.get(key);
		expect(beforeInvalidate).toEqual(mockClub);

		// Invalidate
		await cacheService.invalidate(key);

		// Should be gone
		const afterInvalidate = await cacheService.get(key);
		expect(afterInvalidate).toBeNull();
	});

	it('should clear all entries', async () => {
		await cacheService.set('key1', mockClub);
		await cacheService.set('key2', mockClub);

		// Both should be available
		expect(await cacheService.get('key1')).toEqual(mockClub);
		expect(await cacheService.get('key2')).toEqual(mockClub);

		// Clear all
		await cacheService.invalidateAll();

		// Both should be gone
		expect(await cacheService.get('key1')).toBeNull();
		expect(await cacheService.get('key2')).toBeNull();
	});

	it('should warm cache with multiple clubs', async () => {
		const clubs = [
			{ ...mockClub, id: 'club1', hostname: 'club1.example.com' },
			{ ...mockClub, id: 'club2', hostname: 'club2.example.com' }
		];

		await cacheService.warmCache(clubs);

		// Should be able to retrieve by hostname
		const club1 = await cacheService.get('club:hostname:club1.example.com');
		const club2 = await cacheService.get('club:hostname:club2.example.com');

		expect(club1).toEqual(clubs[0]);
		expect(club2).toEqual(clubs[1]);
	});

	it('should track cache statistics', async () => {
		const key = 'test-key';

		// Initial stats
		let stats = cacheService.getStats();
		expect(stats.hits).toBe(0);
		expect(stats.misses).toBe(0);
		expect(stats.hitRate).toBe(0);

		// Cache miss
		await cacheService.get(key);
		stats = cacheService.getStats();
		expect(stats.misses).toBe(1);
		expect(stats.hitRate).toBe(0);

		// Set and hit
		await cacheService.set(key, mockClub);
		await cacheService.get(key);

		stats = cacheService.getStats();
		expect(stats.hits).toBe(1);
		expect(stats.misses).toBe(1);
		expect(stats.hitRate).toBe(0.5);
	});

	it('should generate correct cache keys', () => {
		expect(cacheService.generateHostnameKey('test.com')).toBe('club:hostname:test.com');
		expect(cacheService.generateIdKey('test-id')).toBe('club:id:test-id');
		expect(cacheService.generateAllClubsKey()).toBe('clubs:all');
	});

	it('should handle disabled cache', async () => {
		const disabledConfig: CacheConfig = {
			enabled: false,
			defaultTtlMs: 1000,
			maxSize: 10,
			cleanupIntervalMs: 0
		};
		const disabledCache = new MemoryClubCacheService(disabledConfig);

		const key = 'test-key';

		// Set should do nothing
		await disabledCache.set(key, mockClub);

		// Get should return null
		const result = await disabledCache.get(key);
		expect(result).toBeNull();

		// Stats should show disabled
		const stats = disabledCache.getStats();
		expect(stats.enabled).toBe(false);

		disabledCache.shutdown();
	});
});
