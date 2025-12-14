/**
 * Input Validation for the Mini Math Compiler
 * 
 * Provides validation utilities for detecting empty or whitespace-only input.
 */

/**
 * Check if input is empty or contains only whitespace characters.
 * 
 * @param input - The source code input to validate
 * @returns true if input is empty or whitespace-only, false otherwise
 */
export function isEmptyOrWhitespace(input: string): boolean {
  return input.trim().length === 0;
}

/**
 * Validation result for input checking
 */
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

/**
 * Validate input before compilation.
 * 
 * @param input - The source code input to validate
 * @returns ValidationResult indicating if input is valid for compilation
 */
export function validateInput(input: string): ValidationResult {
  if (isEmptyOrWhitespace(input)) {
    return {
      isValid: false,
      message: 'Please enter a valid expression to compile',
    };
  }
  
  return { isValid: true };
}
