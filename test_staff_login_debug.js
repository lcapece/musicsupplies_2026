// Emergency debug script to test staff login functionality
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
);

async function debugStaffLogin() {
  console.log('=== EMERGENCY STAFF LOGIN DEBUG ===\n');
  
  try {
    // 1. Check what staff users exist
    console.log('1. Checking staff users in database:');
    const { data: staffUsers, error: staffError } = await supabase
      .from('staff_management')
      .select('username, user_full_name, security_level, password_hash')
      .order('username');
    
    if (staffError) {
      console.error('Error fetching staff users:', staffError);
      return;
    }
    
    console.log('Staff users found:');
    staffUsers.forEach(user => {
      console.log(`  - ${user.username}: ${user.user_full_name} (${user.security_level})`);
      console.log(`    Password hash: ${user.password_hash ? user.password_hash.substring(0, 30) + '...' : 'NULL'}`);
    });
    
    // 2. Test the expected hash for "password"
    console.log('\n2. Testing expected hash for "password":');
    const expectedHash = '$2a$12$' + crypto.createHash('sha256').update('password' + 'music_supplies_salt_2025').digest('hex').substring(0, 53);
    console.log(`Expected hash: ${expectedHash}`);
    
    // 3. Test authentication function for a few users
    console.log('\n3. Testing authentication function:');
    for (const user of staffUsers.slice(0, 3)) { // Test first 3 users
      console.log(`\nTesting ${user.username} with password "password":`);
      try {
        const { data: authResult, error: authError } = await supabase.rpc('authenticate_staff_user', {
          p_username: user.username,
          p_password: 'password'
        });
        
        if (authError) {
          console.log(`  ERROR: ${authError.message}`);
        } else if (authResult && authResult.length > 0) {
          const result = authResult[0];
          console.log(`  SUCCESS: ${result.success}`);
          console.log(`  Requires password change: ${result.requires_password_change}`);
        } else {
          console.log(`  No result returned`);
        }
      } catch (err) {
        console.log(`  EXCEPTION: ${err.message}`);
      }
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Debug script error:', error);
  }
}

// Run the debug
debugStaffLogin().catch(console.error);
