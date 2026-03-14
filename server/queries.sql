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
    url TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Camera Data (Based on config.py)
INSERT INTO cameras (id, name, live_link, is_active) VALUES
(14, 'Cam 14', 'https://www.ttspl.live:8080/hls/cam14.m3u8', TRUE),
(15, 'Cam 15', 'https://www.ttspl.live:8080/hls/cam15.m3u8', TRUE),
(16, 'Cam 16', 'https://www.ttspl.live:8080/hls/cam16.m3u8', TRUE),
(17, 'Cam 17', 'https://www.ttspl.live:8080/hls/cam17.m3u8', TRUE),
(18, 'Cam 18', 'https://www.ttspl.live:8080/hls/cam18.m3u8', TRUE),
(19, 'Cam 19', 'https://www.ttspl.live:8080/hls/cam19.m3u8', TRUE),
(6, 'Cam 6', 'https://www.ttspl.live:8080/hls/cam6.m3u8', TRUE)
ON CONFLICT (id) DO NOTHING;
