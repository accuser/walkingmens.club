<!--
Admin club edit form with route visualization
-->
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { ClubConfig, RoutePoint } from '$lib/clubs/types';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/admin/Toast.svelte';
	import LoadingOverlay from '$lib/components/admin/LoadingOverlay.svelte';
	import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';

	export let data: PageData;
	export let form: ActionData;

	let loading = false;
	let hostnameAvailable: boolean | null = null;
	let hostnameChecking = false;
	let hostnameError = '';
	let originalHostname = '';

	// Toast and dialog state
	let showToast = false;
	let toastMessage = '';
	let toastType: 'success' | 'error' | 'warning' | 'info' = 'info';
	let showUnsavedChangesDialog = false;
	let hasUnsavedChanges = false;

	const club: ClubConfig = data.club;

	// Form data initialized from club data
	let formData = {
		name: form?.data?.name || club.name,
		location: form?.data?.location || club.location,
		hostname: form?.data?.hostname || club.hostname,
		description: form?.data?.description || club.description || '',
		meetingPointName: form?.data?.meetingPoint?.name || club.meetingPoint.name,
		meetingPointAddress: form?.data?.meetingPoint?.address || club.meetingPoint.address,
		meetingPointPostcode: form?.data?.meetingPoint?.postcode || club.meetingPoint.postcode,
		meetingPointLat:
			form?.data?.meetingPoint?.coordinates?.lat || club.meetingPoint.coordinates.lat,
		meetingPointLng:
			form?.data?.meetingPoint?.coordinates?.lng || club.meetingPoint.coordinates.lng,
		meetingPointWhat3words:
			form?.data?.meetingPoint?.what3words || club.meetingPoint.what3words || '',
		scheduleDay: form?.data?.schedule?.day || club.schedule.day,
		scheduleTime: form?.data?.schedule?.time || club.schedule.time,
		scheduleFrequency: form?.data?.schedule?.frequency || club.schedule.frequency || 'Weekly',
		routeName: form?.data?.route?.name || club.route.name,
		routeDescription: form?.data?.route?.description || club.route.description,
		routeDistance: form?.data?.route?.distance || club.route.distance || '',
		routeDuration: form?.data?.route?.duration || club.route.duration || '',
		routeDifficulty: form?.data?.route?.difficulty || club.route.difficulty || 'easy',
		contactEmail: form?.data?.contact?.email || club.contact?.email || '',
		contactPhone: form?.data?.contact?.phone || club.contact?.phone || ''
	};

	// Route points for visualization and editing
	let routePoints: RoutePoint[] = form?.data?.route?.points || club.route.points || [];
	let showRouteEditor = false;
	let editingPoint: number | null = null;
	let newPointLat = '';
	let newPointLng = '';

	// Store original hostname to check if it changed
	originalHostname = club.hostname;

	// Check hostname availability only if it changed
	async function checkHostnameAvailability(hostname: string) {
		if (!hostname || hostname.length < 3 || hostname === originalHostname) {
			hostnameAvailable = null;
			hostnameError = '';
			return;
		}

		hostnameChecking = true;
		hostnameError = '';

		try {
			const response = await fetch(
				`/api/admin/hostname/validate?hostname=${encodeURIComponent(hostname)}`
			);
			const result = await response.json();

			if (response.ok) {
				hostnameAvailable = result.valid && result.available;
				if (!result.valid) {
					hostnameError = result.error || 'Invalid hostname';
				} else if (!result.available) {
					hostnameError = 'Hostname is already taken';
				}
			} else {
				hostnameError = result.error || 'Failed to check hostname';
				hostnameAvailable = false;
			}
		} catch (error) {
			console.error('Hostname check error:', error);
			hostnameError = 'Failed to check hostname availability';
			hostnameAvailable = false;
			showErrorToast('Failed to check hostname availability. Please try again.');
		} finally {
			hostnameChecking = false;
		}
	}

	// Handle hostname input change
	function handleHostnameChange() {
		if (formData.hostname === originalHostname) {
			hostnameAvailable = null;
			hostnameError = '';
			return;
		}

		hostnameAvailable = null;
		hostnameError = '';

		// Debounce the check
		clearTimeout(hostnameCheckTimeout);
		hostnameCheckTimeout = setTimeout(() => {
			checkHostnameAvailability(formData.hostname);
		}, 500);
	}

	// Route point management
	function addRoutePoint() {
		const lat = parseFloat(newPointLat);
		const lng = parseFloat(newPointLng);

		if (isNaN(lat) || isNaN(lng)) {
			showErrorToast('Please enter valid coordinates');
			return;
		}

		if (lat < -90 || lat > 90) {
			showErrorToast('Latitude must be between -90 and 90');
			return;
		}

		if (lng < -180 || lng > 180) {
			showErrorToast('Longitude must be between -180 and 180');
			return;
		}

		routePoints = [...routePoints, { lat, lng }];
		newPointLat = '';
		newPointLng = '';
		hasUnsavedChanges = true;
		showInfoToast('Route point added successfully');
	}

	function removeRoutePoint(index: number) {
		routePoints = routePoints.filter((_, i) => i !== index);
		hasUnsavedChanges = true;
		showInfoToast('Route point removed');
	}

	function moveRoutePoint(index: number, direction: 'up' | 'down') {
		if (direction === 'up' && index > 0) {
			[routePoints[index - 1], routePoints[index]] = [routePoints[index], routePoints[index - 1]];
		} else if (direction === 'down' && index < routePoints.length - 1) {
			[routePoints[index], routePoints[index + 1]] = [routePoints[index + 1], routePoints[index]];
		}
		routePoints = [...routePoints]; // Trigger reactivity
	}

	function editRoutePoint(index: number) {
		editingPoint = index;
		newPointLat = routePoints[index].lat.toString();
		newPointLng = routePoints[index].lng.toString();
	}

	function updateRoutePoint() {
		if (editingPoint === null) return;

		const lat = parseFloat(newPointLat);
		const lng = parseFloat(newPointLng);

		if (isNaN(lat) || isNaN(lng)) {
			showErrorToast('Please enter valid coordinates');
			return;
		}

		if (lat < -90 || lat > 90) {
			showErrorToast('Latitude must be between -90 and 90');
			return;
		}

		if (lng < -180 || lng > 180) {
			showErrorToast('Longitude must be between -180 and 180');
			return;
		}

		routePoints[editingPoint] = { lat, lng };
		routePoints = [...routePoints]; // Trigger reactivity

		editingPoint = null;
		newPointLat = '';
		newPointLng = '';
		hasUnsavedChanges = true;
		showInfoToast('Route point updated successfully');
	}

	function cancelEditPoint() {
		editingPoint = null;
		newPointLat = '';
		newPointLng = '';
	}

	let hostnameCheckTimeout: number;

	// Toast helpers
	function showSuccessToast(message: string) {
		toastMessage = message;
		toastType = 'success';
		showToast = true;
	}

	function showErrorToast(message: string) {
		toastMessage = message;
		toastType = 'error';
		showToast = true;
	}

	function showInfoToast(message: string) {
		toastMessage = message;
		toastType = 'info';
		showToast = true;
	}

	function closeToast() {
		showToast = false;
	}

	// Track form changes
	$: {
		// Simple change detection - in a real app you might want more sophisticated tracking
		if (
			formData.name !== club.name ||
			formData.location !== club.location ||
			formData.hostname !== club.hostname ||
			routePoints.length !== club.route.points.length
		) {
			hasUnsavedChanges = true;
		}
	}

	onMount(() => {
		// Show error toast if there was a form error
		if (form?.error) {
			showErrorToast(form.error);
		}

		return () => {
			clearTimeout(hostnameCheckTimeout);
		};
	});
