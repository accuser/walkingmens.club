<script lang="ts">
	import { onMount } from 'svelte';

	let retryCount = $state(0);
	let isRetrying = $state(false);
	let lastRetry = $state(null);

	async function checkSystemHealth() {
		try {
			const response = await fetch('/api/health');
			if (response.ok) {
				const health = await response.json();
				if (health.status === 'healthy') {
					// System is back online, redirect to home
					window.location.href = '/';
					return true;
				}
			}
			return false;
		} catch (error) {
			console.error('Health check failed:', error);
			return false;
		}
	}

	async function retryConnection() {
		if (isRetrying) return;

		isRetrying = true;
		retryCount++;
		lastRetry = new Date();

		const isHealthy = await checkSystemHealth();

		if (!isHealthy) {
			// Schedule next retry with exponential backoff
			const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000); // Max 30 seconds
			setTimeout(() => {
				isRetrying = false;
			}, delay);
		}
	}

	onMount(() => {
		// Auto-retry every 30 seconds
		const interval = setInterval(async () => {
			if (!isRetrying) {
				await checkSystemHealth();
			}
		}, 30000);

		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>System Maintenance - Walking Mens Club</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="maintenance-page">
	<div class="maintenance-content">
		<div class="maintenance-icon">
			<svg
				width="80"
				height="80"
				viewBox="0 0 24 24"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					d="M12 2L2 7L12 12L22 7L12 2Z"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M2 17L12 22L22 17"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
				<path
					d="M2 12L12 17L22 12"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		</div>

		<h1>System Maintenance</h1>
		<p class="maintenance-message">
			We're currently performing system maintenance to improve your experience. Our walking club
			configurations are temporarily unavailable.
		</p>

		<div class="status-info">
			<div class="status-item">
				<span class="status-label">Status:</span>
				<span class="status-value maintenance">Under Maintenance</span>
			</div>
			<div class="status-item">
				<span class="status-label">Expected Duration:</span>
				<span class="status-value">15-30 minutes</span>
			</div>
			{#if lastRetry}
				<div class="status-item">
					<span class="status-label">Last Check:</span>
					<span class="status-value">{lastRetry.toLocaleTimeString()}</span>
				</div>
			{/if}
		</div>

		<div class="actions">
			<button onclick={retryConnection} disabled={isRetrying} class="retry-button">
				{#if isRetrying}
					<span class="spinner"></span>
					Checking...
				{:else}
					Check Again
				{/if}
			</button>

			<a href="https://walkingmens.club" class="home-link"> Return to Main Site </a>
		</div>

		<div class="help-section">
			<h3>What's happening?</h3>
			<ul>
				<li>We're updating our club configuration system</li>
				<li>Individual club websites may be temporarily unavailable</li>
				<li>No data is being lost during this process</li>
				<li>Normal service will resume shortly</li>
			</ul>

			<p class="contact-info">
				If you have urgent questions, please contact us at
				<a href="mailto:support@walkingmens.club">support@walkingmens.club</a>
			</p>
		</div>

		<div class="auto-refresh-notice">
			<p>This page will automatically check for updates every 30 seconds.</p>
		</div>
	</div>
</div>

<style>
	.maintenance-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.maintenance-content {
		text-align: center;
		max-width: 600px;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 20px;
		padding: 3rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
	}

	.maintenance-icon {
		margin-bottom: 2rem;
		opacity: 0.8;
	}

	.maintenance-icon svg {
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0%,
		100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	h1 {
		font-size: 2.5rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
	}

	.maintenance-message {
		font-size: 1.1rem;
		line-height: 1.6;
		margin: 0 0 2rem 0;
		opacity: 0.9;
	}

	.status-info {
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		padding: 1.5rem;
		margin: 2rem 0;
		text-align: left;
	}

	.status-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.status-item:last-child {
		margin-bottom: 0;
	}

	.status-label {
		font-weight: 500;
		opacity: 0.8;
	}

	.status-value {
		font-weight: 600;
	}

	.status-value.maintenance {
		color: #fbbf24;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		margin: 2rem 0;
	}

	.retry-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: 1rem;
	}

	.retry-button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-2px);
	}

	.retry-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.home-link {
		padding: 0.75rem 1.5rem;
		background: white;
		color: #667eea;
		text-decoration: none;
		border-radius: 8px;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.home-link:hover {
		background: #f8f9ff;
		transform: translateY(-2px);
	}

	.help-section {
		margin: 2rem 0;
		padding: 1.5rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12px;
		text-align: left;
	}

	.help-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.2rem;
		color: #fff;
	}

	.help-section ul {
		margin: 0 0 1rem 0;
		padding-left: 1.25rem;
	}

	.help-section li {
		margin-bottom: 0.5rem;
		opacity: 0.9;
		line-height: 1.5;
	}

	.contact-info {
		margin: 1rem 0 0 0;
		font-size: 0.95rem;
		opacity: 0.9;
	}

	.contact-info a {
		color: #fff;
		text-decoration: underline;
		font-weight: 500;
	}

	.contact-info a:hover {
		color: #f0f0f0;
	}

	.auto-refresh-notice {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.2);
	}

	.auto-refresh-notice p {
		margin: 0;
		font-size: 0.875rem;
		opacity: 0.7;
		font-style: italic;
	}

	@media (max-width: 640px) {
		.maintenance-content {
			padding: 2rem;
		}

		h1 {
			font-size: 2rem;
		}

		.actions {
			flex-direction: column;
			align-items: center;
		}

		.retry-button,
		.home-link {
			width: 100%;
			max-width: 200px;
			text-align: center;
		}

		.status-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}
	}
</style>
