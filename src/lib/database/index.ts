/**
 * Database module exports
 * Main entry point for database-related functionality
 */

// Core database service
export { D1ClubDatabaseService, type ClubDatabaseService } from './clubDatabase';

// Resilient service with fallback
export { ResilientClubService, type FallbackDataProvider } from './resilientClubService';

// Connection management
export {
	DatabaseConnectionManager,
	DatabaseConnectionError,
	DatabaseTimeoutError,
	DatabaseUnavailableError
} from './connectionManager';

// Entity types
export type {
	ClubEntity,
	MeetingPointEntity,
	MeetingScheduleEntity,
	WalkingRouteEntity,
	RoutePointEntity,
	ClubWithRelationsEntity
} from './entities';

// Mapping functions
export { mapEntitiesToClubConfig, mapClubConfigToEntities } from './mappers';

// Validation
export {
	validateClubConfig,
	ValidationError,
	isValidHostname,
	isValidCoordinate,
	isValidTime,
	isValidDifficulty,
	isValidEmail,
	isValidClubId,
	sanitizeString
} from './validation';

// Database configuration
export { getDatabase, checkDatabaseHealth, DATABASE_CONFIG } from '../config/database';

// D1 Database types
export type { D1Database, D1PreparedStatement, D1Result, D1ExecResult } from './types';