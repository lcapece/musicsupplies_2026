const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multipart = require('parse-multipart-data');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Parse multipart form data
    const boundary = multipart.getBoundary(event.headers['content-type']);
    const parts = multipart.parse(Buffer.from(event.body, 'base64'), boundary);
    
    // Find file and filename parts
    const filePart = parts.find(part => part.name === 'file');
    const filenamePart = parts.find(part => part.name === 'filename');
    
    if (!filePart || !filenamePart) {
      throw new Error('Missing file or filename in request');
    }
    
    const filename = filenamePart.data.toString('utf8');
    const fileBuffer = filePart.data;
    const contentType = filePart.type || 'application/octet-stream';
    
    console.log('📤 Uploading to S3:', filename);
    console.log('📦 File size:', fileBuffer.length, 'bytes');
    console.log('🎨 Content type:', contentType);
    
    // Upload directly to S3
    const s3 = new S3Client({
      region: 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new PutObjectCommand({
      Bucket: 'mus86077',
      Key: filename,
      Body: fileBuffer,
      ContentType: contentType,
    });

    await s3.send(command);
    
    console.log('✅ Upload successful:', filename);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        filename,
        url: `https://mus86077.s3.amazonaws.com/${filename}`
      }),
    };
  } catch (error) {
    console.error('❌ Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error.message 
      }),
    };
  }
};