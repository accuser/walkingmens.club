<script lang="ts">
	import { onMount } from 'svelte';

	let { refreshInterval = 30000 } = $props(); // 30 seconds default

	let systemMetrics = $state({
		uptime: 0,
		requestCount: 0,
		errorRate: 0,
		avgResponseTime: 0,
		activeConnections: 0
	});

	let alerts = $state([]);
	let loading = $state(true);
	let error = $state(null);

	// Simulated metrics (in production, these would come from real monitoring)
	function generateMetrics() {
		const now = Date.now();

		return {
			uptime: Math.floor((now - (now % (24 * 60 * 60 * 1000))) / 1000), // Simulated uptime
			requestCount: Math.floor(Math.random() * 1000) + 500,
			errorRate: Math.random() * 5, // 0-5% error rate
			avgResponseTime: Math.random() * 200 + 50, // 50-250ms
			activeConnections: Math.floor(Math.random() * 50) + 10
		};
	}

	function generateAlerts() {
		const alertTypes = [
			{
				level: 'info',
				message: 'System backup completed successfully',
				timestamp: new Date(Date.now() - 60000)
			},
			{
				level: 'warning',
				message: 'High response time detected on subdomain routing',
				timestamp: new Date(Date.now() - 300000)
			},
			{
				level: 'success',
				message: 'Database connection pool optimized',
				timestamp: new Date(Date.now() - 600000)
			}
		];

		// Randomly show some alerts
		return alertTypes.filter(() => Math.random() > 0.7);
	}

	async function fetchMetrics() {
		try {
			// In production, this would fetch real metrics from monitoring APIs
			systemMetrics = generateMetrics();
			alerts = generateAlerts();
			error = null;
		} catch (err) {
			console.error('Failed to fetch system metrics:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	function formatUptime(seconds) {
		const days = Math.floor(seconds / (24 * 60 * 60));
		const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
		const minutes = Math.floor((seconds % (60 * 60)) / 60);

		if (days > 0) {
			return `${days}d ${hours}h ${minutes}m`;
		} else if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else {
			return `${minutes}m`;
		}
	}

	function formatNumber(num) {
		return new Intl.NumberFormat().format(Math.floor(num));
	}

	function getAlertIcon(level) {
		switch (level) {
			case 'error':
				return '🚨';
			case 'warning':
				return '⚠️';
			case 'info':
				return 'ℹ️';
			case 'success':
				return '✅';
			default:
				return '📋';
		}
	}

	function getAlertClass(level) {
		switch (level) {
			case 'error':
				return 'alert-error';
			case 'warning':
				return 'alert-warning';
			case 'info':
				return 'alert-info';
			case 'success':
				return 'alert-success';
			default:
				return 'alert-info';
		}
	}

	onMount(() => {
		fetchMetrics();

		const interval = setInterval(fetchMetrics, refreshInterval);

		return () => clearInterval(interval);
	});
</script>

<div class="system-monitoring">
	<div class="monitoring-header">
		<h3>System Monitoring</h3>
		<div class="status-indicator {error ? 'error' : 'healthy'}">
			<span class="indicator-dot"></span>
			{error ? 'Error' : 'Monitoring Active'}
		</div>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading metrics...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>Failed to load monitoring data: {error}</p>
			<button onclick={fetchMetrics} class="retry-btn">Retry</button>
		</div>
	{:else}
		<!-- Metrics Grid -->
		<div class="metrics-grid">
			<div class="metric-card">
				<div class="metric-icon">⏱️</div>
				<div class="metric-content">
					<div class="metric-value">{formatUptime(systemMetrics.uptime)}</div>
					<div class="metric-label">System Uptime</div>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-icon">📊</div>
				<div class="metric-content">
					<div class="metric-value">{formatNumber(systemMetrics.requestCount)}</div>
					<div class="metric-label">Requests/Hour</div>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-icon">⚡</div>
				<div class="metric-content">
					<div class="metric-value">{systemMetrics.avgResponseTime.toFixed(0)}ms</div>
					<div class="metric-label">Avg Response Time</div>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-icon">🔗</div>
				<div class="metric-content">
					<div class="metric-value">{systemMetrics.activeConnections}</div>
					<div class="metric-label">Active Connections</div>
				</div>
			</div>

			<div class="metric-card">
				<div class="metric-icon">📈</div>
				<div class="metric-content">
					<div class="metric-value">{systemMetrics.errorRate.toFixed(1)}%</div>
					<div class="metric-label">Error Rate</div>
				</div>
			</div>
		</div>

		<!-- Recent Alerts -->
		{#if alerts.length > 0}
			<div class="alerts-section">
				<h4>Recent Alerts</h4>
				<div class="alerts-list">
					{#each alerts as alert (alert.timestamp)}
						<div class="alert-item {getAlertClass(alert.level)}">
							<span class="alert-icon">{getAlertIcon(alert.level)}</span>
							<div class="alert-content">
								<div class="alert-message">{alert.message}</div>
								<div class="alert-timestamp">
									{alert.timestamp.toLocaleTimeString()}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.system-monitoring {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.monitoring-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.monitoring-header h3 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status-indicator.healthy {
		color: #059669;
	}

	.status-indicator.error {
		color: #dc2626;
	}

	.indicator-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		color: #6b7280;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 2px solid #e5e7eb;
		border-top: 2px solid #3b82f6;
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

	.retry-btn {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.retry-btn:hover {
		background: #2563eb;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.metric-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.metric-icon {
		font-size: 1.5rem;
		opacity: 0.8;
	}

	.metric-content {
		flex: 1;
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

	.alerts-section {
		border-top: 1px solid #e5e7eb;
		padding-top: 1.5rem;
	}

	.alerts-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.alerts-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.alert-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 8px;
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

	.alert-success {
		background: #f0fdf4;
		border-left-color: #10b981;
	}

	.alert-icon {
		font-size: 1rem;
		margin-top: 0.125rem;
	}

	.alert-content {
		flex: 1;
	}

	.alert-message {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.alert-timestamp {
		font-size: 0.75rem;
		color: #6b7280;
	}

	@media (max-width: 640px) {
		.monitoring-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.metrics-grid {
			grid-template-columns: 1fr;
		}

		.metric-card {
			flex-direction: column;
			text-align: center;
		}
	}
</style>
