// Test the function with proper authentication to see the real error
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
const SUPABASE_ANON_KEY = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

async function testWithAuth() {
  console.log('🧪 Testing with Supabase client authentication...')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Test data
  const testData = {
    website: 'shawries.com',
    business_name: '102 Pawn',
    city: 'Asheville'
  }
  
  try {
    console.log('📞 Calling gather-prospector-intelligence...')
    
    const { data, error } = await supabase.functions.invoke('gather-prospector-intelligence', {
      body: testData
    })
    
    if (error) {
      console.error('❌ Function error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Function success:', data)
    }
    
  } catch (e) {
    console.error('❌ Catch error:', e)
  }
}

testWithAuth()