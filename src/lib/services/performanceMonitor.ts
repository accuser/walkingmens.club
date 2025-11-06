/**
 * Performance monitoring service for database queries and cache operations
 * Tracks metrics, query performance, and provides optimization insights
 */

export interface QueryMetrics {
	queryType: string;
	duration: number;
	timestamp: number;
	success: boolean;
	error?: string;
	rowsAffected?: number;
	cacheHit?: boolean;
}

export interface CacheMetrics {
	operation: 'get' | 'set' | 'invalidate' | 'warmup';
	key: string;
	duration: number;
	timestamp: number;
	hit: boolean;
	size?: number;
}

export interface PerformanceStats {
	database: {
		totalQueries: number;
		avgQueryTime: number;
		slowQueries: number;
		errorRate: number;
		connectionPoolStats: {
			active: number;
			idle: number;
			total: number;
		};
	};
	cache: {
		hitRate: number;
		totalOperations: number;
		avgResponseTime: number;
		size: number;
	};
	system: {
		uptime: number;
		requestCount: number;
		avgResponseTime: number;
		errorCount: number;
	};
}

export interface SlowQuery {
	query: string;
	duration: number;
	timestamp: number;
	frequency: number;
}

/**
 * Performance monitoring configuration
 */
export interface MonitoringConfig {
	enabled: boolean;
	slowQueryThreshold: number; // milliseconds
	metricsRetentionMs: number;
	maxMetricsCount: number;
	alertThresholds: {
		slowQueryMs: number;
		errorRatePercent: number;
		cacheHitRatePercent: number;
	};
}

const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
	enabled: true,
	slowQueryThreshold: 1000, // 1 second
	metricsRetentionMs: 3600000, // 1 hour
	maxMetricsCount: 10000,
	alertThresholds: {
		slowQueryMs: 2000,
		errorRatePercent: 5,
		cacheHitRatePercent: 80
	}
};

/**
 * Performance monitoring service implementation
 */
export class PerformanceMonitoringService {
	private queryMetrics: QueryMetrics[] = [];
	private cacheMetrics: CacheMetrics[] = [];
	private systemStartTime = Date.now();
	private requestCount = 0;
	private errorCount = 0;
	private responseTimeSum = 0;
	private cleanupInterval?: NodeJS.Timeout;

	constructor(private config: MonitoringConfig = DEFAULT_MONITORING_CONFIG) {
		if (this.config.enabled) {
			this.startCleanupTimer();
		}
	}

	/**
	 * Record database query metrics
	 */
	recordQuery(metrics: Omit<QueryMetrics, 'timestamp'>): void {
		if (!this.config.enabled) return;

		const queryMetric: QueryMetrics = {
			...metrics,
			timestamp: Date.now()
		};

		this.queryMetrics.push(queryMetric);
		this.enforceMetricsLimit();

		// Log slow queries
		if (metrics.duration > this.config.slowQueryThreshold) {
			console.warn(`Slow query detected: ${metrics.queryType} took ${metrics.duration}ms`);
		}
	}

	/**
	 * Record cache operation metrics
	 */
	recordCacheOperation(metrics: Omit<CacheMetrics, 'timestamp'>): void {
		if (!this.config.enabled) return;

		const cacheMetric: CacheMetrics = {
			...metrics,
			timestamp: Date.now()
		};

		this.cacheMetrics.push(cacheMetric);
		this.enforceMetricsLimit();
	}

	/**
	 * Record system request metrics
	 */
	recordRequest(responseTime: number, isError: boolean = false): void {
		if (!this.config.enabled) return;

		this.requestCount++;
		this.responseTimeSum += responseTime;
		
		if (isError) {
			this.errorCount++;
		}
	}

