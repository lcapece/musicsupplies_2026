const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployStateFunctions() {
  console.log('Deploying state assignment functions...');

  const sql = `
-- Function to get assigned states for a specific user
CREATE OR REPLACE FUNCTION get_user_assigned_states(p_username TEXT)
RETURNS TABLE(
    state_abbr VARCHAR(2),
    state_name VARCHAR(100),
    country_code VARCHAR(2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return states assigned to the specific user
    RETURN QUERY
    SELECT 
        ps.state_abbr,
        ps.state_name,
        ps.country_code
    FROM prospectstates ps
    WHERE ps.salesman_assigned = p_username
    ORDER BY ps.country_code, ps.state_abbr;
END;
$$;

-- Function to check if a user has super admin privileges
CREATE OR REPLACE FUNCTION is_user_super_admin(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_security_level TEXT;
BEGIN
    -- Get the user's security level
    SELECT security_level
    INTO v_security_level
    FROM staff_management
    WHERE LOWER(username) = LOWER(p_username);
    
    -- Return true if user has super admin privileges
    RETURN (v_security_level = 'super_admin' OR v_security_level = 'superuser');
END;
$$;

-- Function to get all states (for super admins)
CREATE OR REPLACE FUNCTION get_all_states()
RETURNS TABLE(
    state_abbr VARCHAR(2),
    state_name VARCHAR(100),
    country_code VARCHAR(2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Return all states for super admin users
    RETURN QUERY
    SELECT 
        ps.state_abbr,
        ps.state_name,
        ps.country_code
    FROM prospectstates ps
    ORDER BY ps.country_code, ps.state_abbr;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_assigned_states(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_assigned_states(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_all_states() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_states() TO anon;

-- Add some sample state assignments for testing
-- Assign Guy to NY and NJ as mentioned in the requirements
UPDATE prospectstates 
SET salesman_assigned = 'guy', last_change = NOW()
WHERE state_abbr IN ('NY', 'NJ');

-- Assign some other states to other salespeople for testing
UPDATE prospectstates 
SET salesman_assigned = 'anthony', last_change = NOW()
WHERE state_abbr IN ('CA', 'NV');

UPDATE prospectstates 
SET salesman_assigned = 'julissa', last_change = NOW()
WHERE state_abbr IN ('FL', 'GA');

UPDATE prospectstates 
SET salesman_assigned = 'joe', last_change = NOW()
WHERE state_abbr IN ('TX', 'OK');

UPDATE prospectstates 
SET salesman_assigned = 'melissa', last_change = NOW()
WHERE state_abbr IN ('IL', 'IN', 'WI');
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Error deploying functions:', error);
      // Try alternative approach - execute each statement separately
      const statements = sql.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
            if (stmtError) {
              console.error('Error executing statement:', statement.substring(0, 100) + '...', stmtError);
            } else {
              console.log('✓ Executed statement successfully');
            }
          } catch (e) {
            console.error('Exception executing statement:', e);
          }
        }
      }
    } else {
      console.log('✓ Functions deployed successfully');
    }

    // Test the functions
    console.log('\nTesting functions...');
    
    // Test get_user_assigned_states for 'guy'
    const { data: guyStates, error: guyError } = await supabase.rpc('get_user_assigned_states', { p_username: 'guy' });
    if (guyError) {
      console.error('Error testing guy states:', guyError);
    } else {
      console.log('Guy assigned states:', guyStates);
    }

    // Test is_user_super_admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_user_super_admin', { p_username: 'louis' });
    if (adminError) {
      console.error('Error testing admin check:', adminError);
    } else {
      console.log('Louis is super admin:', isAdmin);
    }

  } catch (error) {
    console.error('Exception:', error);
  }
}

deployStateFunctions();