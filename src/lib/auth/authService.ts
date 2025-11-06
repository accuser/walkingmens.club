/**
 * Authentication service for admin users
 */

import type { D1Database } from '../database/types';
import type { AdminUser, LoginCredentials, AuthResult } from './types';
import { SessionService } from './sessionService';
import { AUTH_CONFIG } from './config';

export class AuthService {
	private sessionService: SessionService;

	constructor(private db: D1Database) {
		this.sessionService = new SessionService(db);
	}

	/**
	 * Authenticate admin user with credentials
	 */
	async login(
		credentials: LoginCredentials,
		ipAddress?: string,
		userAgent?: string
	): Promise<AuthResult> {
		try {
			// Check for rate limiting (basic implementation)
			const recentAttempts = await this.getRecentLoginAttempts(credentials.username);
			if (recentAttempts >= AUTH_CONFIG.MAX_LOGIN_ATTEMPTS) {
				return {
					success: false,
					error: 'Too many login attempts. Please try again later.'
				};
			}

			// Find user by username
			const user = await this.getUserByUsername(credentials.username);
			if (!user) {
				await this.recordLoginAttempt(credentials.username, false, ipAddress);
				return {
					success: false,
					error: 'Invalid username or password'
				};
			}

			// Verify password (in production, this should use proper hashing)
			const isValidPassword = await this.verifyPassword(credentials.password, user);
			if (!isValidPassword) {
				await this.recordLoginAttempt(credentials.username, false, ipAddress);
				return {
					success: false,
					error: 'Invalid username or password'
				};
			}

			// Create session
			const session = await this.sessionService.createSession(user, ipAddress, userAgent);
			
			// Record successful login
			await this.recordLoginAttempt(credentials.username, true, ipAddress);

			return {
				success: true,
				user,
				session
			};
		} catch (error) {
			console.error('Login error:', error);
			return {
				success: false,
				error: 'Authentication failed'
			};
		}
	}

	/**
	 * Logout user by destroying session
	 */
	async logout(sessionId: string): Promise<void> {
		await this.sessionService.destroySession(sessionId);
	}

	/**
	 * Validate session and return user if valid
	 */
	async validateSession(sessionId: string) {
		return await this.sessionService.validateSession(sessionId);
	}

	/**
	 * Initialize default admin user if none exists
	 */
	async initializeDefaultAdmin(): Promise<void> {
		try {
			// Check if any admin users exist
			const existingAdmin = await this.db
				.prepare('SELECT COUNT(*) as count FROM admin_users')
				.first<{ count: number }>();

			if (existingAdmin && existingAdmin.count > 0) {
				return; // Admin already exists
			}

			// Create default admin user
			const adminId = 'admin-' + Date.now();
			await this.db
				.prepare(`
					INSERT INTO admin_users (id, username, password_hash, email, role, created_at)
					VALUES (?, ?, ?, ?, ?, ?)
				`)
				.bind(
					adminId,
					AUTH_CONFIG.DEFAULT_ADMIN.username,
					await this.hashPassword(AUTH_CONFIG.DEFAULT_ADMIN.password),
					AUTH_CONFIG.DEFAULT_ADMIN.email,
					'admin',
					new Date().toISOString()
				)
				.run();

			console.log('Default admin user created');
		} catch (error) {
			console.error('Error initializing default admin:', error);
		}
	}

	/**
	 * Get user by username
	 */
	private async getUserByUsername(username: string): Promise<AdminUser | null> {
		try {
			const result = await this.db
				.prepare('SELECT * FROM admin_users WHERE username = ?')
				.bind(username)
				.first<{
					id: string;
					username: string;
					password_hash: string;
					email?: string;
					role: 'admin';
					created_at: string;
					last_login_at?: string;
				}>();

			if (!result) {
				return null;
			}

			return {
				id: result.id,
				username: result.username,
				email: result.email,
				role: result.role,
				createdAt: new Date(result.created_at),
				lastLoginAt: result.last_login_at ? new Date(result.last_login_at) : undefined
			};
		} catch (error) {
			console.error('Error getting user by username:', error);
			return null;
		}
	}

	/**
	 * Verify password (simplified for demo - use proper hashing in production)
	 */
	private async verifyPassword(password: string, user: AdminUser): Promise<boolean> {
		try {
			const result = await this.db
				.prepare('SELECT password_hash FROM admin_users WHERE id = ?')
				.bind(user.id)
				.first<{ password_hash: string }>();

			if (!result) {
				return false;
			}

			// In production, use bcrypt or similar
			// For demo purposes, using simple comparison
			const hashedInput = await this.hashPassword(password);
			return hashedInput === result.password_hash;
		} catch (error) {
			console.error('Error verifying password:', error);
			return false;
		}
	}

	/**
	 * Hash password (simplified for demo - use bcrypt in production)
	 */
	private async hashPassword(password: string): Promise<string> {
		// In production, use bcrypt or similar secure hashing
		// For demo purposes, using simple hash
		const encoder = new TextEncoder();
		const data = encoder.encode(password + 'salt');
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Record login attempt for rate limiting
	 */
	private async recordLoginAttempt(
		username: string,
		success: boolean,
		ipAddress?: string
	): Promise<void> {
		try {
			await this.db
				.prepare(`
					INSERT INTO login_attempts (username, success, ip_address, attempted_at)
					VALUES (?, ?, ?, ?)
				`)
				.bind(username, success ? 1 : 0, ipAddress || null, new Date().toISOString())
				.run();
		} catch (error) {
			console.error('Error recording login attempt:', error);
		}
	}

	/**
	 * Get recent login attempts for rate limiting
	 */
	private async getRecentLoginAttempts(username: string): Promise<number> {
		try {
			const windowStart = new Date(Date.now() - AUTH_CONFIG.LOGIN_ATTEMPT_WINDOW);
			const result = await this.db
				.prepare(`
					SELECT COUNT(*) as count 
					FROM login_attempts 
					WHERE username = ? AND success = 0 AND attempted_at > ?
				`)
				.bind(username, windowStart.toISOString())
				.first<{ count: number }>();

			return result?.count || 0;
		} catch (error) {
			console.error('Error getting recent login attempts:', error);
			return 0;
		}
	}
}