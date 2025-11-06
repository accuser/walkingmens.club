/**
 * Database entity interfaces for Cloudflare D1 database
 * These interfaces represent the raw database structure
 */

export interface ClubEntity {
	id: string;
	name: string;
	location: string;
	hostname: string;
	description: string | null;
	contact_email: string | null;
	contact_phone: string | null;
	created_at: string;
	updated_at: string;
}

export interface MeetingPointEntity {
	id: number;
	club_id: string;
	name: string;
	address: string;
	postcode: string;
	lat: number;
	lng: number;
	what3words: string | null;
}

export interface MeetingScheduleEntity {
	id: number;
	club_id: string;
	day: string;
	time: string;
	frequency: string | null;
}

export interface WalkingRouteEntity {
	id: number;
	club_id: string;
	name: string;
	description: string;
	distance: string | null;
	duration: string | null;
	difficulty: string | null;
}

export interface RoutePointEntity {
	id: number;
	route_id: number;
	sequence_order: number;
	lat: number;
	lng: number;
}

/**
 * Combined entity type for complete club data retrieval
 */
export interface ClubWithRelationsEntity {
	club: ClubEntity;
	meetingPoint: MeetingPointEntity;
	schedule: MeetingScheduleEntity;
	route: WalkingRouteEntity;
	routePoints: RoutePointEntity[];
}