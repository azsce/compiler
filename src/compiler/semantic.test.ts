/**
 * Property-based tests for the Semantic Analyzer
 * Uses fast-check for property-based testing
 */

import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';
import { tokenize } from './lexer';
import { parse } from './parser';
import { analyze } from './semantic';
import type { ASTNode, DataType } from './types';

// ===========================================================================
// Helper Functions
// ===========================================================================

/**
 * Parse and analyze a source string
 */
function compileAndAnalyze(source: string) {
  const tokens = tokenize(source);
  const { ast, errors: parseErrors } = parse(tokens);
  if (parseErrors.length > 0 || ast.length === 0) {
    return { ast: [], annotatedAst: [], symbolTable: new Map(), errors: parseErrors };
  }
  const { symbolTable, annotatedAst, errors } = analyze(ast);
  return { ast, annotatedAst, symbolTable, errors };
}

/**
 * Get the resolved type from an expression node
 */
function getNodeType(node: ASTNode): DataType | undefined {
  switch (node.kind) {
    case 'BinaryExpr':
    case 'UnaryExpr':
    case 'Literal':
    case 'Variable':
      return node.resolvedType;
    case 'Assignment':
      return getNodeType(node.value);
  }
}

/**
 * Check if all expression nodes in an AST have resolvedType set
 */
function allNodesHaveType(node: ASTNode): boolean {
  switch (node.kind) {
    case 'Literal':
    case 'Variable':
      return node.resolvedType !== undefined;
    case 'UnaryExpr':
      return node.resolvedType !== undefined && allNodesHaveType(node.operand);
    case 'BinaryExpr':
      return (
        node.resolvedType !== undefined &&
        allNodesHaveType(node.left) &&
        allNodesHaveType(node.right)
      );
    case 'Assignment':
      return allNodesHaveType(node.value);
  }
}

// ===========================================================================
// Arbitraries for generating expressions
// ===========================================================================

// Integer literals
const integerArb = fc.integer({ min: 1, max: 100 }).map((n) => n.toString());

// Float literals (ensure they have decimal point)
const floatArb = fc
  .tuple(fc.integer({ min: 0, max: 99 }), fc.integer({ min: 1, max: 99 }))
  .map(([whole, frac]) => `${whole}.${frac}`);

// Binary operators
const binaryOpArb = fc.constantFrom('+', '-', '*', '/', '^');

// Variable names
const varNameArb = fc.constantFrom('x', 'y', 'z', 'a', 'b');

// ===========================================================================
// Property Tests
// ===========================================================================

