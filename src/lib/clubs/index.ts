import { delabole } from './delabole';
import type { ClubConfig } from './types';

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
	if (hostname === 'walkingmens.club' || hostname === 'localhost') {
		return clubsByHostname.get('delabole.walkingmens.club');
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

export type { ClubConfig, MeetingPoint, MeetingSchedule, RoutePoint, WalkingRoute } from './types';
export { delabole };

