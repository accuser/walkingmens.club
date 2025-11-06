/**
 * Database query optimization service
 * Provides query analysis, indexing recommendations, and performance optimization
 */

import type { D1Database } from '../database/types';

export interface QueryAnalysis {
	query: string;
	executionPlan: string;
	estimatedCost: number;
	indexUsage: string[];
	recommendations: string[];
	optimizedQuery?: string;
}

export interface IndexRecommendation {
	table: string;
	columns: string[];
	type: 'single' | 'composite' | 'unique';
	reason: string;
	estimatedImprovement: string;
	createStatement: string;
}

export interface QueryOptimizationResult {
	originalQuery: string;
	optimizedQuery: string;
	improvements: string[];
	estimatedSpeedup: number;
}

/**
 * Query optimization service for D1 database
 */
export class QueryOptimizerService {
	constructor(private db: D1Database) {}

	/**
	 * Analyze query performance and provide optimization recommendations
	 */
	async analyzeQuery(query: string): Promise<QueryAnalysis> {
		try {
			// Get query execution plan
			const explainQuery = `EXPLAIN QUERY PLAN ${query}`;
			const planResult = await this.db.prepare(explainQuery).all();
			
			const executionPlan = planResult.results
				?.map((row: any) => `${row.detail || row.notused || 'N/A'}`)
				.join('\n') || 'No execution plan available';

			// Analyze the plan for optimization opportunities
			const analysis = this.analyzeExecutionPlan(executionPlan, query);

			return {
				query,
				executionPlan,
				estimatedCost: analysis.cost,
				indexUsage: analysis.indexUsage,
				recommendations: analysis.recommendations,
				optimizedQuery: analysis.optimizedQuery
			};
		} catch (error) {
			console.error('Query analysis failed:', error);
			return {
				query,
				executionPlan: 'Analysis failed',
				estimatedCost: -1,
				indexUsage: [],
				recommendations: ['Query analysis failed - check syntax'],
				optimizedQuery: undefined
			};
		}
	}

	/**
	 * Get index recommendations based on query patterns
	 */
	async getIndexRecommendations(): Promise<IndexRecommendation[]> {
		const recommendations: IndexRecommendation[] = [];

		try {
			// Check existing indexes
			const existingIndexes = await this.getExistingIndexes();
			
			// Analyze common query patterns and recommend indexes
			const commonQueries = [
				'SELECT * FROM clubs WHERE hostname = ?',
				'SELECT * FROM meeting_points WHERE club_id = ?',
				'SELECT * FROM walking_routes WHERE club_id = ?',
				'SELECT * FROM route_points WHERE route_id = ? ORDER BY sequence_order'
			];

			for (const query of commonQueries) {
				const analysis = await this.analyzeQuery(query);
				const tableRecommendations = this.generateIndexRecommendations(
					analysis, 
					existingIndexes
				);
				recommendations.push(...tableRecommendations);
			}

			// Add performance-critical indexes
			recommendations.push(...this.getCriticalIndexRecommendations(existingIndexes));

			return recommendations;
		} catch (error) {
			console.error('Failed to generate index recommendations:', error);
			return [];
		}
	}

	/**
	 * Optimize a specific query
	 */
	optimizeQuery(query: string): QueryOptimizationResult {
		const improvements: string[] = [];
		let optimizedQuery = query;
		let estimatedSpeedup = 1.0;

		// Remove unnecessary SELECT *
		if (query.includes('SELECT *')) {
			const specificColumns = this.getSpecificColumns(query);
			if (specificColumns) {
				optimizedQuery = optimizedQuery.replace('SELECT *', `SELECT ${specificColumns}`);
				improvements.push('Replaced SELECT * with specific columns');
				estimatedSpeedup *= 1.2;
			}
		}

		// Add LIMIT if missing for potentially large result sets
		if (!query.toUpperCase().includes('LIMIT') && 
			(query.includes('clubs') || query.includes('meeting_points'))) {
			// Only suggest LIMIT for queries that might return many rows
			improvements.push('Consider adding LIMIT clause for large result sets');
		}

		// Optimize WHERE clauses
		const whereOptimization = this.optimizeWhereClause(query);
		if (whereOptimization.optimized !== query) {
			optimizedQuery = whereOptimization.optimized;
			improvements.push(...whereOptimization.improvements);
			estimatedSpeedup *= whereOptimization.speedup;
		}

		// Optimize JOINs
		const joinOptimization = this.optimizeJoins(optimizedQuery);
		if (joinOptimization.optimized !== optimizedQuery) {
			optimizedQuery = joinOptimization.optimized;
			improvements.push(...joinOptimization.improvements);
			estimatedSpeedup *= joinOptimization.speedup;
		}

		return {
			originalQuery: query,
			optimizedQuery,
			improvements,
			estimatedSpeedup: Math.round(estimatedSpeedup * 100) / 100
		};
	}

