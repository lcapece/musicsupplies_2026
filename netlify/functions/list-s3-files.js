const AWS = require('aws-sdk');

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('Listing S3 files from bucket: mus86077');

    const params = {
      Bucket: 'mus86077',
      MaxKeys: 10000 // Get up to 10,000 files (should cover ~6500 files)
    };

    const data = await s3.listObjectsV2(params).promise();
    
    if (!data.Contents) {
      console.log('No files found in S3 bucket');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          files: [],
          count: 0
        })
      };
    }

    // Extract just the filenames (keys)
    const files = data.Contents.map(obj => obj.Key);
    
    console.log(`Found ${files.length} files in S3 bucket`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        files: files,
        count: files.length
      })
    };

  } catch (error) {
    console.error('Error listing S3 files:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        files: [],
        count: 0
      })
    };
  }
};