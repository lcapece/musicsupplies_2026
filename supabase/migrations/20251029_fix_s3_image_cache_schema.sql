-- Fix s3_image_cache table schema issues
-- This migration addresses column name mismatches and missing columns

-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS s3_image_cache (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add filename column (used by frontend)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 's3_image_cache' AND column_name = 'filename') THEN
        ALTER TABLE s3_image_cache ADD COLUMN filename TEXT;
    END IF;
    
    -- Add file_name column (used by edge function)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 's3_image_cache' AND column_name = 'file_name') THEN
        ALTER TABLE s3_image_cache ADD COLUMN file_name TEXT;
    END IF;
    
    -- Add base_model column (used by edge function for lookups)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 's3_image_cache' AND column_name = 'base_model') THEN
        ALTER TABLE s3_image_cache ADD COLUMN base_model TEXT;
    END IF;
    
    -- Add size column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 's3_image_cache' AND column_name = 'size') THEN
        ALTER TABLE s3_image_cache ADD COLUMN size BIGINT DEFAULT 0;
    END IF;
    
    -- Add last_modified column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 's3_image_cache' AND column_name = 'last_modified') THEN
        ALTER TABLE s3_image_cache ADD COLUMN last_modified TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 's3_image_cache' AND column_name = 'url') THEN
        ALTER TABLE s3_image_cache ADD COLUMN url TEXT;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_s3_image_cache_filename ON s3_image_cache(filename);
CREATE INDEX IF NOT EXISTS idx_s3_image_cache_file_name ON s3_image_cache(file_name);
CREATE INDEX IF NOT EXISTS idx_s3_image_cache_base_model ON s3_image_cache(base_model);

-- Create a trigger to sync filename and file_name columns
CREATE OR REPLACE FUNCTION sync_filename_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- If filename is set but file_name is not, copy filename to file_name
    IF NEW.filename IS NOT NULL AND NEW.file_name IS NULL THEN
        NEW.file_name := NEW.filename;
    END IF;
    
    -- If file_name is set but filename is not, copy file_name to filename
    IF NEW.file_name IS NOT NULL AND NEW.filename IS NULL THEN
        NEW.filename := NEW.file_name;
    END IF;
    
    -- Extract base_model from filename (remove extension and variants)
    IF NEW.filename IS NOT NULL AND NEW.base_model IS NULL THEN
        -- Remove file extension and common suffixes like -2, -3, -3T
        NEW.base_model := regexp_replace(
            regexp_replace(NEW.filename, '\.[^.]*$', ''), 
            '(-[0-9]+[A-Z]*)?$', 
            ''
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_filename_trigger ON s3_image_cache;

-- Create the trigger
CREATE TRIGGER sync_filename_trigger
    BEFORE INSERT OR UPDATE ON s3_image_cache
    FOR EACH ROW
    EXECUTE FUNCTION sync_filename_columns();

-- Add some comments for documentation
COMMENT ON TABLE s3_image_cache IS 'Cache table for S3 image filenames to avoid HTTP HEAD requests';
COMMENT ON COLUMN s3_image_cache.filename IS 'Filename used by frontend (legacy)';
COMMENT ON COLUMN s3_image_cache.file_name IS 'Filename used by edge function';
COMMENT ON COLUMN s3_image_cache.base_model IS 'Base model number extracted from filename for lookups';
COMMENT ON COLUMN s3_image_cache.url IS 'Full S3 URL to the image';