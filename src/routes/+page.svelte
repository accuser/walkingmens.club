<script lang="ts">
	import WalkingRouteMap from '$lib/components/WalkingRouteMap.svelte';
	import ClubSuggestions from '$lib/components/ClubSuggestions.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { club, clubs } = data;
</script>

<svelte:head>
	{#if club}
		<title>{club.name}</title>
		<meta name="description" content={club.description} />
	{:else}
		<title>Walking Men's Clubs - Find Your Local Group</title>
		<meta
			name="description"
			content="Find your local walking men's club. Join us for friendly walks, good company, and fresh air."
		/>
	{/if}
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		{#if clubs}
			<!-- Landing Page -->
			<header class="mb-12 text-center">
				<h1 class="mb-4 text-4xl font-bold text-slate-900 sm:text-5xl">
					Walking Men's Clubs
				</h1>
				<p class="text-xl text-slate-600">
					Join your local walking group for exercise, friendship, and fresh air
				</p>
			</header>

			<ClubSuggestions {clubs} />

			<footer class="mt-16 text-center text-sm text-slate-500">
				<p>All local men welcome • No booking required • Just turn up and join us</p>
			</footer>
		{:else if club}
			<!-- Individual Club Page -->
			<div class="mx-auto max-w-4xl">
				<!-- Header -->
				<header class="mb-12 text-center">
					<h1 class="mb-4 text-4xl font-bold text-slate-900 sm:text-5xl">
						{club.name}
					</h1>
					<p class="text-xl text-slate-600">{club.location}</p>
				</header>

		<!-- Description -->
		{#if club.description}
			<section class="mb-12 rounded-lg bg-white p-6 shadow-md">
				<p class="text-lg leading-relaxed text-slate-700">
					{club.description}
				</p>
			</section>
		{/if}

		<!-- Meeting Information -->
		<section class="mb-12 rounded-lg bg-white p-8 shadow-md">
			<h2 class="mb-6 text-2xl font-bold text-slate-900">When & Where We Meet</h2>

			<div class="grid gap-8 md:grid-cols-2">
				<!-- Time -->
				<div>
					<h3 class="mb-3 flex items-center text-lg font-semibold text-slate-800">
						<svg
							class="mr-2 h-6 w-6 text-blue-600"
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
						Schedule
					</h3>
					<p class="text-slate-700">
						<span class="font-medium">{club.schedule.day}s</span> at
						<span class="font-medium">{club.schedule.time}</span>
					</p>
					{#if club.schedule.frequency}
						<p class="mt-1 text-sm text-slate-600">{club.schedule.frequency}</p>
					{/if}
				</div>

				<!-- Location -->
				<div>
					<h3 class="mb-3 flex items-center text-lg font-semibold text-slate-800">
						<svg
							class="mr-2 h-6 w-6 text-blue-600"
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
						Meeting Point
					</h3>
					<p class="font-medium text-slate-900">{club.meetingPoint.name}</p>
					<p class="mt-1 text-slate-700">{club.meetingPoint.address}</p>
					<p class="text-slate-700">{club.meetingPoint.postcode}</p>
					{#if club.meetingPoint.what3words}
						<p class="mt-2 text-sm text-slate-600">
							what3words: <span class="font-mono">{club.meetingPoint.what3words}</span>
						</p>
					{/if}
				</div>
			</div>
		</section>

		<!-- Route Information -->
		<section class="mb-12 rounded-lg bg-white p-8 shadow-md">
			<h2 class="mb-6 text-2xl font-bold text-slate-900">The Walk</h2>

			<div class="mb-6">
				<h3 class="mb-2 text-lg font-semibold text-slate-800">{club.route.name}</h3>
				<p class="mb-4 text-slate-700">{club.route.description}</p>

				<div class="flex flex-wrap gap-4 text-sm">
					{#if club.route.distance}
						<div class="flex items-center text-slate-600">
							<svg class="mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
								/>
							</svg>
							<span><strong>Distance:</strong> {club.route.distance}</span>
						</div>
					{/if}
					{#if club.route.duration}
						<div class="flex items-center text-slate-600">
							<svg class="mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span><strong>Duration:</strong> {club.route.duration}</span>
						</div>
					{/if}
					{#if club.route.difficulty}
						<div class="flex items-center text-slate-600">
							<svg class="mr-1.5 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
								/>
							</svg>
							<span><strong>Difficulty:</strong>
								<span class="capitalize">{club.route.difficulty}</span>
							</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Map -->
			<div class="mt-6">
				<WalkingRouteMap
					route={club.route.points}
					meetingPoint={club.meetingPoint}
					routeName={club.route.name}
				/>
			</div>
		</section>

		<!-- Contact Information -->
		{#if club.contact?.email || club.contact?.phone}
			<section class="rounded-lg bg-white p-8 shadow-md">
				<h2 class="mb-4 text-2xl font-bold text-slate-900">Get In Touch</h2>
				<div class="space-y-2">
					{#if club.contact.email}
						<p class="text-slate-700">
							<strong>Email:</strong>
							<a href="mailto:{club.contact.email}" class="text-blue-600 hover:underline">
								{club.contact.email}
							</a>
						</p>
					{/if}
					{#if club.contact.phone}
						<p class="text-slate-700">
							<strong>Phone:</strong>
							<a href="tel:{club.contact.phone}" class="text-blue-600 hover:underline">
								{club.contact.phone}
							</a>
						</p>
					{/if}
				</div>
			</section>
		{/if}

				<!-- Footer -->
				<footer class="mt-12 text-center text-sm text-slate-500">
					<p>All local men welcome • No booking required • Just turn up and join us</p>
				</footer>
			</div>
		{/if}
	</div>
</div>
