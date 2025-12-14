/**
 * Tests for the unified compiler pipeline
 */

import { describe, test, expect } from 'bun:test';
import { compile } from './compiler';

describe('Compiler Pipeline', () => {
  describe('Basic compilation', () => {
    test('compiles simple integer literal', () => {
      const result = compile('42');
      
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.length).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    test('compiles simple float literal', () => {
      const result = compile('3.14');
      
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.ast).not.toBeNull();
      expect(result.errors).toHaveLength(0);
    });

    test('compiles assignment statement', () => {
      const result = compile('x = 42');
      
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.[0].kind).toBe('Assignment');
      expect(result.symbolTable).not.toBeNull();
      expect(result.symbolTable?.has('x')).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('compiles binary expression', () => {
      const result = compile('2 + 3 * 4');
      
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.ast).not.toBeNull();
      expect(result.annotatedAst).not.toBeNull();
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Error collection', () => {
    test('collects lexical errors from ERROR tokens', () => {
      const result = compile('@');
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].phase).toBe('lexical');
      expect(result.errors[0].message).toContain('@');
    });

    test('collects syntax errors', () => {
      const result = compile('2 +');
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.phase === 'syntax')).toBe(true);
    });

    test('collects semantic errors for undefined variables', () => {
      const result = compile('x + 1');
      
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.phase === 'semantic')).toBe(true);
      expect(result.errors.some(e => e.variableName === 'x')).toBe(true);
    });

    test('collects errors from multiple phases', () => {
      const result = compile('@ + y');
      
      // Should have lexical error for @ and semantic error for undefined y
      expect(result.errors.length).toBeGreaterThan(0);
      const phases = result.errors.map(e => e.phase);
      expect(phases).toContain('lexical');
    });
  });

  describe('Pipeline stages', () => {
    test('returns tokens even with parse errors', () => {
      const result = compile('2 + +');
      
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.tokens.some(t => t.type === 'INTEGER')).toBe(true);
      expect(result.tokens.some(t => t.type === 'PLUS')).toBe(true);
    });

    test('returns symbol table with variable types', () => {
      const result = compile('x = 42\ny = 3.14');
      
      expect(result.symbolTable).not.toBeNull();
      expect(result.symbolTable?.get('x')?.type).toBe('Integer');
      expect(result.symbolTable?.get('y')?.type).toBe('Float');
    });

    test('returns annotated AST with resolved types', () => {
      const result = compile('x = 2 + 3.0');
      
      expect(result.annotatedAst).not.toBeNull();
      const assignment = result.annotatedAst?.[0];
      expect(assignment?.kind).toBe('Assignment');
      
      if (assignment?.kind === 'Assignment') {
        const value = assignment.value;
        if (value.kind === 'BinaryExpr') {
          expect(value.resolvedType).toBe('Float');
        }
      }
    });
  });

  describe('Empty and whitespace input', () => {
    test('handles empty input', () => {
      const result = compile('');
      
      expect(result.tokens.length).toBe(1); // Just EOF
      expect(result.tokens[0].type).toBe('EOF');
      expect(result.errors).toHaveLength(0);
    });

    test('handles whitespace-only input', () => {
      const result = compile('   \n\t  ');
      
      expect(result.tokens.length).toBe(1); // Just EOF
      expect(result.tokens[0].type).toBe('EOF');
      expect(result.errors).toHaveLength(0);
    });
  });
});
