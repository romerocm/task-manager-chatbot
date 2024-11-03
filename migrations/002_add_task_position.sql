DO $migration$
BEGIN
    -- Only proceed if migration hasn't been applied
    IF NOT has_migration('002_add_task_position') THEN
        -- Add position column if it doesn't exist
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

        -- Initialize positions for each status group based on current order
        WITH indexed_tasks AS (
            SELECT 
                id, 
                status,
                ROW_NUMBER() OVER (
                    PARTITION BY status 
                    ORDER BY created_at
                ) - 1 as new_position
            FROM tasks
        )
        UPDATE tasks 
        SET position = indexed_tasks.new_position
        FROM indexed_tasks
        WHERE tasks.id = indexed_tasks.id;

        -- Record migration
        INSERT INTO schema_migrations (version) VALUES ('002_add_task_position');
    END IF;
END;
$migration$;