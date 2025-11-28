/**
 * Input Validation and Sanitization Utility
 * Provides secure validation for all user inputs
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export class InputValidator {
  
  /**
   * Validate and sanitize email addresses
   */
  static validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    const sanitized = email.trim().toLowerCase();
    
    // Basic email regex - more permissive but secure
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(sanitized)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    if (sanitized.length > 254) {
      return { isValid: false, error: 'Email address is too long' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validate and sanitize phone numbers
   */
  static validatePhone(phone: string): ValidationResult {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length < 10) {
      return { isValid: false, error: 'Phone number must be at least 10 digits' };
    }

    if (digitsOnly.length > 15) {
      return { isValid: false, error: 'Phone number is too long' };
    }

    // Format as (XXX) XXX-XXXX for US numbers
    let formatted = digitsOnly;
    if (digitsOnly.length === 10) {
      formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      const withoutCountryCode = digitsOnly.slice(1);
      formatted = `+1 (${withoutCountryCode.slice(0, 3)}) ${withoutCountryCode.slice(3, 6)}-${withoutCountryCode.slice(6)}`;
    }

    return { isValid: true, sanitized: formatted };
  }

  /**
   * Validate account numbers
   */
  static validateAccountNumber(accountNumber: string): ValidationResult {
    if (!accountNumber || typeof accountNumber !== 'string') {
      return { isValid: false, error: 'Account number is required' };
    }

    const sanitized = accountNumber.trim();
    
    // Account numbers should be numeric and reasonable length
    if (!/^\d+$/.test(sanitized)) {
      return { isValid: false, error: 'Account number must contain only numbers' };
    }

    if (sanitized.length < 1 || sanitized.length > 10) {
      return { isValid: false, error: 'Account number must be between 1 and 10 digits' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validate and sanitize promo codes
   */
  static validatePromoCode(code: string): ValidationResult {
    if (!code || typeof code !== 'string') {
      return { isValid: false, error: 'Promo code is required' };
    }

    const sanitized = code.trim().toUpperCase();
    
    // Promo codes should be alphanumeric with limited special characters
    if (!/^[A-Z0-9\-_]{1,20}$/.test(sanitized)) {
      return { isValid: false, error: 'Promo code contains invalid characters' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validate quantities
   */
  static validateQuantity(quantity: number | string): ValidationResult {
    const num = typeof quantity === 'string' ? parseInt(quantity, 10) : quantity;
    
    if (isNaN(num) || num < 1) {
      return { isValid: false, error: 'Quantity must be at least 1' };
    }

    if (num > 9999) {
      return { isValid: false, error: 'Quantity cannot exceed 9999' };
    }

    return { isValid: true, sanitized: num.toString() };
  }

  /**
   * Sanitize general text input
   */
  static sanitizeText(text: string, maxLength: number = 1000): ValidationResult {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: 'Text input is required' };
    }

    // Remove potentially dangerous characters and trim
    const sanitized = text
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove HTML/script injection characters
      .slice(0, maxLength);

    if (sanitized.length === 0) {
      return { isValid: false, error: 'Input cannot be empty after sanitization' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): ValidationResult {
    if (!password || typeof password !== 'string') {
      return { isValid: false, error: 'Password is required' };
    }

    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
      return { isValid: false, error: 'Password is too long' };
    }

    // Check for at least one number and one letter
    if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      return { isValid: false, error: 'Password must contain at least one letter and one number' };
    }

    return { isValid: true, sanitized: password };
  }

  /**
   * Validate part numbers
   */
  static validatePartNumber(partNumber: string): ValidationResult {
    if (!partNumber || typeof partNumber !== 'string') {
      return { isValid: false, error: 'Part number is required' };
    }

    const sanitized = partNumber.trim().toUpperCase();
    
    // Part numbers should be alphanumeric with limited special characters
    if (!/^[A-Z0-9\-_\.]{1,50}$/.test(sanitized)) {
      return { isValid: false, error: 'Part number contains invalid characters' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Validate monetary amounts
   */
  static validateAmount(amount: number | string): ValidationResult {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(num) || num < 0) {
      return { isValid: false, error: 'Amount must be a positive number' };
    }

    if (num > 999999.99) {
      return { isValid: false, error: 'Amount is too large' };
    }

    // Round to 2 decimal places
    const rounded = Math.round(num * 100) / 100;
    
    return { isValid: true, sanitized: rounded.toString() };
  }

  /**
   * Validate and sanitize search queries
   */
  static validateSearchQuery(query: string): ValidationResult {
    if (!query || typeof query !== 'string') {
      return { isValid: false, error: 'Search query is required' };
    }

    const sanitized = query
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .slice(0, 100); // Limit search query length

    if (sanitized.length < 1) {
      return { isValid: false, error: 'Search query is too short' };
    }

    return { isValid: true, sanitized };
  }

  /**
   * Batch validate multiple fields
   */
  static validateFields(fields: Record<string, any>, rules: Record<string, (value: any) => ValidationResult>): {
    isValid: boolean;
    errors: Record<string, string>;
    sanitized: Record<string, any>;
  } {
    const errors: Record<string, string> = {};
    const sanitized: Record<string, any> = {};
    let isValid = true;

    for (const [fieldName, value] of Object.entries(fields)) {
      const rule = rules[fieldName];
      if (rule) {
        const result = rule(value);
        if (!result.isValid) {
          errors[fieldName] = result.error || 'Invalid input';
          isValid = false;
        } else {
          sanitized[fieldName] = result.sanitized || value;
        }
      } else {
        sanitized[fieldName] = value;
      }
    }

    return { isValid, errors, sanitized };
  }
}

// Export commonly used validators as standalone functions
export const validateEmail = InputValidator.validateEmail;
export const validatePhone = InputValidator.validatePhone;
export const validateAccountNumber = InputValidator.validateAccountNumber;
export const validatePromoCode = InputValidator.validatePromoCode;
export const validateQuantity = InputValidator.validateQuantity;
export const sanitizeText = InputValidator.sanitizeText;
export const validatePassword = InputValidator.validatePassword;
export const validatePartNumber = InputValidator.validatePartNumber;
export const validateAmount = InputValidator.validateAmount;
export const validateSearchQuery = InputValidator.validateSearchQuery;
