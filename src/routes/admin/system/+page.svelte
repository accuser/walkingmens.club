<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import SystemMonitoring from '$lib/components/admin/SystemMonitoring.svelte';
	
	let { data } = $props();
	
	let systemHealth = $state(null);
	let subdomainHealth = $state(null);
	let backupStatus = $state(null);
	let loading = $state(true);
	let error = $state(null);
	let lastRefresh = $state(null);
	
	// Auto-refresh interval (30 seconds)
	let refreshInterval = null;
	
	async function fetchSystemHealth() {
		try {
			const response = await fetch('/api/health');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			systemHealth = await response.json();
		} catch (err) {
			console.error('Failed to fetch system health:', err);
			error = err.message;
		}
	}
	
	async function fetchSubdomainHealth() {
		try {
			const response = await fetch('/api/admin/subdomains/health');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			subdomainHealth = await response.json();
		} catch (err) {
			console.error('Failed to fetch subdomain health:', err);
			error = err.message;
		}
	}
	
	async function fetchBackupStatus() {
		try {
			const response = await fetch('/api/admin/backup/status');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			backupStatus = await response.json();
		} catch (err) {
			console.error('Failed to fetch backup status:', err);
			// Don't set error here as backup might not be critical
		}
	}
	
	async function refreshData() {
		loading = true;
		error = null;
		
		await Promise.all([
			fetchSystemHealth(),
			fetchSubdomainHealth(),
			fetchBackupStatus()
		]);
		
		loading = false;
		lastRefresh = new Date();
	}
	
	function startAutoRefresh() {
		refreshInterval = setInterval(refreshData, 30000); // 30 seconds
	}
	
	function stopAutoRefresh() {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = null;
		}
	}
	
	onMount(() => {
		refreshData();
		startAutoRefresh();
		
		return () => {
			stopAutoRefresh();
		};
	});
	
	function getStatusColor(status) {
		switch (status) {
			case 'healthy':
			case 'up':
				return 'text-green-600 bg-green-100';
			case 'degraded':
				return 'text-yellow-600 bg-yellow-100';
			case 'unhealthy':
			case 'down':
				return 'text-red-600 bg-red-100';
			default:
				return 'text-gray-600 bg-gray-100';
		}
	}
	
	function formatTimestamp(timestamp) {
		return new Date(timestamp).toLocaleString();
	}
	
	function formatDuration(ms) {
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}
</script>

<svelte:head>
	<title>System Status - Admin</title>
</svelte:head>

