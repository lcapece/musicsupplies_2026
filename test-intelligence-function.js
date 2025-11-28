// Test script for the gather-prospector-intelligence function
// This will help diagnose the API key and deployment issues

const SUPABASE_URL = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
const SUPABASE_ANON_KEY = 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'

async function testIntelligenceFunction() {
  console.log('🧪 Testing gather-prospector-intelligence function...')
  
  const testData = {
    website: 'shawries.com',
    business_name: '102 Pawn',
    city: 'Asheville'
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/gather-prospector-intelligence`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(testData)
    })
    
    console.log('📊 Response Status:', response.status)
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()))
    
    const responseText = await response.text()
    console.log('📊 Response Body:', responseText)
    
    if (!response.ok) {
      console.error('❌ Function call failed!')
      console.error('Status:', response.status)
      console.error('Body:', responseText)
      
      // Check if it's a deployment issue
      if (response.status === 404) {
        console.error('🚨 ISSUE: Function not deployed or wrong name')
      } else if (response.status === 500) {
        console.error('🚨 ISSUE: Internal server error - likely missing API keys')
      } else if (response.status === 401 || response.status === 403) {
        console.error('🚨 ISSUE: Authentication/authorization problem')
      }
    } else {
      console.log('✅ Function call successful!')
      try {
        const data = JSON.parse(responseText)
        console.log('📋 Parsed Response:', data)
      } catch (e) {
        console.log('⚠️ Response is not JSON:', responseText)
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message)
    console.error('🚨 ISSUE: Cannot reach the function - check deployment')
  }
}

// Run the test
testIntelligenceFunction()