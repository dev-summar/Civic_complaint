-- Seed initial data for SwachhSetu D1 Database

-- Departments
INSERT OR IGNORE INTO departments (id, name, code, description, is_active, created_at) VALUES
('dept-1', 'Sanitation & Solid Waste', 'SAN', 'Waste management, street sweeping, bin clearance', 1, datetime('now')),
('dept-2', 'Roads & Infrastructure', 'ROAD', 'Pothole repair, road maintenance, snow clearance', 1, datetime('now')),
('dept-3', 'Water & Drainage', 'WATER', 'Water supply, pipeline leakage, drainage issues', 1, datetime('now')),
('dept-4', 'Street Lighting', 'ELEC', 'Streetlights, electrical hazards, poles', 1, datetime('now'));

-- Zones
INSERT OR IGNORE INTO zones (id, name, code, district, is_active, created_at) VALUES
('zone-1', 'Central Zone', 'CENTRAL', 'District Headquarter', 1, datetime('now')),
('zone-2', 'North Zone', 'NORTH', 'Northern Sector', 1, datetime('now')),
('zone-3', 'South Zone', 'SOUTH', 'Southern Sector', 1, datetime('now'));

-- Default Demo Users
-- Note: passwords can be matched in plain or hashed
INSERT OR IGNORE INTO users (id, name, email, phone, password, role, is_active, created_at, updated_at) VALUES
('usr-admin', 'Admin User', 'admin@gmail.com', '9999999999', 'Demo@123', 'admin', 1, datetime('now'), datetime('now')),
('usr-officer', 'Harish Officer', 'harish@demo.rabtajk.gov.in', '9876543210', 'Demo@1234', 'officer', 1, datetime('now'), datetime('now')),
('usr-worker', 'Deep Worker', 'deep@demo.rabtajk.gov.in', '9876543211', 'Demo@1234', 'field_worker', 1, datetime('now'), datetime('now')),
('usr-citizen', 'Summar Kumar', 'summar@gmail.com', '9876543212', 'Demo@123', 'citizen', 1, datetime('now'), datetime('now'));