	/**
	 * Create recommended indexes
	 */
	async createRecommendedIndexes(recommendations: IndexRecommendation[]): Promise<{
		created: string[];
		failed: Array<{ index: string; error: string }>;
	}> {
		const created: string[] = [];
		const failed: Array<{ index: string; error: string }> = [];

		for (const rec of recommendations) {
			try {
				await this.db.prepare(rec.createStatement).run();
				created.push(`${rec.table}(${rec.columns.join(', ')})`);
			} catch (error) {
				failed.push({
					index: `${rec.table}(${rec.columns.join(', ')})`,
					error: error instanceof Error ? error.message : String(error)
				});
			}
		}

		return { created, failed };
	}

	/**
	 * Get database statistics for optimization
	 */
	async getDatabaseStats(): Promise<{
		tableStats: Array<{
			table: string;
			rowCount: number;
			indexCount: number;
			avgRowSize: number;
		}>;
		queryStats: {
			slowQueries: number;
			avgQueryTime: number;
			mostFrequentTables: string[];
		};
	}> {
		try {
			const tables = ['clubs', 'meeting_points', 'meeting_schedules', 'walking_routes', 'route_points'];
			const tableStats = [];

			for (const table of tables) {
				const countResult = await this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
				const indexResult = await this.db.prepare(
					`SELECT COUNT(*) as count FROM sqlite_master WHERE type='index' AND tbl_name=?`
				).bind(table).first();

				tableStats.push({
					table,
					rowCount: (countResult as any)?.count || 0,
					indexCount: (indexResult as any)?.count || 0,
					avgRowSize: 0 // SQLite doesn't provide this easily
				});
			}

			return {
				tableStats,
				queryStats: {
					slowQueries: 0, // Would come from performance monitor
					avgQueryTime: 0, // Would come from performance monitor
					mostFrequentTables: ['clubs', 'meeting_points', 'walking_routes']
				}
			};
		} catch (error) {
			console.error('Failed to get database stats:', error);
			return {
				tableStats: [],
				queryStats: {
					slowQueries: 0,
					avgQueryTime: 0,
					mostFrequentTables: []
				}
			};
		}
	}

	/**
	 * Analyze execution plan for optimization opportunities
	 */
	private analyzeExecutionPlan(plan: string, query: string): {
		cost: number;
		indexUsage: string[];
		recommendations: string[];
		optimizedQuery?: string;
	} {
		const recommendations: string[] = [];
		const indexUsage: string[] = [];
		let cost = 1;

		// Check for table scans
		if (plan.includes('SCAN TABLE')) {
			cost += 10;
			recommendations.push('Query performs full table scan - consider adding index');
		}

		// Check for index usage
		const indexMatches = plan.match(/USING INDEX (\w+)/g);
		if (indexMatches) {
			indexUsage.push(...indexMatches.map(match => match.replace('USING INDEX ', '')));
		} else if (query.includes('WHERE')) {
			recommendations.push('WHERE clause not using index - consider adding appropriate index');
		}

		// Check for sorting
		if (plan.includes('USE TEMP B-TREE FOR ORDER BY')) {
			cost += 5;
			recommendations.push('Query requires temporary sorting - consider adding index on ORDER BY columns');
		}

		return {
			cost,
			indexUsage,
			recommendations
		};
	}

	/**
	 * Get existing database indexes
	 */
	private async getExistingIndexes(): Promise<Array<{
		name: string;
		table: string;
		columns: string[];
		unique: boolean;
	}>> {
		try {
			const result = await this.db.prepare(
				`SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`
			).all();

			return (result.results || []).map((row: any) => ({
				name: row.name,
				table: row.tbl_name,
				columns: this.parseIndexColumns(row.sql),
				unique: row.sql?.includes('UNIQUE') || false
			}));
		} catch (error) {
			console.error('Failed to get existing indexes:', error);
			return [];
		}
	}

	/**
	 * Parse index columns from CREATE INDEX statement
	 */
	private parseIndexColumns(sql: string): string[] {
		if (!sql) return [];
		
		const match = sql.match(/\(([^)]+)\)/);
		if (!match) return [];
		