<div class="system-status">
	<div class="header">
		<h1>System Status</h1>
		<div class="actions">
			<button onclick={refreshData} disabled={loading} class="refresh-btn">
				{loading ? 'Refreshing...' : 'Refresh'}
			</button>
			{#if lastRefresh}
				<span class="last-refresh">
					Last updated: {formatTimestamp(lastRefresh)}
				</span>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			<strong>Error:</strong> {error}
		</div>
	{/if}

	<!-- System Monitoring Component -->
	<SystemMonitoring refreshInterval={30000} />

	{#if loading && !systemHealth}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading system status...</p>
		</div>
	{:else}
		<!-- System Health Overview -->
		{#if systemHealth}
			<div class="section">
				<h2>System Health</h2>
				<div class="health-grid">
					<div class="health-card">
						<div class="health-header">
							<h3>Overall Status</h3>
							<span class="status-badge {getStatusColor(systemHealth.status)}">
								{systemHealth.status}
							</span>
						</div>
						<p class="timestamp">As of {formatTimestamp(systemHealth.timestamp)}</p>
					</div>

					<div class="health-card">
						<div class="health-header">
							<h3>Database</h3>
							<span class="status-badge {getStatusColor(systemHealth.services.database.status)}">
								{systemHealth.services.database.status}
							</span>
						</div>
						<p>Available: {systemHealth.services.database.available ? 'Yes' : 'No'}</p>
					</div>

					<div class="health-card">
						<div class="health-header">
							<h3>Fallback System</h3>
							<span class="status-badge {getStatusColor(systemHealth.services.fallback.status)}">
								{systemHealth.services.fallback.status}
							</span>
						</div>
						<p>Available: {systemHealth.services.fallback.available ? 'Yes' : 'No'}</p>
					</div>

					<div class="health-card">
						<div class="health-header">
							<h3>Cache</h3>
							<span class="status-badge {systemHealth.services.cache.enabled ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'}">
								{systemHealth.services.cache.enabled ? 'enabled' : 'disabled'}
							</span>
						</div>
						<div class="cache-stats">
							<p>Hit Rate: {(systemHealth.services.cache.hitRate * 100).toFixed(1)}%</p>
							<p>Size: {systemHealth.services.cache.size} items</p>
							<p>Hits: {systemHealth.services.cache.hits}</p>
							<p>Misses: {systemHealth.services.cache.misses}</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Subdomain Health -->
		{#if subdomainHealth}
			<div class="section">
				<h2>Subdomain Health</h2>
				
				<!-- Summary -->
				<div class="summary-grid">
					<div class="summary-card">
						<div class="summary-number">{subdomainHealth.summary.total}</div>
						<div class="summary-label">Total Subdomains</div>
					</div>
					<div class="summary-card healthy">
						<div class="summary-number">{subdomainHealth.summary.healthy}</div>
						<div class="summary-label">Healthy</div>
					</div>
					<div class="summary-card degraded">
						<div class="summary-number">{subdomainHealth.summary.degraded}</div>
						<div class="summary-label">Degraded</div>
					</div>
					<div class="summary-card unhealthy">
						<div class="summary-number">{subdomainHealth.summary.unhealthy}</div>
						<div class="summary-label">Unhealthy</div>
					</div>
				</div>

				<!-- Subdomain Details -->
				<div class="subdomain-list">
					{#each subdomainHealth.subdomains as subdomain}
						<div class="subdomain-card">
							<div class="subdomain-header">
								<div class="subdomain-info">
									<h4>{subdomain.hostname}</h4>
									<p class="club-name">{subdomain.clubName}</p>
								</div>
								<div class="subdomain-status">
									<span class="status-badge {getStatusColor(subdomain.status)}">
										{subdomain.status}
									</span>
									{#if subdomain.responseTime}
										<span class="response-time">
											{formatDuration(subdomain.responseTime)}
										</span>
									{/if}
								</div>
							</div>
							
							{#if subdomain.issues.length > 0}
								<div class="issues">
									<h5>Issues:</h5>
									<ul>
										{#each subdomain.issues as issue}
											<li>{issue}</li>
										{/each}
									</ul>
								</div>
							{/if}
							
							<div class="subdomain-footer">
								<span class="last-checked">
									Last checked: {formatTimestamp(subdomain.lastChecked)}
								</span>
								<a href="https://{subdomain.hostname}" target="_blank" class="visit-link">
									Visit Site
								</a>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Backup & Recovery Status -->
		{#if backupStatus}
			<div class="section">
				<h2>Backup & Recovery</h2>
				
				<div class="backup-grid">
					<div class="backup-card">
						<div class="backup-header">
							<h3>Backup Status</h3>
							<span class="status-badge {getStatusColor(backupStatus.backup.status)}">
								{backupStatus.backup.status}
							</span>
						</div>
						<div class="backup-details">
							{#if backupStatus.backup.lastBackup}
								<p><strong>Last Backup:</strong> {formatTimestamp(backupStatus.backup.lastBackup)}</p>
							{/if}
							{#if backupStatus.backup.backupSize}
								<p><strong>Size:</strong> {(backupStatus.backup.backupSize / (1024 * 1024)).toFixed(1)} MB</p>
							{/if}
							<p><strong>Location:</strong> {backupStatus.backup.backupLocation}</p>
							<p><strong>Retention:</strong> {backupStatus.backup.retentionPeriod}</p>
							{#if backupStatus.backup.nextScheduledBackup}
								<p><strong>Next Backup:</strong> {formatTimestamp(backupStatus.backup.nextScheduledBackup)}</p>
							{/if}
						</div>
						{#if backupStatus.backup.issues.length > 0}
							<div class="backup-issues">
								<h4>Issues:</h4>
								<ul>
									{#each backupStatus.backup.issues as issue}
										<li>{issue}</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>

					<div class="backup-card">
						<div class="backup-header">
							<h3>Recovery Status</h3>
							<span class="status-badge {backupStatus.recovery.testStatus === 'passed' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}">
								{backupStatus.recovery.testStatus}
							</span>
						</div>
						<div class="backup-details">
							<p><strong>Last Test:</strong> {formatTimestamp(backupStatus.recovery.lastRecoveryTest)}</p>
							<p><strong>Test Duration:</strong> {backupStatus.recovery.lastTestDuration}</p>
							<p><strong>RTO:</strong> {backupStatus.recovery.recoveryTimeObjective}</p>
							<p><strong>RPO:</strong> {backupStatus.recovery.recoveryPointObjective}</p>
						</div>
					</div>
				</div>

				{#if backupStatus.recommendations.length > 0}
					<div class="recommendations">
						<h4>Recommendations</h4>
						<ul>
							{#each backupStatus.recommendations as recommendation}
								<li>{recommendation}</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.system-status {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header h1 {
		margin: 0;
		font-size: 2rem;
		font-weight: 600;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.refresh-btn {
		padding: 0.5rem 1rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.refresh-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.last-refresh {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem;
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
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.section {
		margin-bottom: 3rem;
	}

	.section h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.health-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.health-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.health-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.health-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.timestamp {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.cache-stats p {
		margin: 0.25rem 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.summary-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		text-align: center;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.summary-card.healthy {
		border-color: #10b981;
		background: #f0fdf4;
	}

	.summary-card.degraded {
		border-color: #f59e0b;
		background: #fffbeb;
	}

	.summary-card.unhealthy {
		border-color: #ef4444;
		background: #fef2f2;
	}

	.summary-number {
		font-size: 2rem;
		font-weight: bold;
		margin-bottom: 0.5rem;
	}

	.summary-label {
		font-size: 0.875rem;
		color: #6b7280;
		font-weight: 500;
	}

	.subdomain-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.subdomain-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.subdomain-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.subdomain-info h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.club-name {
		margin: 0;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.subdomain-status {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.response-time {
		font-size: 0.875rem;
		color: #6b7280;
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.issues {
		margin-bottom: 1rem;
		padding: 1rem;
		background: #fef2f2;
		border-radius: 8px;
	}

	.issues h5 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #dc2626;
	}

	.issues ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.issues li {
		font-size: 0.875rem;
		color: #dc2626;
		margin-bottom: 0.25rem;
	}

	.subdomain-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.875rem;
		color: #6b7280;
	}

	.visit-link {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
	}

	.visit-link:hover {
		text-decoration: underline;
	}

	.backup-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.backup-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.backup-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.backup-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.backup-details p {
		margin: 0.5rem 0;
		font-size: 0.875rem;
		color: #374151;
	}

	.backup-issues {
		margin-top: 1rem;
		padding: 1rem;
		background: #fef2f2;
		border-radius: 8px;
	}

	.backup-issues h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #dc2626;
	}

	.backup-issues ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.backup-issues li {
		font-size: 0.875rem;
		color: #dc2626;
		margin-bottom: 0.25rem;
	}

	.recommendations {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		padding: 1rem;
	}

	.recommendations h4 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #065f46;
	}

	.recommendations ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.recommendations li {
		font-size: 0.875rem;
		color: #065f46;
		margin-bottom: 0.5rem;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		.system-status {
			padding: 1rem;
		}

		.header {
			flex-direction: column;
			align-items: flex-start;
		}

		.health-grid {
			grid-template-columns: 1fr;
		}

		.summary-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.subdomain-header {
			flex-direction: column;
			gap: 1rem;
		}

		.subdomain-footer {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.backup-grid {
			grid-template-columns: 1fr;
		}
	}
</style>