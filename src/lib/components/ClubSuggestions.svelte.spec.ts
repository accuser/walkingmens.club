import { delabole } from '$lib/clubs';
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ClubSuggestions from './ClubSuggestions.svelte';

describe('ClubSuggestions.svelte', () => {
	const mockClubs = [delabole];

	it('should render heading', async () => {
		render(ClubSuggestions, { clubs: mockClubs });

		const heading = page.getByRole('heading', { name: /find your local club/i });
		await expect.element(heading).toBeInTheDocument();
	});

	it('should display club cards', async () => {
		render(ClubSuggestions, { clubs: mockClubs });

		const clubName = page.getByText("Delabole Walking Men's Club");
		await expect.element(clubName).toBeInTheDocument();
	});

	it('should display geolocation button', async () => {
		render(ClubSuggestions, { clubs: mockClubs });

		const button = page.getByRole('button', { name: /find clubs near me/i });
		await expect.element(button).toBeInTheDocument();
	});

	it('should display club schedule', async () => {
		render(ClubSuggestions, { clubs: mockClubs });

		const schedule = page.getByText(/sundays at 10:00/i);
		await expect.element(schedule).toBeInTheDocument();
	});

	it('should display club meeting point', async () => {
		render(ClubSuggestions, { clubs: mockClubs });

		const meetingPoint = page.getByText(/spar/i);
		await expect.element(meetingPoint).toBeInTheDocument();
	});
});
