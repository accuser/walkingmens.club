import { delabole } from '$lib/clubs';
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	const mockData = {
		club: delabole
	};

	it('should render club name in h1', async () => {
		render(Page, { data: mockData });

		const heading = page.getByRole('heading', { level: 1 });
		await expect.element(heading).toBeInTheDocument();
		await expect.element(heading).toHaveTextContent('Delabole Walking Men\'s Club');
	});

	it('should display meeting schedule', async () => {
		render(Page, { data: mockData });

		const scheduleHeading = page.getByRole('heading', { name: /schedule/i });
		await expect.element(scheduleHeading).toBeInTheDocument();
	});

	it('should display meeting point information', async () => {
		render(Page, { data: mockData });

		const meetingPointHeading = page.getByRole('heading', { name: /meeting point/i });
		await expect.element(meetingPointHeading).toBeInTheDocument();

		// Check that Spar is mentioned
		const sparText = page.getByText(/spar/i);
		await expect.element(sparText).toBeInTheDocument();
	});

	it('should display route information', async () => {
		render(Page, { data: mockData });

		const walkHeading = page.getByRole('heading', { name: /the walk/i });
		await expect.element(walkHeading).toBeInTheDocument();
	});
});
