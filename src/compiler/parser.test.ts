/**
 * Property-based tests for the Parser
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';
import { tokenize } from './lexer';
import { parse } from './parser';
import type { ASTNode } from './types';

// ===========================================================================
// AST Evaluation Helper
// ===========================================================================

/**
 * Evaluate an AST node to a numeric value
 * Used to verify that the AST structure produces correct mathematical results
 */
function evaluate(node: ASTNode, variables: Map<string, number> = new Map()): number {
  switch (node.kind) {
    case 'Literal':
      return node.value;

    case 'Variable': {
      const value = variables.get(node.name);
      if (value === undefined) {
        throw new Error(`Undefined variable: ${node.name}`);
      }
      return value;
    }

    case 'UnaryExpr':
      if (node.operator === '-') {
        return -evaluate(node.operand, variables);
      }
      return evaluate(node.operand, variables);

    case 'BinaryExpr': {
      const left = evaluate(node.left, variables);
      const right = evaluate(node.right, variables);
      switch (node.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/':
          return left / right;
        case '^':
          return Math.pow(left, right);
      }
    }

    case 'Assignment':
      // For evaluation purposes, just evaluate the value
      return evaluate(node.value, variables);
  }
}

// ===========================================================================
// Arbitraries for generating expressions
// ===========================================================================

// Small positive integers to avoid overflow issues
const smallIntArb = fc.integer({ min: 1, max: 10 });

// ===========================================================================
// Unit Tests for Error Cases
// ===========================================================================

describe('Parser Error Detection', () => {
  /**
   * Test: Reject expressions with adjacent identifiers without operator
   * "x + y w * 2" should produce a syntax error because 'y' and 'w' 
   * are adjacent without an operator between them
   */
  test('rejects adjacent identifiers in expression', () => {
    const source = 'result = x + y w * 2';
    const tokens = tokenize(source);
    const { errors } = parse(tokens);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].phase).toBe('syntax');
    expect(errors[0].message).toContain('Unexpected token');
  });

  /**
   * Test: Reject expression followed by identifier without operator
   * "x + y z" should produce a syntax error
   */
  test('rejects expression followed by unexpected identifier', () => {
    const source = 'x + y z';
    const tokens = tokenize(source);
    const { errors } = parse(tokens);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].phase).toBe('syntax');
  });

  /**
   * Test: Accept valid expressions with proper operators
   * "x + y * 2" should parse successfully
   */
  test('accepts valid expression with proper operators', () => {
    const source = 'result = x + y * 2';
    const tokens = tokenize(source);
    const { ast, errors } = parse(tokens);

    expect(errors).toHaveLength(0);
    expect(ast).toHaveLength(1);
    expect(ast[0].kind).toBe('Assignment');
  });
});

// ===========================================================================
// Property Tests
// ===========================================================================

