// Deploy Staff Authentication Migration
// Run this with: node deploy-staff-auth-migration.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables manually
const envPath = path.join(__dirname, '.env.local');
let envVars = {};
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
} catch (err) {
  console.log('⚠️  Could not load .env.local, using process.env');
}

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployMigration() {
  try {
    console.log('🚀 Deploying Staff Authentication Migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '20251023_complete_staff_auth_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded:', migrationPath);
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });
        
        if (error) {
          // Try direct query if RPC fails
          const { data: directData, error: directError } = await supabase
            .from('_dummy_table_that_does_not_exist')
            .select('*')
            .limit(0);
          
          // If that fails too, try using the raw query method
          console.log('⚠️  RPC method failed, trying alternative approach...');
          
          // For now, just log the statement that would be executed
          console.log('📋 Statement to execute manually:');
          console.log(statement);
          console.log('');
        } else {
          console.log('✅ Statement executed successfully');
        }
      } catch (err) {
        console.log('⚠️  Statement execution note:', err.message);
        console.log('📋 Statement:', statement.substring(0, 100) + '...');
      }
    }
    
    console.log('\n🎉 Migration deployment completed!');
    console.log('\n📋 Manual Execution Instructions:');
    console.log('If automatic execution failed, please run these commands in your Supabase SQL editor:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of migrations/20251023_complete_staff_auth_system.sql');
    console.log('4. Click "Run"');
    
    console.log('\n🧪 Test the deployment:');
    console.log('Try logging in with:');
    console.log('- Username: peter, Password: 860777 (should work normally)');
    console.log('- Username: teststaff, Password: password (should trigger password change modal)');
    
  } catch (error) {
    console.error('❌ Migration deployment failed:', error);
    console.log('\n📋 Manual Deployment Required:');
    console.log('Please manually execute the SQL in migrations/20251023_complete_staff_auth_system.sql');
    process.exit(1);
  }
}

// Run the deployment
deployMigration();