	/**
	 * Get comprehensive performance statistics
	 */
	getPerformanceStats(): PerformanceStats {
		const now = Date.now();
		const recentQueries = this.getRecentMetrics(this.queryMetrics, 3600000); // Last hour
		const recentCache = this.getRecentMetrics(this.cacheMetrics, 3600000);

		// Database stats
		const totalQueries = recentQueries.length;
		const successfulQueries = recentQueries.filter(q => q.success);
		const avgQueryTime = totalQueries > 0 
			? successfulQueries.reduce((sum, q) => sum + q.duration, 0) / successfulQueries.length 
			: 0;
		const slowQueries = recentQueries.filter(q => q.duration > this.config.slowQueryThreshold).length;
		const errorRate = totalQueries > 0 ? ((totalQueries - successfulQueries.length) / totalQueries) * 100 : 0;

		// Cache stats
		const totalCacheOps = recentCache.length;
		const cacheHits = recentCache.filter(c => c.hit).length;
		const hitRate = totalCacheOps > 0 ? (cacheHits / totalCacheOps) * 100 : 0;
		const avgCacheTime = totalCacheOps > 0 
			? recentCache.reduce((sum, c) => sum + c.duration, 0) / totalCacheOps 
			: 0;

		// System stats
		const uptime = Math.floor((now - this.systemStartTime) / 1000);
		const avgResponseTime = this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0;

		return {
			database: {
				totalQueries,
				avgQueryTime: Math.round(avgQueryTime * 100) / 100,
				slowQueries,
				errorRate: Math.round(errorRate * 100) / 100,
				connectionPoolStats: {
					active: 0, // Will be populated by connection manager
					idle: 0,
					total: 0
				}
			},
			cache: {
				hitRate: Math.round(hitRate * 100) / 100,
				totalOperations: totalCacheOps,
				avgResponseTime: Math.round(avgCacheTime * 100) / 100,
				size: 0 // Will be populated by cache service
			},
			system: {
				uptime,
				requestCount: this.requestCount,
				avgResponseTime: Math.round(avgResponseTime * 100) / 100,
				errorCount: this.errorCount
			}
		};
	}

	/**
	 * Get slow query analysis
	 */
	getSlowQueries(limit: number = 10): SlowQuery[] {
		const slowQueries = this.queryMetrics
			.filter(q => q.duration > this.config.slowQueryThreshold)
			.reduce((acc, query) => {
				const existing = acc.find(sq => sq.query === query.queryType);
				if (existing) {
					existing.frequency++;
					if (query.duration > existing.duration) {
						existing.duration = query.duration;
						existing.timestamp = query.timestamp;
					}
				} else {
					acc.push({
						query: query.queryType,
						duration: query.duration,
						timestamp: query.timestamp,
						frequency: 1
					});
				}
				return acc;
			}, [] as SlowQuery[])
			.sort((a, b) => b.duration - a.duration)
			.slice(0, limit);

		return slowQueries;
	}

	/**
	 * Get performance alerts based on thresholds
	 */
	getPerformanceAlerts(): Array<{
		type: 'warning' | 'error';
		message: string;
		metric: string;
		value: number;
		threshold: number;
	}> {
		const stats = this.getPerformanceStats();
		const alerts = [];

		// Check slow queries
		if (stats.database.avgQueryTime > this.config.alertThresholds.slowQueryMs) {
			alerts.push({
				type: 'warning' as const,
				message: 'Average database query time is above threshold',
				metric: 'avgQueryTime',
				value: stats.database.avgQueryTime,
				threshold: this.config.alertThresholds.slowQueryMs
			});
		}

		// Check error rate
		if (stats.database.errorRate > this.config.alertThresholds.errorRatePercent) {
			alerts.push({
				type: 'error' as const,
				message: 'Database error rate is above threshold',
				metric: 'errorRate',
				value: stats.database.errorRate,
				threshold: this.config.alertThresholds.errorRatePercent
			});
		}

		// Check cache hit rate
		if (stats.cache.hitRate < this.config.alertThresholds.cacheHitRatePercent) {
			alerts.push({
				type: 'warning' as const,
				message: 'Cache hit rate is below threshold',
				metric: 'cacheHitRate',
				value: stats.cache.hitRate,
				threshold: this.config.alertThresholds.cacheHitRatePercent
			});
		}

		return alerts;
	}

