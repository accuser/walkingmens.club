<!--
Admin dashboard page
-->
<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<svelte:head>
	<title>Dashboard - Admin Panel</title>
</svelte:head>

<div class="dashboard">
	<div class="dashboard-header">
		<h1 class="page-title">Dashboard</h1>
		<p class="page-subtitle">Welcome to the Walking Mens Club admin panel</p>
	</div>

	<div class="dashboard-grid">
		<!-- Stats Cards -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon">🚶</div>
				<div class="stat-content">
					<div class="stat-value">{data.stats.totalClubs}</div>
					<div class="stat-label">Total Clubs</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon">🌐</div>
				<div class="stat-content">
					<div class="stat-value">{data.stats.activeSubdomains}</div>
					<div class="stat-label">Active Subdomains</div>
				</div>
			</div>

			<div class="stat-card">
				<div class="stat-icon">📊</div>
				<div class="stat-content">
					<div class="stat-value">Online</div>
					<div class="stat-label">System Status</div>
				</div>
			</div>
		</div>

		<!-- Quick Actions -->
		<div class="quick-actions">
			<h2 class="section-title">Quick Actions</h2>
			<div class="action-grid">
				<a href="/admin/clubs/new" class="action-card">
					<div class="action-icon">➕</div>
					<div class="action-content">
						<div class="action-title">Add New Club</div>
						<div class="action-description">Create a new walking club configuration</div>
					</div>
				</a>

				<a href="/admin/clubs" class="action-card">
					<div class="action-icon">📋</div>
					<div class="action-content">
						<div class="action-title">Manage Clubs</div>
						<div class="action-description">View and edit existing clubs</div>
					</div>
				</a>

				<a href="/admin/settings" class="action-card">
					<div class="action-icon">⚙️</div>
					<div class="action-content">
						<div class="action-title">Settings</div>
						<div class="action-description">Configure system settings</div>
					</div>
				</a>
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="recent-activity">
			<h2 class="section-title">Recent Activity</h2>
			<div class="activity-list">
				<div class="activity-item">
					<div class="activity-icon">ℹ️</div>
					<div class="activity-content">
						<div class="activity-text">Admin panel initialized</div>
						<div class="activity-time">Just now</div>
					</div>
				</div>
				<div class="activity-item">
					<div class="activity-icon">🔧</div>
					<div class="activity-content">
						<div class="activity-text">System ready for club management</div>
						<div class="activity-time">Just now</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		max-width: 1200px;
		margin: 0 auto;
	}

	.dashboard-header {
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

	.dashboard-grid {
		display: grid;
		gap: 2rem;
		grid-template-columns: 1fr;
	}

	/* Stats Grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat-card {
		background: white;
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		font-size: 2rem;
		width: 3rem;
		height: 3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f3f4f6;
		border-radius: 0.5rem;
	}

	.stat-content {
		flex: 1;
	}

	.stat-value {
		font-size: 1.875rem;
		font-weight: 700;
		color: #1f2937;
		line-height: 1;
	}

	.stat-label {
		color: #6b7280;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	/* Quick Actions */
	.quick-actions {
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

	.action-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.action-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;
	}

	.action-card:hover {
		border-color: #3b82f6;
		background: #f8fafc;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.action-icon {
		font-size: 1.5rem;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #eff6ff;
		border-radius: 0.375rem;
		flex-shrink: 0;
	}

	.action-content {
		flex: 1;
	}

	.action-title {
		font-weight: 500;
		color: #1f2937;
		margin-bottom: 0.25rem;
	}

	.action-description {
		font-size: 0.875rem;
		color: #6b7280;
	}

	/* Recent Activity */
	.recent-activity {
		background: white;
		border-radius: 0.75rem;
		padding: 1.5rem;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.activity-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		border-radius: 0.375rem;
		background: #f9fafb;
	}

	.activity-icon {
		font-size: 1.25rem;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.activity-content {
		flex: 1;
	}

	.activity-text {
		color: #374151;
		font-size: 0.875rem;
	}

	.activity-time {
		color: #6b7280;
		font-size: 0.75rem;
		margin-top: 0.125rem;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.action-grid {
			grid-template-columns: 1fr;
		}

		.page-title {
			font-size: 1.5rem;
		}
	}
</style>