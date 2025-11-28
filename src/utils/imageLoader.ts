export interface ImageLoadResult {
  imageUrl: string | null
  source: 'image_field' | 'none'
}

/**
 * ULTRA SIMPLE IMAGE LOADING RULE:
 * ONLY look for the exact image filename from the "image" field in the product record
 * Base URL: https://musicsupplies.s3.amazonaws.com/
 */
export function loadProductImage(partnumber: string, imageField?: string): ImageLoadResult {
  // If no image field provided, return no image
  if (!imageField || imageField.trim() === '') {
    return {
      imageUrl: null,
      source: 'none'
    }
  }

  // Construct the exact URL from the image field
  const baseUrl = 'https://musicsupplies.s3.amazonaws.com'
  const imageUrl = `${baseUrl}/${imageField.trim()}`

  return {
    imageUrl: imageUrl,
    source: 'image_field'
  }
}

/**
 * Synchronous version that just constructs the URL immediately
 */
export function getProductImageUrl(imageField?: string): string | null {
  if (!imageField || imageField.trim() === '') {
    return null
  }

  const baseUrl = 'https://musicsupplies.s3.amazonaws.com'
  return `${baseUrl}/${imageField.trim()}`
}
