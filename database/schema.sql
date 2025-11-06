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

-- Admin users table for authentication
CREATE TABLE admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

-- Admin sessions table for session management
CREATE TABLE admin_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Login attempts table for rate limiting and security
CREATE TABLE login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    success INTEGER NOT NULL DEFAULT 0, -- 0 for failed, 1 for successful
    ip_address TEXT,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_clubs_hostname ON clubs(hostname);
CREATE INDEX idx_meeting_points_club_id ON meeting_points(club_id);
CREATE INDEX idx_meeting_schedules_club_id ON meeting_schedules(club_id);
CREATE INDEX idx_walking_routes_club_id ON walking_routes(club_id);
CREATE INDEX idx_route_points_route_id ON route_points(route_id);
CREATE INDEX idx_route_points_route_sequence ON route_points(route_id, sequence_order);

-- Authentication indexes
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);