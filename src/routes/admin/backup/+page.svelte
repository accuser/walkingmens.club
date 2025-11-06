<script lang="ts">
	import { onMount } from 'svelte';

	let backupData = $state(null);
	let healthData = $state(null);
	let loading = $state(true);
	let error = $state(null);
	let creatingBackup = $state(false);
	let restoringBackup = $state(false);
	let selectedBackup = $state(null);
	let showRestoreDialog = $state(false);
	let showImportDialog = $state(false);

	// Restore options
	let restoreOptions = $state({
		validateData: true,
		createBackupBeforeRestore: true,
		tables: []
	});

	// Import options
	let importFile = $state(null);
	let importFormat = $state('json');
	let importing = $state(false);

	async function fetchBackupData() {
		try {
			const response = await fetch('/api/admin/backup');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				backupData = result.data;
				error = null;
			} else {
				throw new Error('Failed to fetch backup data');
			}
		} catch (err) {
			console.error('Failed to fetch backup data:', err);
			error = err.message;
		}
	}

	async function fetchHealthData() {
		try {
			const response = await fetch('/api/admin/backup/health');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				healthData = result.data;
			}
		} catch (err) {
			console.error('Failed to fetch health data:', err);
		} finally {
			loading = false;
		}
	}

	async function createBackup() {
		creatingBackup = true;
		try {
			const response = await fetch('/api/admin/backup/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ type: 'manual' })
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				await fetchBackupData();
				alert(`Backup created successfully: ${result.data.backup.id}`);
			} else {
				throw new Error('Backup creation failed');
			}
		} catch (err) {
			console.error('Backup creation failed:', err);
			alert(`Backup creation failed: ${err.message}`);
		} finally {
			creatingBackup = false;
		}
	}

	async function deleteBackup(backupId) {
		if (!confirm(`Are you sure you want to delete backup ${backupId}?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/admin/backup/${backupId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				await fetchBackupData();
				alert(`Backup ${backupId} deleted successfully`);
			} else {
				throw new Error('Backup deletion failed');
			}
		} catch (err) {
			console.error('Backup deletion failed:', err);
			alert(`Backup deletion failed: ${err.message}`);
		}
	}

	async function restoreBackup() {
		if (!selectedBackup) return;

		restoringBackup = true;
		try {
			const response = await fetch('/api/admin/backup/restore', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					backupId: selectedBackup.id,
					...restoreOptions
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				alert(`Restore completed successfully: ${result.data.recordsRestored} records restored`);
				showRestoreDialog = false;
				await fetchBackupData();
			} else {
				alert(`Restore completed with errors: ${result.message}`);
			}
		} catch (err) {
			console.error('Restore failed:', err);
			alert(`Restore failed: ${err.message}`);
		} finally {
			restoringBackup = false;
		}
	}

	async function exportData(format) {
		try {
			const response = await fetch(`/api/admin/backup/export?format=${format}`);
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `club-data-export-${Date.now()}.${format}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Export failed:', err);
			alert(`Export failed: ${err.message}`);
		}
	}

	async function importData() {
		if (!importFile) {
			alert('Please select a file to import');
			return;
		}

		importing = true;
		try {
			const formData = new FormData();
			formData.append('file', importFile);
			formData.append('format', importFormat);

			const response = await fetch('/api/admin/backup/import', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				alert(`Import completed successfully: ${result.data.recordsImported} records imported`);
				showImportDialog = false;
				await fetchBackupData();
			} else {
				alert(`Import completed with errors: ${result.message}`);
			}
		} catch (err) {
			console.error('Import failed:', err);
			alert(`Import failed: ${err.message}`);
		} finally {
			importing = false;
		}
	}

	async function runHealthCheck() {
		try {
			const response = await fetch('/api/admin/backup/health/check', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			await fetchHealthData();

			if (result.success) {
				alert(result.message);
			}
		} catch (err) {
			console.error('Health check failed:', err);
			alert(`Health check failed: ${err.message}`);
		}
	}

	function formatBytes(bytes) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function formatDate(dateString) {
		return new Date(dateString).toLocaleString();
	}

	function getStatusClass(status) {
		switch (status) {
			case 'completed':
				return 'status-success';
			case 'failed':
				return 'status-error';
			case 'pending':
				return 'status-pending';
			default:
				return '';
		}
	}

	function getHealthStatusClass(status) {
		switch (status) {
			case 'pass':
				return 'health-pass';
			case 'fail':
				return 'health-fail';
			case 'warn':
				return 'health-warn';
			default:
				return '';
		}
	}

	function getAlertClass(type) {
		switch (type) {
			case 'error':
				return 'alert-error';
			case 'warning':
				return 'alert-warning';
			case 'info':
				return 'alert-info';
			default:
				return '';
		}
	}

	function openRestoreDialog(backup) {
		selectedBackup = backup;
		restoreOptions.tables = [];
		showRestoreDialog = true;
	}

	onMount(() => {
		fetchBackupData();
		fetchHealthData();
	});
</script>

<svelte:head>
	<title>Backup & Recovery - Admin</title>
</svelte:head>

<div class="backup-page">
	<div class="page-header">
		<h1>Backup & Disaster Recovery</h1>
		<div class="header-actions">
			<button onclick={() => (showImportDialog = true)} class="btn-secondary"> Import Data </button>
			<button onclick={() => exportData('json')} class="btn-secondary"> Export JSON </button>
			<button onclick={() => exportData('sql')} class="btn-secondary"> Export SQL </button>
			<button onclick={createBackup} disabled={creatingBackup} class="btn-primary">
				{creatingBackup ? 'Creating...' : 'Create Backup'}
			</button>
		</div>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading backup data...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>Failed to load backup data: {error}</p>
			<button
				onclick={() => {
					fetchBackupData();
					fetchHealthData();
				}}
				class="btn-primary">Retry</button
			>
		</div>
	{:else}
		<!-- System Health Overview -->
		{#if healthData}
			<div class="health-section">
				<div class="section-header">
					<h2>System Health</h2>
					<button onclick={runHealthCheck} class="btn-secondary"> Run Health Check </button>
				</div>

				<div class="health-overview">
					<div class="health-status {healthData.overall.healthy ? 'healthy' : 'unhealthy'}">
						<div class="status-indicator">
							<span class="status-dot"></span>
							<span class="status-text">
								{healthData.overall.healthy ? 'System Healthy' : 'Issues Detected'}
							</span>
						</div>
						<div class="last-check">
							Last check: {formatDate(healthData.overall.lastCheck)}
						</div>
					</div>

					<div class="health-metrics">
						<div class="metric">
							<div class="metric-label">Avg Query Time</div>
							<div class="metric-value">{healthData.performance.avgQueryTime.toFixed(1)}ms</div>
						</div>
						<div class="metric">
							<div class="metric-label">Cache Hit Rate</div>
							<div class="metric-value">{healthData.performance.cacheHitRate}%</div>
						</div>
						<div class="metric">
							<div class="metric-label">Backup Success Rate</div>
							<div class="metric-value">{healthData.backup.successRate.toFixed(1)}%</div>
						</div>
						<div class="metric">
							<div class="metric-label">Uptime</div>
							<div class="metric-value">{Math.floor(healthData.performance.uptime / 3600)}h</div>
						</div>
					</div>
				</div>

				<!-- Health Alerts -->
				{#if healthData.alerts && healthData.alerts.length > 0}
					<div class="health-alerts">
						<h3>Active Alerts</h3>
						<div class="alerts-list">
							{#each healthData.alerts as alert, index (index)}
								<div class="alert-item {getAlertClass(alert.type)}">
									<div class="alert-content">
										<div class="alert-message">{alert.message}</div>
										<div class="alert-meta">
											<span class="alert-category">{alert.category}</span>
											<span class="alert-time">{formatDate(alert.timestamp)}</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Detailed Health Checks -->
				<div class="health-details">
					<h3>Health Check Details</h3>
					<div class="health-checks">
						{#each healthData.database.checks as check, index (index)}
							<div class="health-check {getHealthStatusClass(check.status)}">
								<div class="check-name">{check.name}</div>
								<div class="check-status">{check.status}</div>
								<div class="check-message">{check.message}</div>
								<div class="check-duration">{check.duration}ms</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}

		<!-- Backup Statistics -->
		{#if backupData}
			<div class="stats-section">
				<h2>Backup Statistics</h2>
				<div class="stats-grid">
					<div class="stat-card">
						<div class="stat-value">{backupData.stats.totalBackups}</div>
						<div class="stat-label">Total Backups</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">{formatBytes(backupData.stats.totalSize)}</div>
						<div class="stat-label">Total Size</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">{backupData.stats.successRate.toFixed(1)}%</div>
						<div class="stat-label">Success Rate</div>
					</div>
					<div class="stat-card">
						<div class="stat-value">
							{backupData.stats.newestBackup ? formatDate(backupData.stats.newestBackup) : 'None'}
						</div>
						<div class="stat-label">Last Backup</div>
					</div>
				</div>
			</div>

			<!-- Backup History -->
			<div class="history-section">
				<h2>Backup History</h2>
				{#if backupData.history.length > 0}
					<div class="backup-table">
						<table>
							<thead>
								<tr>
									<th>Backup ID</th>
									<th>Type</th>
									<th>Created</th>
									<th>Size</th>
									<th>Records</th>
									<th>Status</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each backupData.history as backup (backup.id)}
									<tr>
										<td class="backup-id">{backup.id}</td>
										<td class="backup-type">{backup.type}</td>
										<td>{formatDate(backup.timestamp)}</td>
										<td>{formatBytes(backup.size)}</td>
										<td>{backup.recordCount}</td>
										<td>
											<span class="status-badge {getStatusClass(backup.status)}">
												{backup.status}
											</span>
										</td>
										<td class="actions">
											{#if backup.status === 'completed'}
												<button
													onclick={() => openRestoreDialog(backup)}
													class="btn-small btn-secondary"
												>
													Restore
												</button>
											{/if}
											<button onclick={() => deleteBackup(backup.id)} class="btn-small btn-danger">
												Delete
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<div class="empty-state">
						<p>No backups available</p>
						<button onclick={createBackup} class="btn-primary">Create First Backup</button>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<!-- Restore Dialog -->
{#if showRestoreDialog && selectedBackup}
	<div class="modal-overlay" onclick={() => (showRestoreDialog = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Restore from Backup</h3>
				<button onclick={() => (showRestoreDialog = false)} class="close-btn">&times;</button>
			</div>
			<div class="modal-content">
				<div class="backup-info">
					<p><strong>Backup ID:</strong> {selectedBackup.id}</p>
					<p><strong>Created:</strong> {formatDate(selectedBackup.timestamp)}</p>
					<p><strong>Records:</strong> {selectedBackup.recordCount}</p>
				</div>

				<div class="restore-options">
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={restoreOptions.validateData} />
						Validate data before restore
					</label>
					<label class="checkbox-label">
						<input type="checkbox" bind:checked={restoreOptions.createBackupBeforeRestore} />
						Create backup before restore
					</label>
				</div>

				<div class="table-selection">
					<p><strong>Tables to restore (leave empty for all):</strong></p>
					<div class="table-checkboxes">
						{#each ['clubs', 'meeting_points', 'meeting_schedules', 'walking_routes', 'route_points'] as table (table)}
							<label class="checkbox-label">
								<input type="checkbox" bind:group={restoreOptions.tables} value={table} />
								{table}
							</label>
						{/each}
					</div>
				</div>
			</div>
			<div class="modal-actions">
				<button onclick={() => (showRestoreDialog = false)} class="btn-secondary"> Cancel </button>
				<button onclick={restoreBackup} disabled={restoringBackup} class="btn-danger">
					{restoringBackup ? 'Restoring...' : 'Restore'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Import Dialog -->
{#if showImportDialog}
	<div class="modal-overlay" onclick={() => (showImportDialog = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h3>Import Data</h3>
				<button onclick={() => (showImportDialog = false)} class="close-btn">&times;</button>
			</div>
			<div class="modal-content">
				<div class="import-options">
					<div class="form-group">
						<label for="import-format">Format:</label>
						<select id="import-format" bind:value={importFormat}>
							<option value="json">JSON</option>
							<option value="sql">SQL</option>
						</select>
					</div>

					<div class="form-group">
						<label for="import-file">File:</label>
						<input
							id="import-file"
							type="file"
							accept=".json,.sql"
							onchange={(e) => (importFile = e.target.files[0])}
						/>
					</div>
				</div>
			</div>
			<div class="modal-actions">
				<button onclick={() => (showImportDialog = false)} class="btn-secondary"> Cancel </button>
				<button onclick={importData} disabled={importing || !importFile} class="btn-primary">
					{importing ? 'Importing...' : 'Import'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.backup-page {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.page-header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 600;
		color: #1f2937;
	}

	.header-actions {
		display: flex;
		gap: 1rem;
	}

	.btn-primary,
	.btn-secondary,
	.btn-danger,
	.btn-small {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-small {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-secondary:hover {
		background: #e5e7eb;
	}

	.btn-danger {
		background: #dc2626;
		color: white;
	}

	.btn-danger:hover {
		background: #b91c1c;
	}

	.btn-primary:disabled,
	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		color: #6b7280;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.health-section,
	.stats-section,
	.history-section {
		margin-bottom: 3rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
	}

	.health-overview {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 2rem;
		align-items: center;
		padding: 1.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	.health-status {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		animation: pulse 2s infinite;
	}

	.healthy .status-dot {
		background: #10b981;
	}

	.unhealthy .status-dot {
		background: #dc2626;
	}

	.status-text {
		font-weight: 600;
		font-size: 1.125rem;
	}

	.healthy .status-text {
		color: #10b981;
	}

	.unhealthy .status-text {
		color: #dc2626;
	}

	.last-check {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.health-metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
	}

	.metric {
		text-align: center;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 6px;
	}

	.metric-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.metric-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.health-alerts {
		margin-bottom: 1.5rem;
	}

	.health-alerts h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.alerts-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.alert-item {
		padding: 1rem;
		border-radius: 6px;
		border-left: 4px solid;
	}

	.alert-error {
		background: #fef2f2;
		border-left-color: #dc2626;
	}

	.alert-warning {
		background: #fffbeb;
		border-left-color: #f59e0b;
	}

	.alert-info {
		background: #eff6ff;
		border-left-color: #3b82f6;
	}

	.alert-message {
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.alert-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.health-details h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.health-checks {
		display: grid;
		gap: 0.5rem;
	}

	.health-check {
		display: grid;
		grid-template-columns: 1fr auto auto auto;
		gap: 1rem;
		align-items: center;
		padding: 0.75rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
	}

	.health-pass {
		border-left: 4px solid #10b981;
	}

	.health-fail {
		border-left: 4px solid #dc2626;
	}

	.health-warn {
		border-left: 4px solid #f59e0b;
	}

	.check-name {
		font-weight: 500;
	}

	.check-status {
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.health-pass .check-status {
		color: #10b981;
	}

	.health-fail .check-status {
		color: #dc2626;
	}

	.health-warn .check-status {
		color: #f59e0b;
	}

	.check-message {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.check-duration {
		font-size: 0.75rem;
		color: #9ca3af;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		padding: 1.5rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		text-align: center;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.backup-table {
		overflow-x: auto;
	}

	.backup-table table {
		width: 100%;
		border-collapse: collapse;
		background: white;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.backup-table th,
	.backup-table td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	.backup-table th {
		background: #f9fafb;
		font-weight: 600;
		color: #374151;
	}

	.backup-id {
		font-family: monospace;
		font-size: 0.875rem;
	}

	.backup-type {
		text-transform: capitalize;
	}

	.status-badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.status-success {
		background: #d1fae5;
		color: #065f46;
	}

	.status-error {
		background: #fee2e2;
		color: #991b1b;
	}

	.status-pending {
		background: #fef3c7;
		color: #92400e;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: 8px;
		max-width: 500px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.modal-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
	}

	.close-btn:hover {
		color: #374151;
	}

	.modal-content {
		padding: 1.5rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		padding: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.backup-info {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 6px;
	}

	.backup-info p {
		margin: 0.5rem 0;
	}

	.restore-options,
	.table-selection {
		margin-bottom: 1.5rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		cursor: pointer;
	}

	.table-checkboxes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.import-options {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-weight: 500;
		color: #374151;
	}

	.form-group select,
	.form-group input {
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.backup-page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.header-actions {
			flex-wrap: wrap;
		}

		.health-overview {
			grid-template-columns: 1fr;
		}

		.health-metrics {
			grid-template-columns: repeat(2, 1fr);
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.health-check {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.modal {
			width: 95%;
		}
	}
</style>
