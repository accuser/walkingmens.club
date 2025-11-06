<!--
Loading overlay component
-->
<script lang="ts">
	export let show = false;
	export let message = 'Loading...';
	export let backdrop = true;
</script>

{#if show}
	<div class="loading-overlay" class:with-backdrop={backdrop}>
		<div class="loading-content">
			<div class="loading-spinner"></div>
			<p class="loading-message">{message}</p>
		</div>
	</div>
{/if}

<style>
	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1200;
	}

	.loading-overlay.with-backdrop {
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(2px);
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 2rem;
		background: white;
		border-radius: 0.75rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
		border: 1px solid #e5e7eb;
	}

	.loading-spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.loading-message {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
	}
</style>