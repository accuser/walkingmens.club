# Design Document

## Overview

This design migrates the club configuration system from static JSON files to Cloudflare D1 database storage, implementing a complete admin interface for dynamic club management. The solution leverages Cloudflare's edge infrastructure for optimal performance while maintaining full API compatibility with the existing system.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin UI      │    │   SvelteKit App  │    │  Club Websites  │
│   /admin/*      │    │   (Main App)     │    │  *.walkingmens  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │  Club Service    │
                    │  (Data Layer)    │
                    └──────────────────┘
                                 │
                    ┌──────────────────┐
                    │  Cloudflare D1   │
                    │   Database       │
                    └──────────────────┘
```

### Database Schema

The D1 database will use a normalized schema to store club configurations:

```sql
-- Main clubs table
CREATE TABLE clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    hostname TEXT UNIQUE NOT NULL,
    description TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Meeting points table
CREATE TABLE meeting_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    postcode TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    what3words TEXT,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Meeting schedules table
CREATE TABLE meeting_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id TEXT NOT NULL,
    day TEXT NOT NULL,
    time TEXT NOT NULL,
    frequency TEXT,
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Walking routes table
CREATE TABLE walking_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    distance TEXT,
    duration TEXT,
    difficulty TEXT CHECK (difficulty IN ('easy', 'moderate', 'challenging')),
    FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE
);

-- Route points table
CREATE TABLE route_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    sequence_order INTEGER NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    FOREIGN KEY (route_id) REFERENCES walking_routes(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_clubs_hostname ON clubs(hostname);
CREATE INDEX idx_route_points_route_sequence ON route_points(route_id, sequence_order);
```

## Components and Interfaces

### 1. Database Service Layer

**File: `src/lib/services/clubDatabase.ts`**

```typescript
export interface ClubDatabaseService {
	// Club CRUD operations
	getClubByHostname(hostname: string): Promise<ClubConfig | null>;
	getAllClubs(): Promise<ClubConfig[]>;
	createClub(club: Omit<ClubConfig, 'id'>): Promise<ClubConfig>;
	updateClub(id: string, club: Partial<ClubConfig>): Promise<ClubConfig>;
	deleteClub(id: string): Promise<void>;

	// Utility methods
	validateHostname(hostname: string): Promise<boolean>;
	migrateStaticData(): Promise<void>;
}
```

### 2. Cache Layer

**File: `src/lib/services/clubCache.ts`**

```typescript
export interface ClubCacheService {
	get(key: string): Promise<ClubConfig | null>;
	set(key: string, club: ClubConfig, ttl?: number): Promise<void>;
	invalidate(key: string): Promise<void>;
	invalidateAll(): Promise<void>;
}
```

### 3. Admin API Routes

**File: `src/routes/api/admin/clubs/+server.ts`**

```typescript
// GET /api/admin/clubs - List all clubs
// POST /api/admin/clubs - Create new club
// PUT /api/admin/clubs/[id] - Update club
// DELETE /api/admin/clubs/[id] - Delete club
```

### 4. Admin UI Components

**File: `src/routes/admin/+layout.svelte`**

- Authentication wrapper
- Admin navigation
- Permission checks

**File: `src/routes/admin/clubs/+page.svelte`**

- Club list with search/filter
- Quick actions (edit, delete, view)

**File: `src/routes/admin/clubs/new/+page.svelte`**

- Club creation form
- Hostname validation
- Route point editor

**File: `src/routes/admin/clubs/[id]/edit/+page.svelte`**

- Club editing form
- Route visualization
- Delete confirmation

## Data Models

### Enhanced ClubConfig Interface

The existing `ClubConfig` interface will be extended to support database operations:

```typescript
export interface ClubConfigWithMeta extends ClubConfig {
	createdAt: Date;
	updatedAt: Date;
}

export interface ClubFormData {
	name: string;
	location: string;
	hostname: string;
	description?: string;
	meetingPoint: MeetingPoint;
	schedule: MeetingSchedule;
	route: WalkingRoute;
	contact?: {
		email?: string;
		phone?: string;
	};
}
```

### Database Entity Mapping

```typescript
export interface ClubEntity {
	id: string;
	name: string;
	location: string;
	hostname: string;
	description?: string;
	contact_email?: string;
	contact_phone?: string;
	created_at: string;
	updated_at: string;
}

export interface MeetingPointEntity {
	id: number;
	club_id: string;
	name: string;
	address: string;
	postcode: string;
	lat: number;
	lng: number;
	what3words?: string;
}
```

## Error Handling

### Database Connection Failures

1. **Retry Logic**: Implement exponential backoff for transient failures
2. **Circuit Breaker**: Prevent cascading failures during outages
3. **Fallback Cache**: Serve stale data when database is unavailable
4. **Graceful Degradation**: Disable admin features during outages

### Validation Errors

1. **Hostname Uniqueness**: Check before creation/update
2. **Required Fields**: Validate all mandatory club configuration fields
3. **Route Points**: Ensure minimum 2 points for valid routes
4. **Coordinate Validation**: Verify lat/lng are within valid ranges

### Admin Interface Errors

1. **Form Validation**: Real-time validation with clear error messages
2. **Network Errors**: Retry mechanisms with user feedback
3. **Permission Errors**: Clear messaging for unauthorized access
4. **Conflict Resolution**: Handle concurrent edits gracefully

## Testing Strategy

### Unit Tests

1. **Database Service**: Test CRUD operations with mock D1 database
2. **Cache Service**: Test cache hit/miss scenarios and TTL behavior
3. **Data Transformation**: Test entity-to-model mapping functions
4. **Validation Logic**: Test hostname uniqueness and field validation

### Integration Tests

1. **API Endpoints**: Test admin API routes with real database
2. **Migration Scripts**: Test static data migration accuracy
3. **Cache Integration**: Test database-cache consistency
4. **Error Scenarios**: Test fallback mechanisms and error handling

### End-to-End Tests

1. **Admin Workflow**: Test complete club creation/editing flow
2. **Subdomain Routing**: Test club website access via subdomains
3. **Performance**: Test response times under load
4. **Backup/Restore**: Test data recovery procedures

## Performance Considerations

### Caching Strategy

1. **Edge Caching**: Cache club configs at Cloudflare edge locations
2. **TTL Management**: 1-hour TTL for club data, immediate invalidation on updates
3. **Warm Cache**: Pre-populate cache with frequently accessed clubs
4. **Cache Keys**: Use hostname-based keys for efficient lookups

### Database Optimization

1. **Connection Pooling**: Reuse D1 connections across requests
2. **Query Optimization**: Use prepared statements and proper indexing
3. **Batch Operations**: Group related database operations
4. **Read Replicas**: Leverage D1's built-in replication for read scaling

### Frontend Optimization

1. **Lazy Loading**: Load admin components only when needed
2. **Form Debouncing**: Reduce validation API calls during typing
3. **Optimistic Updates**: Update UI before server confirmation
4. **Progressive Enhancement**: Ensure basic functionality without JavaScript

## Security Considerations

### Authentication & Authorization

1. **Admin Access**: Implement secure authentication for admin routes
2. **Session Management**: Use secure, httpOnly cookies
3. **CSRF Protection**: Implement CSRF tokens for state-changing operations
4. **Rate Limiting**: Prevent abuse of admin API endpoints

### Data Protection

1. **Input Sanitization**: Sanitize all user inputs to prevent XSS
2. **SQL Injection**: Use parameterized queries exclusively
3. **Data Validation**: Validate all data at API boundaries
4. **Audit Logging**: Log all admin actions for accountability

### Infrastructure Security

1. **Environment Variables**: Store sensitive config in Cloudflare secrets
2. **HTTPS Only**: Enforce HTTPS for all admin operations
3. **IP Restrictions**: Consider IP allowlisting for admin access
4. **Database Access**: Restrict D1 access to application only

## Migration Plan

### Phase 1: Database Setup

1. Create D1 database and tables
2. Implement database service layer
3. Create migration script for existing data

### Phase 2: API Compatibility

1. Update existing club service to use database
2. Implement caching layer
3. Ensure backward compatibility

### Phase 3: Admin Interface

1. Create admin authentication
2. Build club management UI
3. Implement admin API endpoints

### Phase 4: Testing & Deployment

1. Comprehensive testing
2. Performance optimization
3. Production deployment with rollback plan
