# How Other Developers Handle Image Uploads to S3

## Industry Standard Approaches

### 1. **Pre-Signed URLs (Most Common for Static Sites)**
This is what we attempted. It's the industry standard for Netlify/Vercel/static hosting.

**How it works**:
```
Browser → Backend API → AWS SDK generates pre-signed URL → Returns to browser
Browser → Uploads directly to S3 using pre-signed URL
```

**Popular implementations**:
- **Netlify Functions** (serverless)
- **Vercel Edge Functions** (serverless)
- **AWS Lambda** (serverless)
- **Supabase Edge Functions** (what we tried)

**Example from real projects**:
```javascript
// Netlify Function
exports.handler = async (event) => {
  const s3 = new S3Client({ region: 'us-east-1' });
  const command = new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: filename,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  return { statusCode: 200, body: JSON.stringify({ url }) };
};
```

### 2. **Direct Upload with Temporary Credentials (Less Common)**
Use AWS STS to generate temporary credentials for browser.

**Pros**: No backend needed
**Cons**: Security risk, exposes AWS account structure

**Example**:
```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers';

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: fromCognitoIdentityPool({
    identityPoolId: 'us-east-1:xxx',
    clientConfig: { region: 'us-east-1' }
  })
});
```

### 3. **Upload to CDN/Storage Service First (Simplest)**
Upload to Cloudinary, Supabase Storage, Firebase Storage, then optionally sync to S3.

**Popular services**:
- **Cloudinary** - Image hosting with transformations
- **Supabase Storage** - Built-in with Supabase
- **Firebase Storage** - Google's solution
- **Uploadcare** - Dedicated upload service
- **ImageKit** - Image CDN with upload

**Example (Supabase Storage)**:
```javascript
const { data, error } = await supabase.storage
  .from('images')
  .upload(`public/${filename}`, file);

const { data: urlData } = supabase.storage
  .from('images')
  .getPublicUrl(`public/${filename}`);
```

### 4. **Multipart Upload for Large Files**
For files >5MB, use multipart upload.

**Example**:
```javascript
const upload = new Upload({
  client: s3Client,
  params: {
    Bucket: 'my-bucket',
    Key: filename,
    Body: file,
  },
});

upload.on('httpUploadProgress', (progress) => {
  console.log(progress.loaded / progress.total);
});

await upload.done();
```

## Real-World Examples

### Example 1: Next.js + Vercel
```typescript
// pages/api/upload-url.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export default async function handler(req, res) {
  const { filename, contentType } = req.body;
  
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: filename,
    ContentType: contentType,
  });
  
  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  res.json({ url });
}
```

```typescript
// Frontend
const uploadFile = async (file: File) => {
  // Get pre-signed URL
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
    }),
  });
  const { url } = await res.json();
  
  // Upload to S3
  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
};
```

### Example 2: React + Netlify Functions
```javascript
// netlify/functions/get-upload-url.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { filename, contentType } = JSON.parse(event.body);
  
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: filename,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 300 });
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url }),
  };
};
```

### Example 3: Supabase Storage (Simplest)
```typescript
// No backend needed!
const uploadFile = async (file: File) => {
  const { data, error } = await supabase.storage
    .from('images')
    .upload(`public/${file.name}`, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(`public/${file.name}`);

  return urlData.publicUrl;
};
```

### Example 4: Cloudinary (Popular for Images)
```typescript
// No backend needed!
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'my_preset'); // Set in Cloudinary dashboard

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await res.json();
  return data.secure_url; // CDN URL
};
```

## What's Best for Your Situation?

### Your Stack: React + Netlify + Supabase + AWS S3

**Option A: Netlify Functions (Recommended)**
- ✅ Native to your hosting platform
- ✅ No CORS issues
- ✅ Easy to deploy
- ✅ Works with your existing S3 bucket
- ❌ Requires adding Netlify Functions

**Option B: Supabase Storage Only (Easiest)**
- ✅ Already configured
- ✅ No backend code needed
- ✅ Works immediately
- ✅ Built-in CDN
- ❌ Not using your S3 bucket

**Option C: Fix Supabase Edge Function (Current)**
- ✅ Uses your S3 bucket
- ✅ Serverless
- ❌ CORS issues
- ❌ More complex debugging

## Recommended Solution: Netlify Functions

Since you're on Netlify, use Netlify Functions. Here's the complete implementation:

### Step 1: Install AWS SDK
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 2: Create Netlify Function
```javascript
// netlify/functions/get-upload-url.js
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { filename, contentType } = JSON.parse(event.body);
    
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
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### Step 3: Set Environment Variables in Netlify
In Netlify Dashboard → Site Settings → Environment Variables:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Step 4: Update Frontend Code
```typescript
const handleImageUpload = async (file: File) => {
  try {
    // Get pre-signed URL from Netlify Function
    const res = await fetch('/.netlify/functions/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });
    
    const { url } = await res.json();
    
    // Upload to S3
    await fetch(url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });
    
    // Success!
    const imageUrl = `https://mus86077.s3.amazonaws.com/${file.name}`;
    await autoSave(selectedProduct.partnumber, 'image', file.name);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Step 5: Deploy
```bash
netlify deploy --prod
```

**This will work because**:
- Netlify Functions run on Netlify's servers (no CORS)
- AWS credentials are secure in environment variables
- Pre-signed URLs allow direct browser-to-S3 upload
- No complex Edge Function debugging needed

This is how 90% of developers handle S3 uploads on static hosting platforms.