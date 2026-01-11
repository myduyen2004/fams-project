-- Ensure activity log tables have all required columns
-- Specifically addressing session and access log columns used for geolocation and user monitoring

DO $$
BEGIN
    -- Check user_sessions table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'ip_address') THEN
            ALTER TABLE user_sessions ADD COLUMN ip_address VARCHAR(45);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'province') THEN
            ALTER TABLE user_sessions ADD COLUMN province VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'city') THEN
            ALTER TABLE user_sessions ADD COLUMN city VARCHAR(100);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'latitude') THEN
            ALTER TABLE user_sessions ADD COLUMN latitude DECIMAL(10, 8);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'longitude') THEN
            ALTER TABLE user_sessions ADD COLUMN longitude DECIMAL(11, 8);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'user_agent') THEN
            ALTER TABLE user_sessions ADD COLUMN user_agent VARCHAR(500);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'is_active') THEN
            ALTER TABLE user_sessions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
    END IF;

    -- Check access_logs table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'access_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_logs' AND column_name = 'ip_address') THEN
            ALTER TABLE access_logs ADD COLUMN ip_address VARCHAR(45);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_logs' AND column_name = 'user_agent') THEN
            ALTER TABLE access_logs ADD COLUMN user_agent VARCHAR(255);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'access_logs' AND column_name = 'location') THEN
            ALTER TABLE access_logs ADD COLUMN location VARCHAR(100);
        END IF;
    END IF;
END $$;