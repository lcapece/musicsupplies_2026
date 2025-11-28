# Images Matching Rule

## Overview

This document defines the canonical image resolution algorithm for the Music Supplies application. It applies to all product image display operations across the frontend, backend services, and data processing pipelines.

## Data Sources

- **Primary View**: `products_supabase` view
  - **Image Field**: `IMAGE` (string - may contain filename or path)
  - **Part Number Field**: `partnumber` (used for fallback resolution)
- **Image Storage**: S3 bucket `s3://mus86077` (authoritative source for all product images)

## Key Requirements

### Case-Insensitive Matching
All image lookups and comparisons MUST be performed case-insensitively. This includes:
- S3 key existence checks
- Filename comparisons
- Substring matching for placeholder detection

## Image Resolution Algorithm

The system follows a strict 4-step resolution order when determining which image to display for a product:

### Step 1: Check products_supabase.IMAGE

First, attempt to use the value from `products_supabase.IMAGE`. This step fails and proceeds to Step 2 if:
- `IMAGE` is NULL
- `IMAGE` is detected as a "coming soon" placeholder (see placeholder detection below)
- `IMAGE` does not exist in `s3://mus86077` (case-insensitive check)

If the image exists in S3, use it and stop.

### Step 2: Try Part Number Fallback with Multiple Formats

If Step 1 fails, try multiple format variations with the following priority order:
1. **JPG** (.jpg)
2. **PNG** (.png) 
3. **TIFF** (.tiff, .tif)
4. **PSD** (.psd)

For each format, construct fallback filenames:
- Format: `{partnumber}.{extension}`
- Example: If `partnumber` = "ABC123", try:
  - "ABC123.jpg" (first priority)
  - "ABC123.png" (second priority)
  - "ABC123.tiff" and "ABC123.tif" (third priority)
  - "ABC123.psd" (fourth priority)
- All checks are performed case-insensitive

If any format is found, use it and stop. Otherwise, proceed to Step 3.

### Step 3: Try Hyphen-Based Pattern Matching

If Step 2 fails and the part number contains hyphens, attempt pattern matching:
1. Find the rightmost hyphen in the part number
2. Extract the base pattern (everything to the left of the rightmost hyphen)
3. Search S3 for any image that starts with this base pattern, trying all supported formats
4. Use the first match found (case-insensitive)

Example: For part number "TL-100-BK", try to match:
- "TL-100-*.jpg", "TL-100-*.png", "TL-100-*.tiff", "TL-100-*.tif", "TL-100-*.psd"
- Would match "TL-100-RD.jpg" or "TL-100-SB.png" if available

If found, use it and stop. Otherwise, proceed to Step 4.

### Step 4: Normalize Slashes and Retry

