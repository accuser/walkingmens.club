/**
 * Database connection management and error handling for Cloudflare D1
 * Implements connection pooling, retry logic, and fallback mechanisms
 */

import type { D1Database } from './types';
import { checkDatabaseHealth } from '../config/database';

/**
 * Database connection error types
 */
export class DatabaseConnectionError extends Error {
	constructor(message: string, public cause?: Error) {
		super(message);
		this.name = 'DatabaseConnectionError';
	}
}

export class DatabaseTimeoutError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DatabaseTimeoutError';
	}
}

export class DatabaseUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DatabaseUnavailableError';
	}
}

/**
 * Retry configuration
 */
interface RetryConfig {
	maxAttempts: number;
	baseDelayMs: number;
	maxDelayMs: number;
	backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxAttempts: 3,
	baseDelayMs: 100,
	maxDelayMs: 5000,
	backoffMultiplier: 2
};

/**
 * Connection pool configuration
 */
interface ConnectionPoolConfig {
	maxConnections: number;
	connectionTimeoutMs: number;
	idleTimeoutMs: number;
	healthCheckIntervalMs: number;
}

const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
	maxConnections: 10,
	connectionTimeoutMs: 5000,
	idleTimeoutMs: 30000,
	healthCheckIntervalMs: 60000
};

/**
 * Connection pool entry
 */
interface PooledConnection {
	db: D1Database;
	lastUsed: number;
	isHealthy: boolean;
	inUse: boolean;
}

/**
 * Database connection manager with pooling and retry logic
 */
export class DatabaseConnectionManager {
	private connections: Map<string, PooledConnection> = new Map();
	private healthCheckInterval?: NodeJS.Timeout;
	private isShuttingDown = false;

	constructor(
		private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
		private poolConfig: ConnectionPoolConfig = DEFAULT_POOL_CONFIG
	) {
		this.startHealthChecks();
	}

	/**
	 * Get a database connection with retry logic
	 */
	async getConnection(db: D1Database): Promise<D1Database> {
		if (this.isShuttingDown) {
			throw new DatabaseUnavailableError('Connection manager is shutting down');
		}

		const connectionId = this.generateConnectionId();
		
		try {
			// Check if we have a healthy pooled connection
			const pooledConnection = this.getPooledConnection(connectionId);
			if (pooledConnection) {
				return pooledConnection.db;
			}

			// Create new connection with health check
			const healthyDb = await this.createHealthyConnection(db);
			
			// Add to pool
			this.addToPool(connectionId, healthyDb);
			
			return healthyDb;
		} catch (error) {
			console.error('Failed to get database connection:', error);
			throw new DatabaseConnectionError(
				'Unable to establish database connection',
				error instanceof Error ? error : new Error(String(error))
			);
		}
	}

	/**
	 * Execute database operation with retry logic and error handling
	 */
	async executeWithRetry<T>(
		db: D1Database,
		operation: (db: D1Database) => Promise<T>,
		operationName: string = 'database operation'
	): Promise<T> {
		let lastError: Error | null = null;
		
		for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
			try {
				const connection = await this.getConnection(db);
				const result = await this.executeWithTimeout(
					() => operation(connection),
					this.poolConfig.connectionTimeoutMs,
					`${operationName} (attempt ${attempt})`
				);
				
				// Mark connection as healthy on success
				this.markConnectionHealthy(connection);
				
				return result;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				
				console.warn(
					`${operationName} failed on attempt ${attempt}/${this.retryConfig.maxAttempts}:`,
					lastError.message
				);

				// Mark connection as unhealthy
				this.markConnectionUnhealthy(db);

				// Don't retry on validation errors or non-retryable errors
				if (this.isNonRetryableError(lastError)) {
					throw lastError;
				}

				// Wait before retry (except on last attempt)
				if (attempt < this.retryConfig.maxAttempts) {
					const delay = this.calculateRetryDelay(attempt);
					await this.sleep(delay);
				}
			}
		}

