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
	<!-- Welcome Banner -->
	<div class="mx-auto max-w-4xl rounded-lg bg-blue-50 p-6 text-center">
		<p class="text-lg leading-relaxed text-slate-700">
			A community-wide initiative supporting men's health, wellbeing, and connection through regular
			walks. <span class="font-semibold text-blue-700"
				>All abilities welcome—walk at your own pace, no commitment required.</span
			>
		</p>
	</div>

	<!-- Purpose Section -->
	<div class="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-md">
		<h2 class="mb-6 text-center text-2xl font-bold text-slate-900">Why Join a Walking Group?</h2>
		<div class="space-y-6 text-slate-700">
			<p class="text-lg leading-relaxed">
				Walking groups offer a simple, accessible way to improve your physical and mental health.
				Whether you're looking to stay active, meet people in your area, or just get some fresh
				air, there's no pressure—just turn up and walk.
			</p>
			<div class="grid gap-6 md:grid-cols-3">
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
					<h3 class="mb-1 font-semibold text-slate-900">Build Connections</h3>
					<p class="text-sm">Meet new people and combat isolation</p>
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
					<h3 class="mb-1 font-semibold text-slate-900">Boost Wellbeing</h3>
					<p class="text-sm">Physical and mental health benefits</p>
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
					<p class="text-sm">Discover your area's paths and scenery</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Find Your Club Section -->
	<div class="space-y-4">
		<div class="text-center">
			<h2 class="mb-3 text-2xl font-bold text-slate-900">Find Your Local Club</h2>
			<p class="text-slate-600">
				Use your location to find the closest club, or browse all clubs below
			</p>
		</div>

		<!-- Geolocation Button -->
		{#if geolocationStatus !== 'success'}
			<div class="flex justify-center">
				<button
					onclick={requestLocation}
					disabled={geolocationStatus === 'loading'}
					class="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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
			<div class="rounded-lg bg-green-50 p-3 text-center">
				<p class="font-medium text-green-700">
					<svg
						class="inline h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
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
	</div>

	<!-- Club List -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		{#each sortedClubs as club (club.id)}
			<a
				href="https://{club.hostname}"
				class="group relative block overflow-hidden rounded-lg border-2 border-slate-200 bg-white shadow-sm transition hover:border-blue-500 hover:shadow-lg"
			>
				<!-- Colored top bar -->
				<div class="h-2 bg-gradient-to-r from-blue-500 to-blue-600"></div>

				<div class="p-6">
					<div class="mb-3 flex items-start justify-between gap-3">
						<h3 class="text-xl font-bold leading-tight text-slate-900 group-hover:text-blue-600">
							{club.name}
						</h3>
						{#if club.distance !== undefined}
							<span
								class="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700"
							>
								{formatDistance(club.distance)}
							</span>
						{/if}
					</div>

					<p class="mb-4 text-base font-medium text-slate-600">{club.location}</p>

					<div class="space-y-2.5 text-sm text-slate-700">
						<div class="flex items-center gap-2">
							<svg
								class="h-4 w-4 shrink-0 text-blue-500"
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
							<span><strong>{club.schedule.day}s</strong> at {club.schedule.time}</span>
						</div>

						<div class="flex items-center gap-2">
							<svg
								class="h-4 w-4 shrink-0 text-blue-500"
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

					<div
						class="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-blue-600 group-hover:text-blue-700"
					>
						<span>View full details</span>
						<svg class="h-5 w-5 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7l5 5m0 0l-5 5m5-5H6"
							/>
						</svg>
					</div>
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
