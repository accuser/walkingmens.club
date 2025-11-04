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
	if (hostname === 'walkingmens.club' || hostname === 'localhost') {
		return clubsByHostname.get('delabole.walkingmens.club');
	}

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

