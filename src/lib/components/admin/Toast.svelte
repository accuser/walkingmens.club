<!--
Toast notification component
-->
<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		show?: boolean;
		message?: string;
		type?: 'success' | 'error' | 'warning' | 'info';
		duration?: number; // Auto-hide after 5 seconds
		persistent?: boolean; // Don't auto-hide
		onclose?: () => void;
	}

	let {
		show = $bindable(false),
		message = '',
		type = 'info',
		duration = 5000,
		persistent = false,
		onclose
	}: Props = $props();

	let timeoutId: number;

	function handleClose() {
		show = false;
		onclose?.();
	}

	$effect(() => {
		if (show && !persistent && duration > 0) {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				handleClose();
			}, duration);
		}
	});

	onMount(() => {
		return () => {
			clearTimeout(timeoutId);
		};
	});

	// Icon mapping
	const icons = {
		success: '✅',
		error: '❌',
		warning: '⚠️',
		info: 'ℹ️'
	};
</script>

{#if show}
	<div class="toast toast-{type}" role="alert">
		<div class="toast-content">
			<span class="toast-icon">{icons[type]}</span>
			<span class="toast-message">{message}</span>
		</div>
		<button type="button" class="toast-close" onclick={handleClose} aria-label="Close notification">
			×
		</button>
	</div>
{/if}

<style>
	.toast {
		position: fixed;
		top: 1rem;
		right: 1rem;
		background: white;
		border-radius: 0.5rem;
		box-shadow:
			0 10px 15px -3px rgba(0, 0, 0, 0.1),
			0 4px 6px -2px rgba(0, 0, 0, 0.05);
		border: 1px solid #e5e7eb;
		padding: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		max-width: 400px;
		min-width: 300px;
		z-index: 1100;
		animation: slideIn 0.3s ease-out;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.toast-success {
		border-left: 4px solid #10b981;
	}

	.toast-error {
		border-left: 4px solid #ef4444;
	}

	.toast-warning {
		border-left: 4px solid #f59e0b;
	}

	.toast-info {
		border-left: 4px solid #3b82f6;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.toast-icon {
		font-size: 1.125rem;
		flex-shrink: 0;
	}

	.toast-message {
		color: #374151;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.toast-close {
		background: none;
		border: none;
		color: #6b7280;
		cursor: pointer;
		font-size: 1.25rem;
		line-height: 1;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.toast-close:hover {
		background: #f3f4f6;
		color: #374151;
	}

	@media (max-width: 480px) {
		.toast {
			top: 1rem;
			left: 1rem;
			right: 1rem;
			min-width: auto;
		}
	}
</style>
