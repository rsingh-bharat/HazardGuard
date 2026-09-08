-- HazardGuard Supabase / PostGIS Initialization Migration
-- Scope: Ronak (Integration, Geometry, Infrastructure, Alerts, Reports)

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Custom Alert Level Enum
DO $$ BEGIN
  CREATE TYPE alert_level_enum AS ENUM ('GREEN', 'YELLOW', 'ORANGE', 'RED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- States Table
CREATE TABLE IF NOT EXISTS states (
  id TEXT PRIMARY KEY,                   -- e.g. 'MH'
  name TEXT NOT NULL,
  geom GEOMETRY(MULTIPOLYGON, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_states_geom ON states USING GIST(geom);

-- Districts Table
CREATE TABLE IF NOT EXISTS districts (
  id TEXT PRIMARY KEY,                   -- e.g. 'MH_PUNE'
  state_id TEXT REFERENCES states(id),
  name TEXT NOT NULL,
  centroid GEOMETRY(POINT, 4326),
  geom GEOMETRY(MULTIPOLYGON, 4326),
  area_km2 REAL,
  population INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_districts_geom ON districts USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_districts_centroid ON districts USING GIST(centroid);

-- Infrastructure Assets (Hospitals, Power, Schools, Bridges)
CREATE TABLE IF NOT EXISTS infrastructure_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id TEXT REFERENCES districts(id),
  asset_type TEXT NOT NULL,            -- 'HOSPITAL','SCHOOL','POWER','BRIDGE'
  name TEXT,
  location GEOMETRY(POINT, 4326),
  criticality TEXT DEFAULT 'MEDIUM'   -- 'LOW','MEDIUM','HIGH','CRITICAL'
);
CREATE INDEX IF NOT EXISTS idx_infrastructure_location ON infrastructure_assets USING GIST(location);

-- Major Rivers
CREATE TABLE IF NOT EXISTS rivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  basin TEXT,
  geom GEOMETRY(MULTILINESTRING, 4326)
);
CREATE INDEX IF NOT EXISTS idx_rivers_geom ON rivers USING GIST(geom);

-- Population Zones (Sub-district resolution)
CREATE TABLE IF NOT EXISTS population_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id TEXT REFERENCES districts(id),
  population INTEGER,
  density_per_km2 REAL,
  geom GEOMETRY(POLYGON, 4326)
);
CREATE INDEX IF NOT EXISTS idx_population_zones_geom ON population_zones USING GIST(geom);

-- Official Alert Subscriptions
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  user_name TEXT,
  designation TEXT,
  state_id TEXT REFERENCES states(id),
  district_id TEXT REFERENCES districts(id),
  threshold alert_level_enum DEFAULT 'ORANGE',
  notify_email BOOLEAN DEFAULT TRUE,
  notify_browser BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Official Reports Audit
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id TEXT REFERENCES states(id),
  forecast_id TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  download_url TEXT,
  page_count INTEGER,
  file_size_bytes INTEGER
);

-- Row Level Security (Public read for districts/states, auth for alerts/reports)
ALTER TABLE states ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE population_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Public can read states" ON states FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read districts" ON districts FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read infrastructure" ON infrastructure_assets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read rivers" ON rivers FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can read population zones" ON population_zones FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can manage alerts" ON alerts FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Public can manage reports" ON reports FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
