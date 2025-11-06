<!--
Error boundary component for graceful error handling
-->
<script lang="ts">
	import { onMount } from 'svelte';

	export let fallback: string = 'Something went wrong. Please try again.';
	export let showDetails = false;

	let error: Error | null = null;
	let errorDetails = '';

	function handleError(event: ErrorEvent) {
		error = new Error(event.message);
		errorDetails = `${event.message}\n${event.filename}:${event.lineno}:${event.colno}`;
		console.error('Error caught by boundary:', error);
	}

	function handleUnhandledRejection(event: PromiseRejectionEvent) {
		error = new Error(event.reason?.message || 'Unhandled promise rejection');
		errorDetails = event.reason?.stack || event.reason?.toString() || 'Unknown error';
		console.error('Promise rejection caught by boundary:', event.reason);
	}

	function retry() {
		error = null;
		errorDetails = '';
		// Reload the page to reset state
		window.location.reload();
	}

	onMount(() => {
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);

		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});
</script>

{#if error}
	<div class="error-boundary">
		<div class="error-content">
			<div class="error-icon">⚠️</div>
			<h2 class="error-title">Oops! Something went wrong</h2>
			<p class="error-message">{fallback}</p>
			
			{#if showDetails && errorDetails}
				<details class="error-details">
					<summary>Technical Details</summary>
					<pre class="error-stack">{errorDetails}</pre>
				</details>
			{/if}

			<div class="error-actions">
				<button class="btn btn-primary" on:click={retry}>
					Try Again
				</button>
				<a href="/admin" class="btn btn-outline">
					Go to Dashboard
				</a>
			</div>
		</div>
	</div>
{:else}
	<slot />
{/if}

<style>
	.error-boundary {
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
	}

	.error-content {
		text-align: center;
		max-width: 500px;
		background: white;
		border-radius: 0.75rem;
		padding: 2rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.error-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.7;
	}

	.error-title {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.error-message {
		color: #6b7280;
		margin: 0 0 1.5rem 0;
		line-height: 1.5;
	}

	.error-details {
		text-align: left;
		margin-bottom: 1.5rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
		overflow: hidden;
	}

	.error-details summary {
		padding: 0.75rem;
		background: #f9fafb;
		cursor: pointer;
		font-weight: 500;
		color: #374151;
	}

	.error-details summary:hover {
		background: #f3f4f6;
	}

	.error-stack {
		padding: 1rem;
		margin: 0;
		font-size: 0.75rem;
		color: #6b7280;
		background: #f9fafb;
		overflow-x: auto;
		white-space: pre-wrap;
		word-break: break-all;
	}

	.error-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

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

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-outline {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-outline:hover {
		background: #f3f4f6;
	}

	@media (max-width: 480px) {
		.error-actions {
			flex-direction: column;
		}
	}
</style>