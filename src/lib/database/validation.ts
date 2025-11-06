/**
 * Validation functions for database constraints and business rules
 */

import type { ClubConfig } from '../clubs/types';

/**
 * Validation error class for database constraint violations
 */
export class ValidationError extends Error {
	constructor(
		message: string,
		public field?: string
	) {
		super(message);
		this.name = 'ValidationError';
	}
}

/**
 * Validate club configuration before database operations
 */
export function validateClubConfig(clubConfig: Partial<ClubConfig>): void {
	const errors: string[] = [];

	// Required fields validation
	if (!clubConfig.id?.trim()) {
		errors.push('Club ID is required');
	}

	if (!clubConfig.name?.trim()) {
		errors.push('Club name is required');
	}

	if (!clubConfig.location?.trim()) {
		errors.push('Club location is required');
	}

	if (!clubConfig.hostname?.trim()) {
		errors.push('Club hostname is required');
	}

	// Hostname format validation
	if (clubConfig.hostname && !isValidHostname(clubConfig.hostname)) {
		errors.push('Invalid hostname format');
	}

	// Meeting point validation
	if (clubConfig.meetingPoint) {
		if (!clubConfig.meetingPoint.name?.trim()) {
			errors.push('Meeting point name is required');
		}
		if (!clubConfig.meetingPoint.address?.trim()) {
			errors.push('Meeting point address is required');
		}
		if (!clubConfig.meetingPoint.postcode?.trim()) {
			errors.push('Meeting point postcode is required');
		}
		if (!isValidCoordinate(clubConfig.meetingPoint.coordinates?.lat)) {
			errors.push('Valid meeting point latitude is required');
		}
		if (!isValidCoordinate(clubConfig.meetingPoint.coordinates?.lng)) {
			errors.push('Valid meeting point longitude is required');
		}
	}

	// Schedule validation
	if (clubConfig.schedule) {
		if (!clubConfig.schedule.day?.trim()) {
			errors.push('Meeting day is required');
		}
		if (!clubConfig.schedule.time?.trim()) {
			errors.push('Meeting time is required');
		}
		if (clubConfig.schedule.time && !isValidTime(clubConfig.schedule.time)) {
			errors.push('Invalid time format (use HH:MM)');
		}
	}

	// Route validation
	if (clubConfig.route) {
		if (!clubConfig.route.name?.trim()) {
			errors.push('Route name is required');
		}
		if (!clubConfig.route.description?.trim()) {
			errors.push('Route description is required');
		}
		if (clubConfig.route.difficulty && !isValidDifficulty(clubConfig.route.difficulty)) {
			errors.push('Invalid route difficulty (must be easy, moderate, or challenging)');
		}
		if (!clubConfig.route.points || clubConfig.route.points.length < 2) {
			errors.push('Route must have at least 2 points');
		}
		if (clubConfig.route.points) {
			clubConfig.route.points.forEach((point, index) => {
				if (!isValidCoordinate(point.lat)) {
					errors.push(`Invalid latitude for route point ${index + 1}`);
				}
				if (!isValidCoordinate(point.lng)) {
					errors.push(`Invalid longitude for route point ${index + 1}`);
				}
			});
		}
	}

	// Contact validation (optional but if provided must be valid)
	if (clubConfig.contact?.email && !isValidEmail(clubConfig.contact.email)) {
		errors.push('Invalid email format');
	}

	if (errors.length > 0) {
		throw new ValidationError(errors.join('; '));
	}
}

/**
 * Validate hostname format
 */
export function isValidHostname(hostname: string): boolean {
	// Basic hostname validation - alphanumeric, dots, and hyphens
	const hostnameRegex =
		/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	return hostnameRegex.test(hostname) && hostname.length <= 253;
}

/**
 * Validate coordinate values (latitude/longitude)
 */
export function isValidCoordinate(coord: number | undefined): boolean {
	return typeof coord === 'number' && !isNaN(coord) && isFinite(coord);
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTime(time: string): boolean {
	const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
	return timeRegex.test(time);
}

/**
 * Validate route difficulty
 */
export function isValidDifficulty(difficulty: string): boolean {
	return ['easy', 'moderate', 'challenging'].includes(difficulty);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validate club ID format (alphanumeric with hyphens and underscores)
 */
export function isValidClubId(id: string): boolean {
	const idRegex = /^[a-zA-Z0-9_-]+$/;
	return idRegex.test(id) && id.length >= 1 && id.length <= 50;
}

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
	return input.trim().replace(/[<>'"&]/g, '');
}
