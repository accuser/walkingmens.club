/**
 * Authentication and authorization types
 */

export interface AdminUser {
	id: string;
	username: string;
	email?: string;
	role: 'admin';
	createdAt: Date;
	lastLoginAt?: Date;
}

export interface AdminSession {
	id: string;
	userId: string;
	expiresAt: Date;
	createdAt: Date;
	ipAddress?: string;
	userAgent?: string;
}

export interface LoginCredentials {
	username: string;
	password: string;
}

export interface AuthResult {
	success: boolean;
	user?: AdminUser;
	session?: AdminSession;
	error?: string;
}

export interface SessionValidationResult {
	valid: boolean;
	user?: AdminUser;
	session?: AdminSession;
	error?: string;
}
