// Test staff login through frontend simulation
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
);

async function testStaffLogin() {
  console.log('=== TESTING STAFF LOGIN SIMULATION ===\n');
  
  // Test the exact scenario from AuthContext
  const identifier = 'guy';
  const password = 'password';
  
  console.log(`Testing login for: ${identifier} with password: ${password}`);
  
  try {
    // Simulate the AuthContext emergency staff authentication
    console.log('1. Attempting RPC authentication...');
    
    // Try RPC function first (like in AuthContext)
    const { data: staffAuthResult, error: staffRpcError } = await supabase.rpc('authenticate_staff_user', {
      p_username: identifier,
      p_password: password
    });
    
    if (staffRpcError) {
      console.log('   RPC Error:', staffRpcError.message);
    } else if (staffAuthResult && staffAuthResult.length > 0) {
      const authResult = staffAuthResult[0];
      console.log('   RPC Result:', authResult);
      
      if (authResult.success) {
        console.log('   ✅ Authentication successful!');
        console.log('   📋 User details:', {
          username: authResult.username,
          fullName: authResult.user_full_name,
          securityLevel: authResult.security_level,
          requiresPasswordChange: authResult.requires_password_change
        });
        
        if (authResult.requires_password_change) {
          console.log('   🚨 PASSWORD CHANGE REQUIRED - Modal should appear!');
        }
      } else {
        console.log('   ❌ Authentication failed');
      }
    } else {
      console.log('   No result from RPC');
    }
    
    // Try direct query fallback (like in AuthContext)
    console.log('\n2. Attempting direct query fallback...');
    
    const { data: staffData, error: staffError } = await supabase
      .from('staff_management')
      .select('username, user_full_name, security_level, password_hash')
      .ilike('username', identifier)
      .single();
    
    if (staffError) {
      console.log('   Direct query error:', staffError.message);
    } else if (staffData) {
      console.log('   Staff user found:', staffData.username);
      console.log('   Stored hash:', staffData.password_hash?.substring(0, 30) + '...');
      
      // Test password hash comparison
      const crypto = await import('crypto');
      const computedHash = '$2a$12$' + crypto.createHash('sha256').update(password + 'music_supplies_salt_2025').digest('hex').substring(0, 53);
      console.log('   Computed hash:', computedHash);
      console.log('   Hash matches:', staffData.password_hash === computedHash);
      
      if (staffData.password_hash === computedHash) {
        console.log('   ✅ Password correct!');
        if (password === 'password') {
          console.log('   🚨 PASSWORD CHANGE REQUIRED - Modal should appear!');
        }
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testStaffLogin().catch(console.error);
