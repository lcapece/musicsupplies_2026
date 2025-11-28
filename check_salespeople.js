const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkSalespeople() {
  try {
    console.log('🔍 Checking staff_management table for salespeople...\n');
    
    // Get all staff members
    const { data: allStaff, error: allError } = await supabase
      .from('staff_management')
      .select('username, user_full_name, is_salesperson')
      .order('username');
    
    if (allError) {
      console.error('❌ Error fetching all staff:', allError);
      return;
    }
    
    console.log('📋 ALL STAFF MEMBERS:');
    console.log('Username\t\tFull Name\t\tIs Salesperson');
    console.log('--------\t\t---------\t\t--------------');
    allStaff.forEach(staff => {
      console.log(`${staff.username.padEnd(16)}\t${(staff.user_full_name || 'N/A').padEnd(16)}\t${staff.is_salesperson ? '✅ YES' : '❌ NO'}`);
    });
    
    // Get only salespeople
    const { data: salespeople, error: salesError } = await supabase
      .from('staff_management')
      .select('username, user_full_name')
      .eq('is_salesperson', true)
      .order('username');
    
    if (salesError) {
      console.error('❌ Error fetching salespeople:', salesError);
      return;
    }
    
    console.log('\n🎯 SALESPEOPLE ONLY:');
    console.log('Username\t\tFull Name');
    console.log('--------\t\t---------');
    salespeople.forEach(person => {
      console.log(`${person.username.padEnd(16)}\t${person.user_full_name || 'N/A'}`);
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`Total staff members: ${allStaff.length}`);
    console.log(`Total salespeople: ${salespeople.length}`);
    
    // Expected salespeople from migration
    const expectedSalespeople = ['guy', 'anthony', 'julissa', 'joe', 'melissa', 'louis'];
    console.log(`Expected salespeople: ${expectedSalespeople.length} (${expectedSalespeople.join(', ')})`);
    
    // Check which expected salespeople are missing
    const actualSalespeopleUsernames = salespeople.map(p => p.username);
    const missingSalespeople = expectedSalespeople.filter(username => 
      !actualSalespeopleUsernames.includes(username)
    );
    
    if (missingSalespeople.length > 0) {
      console.log(`\n⚠️  MISSING SALESPEOPLE: ${missingSalespeople.join(', ')}`);
    } else {
      console.log(`\n✅ All expected salespeople are properly marked!`);
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkSalespeople();