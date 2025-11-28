// Text cleaning utility to fix encoding issues in product descriptions
// Focuses on the most common corrupted characters like "GÇ¥" -> "½"

export const cleanProductText = (text: string | null | undefined): string => {
  if (!text) return '';
  
  let cleaned = text;
  
  // Most common encoding fixes - focusing on the main issues
  const encodingFixes: Array<[string, string]> = [
    // Fractions - most common issue you mentioned
    ['GÇ¥', '½'],     // 1/2 - this is the main one: "1/2GÇ¥ Spu" -> "1/2½ Spu"
    ['GÇ¼', '¼'],     // 1/4
    ['GÇ¾', '¾'],     // 3/4
    ['GÇÖ', '⅛'],     // 1/8
    ['GÇÜ', '⅜'],     // 3/8
    ['GÇÝ', '⅝'],     // 5/8
    ['GÇÞ', '⅞'],     // 7/8
    
    // Trademark and copyright
    ['GäÇ', '™'],     // Trademark
    ['GÇ®', '®'],     // Registered trademark
    ['GÇ©', '©'],     // Copyright
    
    // Degrees and measurements
    ['GÇ∞', '°'],     // Degree symbol
    ['GÇ¢', '¢'],     // Cent symbol
    ['GÇú', 'µ'],     // Micro symbol
    
    // Common punctuation
    ['GÇ¿', '…'],     // Ellipsis
    ['GÇó', '•'],     // Bullet point
    ['GÇ¬', '¬'],     // Not sign
    ['GÇ±', '±'],     // Plus-minus
    
    // Additional common corruptions
    ['Ã¢â‚¬â„¢', "'"], // Apostrophe corruption
    ['Ã¢â‚¬Â', '"'],  // Quote corruption
    ['Ã¢â‚¬', '"'],   // Another quote corruption
    ['â€™', "'"],     // Right single quote
    ['â€œ', '"'],     // Left double quote
    ['â€', '"'],      // Right double quote
    ['â€"', '–'],     // En dash
    ['â€"', '—'],     // Em dash
    ['Â½', '½'],      // Half fraction
    ['Â¼', '¼'],      // Quarter fraction
    ['Â¾', '¾'],      // Three quarters fraction
    ['Â°', '°'],      // Degree symbol
    ['Â®', '®'],      // Registered trademark
    ['â„¢', '™'],     // Trademark
    ['Â©', '©'],      // Copyright
    
    // Remove problematic sequences
    ['Ã¢', ''],       // Common prefix corruption
    ['Â', ''],        // Another common corruption
    ['â', ''],        // Yet another corruption
  ];
  
  // Apply all fixes
  encodingFixes.forEach(([corrupted, correct]) => {
    cleaned = cleaned.replace(new RegExp(corrupted, 'g'), correct);
  });
  
  // Clean up any remaining weird character sequences
  cleaned = cleaned
    // Remove sequences of non-printable or weird characters
    .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF\u2100-\u214F\u2150-\u218F]/g, '')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();
  
  return cleaned;
};

// Specific cleaner for HTML content that preserves HTML tags
export const cleanProductHTML = (html: string | null | undefined): string => {
  if (!html) return '';
  
  // First clean the text content, then handle HTML-specific issues
  let cleaned = cleanProductText(html);
  
  // Fix HTML entities that might be corrupted
  const htmlEntityFixes: Array<[string, string]> = [
    ['&amp;GÇ¥', '&frac12;'],  // Half fraction entity
    ['&amp;GÇ¼', '&frac14;'],  // Quarter fraction entity
    ['&amp;GÇ¾', '&frac34;'],  // Three quarters fraction entity
    ['&amp;GäÇ', '&trade;'],   // Trademark entity
    ['&amp;GÇ®', '&reg;'],     // Registered trademark entity
    ['&amp;GÇ©', '&copy;'],    // Copyright entity
    ['&amp;GÇ∞', '&deg;'],     // Degree entity
  ];
  
  htmlEntityFixes.forEach(([corrupted, correct]) => {
    cleaned = cleaned.replace(new RegExp(corrupted, 'g'), correct);
  });
  
  return cleaned;
};