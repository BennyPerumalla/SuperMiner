-- ============================================
-- SEED DATA FOR DEVELOPMENT
-- All passwords are 'password123' (bcrypt hash)
-- ============================================

-- Clear existing data (order matters due to foreign keys)
TRUNCATE ventilation_shafts, inspections, incidents, users, mines, subsidiaries RESTART IDENTITY CASCADE;

-- Subsidiary
INSERT INTO subsidiaries (name) VALUES ('Coal India Northern Division');

-- Mines (with PostGIS point locations and polygon boundaries)
-- Mine 1: Jharia Coalfield area (Jharkhand, India)
INSERT INTO mines (name, company_name, subsidiary_id, status, location, boundary) VALUES (
    'Jharia Main Mine',
    'Coal India Ltd',
    1,
    'active',
    ST_SetSRID(ST_MakePoint(86.42, 23.74), 4326),
    ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
        ST_MakePoint(86.415, 23.735),
        ST_MakePoint(86.425, 23.735),
        ST_MakePoint(86.425, 23.745),
        ST_MakePoint(86.415, 23.745),
        ST_MakePoint(86.415, 23.735)
    ])), 4326)
);

-- Mine 2: Raniganj area (West Bengal, India)
INSERT INTO mines (name, company_name, subsidiary_id, status, location, boundary) VALUES (
    'Raniganj East Mine',
    'Coal India Ltd',
    1,
    'active',
    ST_SetSRID(ST_MakePoint(87.13, 23.62), 4326),
    ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY[
        ST_MakePoint(87.125, 23.615),
        ST_MakePoint(87.135, 23.615),
        ST_MakePoint(87.135, 23.625),
        ST_MakePoint(87.125, 23.625),
        ST_MakePoint(87.125, 23.615)
    ])), 4326)
);

-- Users (password: password123)
-- bcrypt hash generated with 10 salt rounds
INSERT INTO users (name, email, password_hash, role, mine_id, subsidiary_id) VALUES
    ('Ravi Kumar',    'miner@koyla.dev',         '$2b$10$HvY/UxPe8saUYBfOlbDmzubxWKD08YeFg6kqqUR/hToMnmwDLf/zG', 'ROLE_MINER',          1, 1),
    ('Suresh Patel',  'overman@koyla.dev',       '$2b$10$HvY/UxPe8saUYBfOlbDmzubxWKD08YeFg6kqqUR/hToMnmwDLf/zG', 'ROLE_OVERMAN',        1, 1),
    ('Amit Singh',    'manager@koyla.dev',       '$2b$10$HvY/UxPe8saUYBfOlbDmzubxWKD08YeFg6kqqUR/hToMnmwDLf/zG', 'ROLE_MINE_MANAGER',   1, 1),
    ('Dr. Sharma',    'inspector@dgms.gov.in',   '$2b$10$HvY/UxPe8saUYBfOlbDmzubxWKD08YeFg6kqqUR/hToMnmwDLf/zG', 'ROLE_DGMS_INSPECTOR', NULL, NULL);

-- Ventilation Shafts (for spatial proximity queries)
INSERT INTO ventilation_shafts (mine_id, name, location) VALUES
    (1, 'Jharia Shaft A', ST_SetSRID(ST_MakePoint(86.418, 23.738), 4326)),
    (1, 'Jharia Shaft B', ST_SetSRID(ST_MakePoint(86.422, 23.742), 4326)),
    (2, 'Raniganj Shaft A', ST_SetSRID(ST_MakePoint(87.130, 23.620), 4326));

-- Sample Incidents (with watermelon_ids and spatial locations)
INSERT INTO incidents (watermelon_id, mine_id, reported_by, description, severity, status, location) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 1, 1, 'Gas leak detected near shaft A ventilation duct', 'high', 'open', ST_SetSRID(ST_MakePoint(86.4185, 23.7385), 4326)),
    ('550e8400-e29b-41d4-a716-446655440002', 1, 2, 'Roof support beam showing stress fractures in section 3', 'medium', 'open', ST_SetSRID(ST_MakePoint(86.420, 23.740), 4326)),
    ('550e8400-e29b-41d4-a716-446655440003', 2, 1, 'Water seepage in tunnel B4', 'low', 'resolved', ST_SetSRID(ST_MakePoint(87.131, 23.621), 4326));

-- Sample Inspections (with watermelon_ids)
INSERT INTO inspections (watermelon_id, mine_id, inspector_id, status, notes) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', 1, 4, 'completed', 'Quarterly safety inspection. All ventilation systems operational. Minor dust control issues noted.'),
    ('660e8400-e29b-41d4-a716-446655440002', 1, 4, 'pending', 'Follow-up inspection for gas leak incident.');
