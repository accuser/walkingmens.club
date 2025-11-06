<!--
Admin new club creation form
-->
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import Toast from '$lib/components/admin/Toast.svelte';
	import LoadingOverlay from '$lib/components/admin/LoadingOverlay.svelte';

	export let data: PageData;
	export let form: ActionData;

	let loading = false;
	let hostnameAvailable: boolean | null = null;
	let hostnameChecking = false;
	let hostnameError = '';

	// Toast notification state
	let showToast = false;
	let toastMessage = '';
	let toastType: 'success' | 'error' | 'warning' | 'info' = 'info';

	// Form data with defaults
	let formData = {
		name: form?.data?.name || '',
		location: form?.data?.location || '',
		hostname: form?.data?.hostname || '',
		description: form?.data?.description || '',
		meetingPointName: form?.data?.meetingPoint?.name || '',
		meetingPointAddress: form?.data?.meetingPoint?.address || '',
		meetingPointPostcode: form?.data?.meetingPoint?.postcode || '',
		meetingPointLat: form?.data?.meetingPoint?.coordinates?.lat || 0,
		meetingPointLng: form?.data?.meetingPoint?.coordinates?.lng || 0,
		meetingPointWhat3words: form?.data?.meetingPoint?.what3words || '',
		scheduleDay: form?.data?.schedule?.day || 'Sunday',
		scheduleTime: form?.data?.schedule?.time || '10:00',
		scheduleFrequency: form?.data?.schedule?.frequency || 'Weekly',
		routeName: form?.data?.route?.name || '',
		routeDescription: form?.data?.route?.description || '',
		routeDistance: form?.data?.route?.distance || '',
		routeDuration: form?.data?.route?.duration || '',
		routeDifficulty: form?.data?.route?.difficulty || 'easy',
		contactEmail: form?.data?.contact?.email || '',
		contactPhone: form?.data?.contact?.phone || ''
	};

	// Auto-generate hostname from name
	$: if (formData.name && !form?.data?.hostname) {
		const generated = formData.name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');

		if (generated && generated !== formData.hostname) {
			formData.hostname = generated;
			checkHostnameAvailability(generated);
		}
	}

	// Check hostname availability
	async function checkHostnameAvailability(hostname: string) {
		if (!hostname || hostname.length < 3) {
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
		hostnameAvailable = null;
		hostnameError = '';

		// Debounce the check
		clearTimeout(hostnameCheckTimeout);
		hostnameCheckTimeout = setTimeout(() => {
			checkHostnameAvailability(formData.hostname);
		}, 500);
	}

	let hostnameCheckTimeout: number;

	// Toast helpers
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

	onMount(() => {
		// Focus the name field
		const nameInput = document.getElementById('name');
		if (nameInput) {
			nameInput.focus();
		}

		// Show info about form validation
		if (form?.error) {
			showErrorToast(form.error);
		}

		return () => {
			clearTimeout(hostnameCheckTimeout);
		};
	});
</script>

<svelte:head>
	<title>Add New Club - Admin Panel</title>
</svelte:head>

<div class="new-club-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-left">
				<h1 class="page-title">Add New Club</h1>
				<p class="page-subtitle">Create a new walking club configuration</p>
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
		action="?/create"
		class="club-form"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
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
						placeholder="e.g., Delabole Walking Mens"
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
						placeholder="e.g., Delabole, Cornwall"
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
							class:success={hostnameAvailable === true}
							class:error={hostnameAvailable === false || hostnameError}
							bind:value={formData.hostname}
							on:input={handleHostnameChange}
							required
							disabled={loading}
							placeholder="e.g., delabole"
							pattern="[a-z0-9-]+"
							title="Only lowercase letters, numbers, and hyphens allowed"
						/>
						<span class="hostname-suffix">.walkingmens.club</span>

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
						placeholder="Optional description of the walking club"
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
						placeholder="e.g., Village Hall Car Park"
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
						placeholder="e.g., High Street, Delabole"
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
						placeholder="e.g., PL33 9AJ"
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
						placeholder="e.g., ///filled.count.soap"
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
						placeholder="e.g., 50.6234"
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
						placeholder="e.g., -4.7234"
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
						placeholder="e.g., Village Loop Walk"
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
						placeholder="e.g., 3.5 miles"
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
						placeholder="e.g., 1.5 hours"
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
						placeholder="Describe the walking route, including key landmarks and terrain"
						rows="4"
					></textarea>
				</div>
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
						placeholder="e.g., contact@example.com"
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
						placeholder="e.g., 01840 123456"
					/>
				</div>
			</div>
		</div>

		<!-- Form Actions -->
		<div class="form-actions">
			<button
				type="submit"
				class="btn btn-primary"
				disabled={loading || hostnameAvailable === false}
			>
				{#if loading}
					<span class="loading-spinner"></span>
					Creating Club...
				{:else}
					Create Club
				{/if}
			</button>

			<a href="/admin/clubs" class="btn btn-outline"> Cancel </a>
		</div>
	</form>
</div>

<!-- Toast Notifications -->
<Toast bind:show={showToast} message={toastMessage} type={toastType} on:close={closeToast} />

<!-- Loading Overlay -->
<LoadingOverlay show={loading} message="Creating club..." />

<style>
	.new-club-page {
		max-width: 800px;
		margin: 0 auto;
	}

	/* Page header */
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

	/* Error message */
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

	/* Form */
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
	}
</style>
