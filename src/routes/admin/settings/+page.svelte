<!--
Admin settings page
-->
<script lang="ts">
	// Settings functionality will be implemented later
</script>

<svelte:head>
	<title>Settings - Admin Panel</title>
</svelte:head>

<div class="settings">
	<div class="settings-header">
		<h1 class="page-title">Settings</h1>
		<p class="page-subtitle">Configure system settings and preferences</p>
	</div>

	<div class="settings-content">
		<div class="settings-section">
			<h2 class="section-title">System Configuration</h2>
			<div class="placeholder-content">
				<div class="placeholder-icon">⚙️</div>
				<div class="placeholder-text">
					<h3>Settings Coming Soon</h3>
					<p>System configuration options will be available in a future update.</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.settings {
		max-width: 800px;
		margin: 0 auto;
	}

	.settings-header {
		margin-bottom: 2rem;
	}

	.page-title {
		font-size: 2rem;
		font-weight: 700;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.page-subtitle {
		color: #6b7280;
		font-size: 1rem;
		margin: 0;
	}

	.settings-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.settings-section {
		background: white;
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.section-title {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.placeholder-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: 3rem 1rem;
		color: #6b7280;
	}

	.placeholder-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.placeholder-text h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.5rem 0;
	}

	.placeholder-text p {
		margin: 0;
		font-size: 0.875rem;
	}
</style>