describe('Parser Property Tests', () => {
  /**
   * **Feature: mini-math-compiler, Property 6: Operator Precedence Correctness**
   * **Validates: Requirements 4.3**
   *
   * For any expression with multiple operators, the AST structure should reflect
   * correct precedence such that evaluating the AST produces the mathematically
   * correct result (multiplication/division before addition/subtraction,
   * exponentiation before multiplication, right-associativity for exponentiation).
   */
  describe('Property 6: Operator Precedence Correctness', () => {
    /**
     * Test: Multiplication has higher precedence than addition
     * a + b * c should be parsed as a + (b * c)
     */
    test('multiplication has higher precedence than addition', () => {
      fc.assert(
        fc.property(smallIntArb, smallIntArb, smallIntArb, (a, b, c) => {
          const source = `${a} + ${b} * ${c}`;
          const tokens = tokenize(source);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);

          // Evaluate AST and compare with correct mathematical result
          const astResult = evaluate(ast[0]);
          const expected = a + b * c;

          expect(astResult).toBeCloseTo(expected, 10);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Division has higher precedence than subtraction
     * a - b / c should be parsed as a - (b / c)
     */
    test('division has higher precedence than subtraction', () => {
      fc.assert(
        fc.property(smallIntArb, smallIntArb, smallIntArb, (a, b, c) => {
          // Avoid division by zero
          const cNonZero = c === 0 ? 1 : c;
          const source = `${a} - ${b} / ${cNonZero}`;
          const tokens = tokenize(source);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);

          const astResult = evaluate(ast[0]);
          const expected = a - b / cNonZero;

          expect(astResult).toBeCloseTo(expected, 10);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Exponentiation has higher precedence than multiplication
     * a * b ^ c should be parsed as a * (b ^ c)
     */
    test('exponentiation has higher precedence than multiplication', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 3 }),
          (a, b, c) => {
            const source = `${a} * ${b} ^ ${c}`;
            const tokens = tokenize(source);
            const { ast, errors } = parse(tokens);

            expect(errors).toHaveLength(0);
            expect(ast).toHaveLength(1);

            const astResult = evaluate(ast[0]);
            const expected = a * Math.pow(b, c);

            expect(astResult).toBeCloseTo(expected, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Exponentiation is right-associative
     * a ^ b ^ c should be parsed as a ^ (b ^ c), not (a ^ b) ^ c
     */
    test('exponentiation is right-associative', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 3 }),
          fc.integer({ min: 2, max: 3 }),
          fc.integer({ min: 2, max: 2 }),
          (a, b, c) => {
            const source = `${a} ^ ${b} ^ ${c}`;
            const tokens = tokenize(source);
            const { ast, errors } = parse(tokens);

            expect(errors).toHaveLength(0);
            expect(ast).toHaveLength(1);

            const astResult = evaluate(ast[0]);
            // Right-associative: a ^ (b ^ c)
            const expected = Math.pow(a, Math.pow(b, c));
            // Left-associative would be: Math.pow(Math.pow(a, b), c)

            expect(astResult).toBeCloseTo(expected, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Addition/subtraction are left-associative
     * a - b - c should be parsed as (a - b) - c
     */
    test('subtraction is left-associative', () => {
      fc.assert(
        fc.property(smallIntArb, smallIntArb, smallIntArb, (a, b, c) => {
          const source = `${a} - ${b} - ${c}`;
          const tokens = tokenize(source);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);

          const astResult = evaluate(ast[0]);
          // Left-associative: (a - b) - c
          const expected = a - b - c;

          expect(astResult).toBeCloseTo(expected, 10);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Multiplication/division are left-associative
     * a / b / c should be parsed as (a / b) / c
     */
    test('division is left-associative', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 2, max: 10 }),
          (a, b, c) => {
            const source = `${a} / ${b} / ${c}`;
            const tokens = tokenize(source);
            const { ast, errors } = parse(tokens);

            expect(errors).toHaveLength(0);
            expect(ast).toHaveLength(1);

            const astResult = evaluate(ast[0]);
            // Left-associative: (a / b) / c
            const expected = a / b / c;

            expect(astResult).toBeCloseTo(expected, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Parentheses override precedence
     * (a + b) * c should be parsed with addition first
     */
    test('parentheses override precedence', () => {
      fc.assert(
        fc.property(smallIntArb, smallIntArb, smallIntArb, (a, b, c) => {
          const source = `(${a} + ${b}) * ${c}`;
          const tokens = tokenize(source);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);

          const astResult = evaluate(ast[0]);
          const expected = (a + b) * c;

          expect(astResult).toBeCloseTo(expected, 10);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Complex expressions with mixed operators
     * Verify that complex expressions evaluate correctly
     */
    test('complex expressions with mixed operators evaluate correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 3 }),
          (a, b, c, d) => {
            // a + b * c ^ d
            const source = `${a} + ${b} * ${c} ^ ${d}`;
            const tokens = tokenize(source);
            const { ast, errors } = parse(tokens);

            expect(errors).toHaveLength(0);
            expect(ast).toHaveLength(1);

            const astResult = evaluate(ast[0]);
            // Correct precedence: a + (b * (c ^ d))
            const expected = a + b * Math.pow(c, d);

            expect(astResult).toBeCloseTo(expected, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Unary minus has correct precedence
     * -a * b should be parsed as (-a) * b
     */
    test('unary minus has correct precedence', () => {
      fc.assert(
        fc.property(smallIntArb, smallIntArb, (a, b) => {
          const source = `-${a} * ${b}`;
          const tokens = tokenize(source);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);

          const astResult = evaluate(ast[0]);
          const expected = -a * b;

          expect(astResult).toBeCloseTo(expected, 10);
        }),
        { numRuns: 100 }
      );
    });
  });
});
