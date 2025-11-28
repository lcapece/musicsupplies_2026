-- Create companies table
CREATE TABLE companies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  primary_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add company_id foreign key to prospects
ALTER TABLE prospects ADD COLUMN company_id BIGINT REFERENCES companies(id);

-- Add company_id foreign key to prospects_details
ALTER TABLE prospects_details ADD COLUMN company_id BIGINT REFERENCES companies(id);

-- Create index on company_id for faster joins
CREATE INDEX idx_prospects_company_id ON prospects(company_id);
CREATE INDEX idx_prospects_details_company_id ON prospects_details(company_id);
