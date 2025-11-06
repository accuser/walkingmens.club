/**
 * Admin club edit page server load and actions
 */

import type { PageServerLoad, Actions } from './$types';
import { redirect, fail, error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	try {
		const { id } = event.params;

		// Fetch club data from API
		const response = await fetch(`${event.url.origin}/api/admin/clubs/${id}`, {
			headers: {
				cookie: event.request.headers.get('cookie') || ''
			}
		});

		if (!response.ok) {
			if (response.status === 404) {
				throw error(404, 'Club not found');
			}
			if (response.status === 401) {
				throw error(401, 'Authentication required');
			}
			throw error(response.status, 'Failed to fetch club');
		}

		const data = await response.json();

		return {
			club: data.club
		};
	} catch (err) {
		console.error('Error loading club:', err);
		if (err instanceof Response) {
			throw err;
		}
		throw error(500, 'Failed to load club');
	}
};

export const actions: Actions = {
	update: async (event) => {
		try {
			const { id } = event.params;
			const formData = await event.request.formData();

			// Extract form data
			const clubData = {
				name: formData.get('name')?.toString(),
				location: formData.get('location')?.toString(),
				hostname: formData.get('hostname')?.toString(),
				description: formData.get('description')?.toString() || undefined,
				meetingPoint: {
					name: formData.get('meetingPointName')?.toString(),
					address: formData.get('meetingPointAddress')?.toString(),
					postcode: formData.get('meetingPointPostcode')?.toString(),
					coordinates: {
						lat: parseFloat(formData.get('meetingPointLat')?.toString() || '0'),
						lng: parseFloat(formData.get('meetingPointLng')?.toString() || '0')
					},
					what3words: formData.get('meetingPointWhat3words')?.toString() || undefined
				},
				schedule: {
					day: formData.get('scheduleDay')?.toString(),
					time: formData.get('scheduleTime')?.toString(),
					frequency: formData.get('scheduleFrequency')?.toString() || undefined
				},
				route: {
					name: formData.get('routeName')?.toString(),
					description: formData.get('routeDescription')?.toString(),
					distance: formData.get('routeDistance')?.toString() || undefined,
					duration: formData.get('routeDuration')?.toString() || undefined,
					difficulty:
						(formData.get('routeDifficulty')?.toString() as 'easy' | 'moderate' | 'challenging') ||
						'easy',
					points: JSON.parse(formData.get('routePoints')?.toString() || '[]')
				},
				contact: {
					email: formData.get('contactEmail')?.toString() || undefined,
					phone: formData.get('contactPhone')?.toString() || undefined
				}
			};

			// Validate required fields
			const requiredFields = [
				'name',
				'location',
				'hostname',
				'meetingPointName',
				'meetingPointAddress',
				'meetingPointPostcode',
				'scheduleDay',
				'scheduleTime',
				'routeName',
				'routeDescription'
			];

			for (const field of requiredFields) {
				const value = formData.get(field)?.toString();
				if (!value || value.trim() === '') {
					return fail(400, {
						error: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required`,
						data: clubData
					});
				}
			}

			// Validate coordinates
			if (
				clubData.meetingPoint.coordinates.lat === 0 ||
				clubData.meetingPoint.coordinates.lng === 0
			) {
				return fail(400, {
					error: 'Meeting point coordinates are required',
					data: clubData
				});
			}

			// Update club via API
			const response = await fetch(`${event.url.origin}/api/admin/clubs/${id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					cookie: event.request.headers.get('cookie') || ''
				},
				body: JSON.stringify(clubData)
			});

			if (!response.ok) {
				const errorData = await response.json();
				return fail(response.status, {
					error: errorData.error || 'Failed to update club',
					suggestions: errorData.suggestions,
					data: clubData
				});
			}

			await response.json();

			// Redirect to clubs list on success
			throw redirect(302, '/admin/clubs');
		} catch (error) {
			if (error instanceof Response) {
				throw error; // Re-throw redirect responses
			}

			console.error('Update club action error:', error);
			return fail(500, {
				error: 'An unexpected error occurred',
				data: {}
			});
		}
	}
};
