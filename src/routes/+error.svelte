<script lang="ts">
	import { page } from '$app/stores';
	
	let { data } = $props();
	
	// Get error details from the page store
	$: error = $page.error;
	$: status = $page.status;
	
	// Determine if this is a subdomain-related error
	$: isSubdomainError = status === 404 && $page.url.hostname !== 'walkingmens.club' && $page.url.hostname !== 'localhost';
	$: isServiceUnavailable = status === 503;
</script>

<svelte:head>
	<title>{status} - Walking Mens Club</title>
</svelte:head>

<div class="error-container">
	<div class="error-content">
		<h1 class="error-code">{status}</h1>
		
		{#if isServiceUnavailable}
			<h2 class="error-title">Service Temporarily Unavailable</h2>
			<p class="error-message">
				We're experiencing technical difficulties. Our team has been notified and is working to resolve the issue.
			</p>
			<div class="error-actions">
				<button onclick="window.location.reload()" class="retry-button">
					Try Again
				</button>
				<a href="https://walkingmens.club" class="home-link">
					Go to Main Site
				</a>
			</div>
		{:else if isSubdomainError}
			<h2 class="error-title">Club Not Found</h2>
			<p class="error-message">
				{error?.message || `No walking club is configured for ${$page.url.hostname}`}
			</p>
			{#if error?.details}
				<p class="error-details">{error.details}</p>
			{/if}
			<div class="error-actions">
				<a href="https://walkingmens.club" class="home-link">
					Browse All Clubs
				</a>
				<a href="https://walkingmens.club/admin" class="admin-link">
					Admin Portal
				</a>
			</div>
			<div class="help-section">
				<h3>Looking to set up a new club?</h3>
				<p>
					If you're trying to access a new walking club that should be available at this address,
					the club administrator may need to complete the setup process.
				</p>
				<p>
					<strong>Club administrators:</strong> Please log in to the 
					<a href="https://walkingmens.club/admin">admin portal</a> to configure this subdomain.
				</p>
			</div>
		{:else}
			<h2 class="error-title">
				{#if status === 404}
					Page Not Found
				{:else if status >= 500}
					Server Error
				{:else}
					Error
				{/if}
			</h2>
			<p class="error-message">
				{error?.message || 'An unexpected error occurred'}
			</p>
			{#if error?.details}
				<p class="error-details">{error.details}</p>
			{/if}
			<div class="error-actions">
				<button onclick="history.back()" class="back-button">
					Go Back
				</button>
				<a href="/" class="home-link">
					Home
				</a>
			</div>
		{/if}
	</div>
</div>

<style>
	.error-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.error-content {
		text-align: center;
		max-width: 600px;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 20px;
		padding: 3rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
	}

	.error-code {
		font-size: 6rem;
		font-weight: bold;
		margin: 0 0 1rem 0;
		opacity: 0.8;
	}

	.error-title {
		font-size: 2rem;
		margin: 0 0 1rem 0;
		font-weight: 600;
	}

	.error-message {
		font-size: 1.1rem;
		margin: 0 0 1rem 0;
		opacity: 0.9;
		line-height: 1.6;
	}

	.error-details {
		font-size: 0.95rem;
		margin: 0 0 2rem 0;
		opacity: 0.8;
		font-style: italic;
		line-height: 1.5;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: 2rem;
	}

	.retry-button,
	.back-button,
	.home-link,
	.admin-link {
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s ease;
		border: none;
		cursor: pointer;
		font-size: 1rem;
	}

	.retry-button,
	.back-button {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.retry-button:hover,
	.back-button:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-2px);
	}

	.home-link {
		background: white;
		color: #667eea;
	}

	.home-link:hover {
		background: #f8f9ff;
		transform: translateY(-2px);
	}

	.admin-link {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	.admin-link:hover {
		background: rgba(255, 255, 255, 0.2);
		transform: translateY(-2px);
	}

	.help-section {
		margin-top: 2rem;
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

	.help-section p {
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
		line-height: 1.6;
		opacity: 0.9;
	}

	.help-section p:last-child {
		margin-bottom: 0;
	}

	.help-section a {
		color: #fff;
		text-decoration: underline;
		font-weight: 500;
	}

	.help-section a:hover {
		color: #f0f0f0;
	}

	@media (max-width: 640px) {
		.error-content {
			padding: 2rem;
		}

		.error-code {
			font-size: 4rem;
		}

		.error-title {
			font-size: 1.5rem;
		}

		.error-actions {
			flex-direction: column;
			align-items: center;
		}

		.retry-button,
		.back-button,
		.home-link,
		.admin-link {
			width: 100%;
			max-width: 200px;
		}
	}
</style>