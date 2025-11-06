<!--
Admin login page
-->
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';

	export let data: PageData;
	export let form: ActionData;

	let loading = false;
	let username = form?.username || '';
	let password = '';

	onMount(() => {
		// Focus username field on load
		const usernameInput = document.getElementById('username');
		if (usernameInput) {
			usernameInput.focus();
		}
	});
</script>

<svelte:head>
	<title>Admin Login - Walking Mens Club</title>
</svelte:head>

<div class="login-container">
	<div class="login-card">
		<div class="login-header">
			<h1 class="login-title">Walking Mens Club</h1>
			<p class="login-subtitle">Admin Panel</p>
		</div>

		<form
			method="POST"
			action="?/login"
			class="login-form"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
		>
			{#if form?.error}
				<div class="error-message" role="alert">
					{form.error}
				</div>
			{/if}

			<div class="form-group">
				<label for="username" class="form-label">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					class="form-input"
					class:error={form?.error}
					bind:value={username}
					required
					autocomplete="username"
					disabled={loading}
				/>
			</div>

			<div class="form-group">
				<label for="password" class="form-label">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					class="form-input"
					class:error={form?.error}
					bind:value={password}
					required
					autocomplete="current-password"
					disabled={loading}
				/>
			</div>

			<button type="submit" class="login-button" disabled={loading}>
				{#if loading}
					<span class="loading-spinner"></span>
					Signing in...
				{:else}
					Sign In
				{/if}
			</button>
		</form>

		<div class="login-footer">
			<p class="demo-info">
				<strong>Demo Credentials:</strong><br />
				Username: admin<br />
				Password: admin123
			</p>
		</div>
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 1rem;
	}

	.login-card {
		background: white;
		border-radius: 0.75rem;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.1),
			0 10px 10px -5px rgba(0, 0, 0, 0.04);
		padding: 2rem;
		width: 100%;
		max-width: 400px;
	}

	.login-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.login-title {
		font-size: 1.875rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.login-subtitle {
		color: #6b7280;
		font-size: 1rem;
		margin: 0;
	}

	.login-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		text-align: center;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-weight: 500;
		color: #374151;
		font-size: 0.875rem;
	}

	.form-input {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 0.375rem;
		font-size: 1rem;
		transition: all 0.2s ease;
		background: white;
	}

	.form-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.form-input.error {
		border-color: #dc2626;
	}

	.form-input.error:focus {
		border-color: #dc2626;
		box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
	}

	.form-input:disabled {
		background-color: #f9fafb;
		color: #6b7280;
		cursor: not-allowed;
	}

	.login-button {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 0.375rem;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.login-button:hover:not(:disabled) {
		background: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
	}

	.login-button:disabled {
		background: #9ca3af;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
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

	.login-footer {
		margin-top: 2rem;
		padding-top: 1.5rem;
		border-top: 1px solid #e5e7eb;
	}

	.demo-info {
		background: #f0f9ff;
		border: 1px solid #bae6fd;
		color: #0369a1;
		padding: 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		margin: 0;
		text-align: center;
	}

	@media (max-width: 480px) {
		.login-card {
			padding: 1.5rem;
		}

		.login-title {
			font-size: 1.5rem;
		}
	}
</style>
