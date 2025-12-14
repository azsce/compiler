/**
 * Property-based tests for Input Validation
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';
import { isEmptyOrWhitespace, validateInput } from './validation';

// Arbitrary for generating whitespace-only strings
const whitespaceOnlyArb = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { minLength: 0, maxLength: 20 })
  .map((arr) => arr.join(''));

// Arbitrary for generating strings with at least one non-whitespace character
const nonWhitespaceCharArb = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*/^()='.split('')
);

const nonEmptySourceArb = fc
  .tuple(
    whitespaceOnlyArb,
    nonWhitespaceCharArb,
    whitespaceOnlyArb
  )
  .map(([ws1, char, ws2]) => ws1 + char + ws2);

describe('Input Validation Property Tests', () => {
  /**
   * **Feature: mini-math-compiler, Property 10: Whitespace-Only Input Handling**
   * **Validates: Requirements 8.2**
   *
   * For any string consisting entirely of whitespace characters (spaces, tabs, newlines),
   * the compiler should treat it as empty input and not attempt full compilation.
   */
  test('Property 10: Whitespace-Only Input Handling - whitespace-only strings are detected as empty', () => {
    fc.assert(
      fc.property(whitespaceOnlyArb, (input) => {
        // All whitespace-only strings should be detected as empty
        expect(isEmptyOrWhitespace(input)).toBe(true);
        
        // Validation should fail for whitespace-only input
        const result = validateInput(input);
        expect(result.isValid).toBe(false);
        expect(result.message).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: mini-math-compiler, Property 10: Whitespace-Only Input Handling**
   * **Validates: Requirements 8.2**
   *
   * The empty string should be treated as empty input.
   */
  test('Property 10: Whitespace-Only Input Handling - empty string is detected as empty', () => {
    expect(isEmptyOrWhitespace('')).toBe(true);
    
    const result = validateInput('');
    expect(result.isValid).toBe(false);
    expect(result.message).toBeDefined();
  });

  /**
   * **Feature: mini-math-compiler, Property 10: Whitespace-Only Input Handling**
   * **Validates: Requirements 8.2**
   *
   * Strings with at least one non-whitespace character should NOT be treated as empty.
   */
  test('Property 10: Whitespace-Only Input Handling - non-whitespace strings are not empty', () => {
    fc.assert(
      fc.property(nonEmptySourceArb, (input) => {
        // Strings with non-whitespace characters should not be detected as empty
        expect(isEmptyOrWhitespace(input)).toBe(false);
        
        // Validation should pass for non-empty input
        const result = validateInput(input);
        expect(result.isValid).toBe(true);
        expect(result.message).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: mini-math-compiler, Property 10: Whitespace-Only Input Handling**
   * **Validates: Requirements 8.2**
   *
   * Various whitespace characters should all be treated as whitespace.
   */
  test('Property 10: Whitespace-Only Input Handling - all whitespace types are recognized', () => {
    // Test individual whitespace characters
    const whitespaceChars = [' ', '\t', '\n', '\r', '\f', '\v'];
    
    for (const ws of whitespaceChars) {
      expect(isEmptyOrWhitespace(ws)).toBe(true);
      expect(isEmptyOrWhitespace(ws.repeat(5))).toBe(true);
    }
    
    // Test combinations
    expect(isEmptyOrWhitespace(' \t\n\r')).toBe(true);
    expect(isEmptyOrWhitespace('\n\n\n')).toBe(true);
    expect(isEmptyOrWhitespace('\t\t\t')).toBe(true);
  });
});