</script>

<svelte:head>
	<title>Edit {club.name} - Admin Panel</title>
</svelte:head>

<div class="edit-club-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-left">
				<h1 class="page-title">Edit Club</h1>
				<p class="page-subtitle">Editing: {club.name}</p>
			</div>
			<div class="header-right">
				<a href="/admin/clubs" class="btn btn-outline"> ← Back to Clubs </a>
			</div>
		</div>
	</div>

	{#if form?.error}
		<div class="error-message" role="alert">
			{form.error}
			{#if form.suggestions && form.suggestions.length > 0}
				<div class="error-suggestions">
					<p>Suggestions:</p>
					<ul>
						{#each form.suggestions as suggestion}
							<li>{suggestion}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}

	<form
		method="POST"
		action="?/update"
		class="club-form"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		<!-- Hidden field for route points -->
		<input type="hidden" name="routePoints" value={JSON.stringify(routePoints)} />

		<!-- Basic Information -->
		<div class="form-section">
			<h2 class="section-title">Basic Information</h2>

			<div class="form-grid">
				<div class="form-group">
					<label for="name" class="form-label required">Club Name</label>
					<input
						id="name"
						name="name"
						type="text"
						class="form-input"
						bind:value={formData.name}
						required
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="location" class="form-label required">Location</label>
					<input
						id="location"
						name="location"
						type="text"
						class="form-input"
						bind:value={formData.location}
						required
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="hostname" class="form-label required">Hostname</label>
					<div class="hostname-input-group">
						<input
							id="hostname"
							name="hostname"
							type="text"
							class="form-input"
							class:success={hostnameAvailable === true || formData.hostname === originalHostname}
							class:error={hostnameAvailable === false || hostnameError}
							bind:value={formData.hostname}
							on:input={handleHostnameChange}
							required
							disabled={loading}
							pattern="[a-z0-9-]+"
							title="Only lowercase letters, numbers, and hyphens allowed"
						/>
						<span class="hostname-suffix">.walkingmens.club</span>

						{#if formData.hostname !== originalHostname}
							{#if hostnameChecking}
								<div class="hostname-status checking">
									<span class="spinner"></span>
									Checking...
								</div>
							{:else if hostnameAvailable === true}
								<div class="hostname-status available">✅ Available</div>
							{:else if hostnameAvailable === false || hostnameError}
								<div class="hostname-status unavailable">
									❌ {hostnameError || 'Not available'}
								</div>
							{/if}
						{:else}
							<div class="hostname-status current">ℹ️ Current hostname</div>
						{/if}
					</div>
				</div>

				<div class="form-group full-width">
					<label for="description" class="form-label">Description</label>
					<textarea
						id="description"
						name="description"
						class="form-textarea"
						bind:value={formData.description}
						disabled={loading}
						rows="3"
					></textarea>
				</div>
			</div>
		</div>

		<!-- Meeting Point -->
		<div class="form-section">
			<h2 class="section-title">Meeting Point</h2>

			<div class="form-grid">
				<div class="form-group">
					<label for="meetingPointName" class="form-label required">Meeting Point Name</label>
					<input
						id="meetingPointName"
						name="meetingPointName"
						type="text"
						class="form-input"
						bind:value={formData.meetingPointName}
						required
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="meetingPointAddress" class="form-label required">Address</label>
					<input
						id="meetingPointAddress"
						name="meetingPointAddress"
						type="text"
						class="form-input"
						bind:value={formData.meetingPointAddress}
						required
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="meetingPointPostcode" class="form-label required">Postcode</label>
					<input
						id="meetingPointPostcode"
						name="meetingPointPostcode"
						type="text"
						class="form-input"
						bind:value={formData.meetingPointPostcode}
						required
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="meetingPointWhat3words" class="form-label">What3Words</label>
					<input
						id="meetingPointWhat3words"
						name="meetingPointWhat3words"
						type="text"
						class="form-input"
						bind:value={formData.meetingPointWhat3words}
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="meetingPointLat" class="form-label required">Latitude</label>
					<input
						id="meetingPointLat"
						name="meetingPointLat"
						type="number"
						step="any"
						class="form-input"
						bind:value={formData.meetingPointLat}
						required
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="meetingPointLng" class="form-label required">Longitude</label>
					<input
						id="meetingPointLng"
						name="meetingPointLng"
						type="number"
						step="any"
						class="form-input"
						bind:value={formData.meetingPointLng}
						required
						disabled={loading}
					/>
				</div>
			</div>
		</div>

		<!-- Schedule -->
		<div class="form-section">
			<h2 class="section-title">Meeting Schedule</h2>

			<div class="form-grid">
				<div class="form-group">
					<label for="scheduleDay" class="form-label required">Day of Week</label>
					<select
						id="scheduleDay"
						name="scheduleDay"
						class="form-select"
						bind:value={formData.scheduleDay}
						required
						disabled={loading}
					>
						<option value="Sunday">Sunday</option>
						<option value="Monday">Monday</option>
						<option value="Tuesday">Tuesday</option>
						<option value="Wednesday">Wednesday</option>
						<option value="Thursday">Thursday</option>
						<option value="Friday">Friday</option>
						<option value="Saturday">Saturday</option>
					</select>
				</div>

				<div class="form-group">
					<label for="scheduleTime" class="form-label required">Time</label>
					<input
						id="scheduleTime"
						name="scheduleTime"
						type="time"
						class="form-input"
						bind:value={formData.scheduleTime}
						required
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="scheduleFrequency" class="form-label">Frequency</label>
					<select
						id="scheduleFrequency"
						name="scheduleFrequency"
						class="form-select"
						bind:value={formData.scheduleFrequency}
						disabled={loading}
					>
						<option value="Weekly">Weekly</option>
						<option value="Bi-weekly">Bi-weekly</option>
						<option value="Monthly">Monthly</option>
						<option value="Irregular">Irregular</option>
					</select>
				</div>
			</div>
		</div>

		<!-- Walking Route -->
		<div class="form-section">
			<h2 class="section-title">Walking Route</h2>

			<div class="form-grid">
				<div class="form-group">
					<label for="routeName" class="form-label required">Route Name</label>
					<input
						id="routeName"
						name="routeName"
						type="text"
						class="form-input"
						bind:value={formData.routeName}
						required
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="routeDistance" class="form-label">Distance</label>
					<input
						id="routeDistance"
						name="routeDistance"
						type="text"
						class="form-input"
						bind:value={formData.routeDistance}
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="routeDuration" class="form-label">Duration</label>
					<input
						id="routeDuration"
						name="routeDuration"
						type="text"
						class="form-input"
						bind:value={formData.routeDuration}
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="routeDifficulty" class="form-label">Difficulty</label>
					<select
						id="routeDifficulty"
						name="routeDifficulty"
						class="form-select"
						bind:value={formData.routeDifficulty}
						disabled={loading}
					>
						<option value="easy">Easy</option>
						<option value="moderate">Moderate</option>
						<option value="challenging">Challenging</option>
					</select>
				</div>

				<div class="form-group full-width">
					<label for="routeDescription" class="form-label required">Route Description</label>
					<textarea
						id="routeDescription"
						name="routeDescription"
						class="form-textarea"
						bind:value={formData.routeDescription}
						required
						disabled={loading}
						rows="4"
					></textarea>
				</div>
			</div>

			<!-- Route Points Editor -->
			<div class="route-editor">
				<div class="route-editor-header">
					<h3 class="route-editor-title">Route Points</h3>
					<button
						type="button"
						class="btn btn-outline btn-sm"
						on:click={() => (showRouteEditor = !showRouteEditor)}
					>
						{showRouteEditor ? 'Hide' : 'Show'} Route Editor
					</button>
				</div>

				{#if showRouteEditor}
					<div class="route-editor-content">
						<!-- Add new point -->
						<div class="add-point-section">
							<h4>Add Route Point</h4>
							<div class="add-point-form">
								<input
									type="number"
									step="any"
									placeholder="Latitude"
									class="form-input"
									bind:value={newPointLat}
									disabled={loading}
								/>
								<input
									type="number"
									step="any"
									placeholder="Longitude"
									class="form-input"
									bind:value={newPointLng}
									disabled={loading}
								/>
								{#if editingPoint !== null}
									<button
										type="button"
										class="btn btn-primary btn-sm"
										on:click={updateRoutePoint}
										disabled={loading}
									>
										Update Point
									</button>
									<button
										type="button"
										class="btn btn-outline btn-sm"
										on:click={cancelEditPoint}
										disabled={loading}
									>
										Cancel
									</button>
								{:else}
									<button
										type="button"
										class="btn btn-primary btn-sm"
										on:click={addRoutePoint}
										disabled={loading}
									>
										Add Point
									</button>
								{/if}
							</div>
						</div>

						<!-- Route points list -->
						{#if routePoints.length > 0}
							<div class="route-points-list">
								<h4>Route Points ({routePoints.length})</h4>
								<div class="points-table">
									{#each routePoints as point, index}
										<div class="point-row">
											<div class="point-info">
												<span class="point-number">{index + 1}</span>
												<span class="point-coords">
													{point.lat.toFixed(6)}, {point.lng.toFixed(6)}
												</span>
											</div>
											<div class="point-actions">
												<button
													type="button"
													class="btn-icon"
													on:click={() => editRoutePoint(index)}
													disabled={loading}
													title="Edit point"
												>
													✏️
												</button>
												<button
													type="button"
													class="btn-icon"
													on:click={() => moveRoutePoint(index, 'up')}
													disabled={loading || index === 0}
													title="Move up"
												>
													↑
												</button>
												<button
													type="button"
													class="btn-icon"
													on:click={() => moveRoutePoint(index, 'down')}
													disabled={loading || index === routePoints.length - 1}
													title="Move down"
												>
													↓
												</button>
												<button
													type="button"
													class="btn-icon btn-danger"
													on:click={() => removeRoutePoint(index)}
													disabled={loading}
													title="Remove point"
												>
													🗑️
												</button>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{:else}
							<div class="no-points">
								<p>No route points defined. Add points to visualize the walking route.</p>
							</div>
						{/if}

						<!-- Route visualization placeholder -->
						<div class="route-visualization">
							<h4>Route Visualization</h4>
							<div class="map-placeholder">
								<div class="map-placeholder-content">
									<span class="map-icon">🗺️</span>
									<p>Interactive map visualization would be displayed here</p>
									<p class="map-note">
										{#if routePoints.length >= 2}
											Route with {routePoints.length} points ready for visualization
										{:else}
											Add at least 2 points to visualize the route
										{/if}
									</p>
								</div>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Contact Information -->
		<div class="form-section">
			<h2 class="section-title">Contact Information</h2>

			<div class="form-grid">
				<div class="form-group">
					<label for="contactEmail" class="form-label">Email</label>
					<input
						id="contactEmail"
						name="contactEmail"
						type="email"
						class="form-input"
						bind:value={formData.contactEmail}
						disabled={loading}
					/>
				</div>

				<div class="form-group">
					<label for="contactPhone" class="form-label">Phone</label>
					<input
						id="contactPhone"
						name="contactPhone"
						type="tel"
						class="form-input"
						bind:value={formData.contactPhone}
						disabled={loading}
					/>
				</div>
			</div>
		</div>

		<!-- Form Actions -->
		<div class="form-actions">
			<button
				type="submit"
				class="btn btn-primary"
				disabled={loading ||
					(hostnameAvailable === false && formData.hostname !== originalHostname)}
			>
				{#if loading}
					<span class="loading-spinner"></span>
					Updating Club...
				{:else}
					Update Club
				{/if}
			</button>

			<a href="/admin/clubs" class="btn btn-outline"> Cancel </a>
		</div>
	</form>
</div>

<!-- Toast Notifications -->
<Toast bind:show={showToast} message={toastMessage} type={toastType} on:close={closeToast} />

<!-- Loading Overlay -->
<LoadingOverlay show={loading} message="Updating club..." />

<style>
	/* Inherit most styles from the new club page */
	.edit-club-page {
		max-width: 800px;
		margin: 0 auto;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.header-left {
		flex: 1;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.page-subtitle {
		color: #6b7280;
		font-size: 1rem;
		margin: 0;
	}

	.header-right {
		flex-shrink: 0;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 1rem;
		border-radius: 0.5rem;
		margin-bottom: 2rem;
	}

	.error-suggestions {
		margin-top: 0.5rem;
	}

	.error-suggestions p {
		margin: 0 0 0.25rem 0;
		font-weight: 500;
	}

	.error-suggestions ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.club-form {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.form-section {
		background: white;
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1.5rem 0;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group.full-width {
		grid-column: 1 / -1;
	}

	.form-label {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.form-label.required::after {
		content: ' *';
		color: #ef4444;
	}

	.form-input,
	.form-select,
	.form-textarea {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.form-input:focus,
	.form-select:focus,
	.form-textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-input:disabled,
	.form-select:disabled,
	.form-textarea:disabled {
		background-color: #f9fafb;
		color: #6b7280;
		cursor: not-allowed;
	}

	.form-input.success {
		border-color: #10b981;
	}

	.form-input.error {
		border-color: #ef4444;
	}

	.form-textarea {
		resize: vertical;
		min-height: 80px;
	}

	/* Hostname input */
	.hostname-input-group {
		position: relative;
	}

	.hostname-suffix {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: #6b7280;
		font-size: 0.875rem;
		pointer-events: none;
		background: white;
		padding-left: 0.5rem;
	}

	.hostname-input-group .form-input {
		padding-right: 180px;
	}

	.hostname-status {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 0.25rem;
		font-size: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.hostname-status.checking {
		color: #6b7280;
	}

	.hostname-status.available {
		color: #10b981;
	}

	.hostname-status.unavailable {
		color: #ef4444;
	}

	.hostname-status.current {
		color: #3b82f6;
	}

	.spinner {
		width: 0.75rem;
		height: 0.75rem;
		border: 1px solid transparent;
		border-top: 1px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Route Editor */
	.route-editor {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.route-editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.route-editor-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.route-editor-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.add-point-section h4,
	.route-points-list h4,
	.route-visualization h4 {
		font-size: 1rem;
		font-weight: 500;
		color: #374151;
		margin: 0 0 0.75rem 0;
	}

	.add-point-form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.add-point-form .form-input {
		flex: 1;
		min-width: 120px;
	}

	.points-table {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.point-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 0.375rem;
		border: 1px solid #e5e7eb;
	}

	.point-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.point-number {
		background: #3b82f6;
		color: white;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.point-coords {
		font-family: monospace;
		font-size: 0.875rem;
		color: #374151;
	}

	.point-actions {
		display: flex;
		gap: 0.25rem;
	}

	.btn-icon {
		background: none;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		padding: 0.25rem;
		cursor: pointer;
		font-size: 0.75rem;
		width: 1.75rem;
		height: 1.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
	}

	.btn-icon:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.btn-icon:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-icon.btn-danger {
		border-color: #ef4444;
		color: #ef4444;
	}

	.btn-icon.btn-danger:hover:not(:disabled) {
		background: #fef2f2;
	}

	.no-points {
		text-align: center;
		padding: 2rem;
		color: #6b7280;
		background: #f9fafb;
		border-radius: 0.5rem;
		border: 1px dashed #d1d5db;
	}

	.no-points p {
		margin: 0;
		font-size: 0.875rem;
	}

	/* Route visualization */
	.route-visualization {
		margin-top: 1rem;
	}

	.map-placeholder {
		background: #f9fafb;
		border: 2px dashed #d1d5db;
		border-radius: 0.5rem;
		padding: 3rem 1rem;
		text-align: center;
	}

	.map-placeholder-content {
		color: #6b7280;
	}

	.map-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.map-placeholder p {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
	}

	.map-note {
		font-size: 0.75rem !important;
		font-style: italic;
	}

	/* Form actions */
	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding: 1.5rem;
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-outline {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-outline:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.btn-sm {
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			align-items: stretch;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.form-actions {
			flex-direction: column;
		}

		.hostname-input-group .form-input {
			padding-right: 0.75rem;
		}

		.hostname-suffix {
			position: static;
			transform: none;
			margin-top: 0.25rem;
			padding-left: 0;
		}

		.add-point-form {
			flex-direction: column;
			align-items: stretch;
		}

		.point-row {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.point-actions {
			justify-content: center;
		}
	}
</style>
