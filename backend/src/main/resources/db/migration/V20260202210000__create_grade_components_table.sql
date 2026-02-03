-- ===========================================================
-- GRADE_COMPONENTS TABLE - CREATE OR ALTER
-- Created: 2026-02-02 21:00:00
-- Handles both new databases and existing databases
-- ===========================================================

-- 1. Add missing columns if table already exists
DO $$ 
BEGIN
    -- Add description column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grade_components')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_components' AND column_name = 'description') THEN
        ALTER TABLE grade_components ADD COLUMN description TEXT;
    END IF;
    
    -- Add is_resit column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grade_components')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_components' AND column_name = 'is_resit') THEN
        ALTER TABLE grade_components ADD COLUMN is_resit BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    
    -- Add reference_component_id column
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grade_components')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_components' AND column_name = 'reference_component_id') THEN
        ALTER TABLE grade_components ADD COLUMN reference_component_id BIGINT;
    END IF;
    
    -- Drop quantity column if exists (no longer used)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'grade_components' AND column_name = 'quantity') THEN
        ALTER TABLE grade_components DROP COLUMN quantity;
    END IF;
END $$;

-- 2. Create table if not exists (for new databases)
CREATE TABLE IF NOT EXISTS grade_components (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    weight DOUBLE PRECISION NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_resit BOOLEAN NOT NULL DEFAULT FALSE,
    reference_component_id BIGINT,
    course_id BIGINT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Add foreign keys if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_grade_component_course' 
        AND table_name = 'grade_components'
    ) THEN
        ALTER TABLE grade_components 
        ADD CONSTRAINT fk_grade_component_course 
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_grade_component_reference' 
        AND table_name = 'grade_components'
    ) THEN
        ALTER TABLE grade_components 
        ADD CONSTRAINT fk_grade_component_reference 
        FOREIGN KEY (reference_component_id) REFERENCES grade_components(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_grade_component_course ON grade_components (course_id);

CREATE INDEX IF NOT EXISTS idx_grade_component_type ON grade_components(type);

CREATE INDEX IF NOT EXISTS idx_grade_component_resit ON grade_components (is_resit);