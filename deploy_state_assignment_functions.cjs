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

  // Deploy functions one by one
  const functions = [
    {
      name: 'get_user_assigned_states',
      sql: `
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
    RETURN QUERY
    SELECT 
        ps.state_abbr,
        ps.state_name,
        ps.country_code
    FROM prospectstates ps
    WHERE ps.salesman_assigned = p_username
    ORDER BY ps.country_code, ps.state_abbr;
END;
$$;`
    },
    {
      name: 'is_user_super_admin',
      sql: `
CREATE OR REPLACE FUNCTION is_user_super_admin(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_security_level TEXT;
BEGIN
    SELECT security_level
    INTO v_security_level
    FROM staff_management
    WHERE LOWER(username) = LOWER(p_username);
    
    RETURN (v_security_level = 'super_admin' OR v_security_level = 'superuser');
END;
$$;`
    },
    {
      name: 'get_all_states',
      sql: `
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
    RETURN QUERY
    SELECT 
        ps.state_abbr,
        ps.state_name,
        ps.country_code
    FROM prospectstates ps
    ORDER BY ps.country_code, ps.state_abbr;
END;
$$;`
    }
  ];

  // Deploy each function
  for (const func of functions) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: func.sql });
      if (error) {
        console.error(`Error deploying ${func.name}:`, error);
      } else {
        console.log(`✓ ${func.name} deployed successfully`);
      }
    } catch (e) {
      console.error(`Exception deploying ${func.name}:`, e);
    }
  }

  // Grant permissions
  const permissions = [
    "GRANT EXECUTE ON FUNCTION get_user_assigned_states(TEXT) TO authenticated;",
    "GRANT EXECUTE ON FUNCTION get_user_assigned_states(TEXT) TO anon;",
    "GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO authenticated;",
    "GRANT EXECUTE ON FUNCTION is_user_super_admin(TEXT) TO anon;",
    "GRANT EXECUTE ON FUNCTION get_all_states() TO authenticated;",
    "GRANT EXECUTE ON FUNCTION get_all_states() TO anon;"
  ];

  for (const perm of permissions) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: perm });
      if (error) {
        console.error('Error granting permission:', error);
      } else {
        console.log('✓ Permission granted');
      }
    } catch (e) {
      console.error('Exception granting permission:', e);
    }
  }

  // Add sample state assignments
  const assignments = [
    "UPDATE prospectstates SET salesman_assigned = 'guy', last_change = NOW() WHERE state_abbr IN ('NY', 'NJ');",
    "UPDATE prospectstates SET salesman_assigned = 'anthony', last_change = NOW() WHERE state_abbr IN ('CA', 'NV');",
    "UPDATE prospectstates SET salesman_assigned = 'julissa', last_change = NOW() WHERE state_abbr IN ('FL', 'GA');",
    "UPDATE prospectstates SET salesman_assigned = 'joe', last_change = NOW() WHERE state_abbr IN ('TX', 'OK');",
    "UPDATE prospectstates SET salesman_assigned = 'melissa', last_change = NOW() WHERE state_abbr IN ('IL', 'IN', 'WI');"
  ];

  for (const assignment of assignments) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: assignment });
      if (error) {
        console.error('Error updating assignments:', error);
      } else {
        console.log('✓ State assignment updated');
      }
    } catch (e) {
      console.error('Exception updating assignments:', e);
    }
  }

  // Test the functions
  console.log('\nTesting functions...');
  
  try {
    const { data: guyStates, error: guyError } = await supabase.rpc('get_user_assigned_states', { p_username: 'guy' });
    if (guyError) {
      console.error('Error testing guy states:', guyError);
    } else {
      console.log('Guy assigned states:', guyStates);
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc('is_user_super_admin', { p_username: 'louis' });
    if (adminError) {
      console.error('Error testing admin check:', adminError);
    } else {
      console.log('Louis is super admin:', isAdmin);
    }
  } catch (error) {
    console.error('Exception during testing:', error);
  }
}

deployStateFunctions();