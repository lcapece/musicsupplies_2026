import { supabase } from '../lib/supabase';

/**
 * Apply promo code per-account limits update to database
 * This ensures the migration changes are properly applied to the database schema
 */
export async function applyPromoCodeLimitsUpdates(): Promise<{ success: boolean; message: string }> {
  try {
    
    // 1. First check if the columns already exist to avoid duplicate operations
    const { data: columnCheck, error: checkError } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'promo_codes',
        column_name: 'max_uses_per_account'
      });
    
    if (checkError) {
      // If the RPC doesn't exist, we need to create it first
      await supabase.rpc('exec_sql', { 
        sql_string: `
          CREATE OR REPLACE FUNCTION check_column_exists(
            table_name text,
            column_name text
          ) RETURNS boolean AS $$
          DECLARE
            column_exists boolean;
          BEGIN
            SELECT EXISTS (
              SELECT 1
              FROM information_schema.columns
              WHERE table_name = $1
              AND column_name = $2
            ) INTO column_exists;
            
            RETURN column_exists;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });
      
      // Try column check again
      const { data: retryCheck, error: retryError } = await supabase
        .rpc('check_column_exists', { 
          table_name: 'promo_codes',
          column_name: 'max_uses_per_account'
        });
        
      if (retryError) {
        throw new Error(`Failed to check if columns exist: ${retryError.message}`);
      }
      
      if (retryCheck) {
        // Column already exists, no need to add it
        return { success: true, message: 'Columns already exist, no changes needed' };
      }
    } else if (columnCheck) {
      // Column already exists, no need to add it
      return { success: true, message: 'Columns already exist, no changes needed' };
    }
    
    // 2. Add the new columns to the promo_codes table
    await supabase.rpc('exec_sql', {
      sql_string: `
        ALTER TABLE IF EXISTS promo_codes
        ADD COLUMN IF NOT EXISTS max_uses_per_account INTEGER DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS uses_per_account_tracking BOOLEAN DEFAULT FALSE;
      `
    });
    
    // 3. Add a constraint to ensure max_uses_per_account is positive
    await supabase.rpc('exec_sql', {
      sql_string: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'valid_per_account_uses'
          ) THEN
            ALTER TABLE promo_codes
            ADD CONSTRAINT valid_per_account_uses CHECK (max_uses_per_account IS NULL OR max_uses_per_account > 0);
          END IF;
        END
        $$;
      `
    });
    
    // 4. Create index for better performance
    await supabase.rpc('exec_sql', {
      sql_string: `
        CREATE INDEX IF NOT EXISTS idx_promo_code_usage_account_promo
        ON promo_code_usage(promo_code_id, account_number);
      `
    });
    
    return { 
      success: true, 
      message: 'Promo code per-account limits have been successfully added to the database schema' 
    };
  } catch (error: any) {
    console.error('Error applying promo code schema updates:', error);
    return { 
      success: false, 
      message: `Failed to apply promo code updates: ${error.message}` 
    };
  }
}
