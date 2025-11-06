# Database Setup

This directory contains the database schema and migration files for the Walking Mens Club management system using Cloudflare D1.

## Files

- `schema.sql` - Complete database schema with all tables and indexes
- `migrations/` - Directory containing migration files for version control
- `0001_initial_schema.sql` - Initial database schema migration

## Setup Instructions

### 1. Create D1 Database

First, create the D1 database using Wrangler CLI:

```bash
# Create the database
npx wrangler d1 create walking-mens-club-db

# This will output a database ID that you need to update in wrangler.jsonc
```

### 2. Update wrangler.jsonc

Replace the `placeholder-database-id` in `wrangler.jsonc` with the actual database ID from step 1.

### 3. Apply Schema

Apply the database schema:

```bash
# Apply the initial schema
npx wrangler d1 execute walking-mens-club-db --file=./database/schema.sql

# Or apply migrations individually
npx wrangler d1 execute walking-mens-club-db --file=./database/migrations/0001_initial_schema.sql
```

### 4. Local Development

For local development, you can use the local D1 database:

```bash
# Apply schema to local database
npx wrangler d1 execute walking-mens-club-db --local --file=./database/schema.sql
```

## Database Schema

The database consists of the following tables:

- `clubs` - Main club configurations
- `meeting_points` - Club meeting point details
- `meeting_schedules` - Meeting schedule information
- `walking_routes` - Walking route definitions
- `route_points` - Individual points that make up walking routes

All tables include appropriate foreign key constraints and performance indexes.
