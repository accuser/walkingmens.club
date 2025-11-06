/**
 * Authentication middleware for protecting admin routes
 */

import type { RequestEvent } from '@sveltejs/kit';
import type { AdminUser } from './types';
import { AuthService } from './authService';
import { AUTH_CONFIG } from './config';

/**
 * Authentication result for middleware
 */
export interface AuthMiddlewareResult {
	authenticated: boolean;
	user?: AdminUser;
	error?: string;
}

/**
 * Middleware to protect admin routes
 */
export async function requireAuth(event: RequestEvent): Promise<AuthMiddlewareResult> {
	try {
		// Get session cookie
		const sessionId = event.cookies.get(AUTH_CONFIG.SESSION_COOKIE_NAME);

		if (!sessionId) {
			return {
				authenticated: false,
				error: 'No session found'
			};
		}

		// Validate session
		if (!event.platform?.env?.DB) {
			return {
				authenticated: false,
				error: 'Database not available'
			};
		}

		const authService = new AuthService(event.platform.env.DB);
		const validation = await authService.validateSession(sessionId);

		if (!validation.valid || !validation.user) {
			// Clear invalid session cookie
			event.cookies.delete(AUTH_CONFIG.SESSION_COOKIE_NAME, {
				path: AUTH_CONFIG.COOKIE_OPTIONS.path
			});

			return {
				authenticated: false,
				error: validation.error || 'Invalid session'
			};
		}

		return {
			authenticated: true,
			user: validation.user
		};
	} catch (error) {
		console.error('Auth middleware error:', error);
		return {
			authenticated: false,
			error: 'Authentication failed'
		};
	}
}

/**
 * Helper to check if user has admin role
 */
export function requireAdminRole(user: AdminUser): boolean {
	return user.role === 'admin';
}

/**
 * Set authentication cookie
 */
export function setAuthCookie(event: RequestEvent, sessionId: string): void {
	event.cookies.set(AUTH_CONFIG.SESSION_COOKIE_NAME, sessionId, {
		...AUTH_CONFIG.COOKIE_OPTIONS,
		// Adjust secure flag based on environment
		secure: event.url.protocol === 'https:'
	});
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(event: RequestEvent): void {
	event.cookies.delete(AUTH_CONFIG.SESSION_COOKIE_NAME, {
		path: AUTH_CONFIG.COOKIE_OPTIONS.path
	});
}
