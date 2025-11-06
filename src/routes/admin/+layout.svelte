<!--
Admin layout component with authentication wrapper and navigation
-->
<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import ErrorBoundary from '$lib/components/admin/ErrorBoundary.svelte';

	export let data: LayoutData;

	let showMobileMenu = false;

	// Navigation items
	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: '🏠' },
		{ href: '/admin/clubs', label: 'Clubs', icon: '🚶' },
		{ href: '/admin/system', label: 'System Status', icon: '📊' },
		{ href: '/admin/settings', label: 'Settings', icon: '⚙️' }
	];

	// Handle logout
	async function handleLogout() {
		try {
			const response = await fetch('/api/auth/logout', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				goto('/admin/login');
			} else {
				console.error('Logout failed');
			}
		} catch (error) {
			console.error('Logout error:', error);
		}
	}

	// Close mobile menu when route changes
	$: if ($page.url.pathname) {
		showMobileMenu = false;
	}

	onMount(() => {
		// Initialize any admin-specific functionality
		console.log('Admin layout mounted for user:', data.user?.username);
	});
</script>

<svelte:head>
	<title>Admin Panel - Walking Mens Club</title>
</svelte:head>

<div class="admin-layout">
	<!-- Header -->
	<header class="admin-header">
		<div class="header-content">
			<div class="header-left">
				<button
					class="mobile-menu-toggle"
					class:active={showMobileMenu}
					on:click={() => (showMobileMenu = !showMobileMenu)}
					aria-label="Toggle navigation menu"
				>
					<span></span>
					<span></span>
					<span></span>
				</button>
				<h1 class="admin-title">
					<a href="/admin">Walking Mens Club Admin</a>
				</h1>
			</div>

			<div class="header-right">
				<div class="user-info">
					<span class="user-name">Welcome, {data.user?.username}</span>
					<button class="logout-btn" on:click={handleLogout} type="button">
						Logout
					</button>
				</div>
			</div>
		</div>
	</header>

	<!-- Navigation -->
	<nav class="admin-nav" class:mobile-open={showMobileMenu}>
		<ul class="nav-list">
			{#each navItems as item}
				<li class="nav-item">
					<a
						href={item.href}
						class="nav-link"
						class:active={$page.url.pathname === item.href}
						aria-current={$page.url.pathname === item.href ? 'page' : undefined}
					>
						<span class="nav-icon">{item.icon}</span>
						<span class="nav-label">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Main content -->
	<main class="admin-main">
		<div class="main-content">
			<ErrorBoundary fallback="An error occurred in the admin panel. Please try refreshing the page.">
				<slot />
			</ErrorBoundary>
		</div>
	</main>
</div>

<style>
	.admin-layout {
		min-height: 100vh;
		display: grid;
		grid-template-areas:
			'header header'
			'nav main';
		grid-template-columns: 250px 1fr;
		grid-template-rows: auto 1fr;
		background-color: #f8fafc;
	}

	/* Header */
	.admin-header {
		grid-area: header;
		background: white;
		border-bottom: 1px solid #e2e8f0;
		box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		height: 4rem;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.mobile-menu-toggle {
		display: none;
		flex-direction: column;
		gap: 3px;
		background: none;
		border: none;
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 0.375rem;
	}

	.mobile-menu-toggle span {
		width: 20px;
		height: 2px;
		background-color: #374151;
		transition: all 0.2s ease;
	}

	.mobile-menu-toggle.active span:nth-child(1) {
		transform: rotate(45deg) translate(5px, 5px);
	}

	.mobile-menu-toggle.active span:nth-child(2) {
		opacity: 0;
	}

	.mobile-menu-toggle.active span:nth-child(3) {
		transform: rotate(-45deg) translate(7px, -6px);
	}

	.admin-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.admin-title a {
		color: #1f2937;
		text-decoration: none;
	}

	.admin-title a:hover {
		color: #3b82f6;
	}

	.header-right {
		display: flex;
		align-items: center;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-name {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.logout-btn {
		background: #ef4444;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.logout-btn:hover {
		background: #dc2626;
	}

	/* Navigation */
	.admin-nav {
		grid-area: nav;
		background: white;
		border-right: 1px solid #e2e8f0;
		padding: 1.5rem 0;
		overflow-y: auto;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-item {
		margin-bottom: 0.25rem;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1.5rem;
		color: #6b7280;
		text-decoration: none;
		transition: all 0.2s ease;
		border-right: 3px solid transparent;
	}

	.nav-link:hover {
		background-color: #f3f4f6;
		color: #374151;
	}

	.nav-link.active {
		background-color: #eff6ff;
		color: #3b82f6;
		border-right-color: #3b82f6;
	}

	.nav-icon {
		font-size: 1.125rem;
		width: 1.5rem;
		text-align: center;
	}

	.nav-label {
		font-weight: 500;
	}

	/* Main content */
	.admin-main {
		grid-area: main;
		overflow: auto;
	}

	.main-content {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.admin-layout {
			grid-template-areas:
				'header'
				'main';
			grid-template-columns: 1fr;
		}

		.mobile-menu-toggle {
			display: flex;
		}

		.admin-nav {
			position: fixed;
			top: 4rem;
			left: 0;
			width: 250px;
			height: calc(100vh - 4rem);
			transform: translateX(-100%);
			transition: transform 0.3s ease;
			z-index: 50;
			box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
		}

		.admin-nav.mobile-open {
			transform: translateX(0);
		}

		.main-content {
			padding: 1rem;
		}

		.user-name {
			display: none;
		}
	}

	@media (max-width: 480px) {
		.header-content {
			padding: 0 1rem;
		}

		.admin-title {
			font-size: 1rem;
		}

		.logout-btn {
			padding: 0.375rem 0.75rem;
			font-size: 0.75rem;
		}
	}
</style>