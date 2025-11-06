/**
 * Authentication module exports
 */

export { AuthService } from './authService';
export { SessionService } from './sessionService';
export { requireAuth, requireAdminRole, setAuthCookie, clearAuthCookie } from './middleware';
export { AUTH_CONFIG } from './config';
export type {
	AdminUser,
	AdminSession,
	LoginCredentials,
	AuthResult,
	SessionValidationResult
} from './types';
export type { AuthMiddlewareResult } from './middleware';