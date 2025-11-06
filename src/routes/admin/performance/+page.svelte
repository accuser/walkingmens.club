<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	let performanceData = $state(null);
	let indexRecommendations = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let refreshInterval = $state(30000); // 30 seconds
	let autoRefresh = $state(true);
	let intervalId = null;

	// Query analysis
	let queryToAnalyze = $state('');
	let queryAnalysis = $state(null);
	let analyzingQuery = $state(false);

	// Index management
	let creatingIndexes = $state(false);
	let selectedRecommendations = $state([]);

	async function fetchPerformanceData() {
		try {
			const response = await fetch('/api/admin/performance');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				performanceData = result.data;
				error = null;
			} else {
				throw new Error('Failed to fetch performance data');
			}
		} catch (err) {
			console.error('Failed to fetch performance data:', err);
			error = err.message;
		} finally {
			loading = false;
		}
	}

	async function fetchIndexRecommendations() {
		try {
			const response = await fetch('/api/admin/performance/indexes');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				indexRecommendations = result.data.recommendations;
			}
		} catch (err) {
			console.error('Failed to fetch index recommendations:', err);
		}
	}

	async function analyzeQuery() {
		if (!queryToAnalyze.trim()) return;

		analyzingQuery = true;
		try {
			const response = await fetch('/api/admin/performance/analyze', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ query: queryToAnalyze })
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				queryAnalysis = result.data;
			} else {
				throw new Error('Query analysis failed');
			}
		} catch (err) {
			console.error('Query analysis failed:', err);
			alert(`Query analysis failed: ${err.message}`);
		} finally {
			analyzingQuery = false;
		}
	}

	async function createSelectedIndexes() {
		if (selectedRecommendations.length === 0) {
			alert('Please select at least one index to create');
			return;
		}

		creatingIndexes = true;
		try {
			const response = await fetch('/api/admin/performance/indexes/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					recommendations: selectedRecommendations.map((i) => indexRecommendations[i])
				})
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			if (result.success) {
				alert(`Successfully created ${result.data.created.length} indexes`);
				if (result.data.failed.length > 0) {
					console.warn('Failed to create some indexes:', result.data.failed);
				}
				selectedRecommendations = [];
				await fetchIndexRecommendations();
			} else {
				throw new Error('Failed to create indexes');
			}
		} catch (err) {
			console.error('Failed to create indexes:', err);
			alert(`Failed to create indexes: ${err.message}`);
		} finally {
			creatingIndexes = false;
		}
	}

	async function clearMetrics() {
		if (!confirm('Are you sure you want to clear all performance metrics?')) {
			return;
		}

		try {
			const response = await fetch('/api/admin/performance/clear', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			await fetchPerformanceData();
		} catch (err) {
			console.error('Failed to clear metrics:', err);
			alert(`Failed to clear metrics: ${err.message}`);
		}
	}

	async function exportMetrics() {
		try {
			const response = await fetch('/api/admin/performance/export');
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `performance-metrics-${Date.now()}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Failed to export metrics:', err);
			alert(`Failed to export metrics: ${err.message}`);
		}
	}

	function formatDuration(ms) {
		if (ms < 1000) return `${ms.toFixed(1)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	function formatBytes(bytes) {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getAlertClass(type) {
		return type === 'error' ? 'alert-error' : 'alert-warning';
	}

	function getPriorityClass(priority) {
		switch (priority) {
			case 'high':
				return 'priority-high';
			case 'medium':
				return 'priority-medium';
			case 'low':
				return 'priority-low';
			default:
				return '';
		}
	}

	onMount(() => {
		fetchPerformanceData();
		fetchIndexRecommendations();

		if (autoRefresh) {
			intervalId = setInterval(fetchPerformanceData, refreshInterval);
		}

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});

	$effect(() => {
		if (intervalId) {
			clearInterval(intervalId);
		}

		if (autoRefresh && refreshInterval > 0) {
			intervalId = setInterval(fetchPerformanceData, refreshInterval);
		}
	});
</script>

<svelte:head>
	<title>Performance Monitoring - Admin</title>
</svelte:head>

<div class="performance-page">
	<div class="page-header">
		<h1>Performance Monitoring</h1>
		<div class="header-actions">
			<label class="auto-refresh">
				<input type="checkbox" bind:checked={autoRefresh} />
				Auto-refresh
			</label>
			<select bind:value={refreshInterval} disabled={!autoRefresh}>
				<option value={10000}>10s</option>
				<option value={30000}>30s</option>
				<option value={60000}>1m</option>
				<option value={300000}>5m</option>
			</select>
			<button onclick={fetchPerformanceData} class="btn-secondary"> Refresh Now </button>
			<button onclick={exportMetrics} class="btn-secondary"> Export Data </button>
			<button onclick={clearMetrics} class="btn-danger"> Clear Metrics </button>
		</div>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<p>Loading performance data...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p>Failed to load performance data: {error}</p>
			<button onclick={fetchPerformanceData} class="btn-primary">Retry</button>
		</div>
	{:else if performanceData}
		<!-- Performance Alerts -->
		{#if performanceData.alerts && performanceData.alerts.length > 0}
			<div class="alerts-section">
				<h2>Performance Alerts</h2>
				<div class="alerts-grid">
					{#each performanceData.alerts as alert}
						<div class="alert-card {getAlertClass(alert.type)}">
							<div class="alert-header">
								<span class="alert-type">{alert.type.toUpperCase()}</span>
								<span class="alert-metric">{alert.metric}</span>
							</div>
							<div class="alert-message">{alert.message}</div>
							<div class="alert-values">
								Current: {alert.value} | Threshold: {alert.threshold}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Performance Statistics -->
		<div class="stats-section">
			<h2>Performance Statistics</h2>
			<div class="stats-grid">
				<!-- Database Stats -->
				<div class="stat-group">
					<h3>Database Performance</h3>
					<div class="stat-cards">
						<div class="stat-card">
							<div class="stat-value">{performanceData.stats.database.totalQueries}</div>
							<div class="stat-label">Total Queries</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">
								{formatDuration(performanceData.stats.database.avgQueryTime)}
							</div>
							<div class="stat-label">Avg Query Time</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">{performanceData.stats.database.slowQueries}</div>
							<div class="stat-label">Slow Queries</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">{performanceData.stats.database.errorRate}%</div>
							<div class="stat-label">Error Rate</div>
						</div>
					</div>
				</div>

				<!-- Cache Stats -->
				<div class="stat-group">
					<h3>Cache Performance</h3>
					<div class="stat-cards">
						<div class="stat-card">
							<div class="stat-value">{performanceData.stats.cache.hitRate}%</div>
							<div class="stat-label">Hit Rate</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">{performanceData.stats.cache.totalOperations}</div>
							<div class="stat-label">Total Operations</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">
								{formatDuration(performanceData.stats.cache.avgResponseTime)}
							</div>
							<div class="stat-label">Avg Response Time</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">{formatBytes(performanceData.stats.cache.size)}</div>
							<div class="stat-label">Cache Size</div>
						</div>
					</div>
				</div>

				<!-- System Stats -->
				<div class="stat-group">
					<h3>System Performance</h3>
					<div class="stat-cards">
						<div class="stat-card">
							<div class="stat-value">
								{Math.floor(performanceData.stats.system.uptime / 3600)}h
							</div>
							<div class="stat-label">Uptime</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">{performanceData.stats.system.requestCount}</div>
							<div class="stat-label">Total Requests</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">
								{formatDuration(performanceData.stats.system.avgResponseTime)}
							</div>
							<div class="stat-label">Avg Response Time</div>
						</div>
						<div class="stat-card">
							<div class="stat-value">{performanceData.stats.system.errorCount}</div>
							<div class="stat-label">Error Count</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Slow Queries -->
		{#if performanceData.slowQueries && performanceData.slowQueries.length > 0}
			<div class="slow-queries-section">
				<h2>Slow Queries</h2>
				<div class="slow-queries-table">
					<table>
						<thead>
							<tr>
								<th>Query Type</th>
								<th>Duration</th>
								<th>Frequency</th>
								<th>Last Seen</th>
							</tr>
						</thead>
						<tbody>
							{#each performanceData.slowQueries as query}
								<tr>
									<td>{query.query}</td>
									<td>{formatDuration(query.duration)}</td>
									<td>{query.frequency}</td>
									<td>{new Date(query.timestamp).toLocaleString()}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Optimization Recommendations -->
		{#if performanceData.recommendations && performanceData.recommendations.length > 0}
			<div class="recommendations-section">
				<h2>Optimization Recommendations</h2>
				<div class="recommendations-list">
					{#each performanceData.recommendations as rec}
						<div class="recommendation-card {getPriorityClass(rec.priority)}">
							<div class="rec-header">
								<span class="rec-category">{rec.category}</span>
								<span class="rec-priority">{rec.priority} priority</span>
							</div>
							<div class="rec-recommendation">{rec.recommendation}</div>
							<div class="rec-impact">{rec.impact}</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Query Analysis Tool -->
	<div class="query-analysis-section">
		<h2>Query Analysis Tool</h2>
		<div class="query-analyzer">
			<div class="query-input">
				<textarea bind:value={queryToAnalyze} placeholder="Enter SQL query to analyze..." rows="4"
				></textarea>
				<button
					onclick={analyzeQuery}
					disabled={analyzingQuery || !queryToAnalyze.trim()}
					class="btn-primary"
				>
					{analyzingQuery ? 'Analyzing...' : 'Analyze Query'}
				</button>
			</div>

			{#if queryAnalysis}
				<div class="analysis-results">
					<h3>Analysis Results</h3>
					<div class="analysis-grid">
						<div class="analysis-card">
							<h4>Execution Plan</h4>
							<pre>{queryAnalysis.analysis.executionPlan}</pre>
						</div>
						<div class="analysis-card">
							<h4>Performance Metrics</h4>
							<p>Estimated Cost: {queryAnalysis.analysis.estimatedCost}</p>
							<p>Index Usage: {queryAnalysis.analysis.indexUsage.join(', ') || 'None'}</p>
						</div>
						<div class="analysis-card">
							<h4>Optimization</h4>
							<p>Estimated Speedup: {queryAnalysis.optimization.estimatedSpeedup}x</p>
							<div class="improvements">
								{#each queryAnalysis.optimization.improvements as improvement}
									<div class="improvement">{improvement}</div>
								{/each}
							</div>
						</div>
					</div>
					{#if queryAnalysis.optimization.optimizedQuery !== queryAnalysis.optimization.originalQuery}
						<div class="optimized-query">
							<h4>Optimized Query</h4>
							<pre>{queryAnalysis.optimization.optimizedQuery}</pre>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Index Recommendations -->
	{#if indexRecommendations.length > 0}
		<div class="index-recommendations-section">
			<h2>Index Recommendations</h2>
			<div class="index-actions">
				<button
					onclick={createSelectedIndexes}
					disabled={creatingIndexes || selectedRecommendations.length === 0}
					class="btn-primary"
				>
					{creatingIndexes ? 'Creating...' : `Create Selected (${selectedRecommendations.length})`}
				</button>
			</div>
			<div class="index-recommendations">
				{#each indexRecommendations as rec, i}
					<div class="index-rec-card">
						<label class="index-checkbox">
							<input type="checkbox" bind:group={selectedRecommendations} value={i} />
							<div class="index-details">
								<div class="index-header">
									<span class="index-table">{rec.table}</span>
									<span class="index-type">{rec.type}</span>
								</div>
								<div class="index-columns">Columns: {rec.columns.join(', ')}</div>
								<div class="index-reason">{rec.reason}</div>
								<div class="index-impact">{rec.estimatedImprovement}</div>
								<div class="index-sql">
									<code>{rec.createStatement}</code>
								</div>
							</div>
						</label>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.performance-page {
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
		align-items: center;
		gap: 1rem;
	}

	.auto-refresh {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.btn-primary,
	.btn-secondary,
	.btn-danger {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
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
	.error-state {
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

	.alerts-section,
	.stats-section,
	.slow-queries-section,
	.recommendations-section,
	.query-analysis-section,
	.index-recommendations-section {
		margin-bottom: 3rem;
	}

	.alerts-section h2,
	.stats-section h2,
	.slow-queries-section h2,
	.recommendations-section h2,
	.query-analysis-section h2,
	.index-recommendations-section h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
	}

	.alerts-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.alert-card {
		padding: 1rem;
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

	.alert-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.alert-type {
		font-weight: 600;
		font-size: 0.75rem;
	}

	.alert-metric {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.alert-message {
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.alert-values {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 2rem;
	}

	.stat-group h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #374151;
	}

	.stat-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		padding: 1rem;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		text-align: center;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.slow-queries-table {
		overflow-x: auto;
	}

	.slow-queries-table table {
		width: 100%;
		border-collapse: collapse;
		background: white;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.slow-queries-table th,
	.slow-queries-table td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	.slow-queries-table th {
		background: #f9fafb;
		font-weight: 600;
		color: #374151;
	}

	.recommendations-list {
		display: grid;
		gap: 1rem;
	}

	.recommendation-card {
		padding: 1rem;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		border-left: 4px solid;
	}

	.priority-high {
		border-left-color: #dc2626;
	}

	.priority-medium {
		border-left-color: #f59e0b;
	}

	.priority-low {
		border-left-color: #10b981;
	}

	.rec-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.rec-category {
		font-weight: 600;
		text-transform: capitalize;
	}

	.rec-priority {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.rec-recommendation {
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.rec-impact {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.query-analyzer {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.query-input {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.query-input textarea {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.875rem;
		resize: vertical;
	}

	.analysis-results {
		border-top: 1px solid #e5e7eb;
		padding-top: 1.5rem;
	}

	.analysis-results h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.analysis-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.analysis-card {
		padding: 1rem;
		background: #f9fafb;
		border-radius: 6px;
	}

	.analysis-card h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.analysis-card pre {
		background: #1f2937;
		color: #f9fafb;
		padding: 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		overflow-x: auto;
	}

	.improvements {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.improvement {
		font-size: 0.875rem;
		color: #059669;
	}

	.optimized-query {
		margin-top: 1rem;
		padding: 1rem;
		background: #f0fdf4;
		border-radius: 6px;
	}

	.optimized-query h4 {
		margin: 0 0 0.5rem 0;
		color: #059669;
	}

	.index-actions {
		margin-bottom: 1rem;
	}

	.index-recommendations {
		display: grid;
		gap: 1rem;
	}

	.index-rec-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}

	.index-checkbox {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		cursor: pointer;
	}

	.index-checkbox:hover {
		background: #f9fafb;
	}

	.index-details {
		flex: 1;
	}

	.index-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.index-table {
		font-weight: 600;
		color: #1f2937;
	}

	.index-type {
		font-size: 0.875rem;
		color: #6b7280;
		text-transform: capitalize;
	}

	.index-columns {
		font-size: 0.875rem;
		color: #374151;
		margin-bottom: 0.25rem;
	}

	.index-reason {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.25rem;
	}

	.index-impact {
		font-size: 0.875rem;
		color: #059669;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.index-sql {
		background: #f3f4f6;
		padding: 0.5rem;
		border-radius: 4px;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.75rem;
		overflow-x: auto;
	}

	@media (max-width: 768px) {
		.performance-page {
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

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.query-input {
			flex-direction: column;
		}

		.analysis-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
