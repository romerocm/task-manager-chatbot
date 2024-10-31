-- migrations/001_initial_schema.sql

-- Create migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Function to check if a migration has been applied
CREATE OR REPLACE FUNCTION has_migration(v TEXT) RETURNS BOOLEAN 
LANGUAGE plpgsql AS $func$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM schema_migrations WHERE version = v
    );
END;
$func$;

DO $migration$
BEGIN
    -- Only proceed if migration hasn't been applied
    IF NOT has_migration('001_initial_schema') THEN
        -- Create users table
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE,
            avatar_url VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Create tasks table
        CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'todo',
            priority VARCHAR(50) NOT NULL,
            estimated_time INTEGER,
            assignee_id INTEGER REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Create update timestamp function
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER 
        LANGUAGE plpgsql AS $trigger$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $trigger$;

        -- Create trigger
        DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
        CREATE TRIGGER update_tasks_updated_at
            BEFORE UPDATE ON tasks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

        -- Insert initial users
        INSERT INTO users (name, email, avatar_url)
        VALUES 
            ('Carlos Romero', 'carlos@chefcats.com', '/api/placeholder/32/32'),
            ('Ricardo Gallegos', 'ricardo@chefcats.com', '/api/placeholder/32/32'),
            ('Mauricio Moreno', 'mauricio@chefcats.com', '/api/placeholder/32/32')
        ON CONFLICT (email) DO NOTHING;

        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');
    END IF;
END;
$migration$;