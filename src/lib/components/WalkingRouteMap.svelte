<script lang="ts">
	import { onMount } from 'svelte';
	import type { Map as LeafletMap, TileLayer, Marker, Polyline } from 'leaflet';
	import type { RoutePoint, MeetingPoint } from '$lib/clubs';

	interface Props {
		route: RoutePoint[];
		meetingPoint: MeetingPoint;
		routeName: string;
	}

	let { route, meetingPoint, routeName }: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: LeafletMap | undefined = $state();

	onMount(async () => {
		// Import Leaflet dynamically (it requires browser APIs)
		const L = await import('leaflet');

		// Check if container exists before initializing
		if (!mapContainer) {
			console.warn('Map container not found');
			return;
		}

		// Initialize the map
		map = L.map(mapContainer).setView([meetingPoint.coordinates.lat, meetingPoint.coordinates.lng], 14);

		// Add OpenStreetMap tiles
		const tileLayer: TileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
			maxZoom: 19
		});
		tileLayer.addTo(map);

		// Add meeting point marker
		const marker: Marker = L.marker([meetingPoint.coordinates.lat, meetingPoint.coordinates.lng], {
			title: meetingPoint.name
		});
		marker.addTo(map);
		marker.bindPopup(`<strong>${meetingPoint.name}</strong><br>${meetingPoint.address}`);

		// Add route line
		if (route && route.length > 0) {
			const routeCoords: [number, number][] = route.map((point) => [point.lat, point.lng]);
			const polyline: Polyline = L.polyline(routeCoords, {
				color: '#2563eb',
				weight: 3,
				opacity: 0.7
			});
			polyline.addTo(map);
			polyline.bindPopup(`<strong>${routeName}</strong>`);

			// Fit map to show entire route
			const bounds = polyline.getBounds();
			map.fitBounds(bounds, { padding: [50, 50] });
		}

		return () => {
			if (map) {
				map.remove();
			}
		};
	});
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
		integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
		crossorigin=""/>
</svelte:head>

<div bind:this={mapContainer} class="h-96 w-full rounded-lg shadow-lg"></div>