This step handles cases where path separators cause mismatches:
1. Remove all forward slashes (`/`) and backslashes (`\`) from both:
   - The original `IMAGE` value
   - All S3 object keys
2. Compare the normalized strings (case-insensitive)
3. If a match is found, use the corresponding S3 object

If no match is found after all four steps, treat the product as having no available image.

## Placeholder Detection

An image is considered a "coming soon" placeholder if its filename contains the substring "comingsoon" after normalization:

1. Convert filename to lowercase
2. Remove separators: spaces, underscores, hyphens, forward slashes, backslashes
3. Check if the result contains "comingsoon"

Examples of placeholders:
- `coming-soon.png` → `comingsoon.png` → detected
- `images/Coming_Soon.jpg` → `imagescomingsoon.jpg` → detected
- `COMING SOON.gif` → `comingsoon.gif` → detected

## Implementation Examples

### Example 1: Standard Case
```
IMAGE: "Products/Strings/ABC123.JPG"
S3 has: "products/strings/abc123.jpg"
Result: Step 1 succeeds (case-insensitive match)
```

### Example 2: NULL Image with JPG
```
IMAGE: NULL
Part Number: "ABC123"
S3 has: "abc123.JPG"
Result: Step 2 succeeds with "ABC123.jpg" (first format priority)
```

### Example 3: NULL Image with PNG
```
IMAGE: NULL
Part Number: "XYZ789"
S3 has: "xyz789.PNG"
Result: Step 2 succeeds with "XYZ789.png" (second format priority)
```

### Example 4: Placeholder Image
```
IMAGE: "images/coming-soon.png"
Part Number: "DEF456"
S3 has: "def456.tiff"
Result: Step 1 detects placeholder, Step 2 tries formats and finds "DEF456.tiff"
```

### Example 5: Hyphen Pattern Matching
```
IMAGE: NULL
Part Number: "TL-100-BK"
S3 has: "TL-100-RD.jpg", "TL-100-SB.png"
Result: Step 2 fails (no exact match), Step 3 succeeds with "TL-100-RD.jpg" (first match)
```

### Example 6: Path Separator Mismatch
```
IMAGE: "guitars\\Acme\\A/B\\C123.jpg"
S3 has: "guitars/acme/abc123.JPG"
Result: Steps 1-3 fail, Step 4 normalizes to "guitarsacmeabc123.jpg" and matches
```

## Implementation Guidelines

### For Backend Services
```javascript
function resolveProductImage(product, s3Keys) {
  const { IMAGE, partnumber } = product;
  const supportedFormats = ['.jpg', '.png', '.tiff', '.tif', '.psd'];
  
  // Step 1: Check IMAGE
  if (IMAGE && !isComingSoonPlaceholder(IMAGE)) {
    const imageKey = findCaseInsensitive(s3Keys, IMAGE);
    if (imageKey) return imageKey;
  }
  
  // Step 2: Try part number with multiple formats
  for (const format of supportedFormats) {
    const partNumberImage = `${partnumber}${format}`;
    const partNumberKey = findCaseInsensitive(s3Keys, partNumberImage);
    if (partNumberKey) return partNumberKey;
  }
  
  // Step 3: Try hyphen-based pattern matching
  if (partnumber.includes('-')) {
    const lastHyphenIndex = partnumber.lastIndexOf('-');
    const basePattern = partnumber.substring(0, lastHyphenIndex);
    
    for (const format of supportedFormats) {
      const matchingKey = s3Keys.find(key => 
        key.toLowerCase().startsWith(basePattern.toLowerCase()) && 
        key.toLowerCase().endsWith(format.toLowerCase())
      );
      if (matchingKey) return matchingKey;
    }
  }
  
  // Step 4: Normalize slashes and retry
  if (IMAGE) {
    const normalizedImage = IMAGE.replace(/[\/\\]/g, '').toLowerCase();
    const normalizedKey = s3Keys.find(key => 
      key.replace(/[\/\\]/g, '').toLowerCase() === normalizedImage
    );
    if (normalizedKey) return normalizedKey;
  }
  
  return null; // No image available
}

function isComingSoonPlaceholder(filename) {
  const normalized = filename
    .toLowerCase()
    .replace(/[\s\-_\/\\]/g, '');
  return normalized.includes('comingsoon');
}

function findCaseInsensitive(keys, target) {
  const lowerTarget = target.toLowerCase();
  return keys.find(key => key.toLowerCase() === lowerTarget);
}
```

### For Frontend Components
```typescript
interface ImageResolutionResult {
  imageUrl: string | null;
  resolutionMethod: 'image_field' | 'part_number_format' | 'hyphen_pattern' | 'slash_normalized' | 'not_found';
}

async function getProductImageUrl(
  product: Product,
  s3BaseUrl: string
): Promise<ImageResolutionResult> {
  const supportedFormats = ['.jpg', '.png', '.tiff', '.tif', '.psd'];
  const { IMAGE, partnumber } = product;
  
  // Step 1: Check IMAGE field
  if (IMAGE && !isComingSoonPlaceholder(IMAGE)) {
    const imageUrl = `${s3BaseUrl}${IMAGE}`;
    if (await imageExists(imageUrl)) {
      return { imageUrl, resolutionMethod: 'image_field' };
    }
  }
  
  // Step 2: Try multiple formats
  for (const format of supportedFormats) {
    const imageUrl = `${s3BaseUrl}${partnumber}${format}`;
    if (await imageExists(imageUrl)) {
      return { imageUrl, resolutionMethod: 'part_number_format' };
    }
  }
  
  // Step 3: Try hyphen pattern matching
  if (partnumber.includes('-')) {
    const lastHyphenIndex = partnumber.lastIndexOf('-');
    const basePattern = partnumber.substring(0, lastHyphenIndex);
    
    // This would require S3 listing or a cached key lookup
    // Implementation depends on available S3 key listing mechanism
  }
  
  // Step 4: Try slash normalization (similar logic)
  
  return { imageUrl: null, resolutionMethod: 'not_found' };
}

async function imageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}
```

## Monitoring and Logging

### Recommended Metrics
- Count of resolutions by method (Step 1, 2, 3, or 4)
- Count of products with no available image
- List of IMAGE values that fail Step 1 (for data quality monitoring)
- Format distribution for Step 2 resolutions (JPG vs PNG vs TIFF vs PSD)

### Logging Examples
```
INFO: Product ABC123 - Image resolved via Step 1 (IMAGE field)
WARN: Product XYZ789 - IMAGE "old/path/image.jpg" not found in S3, trying fallback formats
INFO: Product DEF456 - Image resolved via Step 2 (part number with PNG format)
INFO: Product GHI789 - Image resolved via Step 3 (hyphen pattern match: TL-100-RD.jpg)
INFO: Product JKL012 - Image resolved via Step 4 (slash normalization)
ERROR: Product MNO345 - No image found after all resolution attempts
```

## Notes for Implementers

1. **Performance Optimization**: Consider caching S3 key listings or using a metadata table with normalized keys for efficient lookups.

2. **Batch Processing**: When processing multiple products, fetch all S3 keys once and reuse for all lookups.

3. **Error Handling**: Always gracefully handle missing images. Never crash or throw exceptions for missing images.

4. **Consistency**: This algorithm must be applied uniformly across:
   - Product listing pages
   - Product detail pages
   - Order confirmation emails
   - Admin interfaces
   - Batch export jobs
   - API responses

5. **Testing**: Ensure test coverage for all four resolution steps and edge cases like mixed-case filenames, various path separator combinations, and hyphen-based pattern matching.

## Version History

- v1.0 (2025-08-12): Initial implementation of 3-step image resolution algorithm
- v2.0 (2025-09-17): Enhanced to 4-step algorithm with multiple format support (JPG, PNG, TIFF, PSD) and hyphen-based pattern matching
