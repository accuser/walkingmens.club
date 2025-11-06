<!--
Reusable confirmation dialog component
-->
<script lang="ts">
	interface Props {
		show?: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		confirmVariant?: 'primary' | 'danger';
		loading?: boolean;
		onconfirm?: () => void;
		oncancel?: () => void;
	}

	let {
		show = $bindable(false),
		title = 'Confirm Action',
		message = 'Are you sure you want to proceed?',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		confirmVariant = 'primary',
		loading = false,
		onconfirm,
		oncancel
	}: Props = $props();

	function handleConfirm() {
		onconfirm?.();
	}

	function handleCancel() {
		oncancel?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			handleCancel();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

{#if show}
	<div
		class="dialog-overlay"
		role="dialog"
		aria-modal="true"
		aria-labelledby="dialog-title"
		tabindex="-1"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
	>
		<div class="dialog-content">
			<div class="dialog-header">
				<h2 id="dialog-title" class="dialog-title">{title}</h2>
			</div>

			<div class="dialog-body">
				<p class="dialog-message">{message}</p>
			</div>

			<div class="dialog-actions">
				<button type="button" class="btn btn-outline" onclick={handleCancel} disabled={loading}>
					{cancelText}
				</button>
				<button
					type="button"
					class="btn"
					class:btn-primary={confirmVariant === 'primary'}
					class:btn-danger={confirmVariant === 'danger'}
					onclick={handleConfirm}
					disabled={loading}
				>
					{#if loading}
						<span class="loading-spinner"></span>
					{/if}
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.dialog-overlay {
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
		padding: 1rem;
	}

	.dialog-content {
		background: white;
		border-radius: 0.75rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		max-width: 400px;
		width: 100%;
		max-height: 90vh;
		overflow: auto;
	}

	.dialog-header {
		padding: 1.5rem 1.5rem 0 1.5rem;
	}

	.dialog-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.dialog-body {
		padding: 1rem 1.5rem;
	}

	.dialog-message {
		color: #6b7280;
		margin: 0;
		line-height: 1.5;
	}

	.dialog-actions {
		padding: 0 1.5rem 1.5rem 1.5rem;
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
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

	.btn-danger {
		background: #ef4444;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-outline {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.btn-outline:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.loading-spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 480px) {
		.dialog-actions {
			flex-direction: column;
		}
	}
</style>
