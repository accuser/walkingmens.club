/**
 * Authentication configuration
 */

export const AUTH_CONFIG = {
	// Session configuration
	SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
	SESSION_COOKIE_NAME: 'admin_session',

	// Cookie configuration
	COOKIE_OPTIONS: {
		httpOnly: true,
		secure: true, // HTTPS only in production
		sameSite: 'strict' as const,
		path: '/admin',
		maxAge: 24 * 60 * 60 // 24 hours in seconds
	},

	// Security configuration
	MAX_LOGIN_ATTEMPTS: 5,
	LOGIN_ATTEMPT_WINDOW: 15 * 60 * 1000, // 15 minutes

	// Default admin credentials (should be changed in production)
	DEFAULT_ADMIN: {
		username: 'admin',
		// This should be a hashed password in production
		// For demo purposes, using a simple password
		password: 'admin123',
		email: 'admin@walkingmens.club'
	}
} as const;
