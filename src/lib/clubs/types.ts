export interface MeetingPoint {
	name: string;
	address: string;
	postcode: string;
	coordinates: {
		lat: number;
		lng: number;
	};
	what3words?: string;
}

export interface MeetingSchedule {
	day: string;
	time: string;
	frequency?: string;
}

export interface RoutePoint {
	lat: number;
	lng: number;
}

export interface WalkingRoute {
	name: string;
	description: string;
	distance?: string;
	duration?: string;
	difficulty?: 'easy' | 'moderate' | 'challenging';
	points: RoutePoint[];
}

export interface ClubConfig {
	id: string;
	name: string;
	location: string;
	hostname: string;
	meetingPoint: MeetingPoint;
	schedule: MeetingSchedule;
	route: WalkingRoute;
	description?: string;
	contact?: {
		email?: string;
		phone?: string;
	};
}