		// All attempts failed
		throw new DatabaseConnectionError(
			`${operationName} failed after ${this.retryConfig.maxAttempts} attempts`,
			lastError || undefined
		);
	}

	/**
	 * Execute operation with timeout
	 */
	private async executeWithTimeout<T>(
		operation: () => Promise<T>,
		timeoutMs: number,
		operationName: string
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new DatabaseTimeoutError(`${operationName} timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			operation()
				.then(result => {
					clearTimeout(timeout);
					resolve(result);
				})
				.catch(error => {
					clearTimeout(timeout);
					reject(error);
				});
		});
	}

	/**
	 * Check if error is non-retryable
	 */
	private isNonRetryableError(error: Error): boolean {
		// Don't retry validation errors, syntax errors, etc.
		const nonRetryablePatterns = [
			'ValidationError',
			'SQLITE_ERROR',
			'SQLITE_MISUSE',
			'syntax error',
			'constraint failed'
		];

		return nonRetryablePatterns.some(pattern => 
			error.name.includes(pattern) || error.message.toLowerCase().includes(pattern.toLowerCase())
		);
	}

	/**
	 * Calculate retry delay with exponential backoff
	 */
	private calculateRetryDelay(attempt: number): number {
		const delay = this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
		return Math.min(delay, this.retryConfig.maxDelayMs);
	}

	/**
	 * Create a healthy database connection
	 */
	private async createHealthyConnection(db: D1Database): Promise<D1Database> {
		const isHealthy = await checkDatabaseHealth(db);
		if (!isHealthy) {
			throw new DatabaseConnectionError('Database health check failed');
		}
		return db;
	}

	/**
	 * Get pooled connection if available and healthy
	 */
	private getPooledConnection(connectionId: string): PooledConnection | null {
		const connection = this.connections.get(connectionId);
		
		if (!connection || !connection.isHealthy || connection.inUse) {
			return null;
		}

		// Check if connection is not idle
		const now = Date.now();
		if (now - connection.lastUsed > this.poolConfig.idleTimeoutMs) {
			this.connections.delete(connectionId);
			return null;
		}

		// Mark as in use
		connection.inUse = true;
		connection.lastUsed = now;
		
		return connection;
	}

	/**
	 * Add connection to pool
	 */
	private addToPool(connectionId: string, db: D1Database): void {
		// Remove oldest connection if pool is full
		if (this.connections.size >= this.poolConfig.maxConnections) {
			const oldestId = Array.from(this.connections.entries())
				.filter(([, conn]) => !conn.inUse)
				.sort(([, a], [, b]) => a.lastUsed - b.lastUsed)[0]?.[0];
			
			if (oldestId) {
				this.connections.delete(oldestId);
			}
		}

		this.connections.set(connectionId, {
			db,
			lastUsed: Date.now(),
			isHealthy: true,
			inUse: false
		});
	}

	/**
	 * Mark connection as healthy
	 */
	private markConnectionHealthy(db: D1Database): void {
		for (const connection of this.connections.values()) {
			if (connection.db === db) {
				connection.isHealthy = true;
				connection.inUse = false;
				connection.lastUsed = Date.now();
				break;
			}
		}
	}

	/**
	 * Mark connection as unhealthy
	 */
	private markConnectionUnhealthy(db: D1Database): void {
		for (const [id, connection] of this.connections.entries()) {
			if (connection.db === db) {
				connection.isHealthy = false;
				connection.inUse = false;
				// Remove unhealthy connections immediately
				this.connections.delete(id);
				break;
			}
		}
	}

	/**
	 * Generate unique connection ID
	 */
	private generateConnectionId(): string {
		return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Start periodic health checks
	 */
	private startHealthChecks(): void {
		this.healthCheckInterval = setInterval(async () => {
			if (this.isShuttingDown) return;

			const now = Date.now();
			const connectionsToCheck = Array.from(this.connections.entries());

			for (const [id, connection] of connectionsToCheck) {
				// Remove idle connections
				if (now - connection.lastUsed > this.poolConfig.idleTimeoutMs) {
					this.connections.delete(id);
					continue;
				}

				// Health check active connections
				if (!connection.inUse) {
					try {
						const isHealthy = await checkDatabaseHealth(connection.db);
						if (!isHealthy) {
							this.connections.delete(id);
						} else {
							connection.isHealthy = true;
						}
					} catch (error) {
						console.warn('Health check failed for connection:', error);
						this.connections.delete(id);
					}
				}
			}
		}, this.poolConfig.healthCheckIntervalMs);
	}

	/**
	 * Shutdown connection manager
	 */
	async shutdown(): Promise<void> {
		this.isShuttingDown = true;
		
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}

		// Wait for active connections to finish (with timeout)
		const shutdownTimeout = 10000; // 10 seconds
		const startTime = Date.now();
		
		while (this.hasActiveConnections() && Date.now() - startTime < shutdownTimeout) {
			await this.sleep(100);
		}

		// Clear all connections
		this.connections.clear();
	}

	/**
	 * Check if there are active connections
	 */
	private hasActiveConnections(): boolean {
		return Array.from(this.connections.values()).some(conn => conn.inUse);
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Get connection pool statistics
	 */
	getPoolStats(): {
		totalConnections: number;
		activeConnections: number;
		healthyConnections: number;
	} {
		const connections = Array.from(this.connections.values());
		
		return {
			totalConnections: connections.length,
			activeConnections: connections.filter(conn => conn.inUse).length,
			healthyConnections: connections.filter(conn => conn.isHealthy).length
		};
	}
}