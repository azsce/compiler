/**
 * Property-based tests for the Lexer
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';
import { tokenize } from './lexer';
import type { TokenType } from './types';

// Valid token types (excluding ERROR)
const VALID_TOKEN_TYPES: TokenType[] = [
  'INTEGER',
  'FLOAT',
  'IDENTIFIER',
  'PLUS',
  'MINUS',
  'STAR',
  'SLASH',
  'CARET',
  'LPAREN',
  'RPAREN',
  'EQUALS',
  'EOF',
];

// Arbitraries for generating valid source code components
const integerArb = fc.integer({ min: 0, max: 999999 }).map((n) => n.toString());

const floatArb = fc
  .tuple(fc.integer({ min: 0, max: 9999 }), fc.integer({ min: 0, max: 9999 }))
  .map(([whole, frac]) => `${whole}.${frac}`);

const alphaChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';
const alphaNumChars = alphaChars + '0123456789';

const identifierArb = fc
  .tuple(
    fc.constantFrom(...alphaChars.split('')),
    fc.array(fc.constantFrom(...alphaNumChars.split('')), { minLength: 0, maxLength: 5 })
  )
  .map(([first, rest]) => first + rest.join(''));

const operatorArb = fc.constantFrom('+', '-', '*', '/', '^', '(', ')', '=');

const whitespaceArb = fc
  .array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 3 })
  .map((arr) => arr.join(''));

// Generate valid source strings (only valid tokens)
const validTokenArb = fc.oneof(integerArb, floatArb, identifierArb, operatorArb);

// Valid source with proper token separation to avoid ambiguous concatenation
const validSourceArb = fc
  .array(validTokenArb, { minLength: 0, maxLength: 10 })
  .map((tokens) => tokens.join(' '));

describe('Lexer Property Tests', () => {
  /**
   * **Feature: mini-math-compiler, Property 3: Token Type Validity**
   * **Validates: Requirements 3.1, 3.2, 3.6**
   *
   * For any input string, all tokens produced by the lexer (except ERROR tokens)
   * should be one of the valid token types.
   */
  test('Property 3: Token Type Validity - all non-ERROR tokens have valid types', () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const tokens = tokenize(source);

        for (const token of tokens) {
          if (token.type !== 'ERROR') {
            expect(VALID_TOKEN_TYPES).toContain(token.type);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: mini-math-compiler, Property 3: Token Type Validity**
   * **Validates: Requirements 3.1, 3.2, 3.6**
   *
   * For valid source strings (containing only valid language constructs),
   * no ERROR tokens should be produced.
   */
  test('Property 3: Token Type Validity - valid source produces no ERROR tokens', () => {
    fc.assert(
      fc.property(validSourceArb, (source) => {
        const tokens = tokenize(source);

        const errorTokens = tokens.filter((t) => t.type === 'ERROR');
        expect(errorTokens).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: mini-math-compiler, Property 3: Token Type Validity**
   * **Validates: Requirements 3.1, 3.2, 3.6**
   *
   * The last token should always be EOF.
   */
  test('Property 3: Token Type Validity - last token is always EOF', () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const tokens = tokenize(source);

        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[tokens.length - 1].type).toBe('EOF');
      }),
      { numRuns: 100 }
    );
  });
});


describe('Lexer Whitespace Property Tests', () => {
  /**
   * **Feature: mini-math-compiler, Property 4: Whitespace Transparency**
   * **Validates: Requirements 3.3**
   *
   * For any input string, the token stream should never contain whitespace tokens,
   * and adding or removing whitespace between tokens should not change the token
   * types or literal values (only positions).
   */
  test('Property 4: Whitespace Transparency - no whitespace tokens produced', () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const tokens = tokenize(source);

        // There should be no token type for whitespace
        for (const token of tokens) {
          // Whitespace should not appear as a token type
          expect(token.type).not.toBe('WHITESPACE');
          // Whitespace-only lexemes should not exist (except for EOF which has empty lexeme)
          if (token.type !== 'EOF') {
            expect(token.lexeme.trim()).toBe(token.lexeme);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: mini-math-compiler, Property 4: Whitespace Transparency**
   * **Validates: Requirements 3.3**
   *
   * Adding whitespace between tokens should not change token types or literal values.
   */
  test('Property 4: Whitespace Transparency - whitespace does not affect token types/values', () => {
    fc.assert(
      fc.property(
        fc.array(validTokenArb, { minLength: 1, maxLength: 5 }),
        whitespaceArb,
        (tokenStrings, extraWs) => {
          // Create source without extra whitespace
          const sourceCompact = tokenStrings.join(' ');
          // Create source with extra whitespace
          const sourceSpaced = tokenStrings.join(extraWs + ' ' + extraWs);

          const tokensCompact = tokenize(sourceCompact);
          const tokensSpaced = tokenize(sourceSpaced);

          // Filter out EOF for comparison
          const compactNoEof = tokensCompact.filter((t) => t.type !== 'EOF');
          const spacedNoEof = tokensSpaced.filter((t) => t.type !== 'EOF');

          // Same number of tokens
          expect(compactNoEof.length).toBe(spacedNoEof.length);

          // Same types and literals
          for (let i = 0; i < compactNoEof.length; i++) {
            expect(compactNoEof[i].type).toBe(spacedNoEof[i].type);
            expect(compactNoEof[i].literal).toBe(spacedNoEof[i].literal);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Lexer Position Tracking Property Tests', () => {
  /**
   * **Feature: mini-math-compiler, Property 5: Position Tracking Completeness**
   * **Validates: Requirements 3.4, 3.5**
   *
   * For any input string, every token and every error should have a valid position
   * with line >= 1 and column >= 1.
   */
  test('Property 5: Position Tracking Completeness - all tokens have valid positions', () => {
    fc.assert(
      fc.property(fc.string(), (source) => {
        const tokens = tokenize(source);

        for (const token of tokens) {
          expect(token.position).toBeDefined();
          expect(token.position.line).toBeGreaterThanOrEqual(1);
          expect(token.position.column).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: mini-math-compiler, Property 5: Position Tracking Completeness**
   * **Validates: Requirements 3.4, 3.5**
   *
   * ERROR tokens should also have valid positions.
   */
  test('Property 5: Position Tracking Completeness - error tokens have valid positions', () => {
    // Generate strings with invalid characters
    const invalidCharArb = fc.constantFrom('@', '#', '$', '&', '!', '?', '`', '~');
    const sourceWithInvalidArb = fc
      .tuple(whitespaceArb, invalidCharArb, whitespaceArb)
      .map(([ws1, invalid, ws2]) => ws1 + invalid + ws2);

    fc.assert(
      fc.property(sourceWithInvalidArb, (source) => {
        const tokens = tokenize(source);

        const errorTokens = tokens.filter((t) => t.type === 'ERROR');
        expect(errorTokens.length).toBeGreaterThan(0);

        for (const errorToken of errorTokens) {
          expect(errorToken.position).toBeDefined();
          expect(errorToken.position.line).toBeGreaterThanOrEqual(1);
          expect(errorToken.position.column).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: mini-math-compiler, Property 5: Position Tracking Completeness**
   * **Validates: Requirements 3.4, 3.5**
   *
   * Line numbers should increase when newlines are encountered.
   */
  test('Property 5: Position Tracking Completeness - line numbers increase with newlines', () => {
    fc.assert(
      fc.property(
        fc.array(validTokenArb, { minLength: 2, maxLength: 4 }),
        (tokenStrings) => {
          // Create multi-line source
          const source = tokenStrings.join('\n');
          const tokens = tokenize(source);

          // Filter out EOF
          const tokensNoEof = tokens.filter((t) => t.type !== 'EOF');

          // Each token should be on a different line (since we joined with \n)
          const lines = tokensNoEof.map((t) => t.position.line);
          for (let i = 1; i < lines.length; i++) {
            expect(lines[i]).toBeGreaterThan(lines[i - 1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
