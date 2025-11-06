<!--
Admin clubs list and management page
-->
<script lang="ts">
	import type { PageData } from './$types';
	import type { ClubConfig } from '$lib/clubs/types';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
	import Toast from '$lib/components/admin/Toast.svelte';
	import LoadingOverlay from '$lib/components/admin/LoadingOverlay.svelte';

	export let data: PageData;

	let clubs: ClubConfig[] = data.clubs;
	let filteredClubs: ClubConfig[] = clubs;
	let searchTerm = '';
	let sortBy: 'name' | 'location' | 'hostname' | 'created' = 'name';
	let sortOrder: 'asc' | 'desc' = 'asc';
	let loading = false;
	let error = '';

	// Dialog and notification state
	let showDeleteDialog = false;
	let clubToDelete: ClubConfig | null = null;
	let deleteLoading = false;
	let showToast = false;
	let toastMessage = '';
	let toastType: 'success' | 'error' | 'warning' | 'info' = 'info';

	// Pagination
	let currentPage = 1;
	let itemsPerPage = 10;
	let totalPages = 1;
	let paginatedClubs: ClubConfig[] = [];

	// Search and filter functionality
	$: {
		filteredClubs = clubs.filter((club) => {
			const searchLower = searchTerm.toLowerCase();
			return (
				club.name.toLowerCase().includes(searchLower) ||
				club.location.toLowerCase().includes(searchLower) ||
				club.hostname.toLowerCase().includes(searchLower) ||
				(club.description && club.description.toLowerCase().includes(searchLower))
			);
		});

		// Sort clubs
		filteredClubs.sort((a, b) => {
			let aValue: string | number;
			let bValue: string | number;

			switch (sortBy) {
				case 'name':
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
					break;
				case 'location':
					aValue = a.location.toLowerCase();
					bValue = b.location.toLowerCase();
					break;
				case 'hostname':
					aValue = a.hostname.toLowerCase();
					bValue = b.hostname.toLowerCase();
					break;
				case 'created':
					// For now, use name as fallback since we don't have created dates
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
					break;
				default:
					aValue = a.name.toLowerCase();
					bValue = b.name.toLowerCase();
			}

			if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
			if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
			return 0;
		});

		// Update pagination
		totalPages = Math.ceil(filteredClubs.length / itemsPerPage);
		currentPage = Math.min(currentPage, totalPages || 1);

		const startIndex = (currentPage - 1) * itemsPerPage;
		const endIndex = startIndex + itemsPerPage;
		paginatedClubs = filteredClubs.slice(startIndex, endIndex);
	}

	// Handle club deletion
	function handleDeleteClick(club: ClubConfig) {
		clubToDelete = club;
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!clubToDelete) return;

		deleteLoading = true;
		error = '';

		try {
			const response = await fetch(`/api/admin/clubs/${clubToDelete.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to delete club');
			}

			// Remove club from local state
			clubs = clubs.filter((c) => c.id !== clubToDelete.id);

			// Show success toast
			showSuccessToast(`Club "${clubToDelete.name}" deleted successfully`);

			// Close dialog
			showDeleteDialog = false;
			clubToDelete = null;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to delete club';
			showErrorToast(errorMessage);
			console.error('Delete error:', err);
		} finally {
			deleteLoading = false;
		}
	}

	function cancelDelete() {
		showDeleteDialog = false;
		clubToDelete = null;
	}

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

	// Handle sort change
	function handleSort(column: typeof sortBy) {
		if (sortBy === column) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortBy = column;
			sortOrder = 'asc';
		}
	}

	// Handle page change
	function goToPage(page: number) {
		currentPage = Math.max(1, Math.min(page, totalPages));
	}

	onMount(() => {
		console.log('Clubs loaded:', clubs.length);
	});
</script>

<svelte:head>
	<title>Clubs - Admin Panel</title>
</svelte:head>

<div class="clubs-page">
	<div class="page-header">
		<div class="header-content">
			<div class="header-left">
				<h1 class="page-title">Clubs</h1>
				<p class="page-subtitle">Manage walking club configurations</p>
			</div>
			<div class="header-right">
				<a href="/admin/clubs/new" class="btn btn-primary">
					<span class="btn-icon">➕</span>
					Add New Club
				</a>
			</div>
		</div>
	</div>

	{#if error}
		<div class="error-message" role="alert">
			{error}
		</div>
	{/if}

	<div class="clubs-content">
		<!-- Search and filters -->
		<div class="search-section">
			<div class="search-controls">
				<div class="search-input-group">
					<input
						type="text"
						placeholder="Search clubs..."
						class="search-input"
						bind:value={searchTerm}
					/>
					<span class="search-icon">🔍</span>
				</div>

				<div class="sort-controls">
					<label for="sort-select" class="sort-label">Sort by:</label>
					<select id="sort-select" class="sort-select" bind:value={sortBy}>
						<option value="name">Name</option>
						<option value="location">Location</option>
						<option value="hostname">Hostname</option>
						<option value="created">Created</option>
					</select>
					<button
						class="sort-order-btn"
						class:desc={sortOrder === 'desc'}
						on:click={() => handleSort(sortBy)}
						title="Toggle sort order"
					>
						{sortOrder === 'asc' ? '↑' : '↓'}
					</button>
				</div>
			</div>

			<div class="results-info">
				Showing {paginatedClubs.length} of {filteredClubs.length} clubs
				{#if searchTerm}
					matching "{searchTerm}"
				{/if}
			</div>
		</div>

		<!-- Clubs table -->
		{#if paginatedClubs.length > 0}
			<div class="clubs-table-container">
				<table class="clubs-table">
					<thead>
						<tr>
							<th>
								<button class="sort-header" on:click={() => handleSort('name')}>
									Name
									{#if sortBy === 'name'}
										<span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</th>
							<th>
								<button class="sort-header" on:click={() => handleSort('location')}>
									Location
									{#if sortBy === 'location'}
										<span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</th>
							<th>
								<button class="sort-header" on:click={() => handleSort('hostname')}>
									Hostname
									{#if sortBy === 'hostname'}
										<span class="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</button>
							</th>
							<th>Meeting Day</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedClubs as club (club.id)}
							<tr class="club-row">
								<td class="club-name">
									<div class="name-content">
										<span class="name">{club.name}</span>
										{#if club.description}
											<span class="description">{club.description}</span>
										{/if}
									</div>
								</td>
								<td class="club-location">{club.location}</td>
								<td class="club-hostname">
									<a
										href="https://{club.hostname}"
										target="_blank"
										rel="noopener noreferrer"
										class="hostname-link"
									>
										{club.hostname}
									</a>
								</td>
								<td class="club-schedule">
									{club.schedule.day} at {club.schedule.time}
								</td>
								<td class="club-actions">
									<div class="action-buttons">
										<a
											href="/admin/clubs/{club.id}/edit"
											class="btn btn-sm btn-secondary"
											title="Edit club"
										>
											✏️ Edit
										</a>
										<a
											href="https://{club.hostname}"
											target="_blank"
											rel="noopener noreferrer"
											class="btn btn-sm btn-outline"
											title="View club website"
										>
											👁️ View
										</a>
										<button
											class="btn btn-sm btn-danger"
											on:click={() => handleDeleteClick(club)}
											disabled={loading || deleteLoading}
											title="Delete club"
										>
											🗑️ Delete
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			{#if totalPages > 1}
				<div class="pagination">
					<button
						class="pagination-btn"
						disabled={currentPage === 1}
						on:click={() => goToPage(currentPage - 1)}
					>
						Previous
					</button>

					<div class="pagination-pages">
						{#each Array(totalPages) as _, i}
							{@const page = i + 1}
							<button
								class="pagination-page"
								class:active={page === currentPage}
								on:click={() => goToPage(page)}
							>
								{page}
							</button>
						{/each}
					</div>

					<button
						class="pagination-btn"
						disabled={currentPage === totalPages}
						on:click={() => goToPage(currentPage + 1)}
					>
						Next
					</button>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<div class="empty-icon">🚶</div>
				<div class="empty-content">
					{#if searchTerm}
						<h3>No clubs found</h3>
						<p>No clubs match your search criteria. Try adjusting your search terms.</p>
						<button class="btn btn-outline" on:click={() => (searchTerm = '')}>
							Clear Search
						</button>
					{:else}
						<h3>No clubs yet</h3>
						<p>Get started by creating your first walking club configuration.</p>
						<a href="/admin/clubs/new" class="btn btn-primary"> Add Your First Club </a>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Confirmation Dialog -->
<ConfirmDialog
	bind:show={showDeleteDialog}
	title="Delete Club"
	message={clubToDelete
		? `Are you sure you want to delete "${clubToDelete.name}"? This action cannot be undone and will remove all club data including routes and meeting information.`
		: ''}
	confirmText="Delete Club"
	cancelText="Cancel"
	confirmVariant="danger"
	loading={deleteLoading}
	on:confirm={confirmDelete}
	on:cancel={cancelDelete}
/>

<!-- Toast Notifications -->
<Toast bind:show={showToast} message={toastMessage} type={toastType} on:close={closeToast} />

<!-- Loading Overlay -->
<LoadingOverlay show={loading && !deleteLoading} message="Loading clubs..." />

<style>
	.clubs-page {
		max-width: 1200px;
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
		margin-bottom: 1rem;
		text-align: center;
	}

	/* Search section */
	.search-section {
		background: white;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.search-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.search-input-group {
		position: relative;
		flex: 1;
		max-width: 400px;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 2.5rem 0.75rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		font-size: 0.875rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.search-icon {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: #6b7280;
		pointer-events: none;
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.sort-label {
		font-size: 0.875rem;
		color: #6b7280;
		white-space: nowrap;
	}

	.sort-select {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 0.875rem;
	}

	.sort-order-btn {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		cursor: pointer;
		font-size: 1rem;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.sort-order-btn:hover {
		background: #f3f4f6;
	}

	.results-info {
		color: #6b7280;
		font-size: 0.875rem;
	}

	/* Table */
	.clubs-table-container {
		background: white;
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
		margin-bottom: 1.5rem;
	}

	.clubs-table {
		width: 100%;
		border-collapse: collapse;
	}

	.clubs-table th {
		background: #f9fafb;
		padding: 1rem;
		text-align: left;
		font-weight: 600;
		color: #374151;
		border-bottom: 1px solid #e5e7eb;
	}

	.sort-header {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.sort-header:hover {
		color: #3b82f6;
	}

	.sort-indicator {
		font-size: 0.75rem;
	}

	.clubs-table td {
		padding: 1rem;
		border-bottom: 1px solid #f3f4f6;
		vertical-align: top;
	}

	.club-row:hover {
		background: #f9fafb;
	}

	.name-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.name {
		font-weight: 500;
		color: #1f2937;
	}

	.description {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.hostname-link {
		color: #3b82f6;
		text-decoration: none;
		font-family: monospace;
		font-size: 0.875rem;
	}

	.hostname-link:hover {
		text-decoration: underline;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
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

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
	}

	.btn-outline {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-outline:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.btn-danger {
		background: #ef4444;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-sm {
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
	}

	.btn-icon {
		font-size: 1rem;
	}

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
	}

	.pagination-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		color: #374151;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.pagination-btn:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.pagination-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.pagination-pages {
		display: flex;
		gap: 0.25rem;
	}

	.pagination-page {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		background: white;
		color: #374151;
		cursor: pointer;
		font-size: 0.875rem;
		min-width: 2.5rem;
	}

	.pagination-page:hover {
		background: #f3f4f6;
	}

	.pagination-page.active {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	/* Empty state */
	.empty-state {
		background: white;
		border-radius: 0.75rem;
		padding: 3rem 1.5rem;
		text-align: center;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-content h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.empty-content p {
		color: #6b7280;
		margin: 0 0 1.5rem 0;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			align-items: stretch;
		}

		.search-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.clubs-table-container {
			overflow-x: auto;
		}

		.clubs-table {
			min-width: 600px;
		}

		.action-buttons {
			flex-direction: column;
		}

		.pagination {
			flex-wrap: wrap;
		}
	}
</style>
