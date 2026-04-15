-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Cameras Table
CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT,
    lat FLOAT,
    long FLOAT,
    live_link TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE,
    last_inactive_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Encounters Table
CREATE TABLE IF NOT EXISTS encounters (
    id SERIAL PRIMARY KEY,
    cam_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
    count INTEGER DEFAULT 0,
    direction TEXT,
    alert_id INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    cam_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'Elephant Detection',
    severity TEXT DEFAULT 'CRITICAL',
    is_active BOOLEAN DEFAULT TRUE,
    count INTEGER DEFAULT 1,
    direction TEXT DEFAULT 'unknown',
    url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Recordings Table
CREATE TABLE IF NOT EXISTS recordings (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    cam_id INTEGER REFERENCES cameras(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    duration_secs INTEGER,
    count INTEGER,
    direction TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
