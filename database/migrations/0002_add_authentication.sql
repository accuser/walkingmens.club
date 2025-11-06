-- Migration: Add authentication tables
-- Date: 2024-11-06
-- Description: Add admin users, sessions, and login attempts tables for authentication

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

-- Authentication indexes
CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions(expires_at);
CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);