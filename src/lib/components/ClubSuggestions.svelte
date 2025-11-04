<script lang="ts">
	import type { ClubConfig } from '$lib/clubs';

	interface ClubWithDistance extends ClubConfig {
		distance?: number;
	}

	let { clubs }: { clubs: ClubConfig[] } = $props();

	let sortedClubs = $state<ClubWithDistance[]>(clubs.map((c) => ({ ...c })));
	let geolocationStatus = $state<'loading' | 'success' | 'denied' | 'error' | null>(null);
	let userLocation = $state<{ lat: number; lng: number } | null>(null);

	// Calculate distance between two points using Haversine formula
	function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 3959; // Earth's radius in miles
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLng = ((lng2 - lng1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	// Request user's location
	function requestLocation() {
		if (!navigator.geolocation) {
			geolocationStatus = 'error';
			return;
		}

		geolocationStatus = 'loading';

		navigator.geolocation.getCurrentPosition(
			(position) => {
				userLocation = {
					lat: position.coords.latitude,
					lng: position.coords.longitude
				};
				geolocationStatus = 'success';

				// Calculate distances and sort
				sortedClubs = clubs
					.map((club) => ({
						...club,
						distance: calculateDistance(
							position.coords.latitude,
							position.coords.longitude,
							club.meetingPoint.coordinates.lat,
							club.meetingPoint.coordinates.lng
						)
					}))
					.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
			},
			(error) => {
				console.error('Geolocation error:', error);
				geolocationStatus = error.code === error.PERMISSION_DENIED ? 'denied' : 'error';
			}
		);
	}

	function formatDistance(distance?: number): string {
		if (distance === undefined) return '';
		if (distance < 0.1) return `${Math.round(distance * 5280)}ft away`;
		return `${distance.toFixed(1)} miles away`;
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="text-center">
		<h2 class="mb-4 text-3xl font-bold text-slate-900">Find your local Walking Men's Club</h2>
		<p class="text-lg text-slate-600">
			Select a club below to view their meeting times and walking routes
		</p>
	</div>

	<!-- Purpose Section -->
	<div class="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-md">
		<div class="space-y-4 text-slate-700">
			<p class="text-lg leading-relaxed">
				Walking Men's Clubs bring local men together for regular walks, fresh air, and good company.
				Whether you're looking to stay active, meet new people, or simply enjoy your local area,
				you're welcome to join us.
			</p>
			<div class="grid gap-6 pt-4 md:grid-cols-3">
				<div class="text-center">
					<svg
						class="mx-auto mb-2 h-8 w-8 text-blue-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
						/>
					</svg>
					<h3 class="mb-1 font-semibold text-slate-900">Meet People</h3>
					<p class="text-sm">Connect with others in your community</p>
				</div>
				<div class="text-center">
					<svg
						class="mx-auto mb-2 h-8 w-8 text-blue-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
						/>
					</svg>
					<h3 class="mb-1 font-semibold text-slate-900">Stay Active</h3>
					<p class="text-sm">Regular exercise at your own pace</p>
				</div>
				<div class="text-center">
					<svg
						class="mx-auto mb-2 h-8 w-8 text-blue-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
						/>
					</svg>
					<h3 class="mb-1 font-semibold text-slate-900">Explore Local</h3>
					<p class="text-sm">Discover routes in your area</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Geolocation Button -->
	{#if geolocationStatus !== 'success'}
		<div class="flex justify-center">
			<button
				onclick={requestLocation}
				disabled={geolocationStatus === 'loading'}
				class="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				{#if geolocationStatus === 'loading'}
					Finding your location...
				{:else}
					Find clubs near me
				{/if}
			</button>
		</div>

		{#if geolocationStatus === 'denied'}
			<p class="text-center text-sm text-red-600">
				Location access denied. Please enable location services to find nearby clubs.
			</p>
		{:else if geolocationStatus === 'error'}
			<p class="text-center text-sm text-red-600">
				Unable to get your location. Please try again or browse all clubs below.
			</p>
		{/if}
	{:else}
		<div class="text-center">
			<p class="text-green-600">
				<svg class="inline h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
				Clubs sorted by distance from your location
			</p>
		</div>
	{/if}

	<!-- Club List -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each sortedClubs as club (club.id)}
			<a
				href="https://{club.hostname}"
				class="group block rounded-lg border-2 border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-500 hover:shadow-md"
			>
				<div class="mb-3 flex items-start justify-between">
					<h3 class="text-xl font-bold text-slate-900 group-hover:text-blue-600">
						{club.name}
					</h3>
					{#if club.distance !== undefined}
						<span class="ml-2 text-sm font-medium whitespace-nowrap text-blue-600">
							{formatDistance(club.distance)}
						</span>
					{/if}
				</div>

				<p class="mb-4 text-slate-600">{club.location}</p>

				<div class="space-y-2 text-sm text-slate-700">
					<div class="flex items-center gap-2">
						<svg
							class="h-4 w-4 text-slate-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{club.schedule.day}s at {club.schedule.time}</span>
					</div>

					<div class="flex items-center gap-2">
						<svg
							class="h-4 w-4 text-slate-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						<span class="truncate">{club.meetingPoint.name}</span>
					</div>
				</div>

				<div class="mt-4 flex items-center text-sm font-medium text-blue-600 group-hover:underline">
					View details
					<svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</div>
			</a>
		{/each}
	</div>

	{#if sortedClubs.length === 0}
		<div class="text-center text-slate-600">
			<p>No clubs found. Check back soon as we're adding more clubs!</p>
		</div>
	{/if}
</div>
