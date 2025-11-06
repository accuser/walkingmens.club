/**
 * Database configuration and constants for Cloudflare D1
 */

export const DATABASE_CONFIG = {
	// Database binding name (matches wrangler.jsonc)
	BINDING_NAME: 'DB',

	// Table names
	TABLES: {
		CLUBS: 'clubs',
		MEETING_POINTS: 'meeting_points',
		MEETING_SCHEDULES: 'meeting_schedules',
		WALKING_ROUTES: 'walking_routes',
		ROUTE_POINTS: 'route_points'
	},

	// Cache configuration
	CACHE: {
		TTL_SECONDS: 3600, // 1 hour
		CLUB_KEY_PREFIX: 'club:',
		ALL_CLUBS_KEY: 'clubs:all'
	},

	// Database constraints
	CONSTRAINTS: {
		MAX_ROUTE_POINTS: 100,
		MIN_ROUTE_POINTS: 2,
		DIFFICULTY_LEVELS: ['easy', 'moderate', 'challenging'] as const
	}
} as const;

/**
 * Get database instance from platform environment
 */
export function getDatabase(platform: App.Platform | undefined) {
	if (!platform?.env?.DB) {
		throw new Error(
			'Database binding not available. Ensure D1 database is configured in wrangler.jsonc'
		);
	}
	return platform.env.DB;
}

/**
 * Database connection health check
 */
export async function checkDatabaseHealth(db: any): Promise<boolean> {
	try {
		const result = await db.prepare('SELECT 1 as health_check').first();
		return result?.health_check === 1;
	} catch (error) {
		console.error('Database health check failed:', error);
		return false;
	}
}