describe('Semantic Analyzer Property Tests', () => {
  /**
   * **Feature: mini-math-compiler, Property 7: Type Promotion Correctness**
   * **Validates: Requirements 5.2, 5.3, 5.4**
   *
   * For any binary expression, if either operand has type Float, the result type
   * should be Float. If the operator is division (/), the result type should
   * always be Float regardless of operand types.
   */
  describe('Property 7: Type Promotion Correctness', () => {
    /**
     * Test: Integer op Integer = Integer (except division)
     */
    test('Integer op Integer = Integer (except division)', () => {
      fc.assert(
        fc.property(
          integerArb,
          fc.constantFrom('+', '-', '*', '^'),
          integerArb,
          (left, op, right) => {
            const source = `${left} ${op} ${right}`;
            const { annotatedAst, errors } = compileAndAnalyze(source);

            expect(errors).toHaveLength(0);
            expect(annotatedAst).toHaveLength(1);

            const resultType = getNodeType(annotatedAst[0]);
            expect(resultType).toBe('Integer');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Division always produces Float
     */
    test('Division always produces Float', () => {
      fc.assert(
        fc.property(integerArb, integerArb, (left, right) => {
          const source = `${left} / ${right}`;
          const { annotatedAst, errors } = compileAndAnalyze(source);

          expect(errors).toHaveLength(0);
          expect(annotatedAst).toHaveLength(1);

          const resultType = getNodeType(annotatedAst[0]);
          expect(resultType).toBe('Float');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Integer op Float = Float
     */
    test('Integer op Float = Float', () => {
      fc.assert(
        fc.property(integerArb, binaryOpArb, floatArb, (left, op, right) => {
          const source = `${left} ${op} ${right}`;
          const { annotatedAst, errors } = compileAndAnalyze(source);

          expect(errors).toHaveLength(0);
          expect(annotatedAst).toHaveLength(1);

          const resultType = getNodeType(annotatedAst[0]);
          expect(resultType).toBe('Float');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Float op Integer = Float
     */
    test('Float op Integer = Float', () => {
      fc.assert(
        fc.property(floatArb, binaryOpArb, integerArb, (left, op, right) => {
          const source = `${left} ${op} ${right}`;
          const { annotatedAst, errors } = compileAndAnalyze(source);

          expect(errors).toHaveLength(0);
          expect(annotatedAst).toHaveLength(1);

          const resultType = getNodeType(annotatedAst[0]);
          expect(resultType).toBe('Float');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Float op Float = Float
     */
    test('Float op Float = Float', () => {
      fc.assert(
        fc.property(floatArb, binaryOpArb, floatArb, (left, op, right) => {
          const source = `${left} ${op} ${right}`;
          const { annotatedAst, errors } = compileAndAnalyze(source);

          expect(errors).toHaveLength(0);
          expect(annotatedAst).toHaveLength(1);

          const resultType = getNodeType(annotatedAst[0]);
          expect(resultType).toBe('Float');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Literals have correct types
     */
    test('Integer literals have Integer type', () => {
      fc.assert(
        fc.property(integerArb, (num) => {
          const source = num;
          const { annotatedAst, errors } = compileAndAnalyze(source);

          expect(errors).toHaveLength(0);
          expect(annotatedAst).toHaveLength(1);

          const resultType = getNodeType(annotatedAst[0]);
          expect(resultType).toBe('Integer');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Float literals have Float type
     */
    test('Float literals have Float type', () => {
      fc.assert(
        fc.property(floatArb, (num) => {
          const source = num;
          const { annotatedAst, errors } = compileAndAnalyze(source);

          expect(errors).toHaveLength(0);
          expect(annotatedAst).toHaveLength(1);

          const resultType = getNodeType(annotatedAst[0]);
          expect(resultType).toBe('Float');
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: mini-math-compiler, Property 8: Undefined Variable Detection**
   * **Validates: Requirements 5.5**
   *
   * For any AST containing a variable reference, if that variable is not assigned
   * before use in the statement sequence, the semantic analyzer should produce
   * an error containing that variable's name.
   */
  describe('Property 8: Undefined Variable Detection', () => {
    /**
     * Test: Using undefined variable produces error
     */
    test('Using undefined variable produces error with variable name', () => {
      fc.assert(
        fc.property(varNameArb, (varName) => {
          // Use variable without defining it
          const source = varName;
          const { errors } = compileAndAnalyze(source);

          expect(errors.length).toBeGreaterThan(0);
          
          // At least one error should mention the variable name
          const hasVarError = errors.some(
            (e) => e.phase === 'semantic' && e.variableName === varName
          );
          expect(hasVarError).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Defined variable does not produce error
     */
    test('Defined variable does not produce undefined error', () => {
      fc.assert(
        fc.property(varNameArb, integerArb, (varName, value) => {
          // Define variable then use it
          const tokens1 = tokenize(`${varName} = ${value}`);
          const { ast: ast1 } = parse(tokens1);
          
          const tokens2 = tokenize(varName);
          const { ast: ast2 } = parse(tokens2);
          
          // Analyze both statements together
          const { errors } = analyze([...ast1, ...ast2]);

          // Should have no undefined variable errors
          const undefinedErrors = errors.filter(
            (e) => e.phase === 'semantic' && e.variableName === varName
          );
          expect(undefinedErrors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Variable used in expression before definition produces error
     */
    test('Variable in expression before definition produces error', () => {
      fc.assert(
        fc.property(varNameArb, integerArb, binaryOpArb, (varName, num, op) => {
          // Use variable in expression without defining it
          const source = `${num} ${op} ${varName}`;
          const { errors } = compileAndAnalyze(source);

          expect(errors.length).toBeGreaterThan(0);
          
          const hasVarError = errors.some(
            (e) => e.phase === 'semantic' && e.variableName === varName
          );
          expect(hasVarError).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Multiple undefined variables all produce errors
     */
    test('Multiple undefined variables all produce errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('x', 'y'),
          fc.constantFrom('a', 'b'),
          binaryOpArb,
          (var1, var2, op) => {
            // var1 is from {x,y} and var2 is from {a,b}, so they're always different
            const source = `${var1} ${op} ${var2}`;
            const { errors } = compileAndAnalyze(source);

            // Should have errors for both variables
            const var1Error = errors.some(
              (e) => e.phase === 'semantic' && e.variableName === var1
            );
            const var2Error = errors.some(
              (e) => e.phase === 'semantic' && e.variableName === var2
            );
            
            expect(var1Error).toBe(true);
            expect(var2Error).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: mini-math-compiler, Property 9: Type Annotation Completeness**
   * **Validates: Requirements 5.7**
   *
   * For any valid AST (no semantic errors), after semantic analysis, every
   * expression node (BinaryExpr, UnaryExpr, Literal, Variable) should have
   * a non-null resolvedType field.
   */
  describe('Property 9: Type Annotation Completeness', () => {
    /**
     * Test: All nodes in valid expressions have resolvedType
     */
    test('All nodes in valid literal expressions have resolvedType', () => {
      fc.assert(
        fc.property(
          fc.oneof(integerArb, floatArb),
          (literal) => {
            const { annotatedAst, errors } = compileAndAnalyze(literal);

            // Filter out semantic errors (we only care about valid ASTs)
            const semanticErrors = errors.filter((e) => e.phase === 'semantic');
            if (semanticErrors.length > 0) return; // Skip invalid cases

            expect(annotatedAst).toHaveLength(1);
            expect(allNodesHaveType(annotatedAst[0])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: All nodes in binary expressions have resolvedType
     */
    test('All nodes in binary expressions have resolvedType', () => {
      fc.assert(
        fc.property(
          fc.oneof(integerArb, floatArb),
          binaryOpArb,
          fc.oneof(integerArb, floatArb),
          (left, op, right) => {
            const source = `${left} ${op} ${right}`;
            const { annotatedAst, errors } = compileAndAnalyze(source);

            const semanticErrors = errors.filter((e) => e.phase === 'semantic');
            if (semanticErrors.length > 0) return;

            expect(annotatedAst).toHaveLength(1);
            expect(allNodesHaveType(annotatedAst[0])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: All nodes in unary expressions have resolvedType
     */
    test('All nodes in unary expressions have resolvedType', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '+'),
          fc.oneof(integerArb, floatArb),
          (op, operand) => {
            const source = `${op}${operand}`;
            const { annotatedAst, errors } = compileAndAnalyze(source);

            const semanticErrors = errors.filter((e) => e.phase === 'semantic');
            if (semanticErrors.length > 0) return;

            expect(annotatedAst).toHaveLength(1);
            expect(allNodesHaveType(annotatedAst[0])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: All nodes in assignments with defined variables have resolvedType
     */
    test('All nodes in assignments have resolvedType', () => {
      fc.assert(
        fc.property(
          varNameArb,
          fc.oneof(integerArb, floatArb),
          (varName, value) => {
            const source = `${varName} = ${value}`;
            const { annotatedAst, errors } = compileAndAnalyze(source);

            const semanticErrors = errors.filter((e) => e.phase === 'semantic');
            if (semanticErrors.length > 0) return;

            expect(annotatedAst).toHaveLength(1);
            expect(allNodesHaveType(annotatedAst[0])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Complex nested expressions have all nodes typed
     */
    test('Complex nested expressions have all nodes typed', () => {
      fc.assert(
        fc.property(
          fc.oneof(integerArb, floatArb),
          binaryOpArb,
          fc.oneof(integerArb, floatArb),
          binaryOpArb,
          fc.oneof(integerArb, floatArb),
          (a, op1, b, op2, c) => {
            const source = `(${a} ${op1} ${b}) ${op2} ${c}`;
            const { annotatedAst, errors } = compileAndAnalyze(source);

            const semanticErrors = errors.filter((e) => e.phase === 'semantic');
            if (semanticErrors.length > 0) return;

            expect(annotatedAst).toHaveLength(1);
            expect(allNodesHaveType(annotatedAst[0])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Test: Variables after assignment have resolvedType
     */
    test('Variables after assignment have resolvedType', () => {
      fc.assert(
        fc.property(
          varNameArb,
          fc.oneof(integerArb, floatArb),
          (varName, value) => {
            // First assign, then use
            const tokens1 = tokenize(`${varName} = ${value}`);
            const { ast: ast1 } = parse(tokens1);
            
            const tokens2 = tokenize(varName);
            const { ast: ast2 } = parse(tokens2);
            
            const { annotatedAst, errors } = analyze([...ast1, ...ast2]);

            const semanticErrors = errors.filter((e) => e.phase === 'semantic');
            if (semanticErrors.length > 0) return;

            // Both the assignment and the variable reference should be typed
            for (const node of annotatedAst) {
              expect(allNodesHaveType(node)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