	/**
	 * Get optimization recommendations
	 */
	getOptimizationRecommendations(): Array<{
		category: 'database' | 'cache' | 'system';
		priority: 'high' | 'medium' | 'low';
		recommendation: string;
		impact: string;
	}> {
		const stats = this.getPerformanceStats();
		const slowQueries = this.getSlowQueries(5);
		const recommendations = [];

		// Database recommendations
		if (stats.database.avgQueryTime > 500) {
			recommendations.push({
				category: 'database' as const,
				priority: 'high' as const,
				recommendation: 'Consider adding database indexes for frequently queried columns',
				impact: 'Could reduce average query time by 50-80%'
			});
		}

		if (slowQueries.length > 0) {
			recommendations.push({
				category: 'database' as const,
				priority: 'high' as const,
				recommendation: `Optimize slow queries: ${slowQueries.map(q => q.query).join(', ')}`,
				impact: 'Could improve overall system performance significantly'
			});
		}

		// Cache recommendations
		if (stats.cache.hitRate < 70) {
			recommendations.push({
				category: 'cache' as const,
				priority: 'medium' as const,
				recommendation: 'Increase cache TTL or implement cache warming strategies',
				impact: 'Could reduce database load by 30-50%'
			});
		}

		if (stats.cache.totalOperations > 0 && stats.cache.avgResponseTime > 50) {
			recommendations.push({
				category: 'cache' as const,
				priority: 'low' as const,
				recommendation: 'Consider using faster cache storage (Redis vs memory)',
				impact: 'Could improve cache response time by 20-40%'
			});
		}

		// System recommendations
		if (stats.system.avgResponseTime > 1000) {
			recommendations.push({
				category: 'system' as const,
				priority: 'high' as const,
				recommendation: 'Investigate high response times - check database and cache performance',
				impact: 'Could improve user experience significantly'
			});
		}

		return recommendations;
	}

	/**
	 * Export metrics for external analysis
	 */
	exportMetrics(): {
		queries: QueryMetrics[];
		cache: CacheMetrics[];
		system: {
			startTime: number;
			requestCount: number;
			errorCount: number;
			avgResponseTime: number;
		};
	} {
		return {
			queries: [...this.queryMetrics],
			cache: [...this.cacheMetrics],
			system: {
				startTime: this.systemStartTime,
				requestCount: this.requestCount,
				errorCount: this.errorCount,
				avgResponseTime: this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0
			}
		};
	}

	/**
	 * Clear all metrics
	 */
	clearMetrics(): void {
		this.queryMetrics = [];
		this.cacheMetrics = [];
		this.requestCount = 0;
		this.errorCount = 0;
		this.responseTimeSum = 0;
		this.systemStartTime = Date.now();
	}

	/**
	 * Update connection pool stats (called by connection manager)
	 */
	updateConnectionPoolStats(stats: { active: number; idle: number; total: number }): void {
		// Store for inclusion in performance stats
		this.connectionPoolStats = stats;
	}

	/**
	 * Update cache size (called by cache service)
	 */
	updateCacheSize(size: number): void {
		this.cacheSize = size;
	}

	private connectionPoolStats = { active: 0, idle: 0, total: 0 };
	private cacheSize = 0;

	/**
	 * Get recent metrics within time window
	 */
	private getRecentMetrics<T extends { timestamp: number }>(metrics: T[], windowMs: number): T[] {
		const cutoff = Date.now() - windowMs;
		return metrics.filter(m => m.timestamp > cutoff);
	}

	/**
	 * Enforce maximum metrics count
	 */
	private enforceMetricsLimit(): void {
		if (this.queryMetrics.length > this.config.maxMetricsCount) {
			this.queryMetrics = this.queryMetrics.slice(-Math.floor(this.config.maxMetricsCount * 0.8));
		}
		if (this.cacheMetrics.length > this.config.maxMetricsCount) {
			this.cacheMetrics = this.cacheMetrics.slice(-Math.floor(this.config.maxMetricsCount * 0.8));
		}
	}

	/**
	 * Start cleanup timer for old metrics
	 */
	private startCleanupTimer(): void {
		this.cleanupInterval = setInterval(() => {
			const cutoff = Date.now() - this.config.metricsRetentionMs;
			this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoff);
			this.cacheMetrics = this.cacheMetrics.filter(m => m.timestamp > cutoff);
		}, 300000); // Clean up every 5 minutes
	}

	/**
	 * Shutdown monitoring service
	 */
	shutdown(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitoringService();