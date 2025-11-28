// Test script for the enhanced image loader system
// Tests the new rules for determining product images

import { loadProductImage } from './src/utils/imageLoader.ts';

async function testImageLoader() {
  console.log('=== Testing Enhanced Image Loader ===\n');

  // Test cases based on the new rules
  const testCases = [
    {
      name: 'Test 1: Product with image_field that exists in s3_image_cache',
      partnumber: 'TEST123',
      imageField: 'SPECIAL_IMAGE.JPG',
      expected: 'Should find image via image_field lookup'
    },
    {
      name: 'Test 2: Product with empty image_field, use partnumber for base_model lookup',
      partnumber: 'YAMAHA_P45',
      imageField: '',
      expected: 'Should find image via base_model lookup'
    },
    {
      name: 'Test 3: Product with no image_field, use partnumber for base_model lookup',
      partnumber: 'ROLAND_FP30X',
      imageField: undefined,
      expected: 'Should find image via base_model lookup'
    },
    {
      name: 'Test 4: Product not in database, fallback to direct S3 lookup',
      partnumber: 'UNKNOWN_MODEL',
      imageField: undefined,
      expected: 'Should attempt direct S3 fallback'
    },
    {
      name: 'Test 5: Product with invalid image_field, fallback to base_model',
      partnumber: 'KAWAI_ES110',
      imageField: 'NONEXISTENT.JPG',
      expected: 'Should fallback to base_model lookup'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n--- ${testCase.name} ---`);
    console.log(`Partnumber: ${testCase.partnumber}`);
    console.log(`Image Field: ${testCase.imageField || 'undefined'}`);
    console.log(`Expected: ${testCase.expected}`);
    
    try {
      const result = await loadProductImage(testCase.partnumber, testCase.imageField);
      
      console.log(`Result:`);
      console.log(`  Found: ${result.found}`);
      console.log(`  Image URL: ${result.imageUrl || 'none'}`);
      console.log(`  Source: ${result.source}`);
      
      if (result.found) {
        console.log(`  ✅ SUCCESS: Image found`);
      } else {
        console.log(`  ⚠️  NO IMAGE: ${result.source}`);
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
    }
  }

  console.log('\n=== Test Complete ===');
}

// Run the tests
testImageLoader().catch(console.error);