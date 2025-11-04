<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { club, clubUrl } = data;

	let qrCodeDataUrl = $state<string>('');
	let isGenerating = $state(true);

	onMount(async () => {
		// Generate QR code on the client side (browser has Canvas API)
		const QRCode = await import('qrcode');

		qrCodeDataUrl = await QRCode.toDataURL(clubUrl, {
			width: 300,
			margin: 2,
			color: {
				dark: '#1e293b', // slate-900
				light: '#ffffff'
			}
		});

		isGenerating = false;
	});

	function handlePrint() {
		window.print();
	}
</script>

<svelte:head>
	<title>{club.name} - Printable Poster</title>
</svelte:head>

<!-- Print Button (hidden when printing) -->
<div class="no-print fixed right-4 top-4 z-10">
	<button
		onclick={handlePrint}
		class="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700"
	>
		<svg
			class="mr-2 inline h-5 w-5"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
			/>
		</svg>
		Print Poster
	</button>
	<a
		href="/"
		class="mt-2 block rounded-lg bg-slate-600 px-6 py-3 text-center font-semibold text-white shadow-lg transition hover:bg-slate-700"
	>
		Back to Club Page
	</a>
</div>

<!-- Poster Content (A4 size) -->
<div class="poster mx-auto bg-white p-12 shadow-2xl">
	<!-- Header -->
	<div class="mb-8 border-b-4 border-blue-600 pb-6 text-center">
		<h1 class="mb-3 text-5xl font-black text-slate-900">
			{club.name}
		</h1>
		<p class="text-2xl font-medium text-slate-600">{club.location}</p>
	</div>

	<!-- Main Content Grid -->
	<div class="mb-8 grid gap-8 md:grid-cols-2">
		<!-- Left Column: Details -->
		<div class="space-y-6">
			<!-- When We Meet -->
			<div class="rounded-lg bg-blue-50 p-6">
				<h2 class="mb-3 flex items-center text-2xl font-bold text-slate-900">
					<svg
						class="mr-3 h-8 w-8 text-blue-600"
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
					When We Meet
				</h2>
				<p class="text-xl text-slate-800">
					<span class="font-bold">{club.schedule.day}s</span>
				</p>
				<p class="text-xl text-slate-800">
					at <span class="font-bold">{club.schedule.time}</span>
				</p>
				{#if club.schedule.frequency}
					<p class="mt-2 text-lg text-slate-600">{club.schedule.frequency}</p>
				{/if}
			</div>

			<!-- Where We Meet -->
			<div class="rounded-lg bg-slate-50 p-6">
				<h2 class="mb-3 flex items-center text-2xl font-bold text-slate-900">
					<svg
						class="mr-3 h-8 w-8 text-blue-600"
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
					Where We Meet
				</h2>
				<p class="text-xl font-bold text-slate-900">{club.meetingPoint.name}</p>
				<p class="mt-2 text-lg text-slate-700">{club.meetingPoint.address}</p>
				<p class="text-lg text-slate-700">{club.meetingPoint.postcode}</p>
			</div>

			<!-- The Walk -->
			<div class="rounded-lg bg-green-50 p-6">
				<h2 class="mb-3 text-2xl font-bold text-slate-900">The Walk</h2>
				<p class="text-lg font-semibold text-slate-800">{club.route.name}</p>
				{#if club.route.distance}
					<p class="mt-2 text-lg text-slate-700">
						<strong>Distance:</strong> {club.route.distance}
					</p>
				{/if}
				{#if club.route.duration}
					<p class="text-lg text-slate-700">
						<strong>Duration:</strong> {club.route.duration}
					</p>
				{/if}
				{#if club.route.difficulty}
					<p class="text-lg text-slate-700">
						<strong>Difficulty:</strong>
						<span class="capitalize">{club.route.difficulty}</span>
					</p>
				{/if}
			</div>
		</div>

		<!-- Right Column: QR Code -->
		<div class="flex flex-col items-center justify-center">
			<div class="rounded-xl border-4 border-slate-900 bg-white p-6 shadow-lg">
				{#if isGenerating}
					<div class="flex h-[300px] w-[300px] items-center justify-center">
						<div class="text-center">
							<svg
								class="mx-auto mb-2 h-12 w-12 animate-spin text-blue-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							<p class="text-sm text-slate-600">Generating QR code...</p>
						</div>
					</div>
				{:else}
					<img src={qrCodeDataUrl} alt="QR Code to {clubUrl}" class="h-auto w-full" />
				{/if}
			</div>
			<p class="mt-4 text-center text-lg font-semibold text-slate-700">
				Scan for more information
			</p>
			<p class="mt-2 break-all text-center text-sm text-slate-600">{clubUrl}</p>
		</div>
	</div>

	<!-- Call to Action -->
	<div class="rounded-xl border-4 border-blue-600 bg-gradient-to-r from-blue-50 to-blue-100 p-8 text-center">
		<h2 class="mb-4 text-3xl font-black text-slate-900">Everyone Welcome!</h2>
		<div class="space-y-2 text-lg text-slate-700">
			<p class="font-semibold">✓ No booking required</p>
			<p class="font-semibold">✓ No experience needed</p>
			<p class="font-semibold">✓ Walk at your own pace</p>
			<p class="mt-4 text-xl font-bold text-blue-700">Just turn up and join us</p>
		</div>
	</div>

	<!-- Footer -->
	<div class="mt-8 border-t-2 border-slate-200 pt-6 text-center">
		<p class="text-lg font-medium text-slate-600">
			A community-wide initiative supporting men's health and wellbeing
		</p>
	</div>
</div>

<style>
	/* Base poster styles */
	.poster {
		width: 210mm; /* A4 width */
		min-height: 297mm; /* A4 height */
		margin: 2rem auto;
	}

	/* Print styles */
	@media print {
		/* Hide print button and back link */
		.no-print {
			display: none !important;
		}

		/* Reset page for printing */
		:global(body) {
			margin: 0;
			padding: 0;
		}

		.poster {
			width: 210mm;
			height: 297mm;
			margin: 0;
			box-shadow: none;
			page-break-after: avoid;
		}

		/* Ensure colors print */
		:global(*) {
			-webkit-print-color-adjust: exact;
			print-color-adjust: exact;
		}
	}

	/* Screen only: Add some spacing */
	@media screen {
		:global(body) {
			background: #f1f5f9;
			padding: 2rem 0;
		}
	}
</style>
