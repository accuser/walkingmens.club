/**
 * SvelteKit server hooks
 * Handles server-side initialization and request processing
 */

import type { Handle, HandleServerError } from '@sveltejs/kit';
import { initializeClubService, getServiceHealthStatus } from '$lib/clubs/index';
import { AuthService } from '$lib/auth';

/**
 * Handle function runs on every server request
 */
export const handle: Handle = async ({ event, resolve }) => {
	const startTime = Date.now();

	// Initialize club service with platform context if available
	if (event.platform) {
		initializeClubService(event.platform);

		// Initialize authentication system
		try {
			const authService = new AuthService(event.platform.env.DB);
			await authService.initializeDefaultAdmin();
		} catch (error) {
			console.error('Failed to initialize authentication:', error);
		}
	}

	// Add request context for monitoring
	const hostname = event.url.hostname;
	const isSubdomain = hostname !== 'walkingmens.club' && hostname !== 'localhost';
	const isAdminRoute = event.url.pathname.startsWith('/admin');
	const isMaintenancePage = event.url.pathname === '/maintenance';
	const isHealthEndpoint = event.url.pathname === '/api/health';

	// Check system health for critical routes
	if (event.platform && !isMaintenancePage && !isHealthEndpoint && !isAdminRoute) {
		try {
			const healthStatus = await getServiceHealthStatus();

			// If both database and fallback are down, redirect to maintenance page
			if (!healthStatus.database && !healthStatus.fallback) {
				console.warn('System completely unavailable, redirecting to maintenance page');
				return new Response(null, {
					status: 302,
					headers: {
						Location: '/maintenance'
					}
				});
			}
		} catch (error) {
			console.error('Health check failed in hooks:', error);
			// If health check itself fails, allow request to continue
			// The individual page handlers will deal with the errors
		}
	}

	// Log subdomain access attempts for monitoring
	if (isSubdomain && !isAdminRoute) {
		console.log(`Subdomain access: ${hostname} -> ${event.url.pathname}`);
	}

	// Continue with request processing
	const response = await resolve(event);

	// Log performance metrics for monitoring
	const duration = Date.now() - startTime;
	if (duration > 1000) {
		// Log slow requests
		console.warn(`Slow request: ${event.request.method} ${event.url.pathname} took ${duration}ms`);
	}

	// Add system health headers for monitoring
	if (event.platform) {
		try {
			const healthStatus = await getServiceHealthStatus();
			response.headers.set(
				'X-System-Database',
				healthStatus.database ? 'available' : 'unavailable'
			);
			response.headers.set(
				'X-System-Fallback',
				healthStatus.fallback ? 'available' : 'unavailable'
			);
			response.headers.set('X-Cache-Hit-Rate', healthStatus.cache.hitRate.toFixed(2));
		} catch (error) {
			// Don't fail the request if health check fails
			console.error('Health status check failed:', error);
		}
	}

	return response;
};

/**
 * Handle server errors with enhanced logging and monitoring
 */
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
	const hostname = event.url.hostname;
	const isSubdomain = hostname !== 'walkingmens.club' && hostname !== 'localhost';

	// Enhanced error logging for subdomain-related issues
	if (isSubdomain) {
		console.error(`Subdomain error [${status}] on ${hostname}:`, {
			message,
			error: error?.message || error,
			path: event.url.pathname,
			userAgent: event.request.headers.get('user-agent'),
			timestamp: new Date().toISOString()
		});

		// Check system health when subdomain errors occur
		try {
			const healthStatus = await getServiceHealthStatus();
			console.log(`System health during error:`, {
				database: healthStatus.database,
				fallback: healthStatus.fallback,
				cacheHitRate: healthStatus.cache.hitRate
			});
		} catch (healthError) {
			console.error('Failed to get health status during error handling:', healthError);
		}
	} else {
		// Standard error logging for main domain
		console.error(`Server error [${status}]:`, {
			message,
			error: error?.message || error,
			path: event.url.pathname,
			timestamp: new Date().toISOString()
		});
	}

	// Return error details (will be sanitized in production)
	return {
		message: message || 'An unexpected error occurred',
		code: status
	};
};
