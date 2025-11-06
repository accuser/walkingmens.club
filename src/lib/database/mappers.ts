/**
 * Mapping functions to transform between database entities and ClubConfig objects
 */

import type {
	ClubConfig,
	MeetingPoint,
	MeetingSchedule,
	WalkingRoute,
	RoutePoint
} from '../clubs/types';
import type {
	ClubEntity,
	MeetingPointEntity,
	MeetingScheduleEntity,
	WalkingRouteEntity,
	RoutePointEntity,
	ClubWithRelationsEntity
} from './entities';

/**
 * Transform database entities to ClubConfig object
 */
export function mapEntitiesToClubConfig(entities: ClubWithRelationsEntity): ClubConfig {
	const { club, meetingPoint, schedule, route, routePoints } = entities;

	// Map meeting point
	const mappedMeetingPoint: MeetingPoint = {
		name: meetingPoint.name,
		address: meetingPoint.address,
		postcode: meetingPoint.postcode,
		coordinates: {
			lat: meetingPoint.lat,
			lng: meetingPoint.lng
		},
		what3words: meetingPoint.what3words || undefined
	};

	// Map schedule
	const mappedSchedule: MeetingSchedule = {
		day: schedule.day,
		time: schedule.time,
		frequency: schedule.frequency || undefined
	};

	// Map route points (sorted by sequence_order)
	const mappedRoutePoints: RoutePoint[] = routePoints
		.sort((a, b) => a.sequence_order - b.sequence_order)
		.map((point) => ({
			lat: point.lat,
			lng: point.lng
		}));

	// Map walking route
	const mappedRoute: WalkingRoute = {
		name: route.name,
		description: route.description,
		distance: route.distance || undefined,
		duration: route.duration || undefined,
		difficulty: (route.difficulty as 'easy' | 'moderate' | 'challenging') || undefined,
		points: mappedRoutePoints
	};

	// Map club config
	const clubConfig: ClubConfig = {
		id: club.id,
		name: club.name,
		location: club.location,
		hostname: club.hostname,
		meetingPoint: mappedMeetingPoint,
		schedule: mappedSchedule,
		route: mappedRoute,
		description: club.description || undefined,
		contact:
			club.contact_email || club.contact_phone
				? {
						email: club.contact_email || undefined,
						phone: club.contact_phone || undefined
					}
				: undefined
	};

	return clubConfig;
}

/**
 * Transform ClubConfig to database entities for insertion/update
 */
export function mapClubConfigToEntities(clubConfig: ClubConfig): {
	club: Omit<ClubEntity, 'created_at' | 'updated_at'>;
	meetingPoint: Omit<MeetingPointEntity, 'id'>;
	schedule: Omit<MeetingScheduleEntity, 'id'>;
	route: Omit<WalkingRouteEntity, 'id'>;
	routePoints: Omit<RoutePointEntity, 'id' | 'route_id'>[];
} {
	const club: Omit<ClubEntity, 'created_at' | 'updated_at'> = {
		id: clubConfig.id,
		name: clubConfig.name,
		location: clubConfig.location,
		hostname: clubConfig.hostname,
		description: clubConfig.description || null,
		contact_email: clubConfig.contact?.email || null,
		contact_phone: clubConfig.contact?.phone || null
	};

	const meetingPoint: Omit<MeetingPointEntity, 'id'> = {
		club_id: clubConfig.id,
		name: clubConfig.meetingPoint.name,
		address: clubConfig.meetingPoint.address,
		postcode: clubConfig.meetingPoint.postcode,
		lat: clubConfig.meetingPoint.coordinates.lat,
		lng: clubConfig.meetingPoint.coordinates.lng,
		what3words: clubConfig.meetingPoint.what3words || null
	};

	const schedule: Omit<MeetingScheduleEntity, 'id'> = {
		club_id: clubConfig.id,
		day: clubConfig.schedule.day,
		time: clubConfig.schedule.time,
		frequency: clubConfig.schedule.frequency || null
	};

	const route: Omit<WalkingRouteEntity, 'id'> = {
		club_id: clubConfig.id,
		name: clubConfig.route.name,
		description: clubConfig.route.description,
		distance: clubConfig.route.distance || null,
		duration: clubConfig.route.duration || null,
		difficulty: clubConfig.route.difficulty || null
	};

	const routePoints: Omit<RoutePointEntity, 'id' | 'route_id'>[] = clubConfig.route.points.map(
		(point, index) => ({
			sequence_order: index + 1,
			lat: point.lat,
			lng: point.lng
		})
	);

	return {
		club,
		meetingPoint,
		schedule,
		route,
		routePoints
	};
}
