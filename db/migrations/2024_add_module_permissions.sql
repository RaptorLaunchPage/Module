-- Migration: Add module_permissions table for role-based module access
CREATE TABLE IF NOT EXISTS module_permissions (
    id SERIAL PRIMARY KEY,
    role TEXT NOT NULL,
    module TEXT NOT NULL,
    can_access BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (role, module)
);

-- Seed initial permissions for current modules and roles
INSERT INTO module_permissions (role, module, can_access) VALUES
    ('admin', 'team_management', TRUE),
    ('admin', 'user_management', TRUE),
    ('admin', 'performance', TRUE),
    ('admin', 'profile', TRUE),
    ('manager', 'team_management', TRUE),
    ('manager', 'user_management', TRUE),
    ('manager', 'performance', TRUE),
    ('manager', 'profile', TRUE),
    ('coach', 'team_management', TRUE),
    ('coach', 'user_management', FALSE),
    ('coach', 'performance', TRUE),
    ('coach', 'profile', TRUE),
    ('player', 'team_management', FALSE),
    ('player', 'user_management', FALSE),
    ('player', 'performance', TRUE),
    ('player', 'profile', TRUE),
    ('analyst', 'team_management', FALSE),
    ('analyst', 'user_management', FALSE),
    ('analyst', 'performance', TRUE),
    ('analyst', 'profile', TRUE)
ON CONFLICT (role, module) DO NOTHING;