		return match[1].split(',').map(col => col.trim().replace(/["`]/g, ''));
	}

	/**
	 * Generate index recommendations based on query analysis
	 */
	private generateIndexRecommendations(
		analysis: QueryAnalysis, 
		existingIndexes: Array<{ name: string; table: string; columns: string[] }>
	): IndexRecommendation[] {
		const recommendations: IndexRecommendation[] = [];
		
		// Extract table and WHERE conditions from query
		const tableMatch = analysis.query.match(/FROM\s+(\w+)/i);
		const table = tableMatch?.[1];
		
		if (!table) return recommendations;

		// Check for WHERE clause columns that need indexing
		const whereMatch = analysis.query.match(/WHERE\s+(\w+)\s*=/i);
		const whereColumn = whereMatch?.[1];
		
		if (whereColumn) {
			const hasIndex = existingIndexes.some(idx => 
				idx.table === table && idx.columns.includes(whereColumn)
			);
			
			if (!hasIndex) {
				recommendations.push({
					table,
					columns: [whereColumn],
					type: 'single',
					reason: `Improve WHERE clause performance on ${whereColumn}`,
					estimatedImprovement: '50-80% faster queries',
					createStatement: `CREATE INDEX idx_${table}_${whereColumn} ON ${table}(${whereColumn})`
				});
			}
		}

		return recommendations;
	}

	/**
	 * Get critical index recommendations for performance
	 */
	private getCriticalIndexRecommendations(
		existingIndexes: Array<{ name: string; table: string; columns: string[] }>
	): IndexRecommendation[] {
		const recommendations: IndexRecommendation[] = [];
		
		const criticalIndexes = [
			{
				table: 'clubs',
				columns: ['hostname'],
				reason: 'Critical for subdomain routing performance'
			},
			{
				table: 'meeting_points',
				columns: ['club_id'],
				reason: 'Foreign key lookup optimization'
			},
			{
				table: 'meeting_schedules',
				columns: ['club_id'],
				reason: 'Foreign key lookup optimization'
			},
			{
				table: 'walking_routes',
				columns: ['club_id'],
				reason: 'Foreign key lookup optimization'
			},
			{
				table: 'route_points',
				columns: ['route_id', 'sequence_order'],
				reason: 'Optimize route point ordering'
			}
		];

		for (const critical of criticalIndexes) {
			const hasIndex = existingIndexes.some(idx => 
				idx.table === critical.table && 
				critical.columns.every(col => idx.columns.includes(col))
			);
			
			if (!hasIndex) {
				const indexName = `idx_${critical.table}_${critical.columns.join('_')}`;
				recommendations.push({
					table: critical.table,
					columns: critical.columns,
					type: critical.columns.length > 1 ? 'composite' : 'single',
					reason: critical.reason,
					estimatedImprovement: '2-5x faster queries',
					createStatement: `CREATE INDEX ${indexName} ON ${critical.table}(${critical.columns.join(', ')})`
				});
			}
		}

		return recommendations;
	}

	/**
	 * Get specific columns for SELECT optimization
	 */
	private getSpecificColumns(query: string): string | null {
		// This is a simplified implementation
		// In practice, you'd analyze the query context to determine needed columns
		if (query.includes('clubs')) {
			return 'id, name, hostname, location';
		}
		return null;
	}

	/**
	 * Optimize WHERE clause
	 */
	private optimizeWhereClause(query: string): {
		optimized: string;
		improvements: string[];
		speedup: number;
	} {
		let optimized = query;
		const improvements: string[] = [];
		let speedup = 1.0;

		// Convert LIKE to = when possible
		const likePattern = /WHERE\s+(\w+)\s+LIKE\s+'([^%_]+)'/gi;
		if (likePattern.test(query)) {
			optimized = optimized.replace(likePattern, "WHERE $1 = '$2'");
			improvements.push('Converted LIKE to equality comparison');
			speedup *= 1.3;
		}

		return { optimized, improvements, speedup };
	}

	/**
	 * Optimize JOIN operations
	 */
	private optimizeJoins(query: string): {
		optimized: string;
		improvements: string[];
		speedup: number;
	} {
		// For this implementation, we'll return the query as-is
		// In practice, you'd analyze JOIN order and conditions
		return {
			optimized: query,
			improvements: [],
			speedup: 1.0
		};
	}
}