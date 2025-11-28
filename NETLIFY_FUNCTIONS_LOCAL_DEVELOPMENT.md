# How to Develop with Netlify Functions Locally

## The Problem
You're running `npm run dev` (Vite dev server on port 5173), but Netlify Functions only work when deployed. How do you test them locally?

## Solution: Netlify CLI

Netlify provides a CLI that runs a local dev server that includes both your frontend AND your functions.

## Setup Steps

### 1. Install Netlify CLI
```bash
npm install -g netlify-cli
```

### 2. Login to Netlify
```bash
netlify login
```
This opens a browser to authenticate.

### 3. Link Your Project (if not already linked)
```bash
netlify link
```
Select your site from the list.

### 4. Create Your Function
Create the file structure:
```
your-project/
├── netlify/
│   └── functions/
│       └── get-upload-url.js
├── src/
├── package.json
└── netlify.toml
```

**File**: `netlify/functions/get-upload-url.js`
```javascript
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
```

### 5. Create netlify.toml (if you don't have one)
**File**: `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 6. Create .env File for Local Development
**File**: `.env` (in project root)
```env
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
```

**IMPORTANT**: Add `.env` to your `.gitignore`!

### 7. Run Netlify Dev Server
Instead of `npm run dev`, use:
```bash
netlify dev
```

This will:
- Start your Vite dev server (port 5173)
- Start Netlify Functions server (port 8888)
- Create a proxy at `http://localhost:8888` that serves both

**Access your app at**: `http://localhost:8888` (NOT 5173!)

### 8. Test Your Function
Your function is now available at:
```
http://localhost:8888/.netlify/functions/get-upload-url
```

Test it with curl:
```bash
curl -X POST http://localhost:8888/.netlify/functions/get-upload-url \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg"}'
```

### 9. Update Your Frontend Code
```typescript
const handleImageUpload = async (file: File) => {
  try {
    // Call Netlify Function
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
    
    console.log('Upload successful!');
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## Development Workflow

### Daily Development
```bash
# Start dev server with functions
netlify dev

# Access at http://localhost:8888
```

### View Function Logs
Netlify CLI shows function logs in the terminal:
```
◈ Functions server is listening on 34567

Request from ::1: POST /.netlify/functions/get-upload-url
Response with status 200 in 234 ms.
```

### Deploy to Production
```bash
# Deploy everything (site + functions)
netlify deploy --prod
```

## Alternative: Use Netlify Dev with Existing Vite Server

If you want to keep using `npm run dev` on port 5173:

### Option A: Proxy in vite.config.ts
```typescript
export default defineConfig({
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      }
    }
  }
});
```

Then run both:
```bash
# Terminal 1
netlify functions:serve

# Terminal 2
npm run dev
```

### Option B: Just Use netlify dev (Recommended)
It's simpler. Just use `netlify dev` instead of `npm run dev`.

## Debugging Tips

### Check Function Logs
```bash
netlify functions:list  # List all functions
netlify functions:invoke get-upload-url --payload '{"filename":"test.jpg","contentType":"image/jpeg"}'
```

### Check Environment Variables
```bash
netlify env:list
```

### Test Function Locally Without Server
```bash
node netlify/functions/get-upload-url.js
```

## Common Issues

### Issue 1: "Function not found"
**Solution**: Make sure `netlify.toml` has correct functions directory:
```toml
[functions]
  directory = "netlify/functions"
```

### Issue 2: "AWS credentials not found"
**Solution**: Create `.env` file with AWS credentials in project root.

### Issue 3: "Port 8888 already in use"
**Solution**: Kill the process or use different port:
```bash
netlify dev --port 9999
```

### Issue 4: Function works locally but not in production
**Solution**: Set environment variables in Netlify Dashboard:
- Go to Site Settings → Environment Variables
- Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

## Package.json Scripts

Update your `package.json`:
```json
{
  "scripts": {
    "dev": "netlify dev",
    "dev:vite": "vite",
    "build": "vite build",
    "deploy": "netlify deploy --prod",
    "functions:serve": "netlify functions:serve"
  }
}
```

Now you can just run:
```bash
npm run dev
```

And it will start Netlify dev server with functions!

## Summary

**Before**: `npm run dev` → Vite only, no functions
**After**: `netlify dev` → Vite + Functions, everything works locally

**Key Points**:
1. Install Netlify CLI globally
2. Create functions in `netlify/functions/`
3. Use `netlify dev` instead of `npm run dev`
4. Access at `http://localhost:8888`
5. Functions available at `/.netlify/functions/function-name`
6. Deploy with `netlify deploy --prod`

This is the standard way to develop Netlify sites with functions locally.