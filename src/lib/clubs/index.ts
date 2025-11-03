import type { ClubConfig } from './types';
import { delabole } from './delabole';

// Registry of all clubs
const clubs: ClubConfig[] = [delabole];

// Map hostnames to clubs for faster lookup
const clubsByHostname = new Map<string, ClubConfig>(
	clubs.map((club) => [club.hostname, club])
);

/**
 * Get club configuration by hostname
 * @param hostname - The hostname (e.g., 'delabole.walkingmens.club')
 * @returns ClubConfig or undefined if not found
 */
export function getClubByHostname(hostname: string): ClubConfig | undefined {
	// Extract subdomain for localhost development
	// e.g., 'localhost:5173' -> use first club as default
	// e.g., 'delabole.localhost:5173' -> extract 'delabole'
	if (hostname.includes('localhost')) {
		const parts = hostname.split('.');
		if (parts.length > 1 && parts[0] !== 'localhost') {
			const subdomain = parts[0];
			const club = clubs.find((c) => c.id === subdomain);
			if (club) return club;
		}
		// Default to first club for development
		return clubs[0];
	}

	// Production: match by full hostname
	return clubsByHostname.get(hostname);
}

/**
 * Get all registered clubs
 */
export function getAllClubs(): ClubConfig[] {
	return [...clubs];
}

export { delabole };
export type { ClubConfig, MeetingPoint, MeetingSchedule, WalkingRoute, RoutePoint } from './types';
