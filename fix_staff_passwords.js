// Emergency fix script to update staff passwords
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
);

async function fixStaffPasswords() {
  console.log('=== EMERGENCY FIX: Updating all staff passwords to "password" ===');
  
  // Generate the correct hash for "password"
  const correctHash = '$2a$12$' + crypto.createHash('sha256').update('password' + 'music_supplies_salt_2025').digest('hex').substring(0, 53);
  console.log('Correct hash for "password":', correctHash);
  
  // Update all staff users except peter
  const { data, error } = await supabase
    .from('staff_management')
    .update({ 
      password_hash: correctHash,
      updated_at: new Date().toISOString()
    })
    .neq('username', 'peter');
  
  if (error) {
    console.error('Error updating passwords:', error);
  } else {
    console.log('Successfully updated staff passwords!');
    console.log('Affected rows:', data);
  }
}

fixStaffPasswords().catch(console.error);
