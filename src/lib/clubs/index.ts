import { delabole } from './delabole';
import type { ClubConfig } from './types';
import type { FallbackDataProvider } from '../database/resilientClubService';

// Registry of all static clubs
const staticClubs: ClubConfig[] = [delabole];

// Map hostnames to clubs for faster lookup
const staticClubsByHostname = new Map<string, ClubConfig>(
	staticClubs.map((club) => [club.hostname, club])
);

/**
 * Static fallback data provider
 */
export const staticFallbackProvider: FallbackDataProvider = {
	getClubByHostname(hostname: string): ClubConfig | undefined {
		return staticClubsByHostname.get(hostname);
	},
	getAllClubs(): ClubConfig[] {
		return [...staticClubs];
	}
};

// Global service instance
let clubService: any = null;

/**
 * Initialize club service with platform context
 * This should be called during app initialization with the platform context
 */
export function initializeClubService(platform?: App.Platform): void {
	// Only initialize if we have a platform and haven't initialized yet
	if (platform && !clubService) {
		// Dynamically import to avoid circular dependencies and ensure it only loads when needed
		import('../database/resilientClubService').then(({ ResilientClubService }) => {
			clubService = new ResilientClubService(platform, staticFallbackProvider);
		}).catch(error => {
			console.warn('Failed to initialize database service, using static fallback:', error);
		});
	}
}

/**
 * Get club configuration by hostname
 * @param hostname - The hostname (e.g., 'delabole.walkingmens.club')
 * @returns ClubConfig or undefined if not found
 */
export async function getClubByHostname(hostname: string): Promise<ClubConfig | undefined> {
	// Try database service first if available
	if (clubService) {
		try {
			const result = await clubService.getClubByHostname(hostname);
			return result || undefined;
		} catch (error) {
			console.warn('Database service failed, falling back to static data:', error);
		}
	}

	// Fallback to static data
	return staticClubsByHostname.get(hostname);
}

/**
 * Get all registered clubs
 */
export async function getAllClubs(): Promise<ClubConfig[]> {
	// Try database service first if available
	if (clubService) {
		try {
			const result = await clubService.getAllClubs();
			return result;
		} catch (error) {
			console.warn('Database service failed, falling back to static data:', error);
		}
	}

	// Fallback to static data
	return [...staticClubs];
}

/**
 * Synchronous versions for backward compatibility
 * These will be deprecated once all callers are updated to use async versions
 */
export function getClubByHostnameSync(hostname: string): ClubConfig | undefined {
	console.warn('getClubByHostnameSync is deprecated, use getClubByHostname instead');
	return staticClubsByHostname.get(hostname);
}

export function getAllClubsSync(): ClubConfig[] {
	console.warn('getAllClubsSync is deprecated, use getAllClubs instead');
	return [...staticClubs];
}

/**
 * Get static clubs (for migration and testing)
 */
export function getStaticClubs(): ClubConfig[] {
	return [...staticClubs];
}

/**
 * Check if database service is available
 */
export function isDatabaseServiceAvailable(): boolean {
	return clubService !== null;
}

/**
 * Check if a hostname is configured in the system
 */
export async function isHostnameConfigured(hostname: string): Promise<boolean> {
	// Try database service first if available
	if (clubService && typeof clubService.isHostnameConfigured === 'function') {
		try {
			return await clubService.isHostnameConfigured(hostname);
		} catch (error) {
			console.warn('Database service failed for hostname check, falling back to static data:', error);
		}
	}

	// Fallback to static data
	return staticClubsByHostname.has(hostname);
}

/**
 * Get service health status (if database service is available)
 */
export async function getServiceHealthStatus() {
	if (clubService && typeof clubService.getHealthStatus === 'function') {
		return await clubService.getHealthStatus();
	}
	
	return {
		database: false,
		fallback: true,
		cache: { size: 0, enabled: false, hits: 0, misses: 0, hitRate: 0 },
		connections: { totalConnections: 0, activeConnections: 0, healthyConnections: 0 }
	};
}

export type { ClubConfig, MeetingPoint, MeetingSchedule, RoutePoint, WalkingRoute } from './types';
export { delabole };

