import type { ClubConfig } from './types';

// Approximate route around Delabole Slate Quarry
// This is a placeholder - replace with actual route data when available
const delaboleRoute = [
	{ lat: 50.6228, lng: -4.7242 }, // Starting point near Spar
	{ lat: 50.6235, lng: -4.7265 }, // Head towards quarry
	{ lat: 50.6248, lng: -4.7285 }, // North edge
	{ lat: 50.6265, lng: -4.7295 }, // Northeast
	{ lat: 50.6275, lng: -4.728 }, // East side
	{ lat: 50.627, lng: -4.726 }, // Southeast
	{ lat: 50.6255, lng: -4.7245 }, // South
	{ lat: 50.624, lng: -4.7235 }, // Southwest
	{ lat: 50.6228, lng: -4.7242 } // Return to start
];

export const delabole: ClubConfig = {
	id: 'delabole',
	name: "Delabole Walking Men's Club",
	location: 'Delabole, Cornwall',
	hostname: 'delabole.walkingmens.club',
	meetingPoint: {
		name: 'Spar',
		address: '65 High Street, Delabole',
		postcode: 'PL33 9AG',
		coordinates: {
			lat: 50.6228,
			lng: -4.7242
		}
	},
	schedule: {
		day: 'Sunday',
		time: '10:00',
		frequency: 'Weekly'
	},
	route: {
		name: 'Delabole Slate Quarry Walk',
		description:
			'A scenic walk around the historic Delabole Slate Quarry and surrounding countryside, following footpaths through fields and offering views of this impressive working quarry.',
		distance: 'Approximately 3-4 km',
		duration: 'About 1 hour',
		difficulty: 'easy',
		points: delaboleRoute
	},
	description:
		'Join us for a friendly Sunday morning walk around Delabole. All are welcome to join us for gentle exercise, good company, and fresh Cornish air.'
};
