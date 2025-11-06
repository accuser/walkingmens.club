/**
 * Session management service for admin authentication
 */

import type { D1Database } from '../database/types';
import type { AdminUser, AdminSession, SessionValidationResult } from './types';
import { AUTH_CONFIG } from './config';

export class SessionService {
	constructor(private db: D1Database) {}

	/**
	 * Create a new admin session
	 */
	async createSession(
		user: AdminUser,
		ipAddress?: string,
		userAgent?: string
	): Promise<AdminSession> {
		const sessionId = this.generateSessionId();
		const expiresAt = new Date(Date.now() + AUTH_CONFIG.SESSION_DURATION);
		
		const session: AdminSession = {
			id: sessionId,
			userId: user.id,
			expiresAt,
			createdAt: new Date(),
			ipAddress,
			userAgent
		};

		try {
			await this.db
				.prepare(`
					INSERT INTO admin_sessions (id, user_id, expires_at, created_at, ip_address, user_agent)
					VALUES (?, ?, ?, ?, ?, ?)
				`)
				.bind(
					session.id,
					session.userId,
					session.expiresAt.toISOString(),
					session.createdAt.toISOString(),
					session.ipAddress || null,
					session.userAgent || null
				)
				.run();

			// Update user's last login time
			await this.db
				.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?')
				.bind(new Date().toISOString(), user.id)
				.run();

			return session;
		} catch (error) {
			console.error('Error creating session:', error);
			throw new Error('Failed to create session');
		}
	}

	/**
	 * Validate an existing session
	 */
	async validateSession(sessionId: string): Promise<SessionValidationResult> {
		try {
			const sessionResult = await this.db
				.prepare(`
					SELECT s.*, u.id as user_id, u.username, u.email, u.role, u.created_at as user_created_at, u.last_login_at
					FROM admin_sessions s
					JOIN admin_users u ON s.user_id = u.id
					WHERE s.id = ? AND s.expires_at > datetime('now')
				`)
				.bind(sessionId)
				.first<{
					id: string;
					user_id: string;
					expires_at: string;
					created_at: string;
					ip_address?: string;
					user_agent?: string;
					username: string;
					email?: string;
					role: 'admin';
					user_created_at: string;
					last_login_at?: string;
				}>();

			if (!sessionResult) {
				return {
					valid: false,
					error: 'Invalid or expired session'
				};
			}

			const user: AdminUser = {
				id: sessionResult.user_id,
				username: sessionResult.username,
				email: sessionResult.email,
				role: sessionResult.role,
				createdAt: new Date(sessionResult.user_created_at),
				lastLoginAt: sessionResult.last_login_at ? new Date(sessionResult.last_login_at) : undefined
			};

			const session: AdminSession = {
				id: sessionResult.id,
				userId: sessionResult.user_id,
				expiresAt: new Date(sessionResult.expires_at),
				createdAt: new Date(sessionResult.created_at),
				ipAddress: sessionResult.ip_address,
				userAgent: sessionResult.user_agent
			};

			return {
				valid: true,
				user,
				session
			};
		} catch (error) {
			console.error('Error validating session:', error);
			return {
				valid: false,
				error: 'Session validation failed'
			};
		}
	}

	/**
	 * Destroy a session (logout)
	 */
	async destroySession(sessionId: string): Promise<void> {
		try {
			await this.db
				.prepare('DELETE FROM admin_sessions WHERE id = ?')
				.bind(sessionId)
				.run();
		} catch (error) {
			console.error('Error destroying session:', error);
			throw new Error('Failed to destroy session');
		}
	}

	/**
	 * Clean up expired sessions
	 */
	async cleanupExpiredSessions(): Promise<void> {
		try {
			await this.db
				.prepare('DELETE FROM admin_sessions WHERE expires_at <= datetime("now")')
				.run();
		} catch (error) {
			console.error('Error cleaning up expired sessions:', error);
		}
	}

	/**
	 * Get all active sessions for a user
	 */
	async getUserSessions(userId: string): Promise<AdminSession[]> {
		try {
			const result = await this.db
				.prepare(`
					SELECT * FROM admin_sessions 
					WHERE user_id = ? AND expires_at > datetime('now')
					ORDER BY created_at DESC
				`)
				.bind(userId)
				.all<{
					id: string;
					user_id: string;
					expires_at: string;
					created_at: string;
					ip_address?: string;
					user_agent?: string;
				}>();

			return (result.results || []).map(row => ({
				id: row.id,
				userId: row.user_id,
				expiresAt: new Date(row.expires_at),
				createdAt: new Date(row.created_at),
				ipAddress: row.ip_address,
				userAgent: row.user_agent
			}));
		} catch (error) {
			console.error('Error getting user sessions:', error);
			return [];
		}
	}

	/**
	 * Generate a secure session ID
	 */
	private generateSessionId(): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		let result = '';
		for (let i = 0; i < 32; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}
}