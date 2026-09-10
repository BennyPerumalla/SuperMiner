-- =============================================================
-- PostgreSQL initialization script
-- Runs once when the container is first created.
-- =============================================================

-- PostGIS: Spatial data types, functions, and GiST indexing.
-- Required for mine boundaries (Polygon), incident locations (Point),
-- and proximity queries (ST_DWithin).
CREATE EXTENSION IF NOT EXISTS postgis;

-- uuid-ossp: UUID generation functions.
-- We use uuid_generate_v4() as DEFAULT for primary keys so that
-- if a record is created server-side (not from mobile), it still
-- gets a UUID automatically.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- Create the test database with the same extensions.
-- Integration tests use a separate database to avoid polluting
-- development data.
-- =============================================================
CREATE DATABASE koyla_chain_test;
\c koyla_chain_test;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
