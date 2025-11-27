/**
 * Utility functions for formatting and parsing numbers in InputNumber components
 * 
 * FIXED BUG: When typing "10" it displayed "101", when typing "30" it displayed "303" or "3300"
 * 
 * ROOT CAUSE: Parser was returning empty string '' instead of null for empty values.
 * InputNumber expects null/undefined for empty values, not empty string. This caused
 * InputNumber to treat empty string as a value, leading to concatenation bugs.
 * 
 * FIX: Parser now returns null instead of '' for empty values and NaN cases.
 * This ensures InputNumber properly handles empty states and prevents concatenation.
 */

/**
 * Format a number value for display (adds thousand separators)
 * @param {number|string} value - The value to format
 * @returns {string} Formatted string with thousand separators
 */
export const formatNumber = (value) => {
  // FIX: Handle null/undefined properly - return empty string for display
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  // Convert to string and remove existing commas
  // IMPORTANT: Always convert to string first to avoid type issues
  let numStr;
  if (typeof value === 'string') {
    numStr = value.replace(/,/g, '');
  } else if (typeof value === 'number') {
    // For numbers, convert directly to string
    numStr = String(value);
  } else {
    numStr = String(value);
  }
  
  // Handle decimal numbers
  if (numStr.includes('.')) {
    const [integerPart, decimalPart] = numStr.split('.');
    // Only format integer part with commas if it has 4+ digits
    const formattedInteger = integerPart.length >= 4 
      ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : integerPart;
    return `${formattedInteger}.${decimalPart}`;
  }
  
  // Format integer with thousand separators
  // Only add commas if the number has 4+ digits (1000, 10000, etc.)
  // For numbers < 1000, don't add commas
  const shouldAddCommas = numStr.length >= 4;
  return shouldAddCommas 
    ? numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : numStr;
};

/**
 * Parse a formatted string back to a number
 * @param {string|number} value - The formatted string value
 * @returns {number|null} Parsed number or null for empty/invalid values
 */
export const parseNumber = (value) => {
  // FIX: Return null instead of empty string for empty values
  // InputNumber expects null/undefined for empty, not empty string
  // This prevents concatenation bugs where typing "10" shows "101"
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Convert to string first
  const strValue = value.toString();
  
  // CRITICAL FIX: Remove all non-numeric characters except decimal point
  // This ensures we only get digits and decimal point, preventing any concatenation issues
  const cleaned = strValue.replace(/[^\d.]/g, '');
  
  // FIX: Return null instead of empty string
  if (cleaned === '' || cleaned === '.') {
    return null;
  }
  
  // Convert to number
  const num = Number(cleaned);
  
  // FIX: Return null for NaN, not empty string
  return isNaN(num) ? null : num;
};

/**
 * Format a number value for display (integer only, no decimals)
 * @param {number|string} value - The value to format
 * @returns {string} Formatted string with thousand separators (integer only)
 */
export const formatInteger = (value) => {
  // FIX: Handle null/undefined properly - return empty string for display
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  // Convert to string and remove existing commas and decimals
  let numStr;
  if (typeof value === 'string') {
    numStr = value.replace(/,/g, '').replace(/\./g, '');
  } else if (typeof value === 'number') {
    numStr = String(Math.floor(value || 0));
  } else {
    numStr = String(Math.floor(Number(value) || 0));
  }
  
  // Format integer with thousand separators
  // Only add commas if the number has 4+ digits
  const shouldAddCommas = numStr.length >= 4;
  return shouldAddCommas 
    ? numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : numStr;
};

/**
 * Parse a formatted string back to an integer
 * @param {string|number} value - The formatted string value
 * @returns {number|null} Parsed integer or null for empty/invalid values
 */
export const parseInteger = (value) => {
  // FIX: Return null instead of empty string for empty values
  // InputNumber expects null/undefined for empty, not empty string
  // This prevents concatenation bugs where typing "10" shows "101"
  if (value === null || value === undefined || value === '') {
    return null;
  }
  
  // Convert to string first
  const strValue = value.toString();
  
  // CRITICAL FIX: Remove all non-digit characters
  // This ensures we only get digits, preventing any concatenation issues
  const cleaned = strValue.replace(/\D/g, '');
  
  // FIX: Return null instead of empty string
  if (cleaned === '') {
    return null;
  }
  
  // Convert to integer
  const num = parseInt(cleaned, 10);
  
  // FIX: Return null for NaN, not empty string
  return isNaN(num) ? null : num;
};

/**
 * Formatter function for InputNumber (supports decimals)
 * Usage: formatter={numberFormatter}
 */
export const numberFormatter = (value) => {
  return formatNumber(value);
};

/**
 * Parser function for InputNumber (supports decimals)
 * Usage: parser={numberParser}
 */
export const numberParser = (value) => {
  return parseNumber(value);
};

/**
 * Formatter function for InputNumber (integer only)
 * Usage: formatter={integerFormatter}
 */
export const integerFormatter = (value) => {
  return formatInteger(value);
};

/**
 * Parser function for InputNumber (integer only)
 * Usage: parser={integerParser}
 */
export const integerParser = (value) => {
  return parseInteger(value);
};
