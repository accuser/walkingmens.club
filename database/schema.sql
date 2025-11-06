-- Walking Mens Club Database Schema
-- Cloudflare D1 Database Schema for Club Management System

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

-- Indexes for performance optimization
CREATE INDEX idx_clubs_hostname ON clubs(hostname);
CREATE INDEX idx_meeting_points_club_id ON meeting_points(club_id);
CREATE INDEX idx_meeting_schedules_club_id ON meeting_schedules(club_id);
CREATE INDEX idx_walking_routes_club_id ON walking_routes(club_id);
CREATE INDEX idx_route_points_route_id ON route_points(route_id);
CREATE INDEX idx_route_points_route_sequence ON route_points(route_id, sequence_order);