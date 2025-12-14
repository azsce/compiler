/**
 * Property-based tests for the Pretty Printer
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';
import { tokenize } from './lexer';
import { parse } from './parser';
import { printAST } from './prettyPrint';
import type { ASTNode, DataType, Position } from './types';

// ===========================================================================
// AST Comparison Helper
// ===========================================================================

/**
 * Compare two AST nodes for structural equality
 * Ignores position information since that changes after round-trip
 */
function astEqual(a: ASTNode, b: ASTNode): boolean {
  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case 'Literal':
      if (b.kind !== 'Literal') return false;
      // Compare values with tolerance for floating point
      return a.dataType === b.dataType && Math.abs(a.value - b.value) < 1e-10;

    case 'Variable':
      if (b.kind !== 'Variable') return false;
      return a.name === b.name;

    case 'UnaryExpr':
      if (b.kind !== 'UnaryExpr') return false;
      return a.operator === b.operator && astEqual(a.operand, b.operand);

    case 'BinaryExpr':
      if (b.kind !== 'BinaryExpr') return false;
      return (
        a.operator === b.operator &&
        astEqual(a.left, b.left) &&
        astEqual(a.right, b.right)
      );

    case 'Assignment':
      if (b.kind !== 'Assignment') return false;
      return a.name === b.name && astEqual(a.value, b.value);
  }
}

// ===========================================================================
// Arbitraries for generating AST nodes
// ===========================================================================

const dummyPosition: Position = { line: 1, column: 1 };

// Generate valid identifier names (letters only, to avoid conflicts with keywords)
const alphaChars = 'abcdefghijklmnopqrstuvwxyz';
const identifierArb = fc
  .tuple(
    fc.constantFrom(...alphaChars.split('')),
    fc.array(fc.constantFrom(...alphaChars.split('')), { minLength: 0, maxLength: 4 })
  )
  .map(([first, rest]) => first + rest.join(''));

// Generate integer literals
const integerLiteralArb: fc.Arbitrary<ASTNode> = fc
  .integer({ min: 0, max: 1000 })
  .map((value) => ({
    kind: 'Literal' as const,
    value,
    dataType: 'Integer' as DataType,
    position: dummyPosition,
  }));

// Generate float literals (avoiding very small decimals that might round)
const floatLiteralArb: fc.Arbitrary<ASTNode> = fc
  .tuple(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 1, max: 99 }))
  .map(([whole, decimal]) => ({
    kind: 'Literal' as const,
    value: parseFloat(`${whole}.${decimal}`),
    dataType: 'Float' as DataType,
    position: dummyPosition,
  }));

// Generate variable references
const variableArb: fc.Arbitrary<ASTNode> = identifierArb.map((name: string) => ({
  kind: 'Variable' as const,
  name,
  position: dummyPosition,
}));

// Generate leaf nodes (literals and variables)
const leafArb: fc.Arbitrary<ASTNode> = fc.oneof(
  integerLiteralArb,
  floatLiteralArb,
  variableArb
);

// Binary operators
const binaryOpArb = fc.constantFrom('+', '-', '*', '/', '^') as fc.Arbitrary<
  '+' | '-' | '*' | '/' | '^'
>;

// Unary operators
const unaryOpArb = fc.constantFrom('-', '+') as fc.Arbitrary<'-' | '+'>;

// Generate expression AST nodes recursively (limited depth)
const expressionArb: fc.Arbitrary<ASTNode> = fc.letrec((tie) => ({
  expr: fc.oneof(
    { weight: 3, arbitrary: leafArb },
    {
      weight: 1,
      arbitrary: fc
        .tuple(unaryOpArb, tie('expr') as fc.Arbitrary<ASTNode>)
        .map(([operator, operand]) => ({
          kind: 'UnaryExpr' as const,
          operator,
          operand,
          position: dummyPosition,
        })),
    },
    {
      weight: 2,
      arbitrary: fc
        .tuple(
          tie('expr') as fc.Arbitrary<ASTNode>,
          binaryOpArb,
          tie('expr') as fc.Arbitrary<ASTNode>
        )
        .map(([left, operator, right]) => ({
          kind: 'BinaryExpr' as const,
          operator,
          left,
          right,
          position: dummyPosition,
        })),
    }
  ),
})).expr;

// Generate assignment nodes
const assignmentArb: fc.Arbitrary<ASTNode> = fc
  .tuple(identifierArb, expressionArb)
  .map(([name, value]: [string, ASTNode]) => ({
    kind: 'Assignment' as const,
    name,
    value,
    position: dummyPosition,
  }));

// Generate any valid AST node
const astNodeArb: fc.Arbitrary<ASTNode> = fc.oneof(
  { weight: 2, arbitrary: expressionArb },
  { weight: 1, arbitrary: assignmentArb }
);

// ===========================================================================
// Property Tests
// ===========================================================================

describe('Pretty Printer Property Tests', () => {
  /**
   * **Feature: mini-math-compiler, Property 2: Parser Round-Trip**
   * **Validates: Requirements 4.6**
   *
   * For any valid AST, pretty-printing the AST to source text and then
   * parsing that text should produce an equivalent AST (same structure and values).
   */
  describe('Property 2: Parser Round-Trip', () => {
    test('pretty-printing and re-parsing produces equivalent AST', () => {
      fc.assert(
        fc.property(astNodeArb, (originalAst) => {
          // Step 1: Pretty-print the AST to source text
          const sourceText = printAST(originalAst);

          // Step 2: Tokenize the source text
          const tokens = tokenize(sourceText);

          // Step 3: Parse the tokens back into an AST
          const { ast, errors } = parse(tokens);

          // Should parse without errors
          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);

          // Step 4: Compare the original and round-tripped AST
          const roundTrippedAst = ast[0];
          expect(astEqual(originalAst, roundTrippedAst)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('integer literals round-trip correctly', () => {
      fc.assert(
        fc.property(integerLiteralArb, (originalAst) => {
          const sourceText = printAST(originalAst);
          const tokens = tokenize(sourceText);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);
          expect(astEqual(originalAst, ast[0])).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('float literals round-trip correctly', () => {
      fc.assert(
        fc.property(floatLiteralArb, (originalAst) => {
          const sourceText = printAST(originalAst);
          const tokens = tokenize(sourceText);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);
          expect(astEqual(originalAst, ast[0])).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('variable references round-trip correctly', () => {
      fc.assert(
        fc.property(variableArb, (originalAst) => {
          const sourceText = printAST(originalAst);
          const tokens = tokenize(sourceText);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);
          expect(astEqual(originalAst, ast[0])).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('binary expressions round-trip correctly', () => {
      fc.assert(
        fc.property(
          leafArb,
          binaryOpArb,
          leafArb,
          (left, operator, right) => {
            const originalAst: ASTNode = {
              kind: 'BinaryExpr',
              operator,
              left,
              right,
              position: dummyPosition,
            };

            const sourceText = printAST(originalAst);
            const tokens = tokenize(sourceText);
            const { ast, errors } = parse(tokens);

            expect(errors).toHaveLength(0);
            expect(ast).toHaveLength(1);
            expect(astEqual(originalAst, ast[0])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('unary expressions round-trip correctly', () => {
      fc.assert(
        fc.property(unaryOpArb, leafArb, (operator, operand) => {
          const originalAst: ASTNode = {
            kind: 'UnaryExpr',
            operator,
            operand,
            position: dummyPosition,
          };

          const sourceText = printAST(originalAst);
          const tokens = tokenize(sourceText);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);
          expect(astEqual(originalAst, ast[0])).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('assignment statements round-trip correctly', () => {
      fc.assert(
        fc.property(assignmentArb, (originalAst) => {
          const sourceText = printAST(originalAst);
          const tokens = tokenize(sourceText);
          const { ast, errors } = parse(tokens);

          expect(errors).toHaveLength(0);
          expect(ast).toHaveLength(1);
          expect(astEqual(originalAst, ast[0])).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });
});
