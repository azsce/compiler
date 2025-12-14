/**
 * Unified Compiler Pipeline for the Mini Math Compiler
 * Chains lexer → parser → semantic analyzer and collects errors from all phases
 */

import type {
  Token,
  ASTNode,
  SymbolTable,
  CompilerError,
  CompilationResult,
} from './types';
import { tokenize } from './lexer';
import { parse } from './parser';
import { analyze } from './semantic';

/**
 * Run the complete compiler pipeline on source code
 * 
 * Pipeline stages:
 * 1. Lexical Analysis: Source → Tokens
 * 2. Syntax Analysis: Tokens → AST
 * 3. Semantic Analysis: AST → Annotated AST + Symbol Table
 * 
 * Errors are collected from all phases and returned in the result.
 * 
 * @param source - The source code to compile
 * @returns CompilationResult containing tokens, AST, symbol table, and errors
 */
export function compile(source: string): CompilationResult {
  const errors: CompilerError[] = [];
  let tokens: Token[] = [];
  let ast: ASTNode[] | null = null;
  let symbolTable: SymbolTable | null = null;
  let annotatedAst: ASTNode[] | null = null;

  // Phase 1: Lexical Analysis
  tokens = tokenize(source);

  // Collect lexical errors from ERROR tokens
  const lexicalErrors = collectLexicalErrors(tokens);
  errors.push(...lexicalErrors);

  // Phase 2: Syntax Analysis
  // Only proceed if we have tokens (even with lexical errors, we can try parsing)
  const parseResult = parse(tokens);
  
  if (parseResult.errors.length > 0) {
    errors.push(...parseResult.errors);
  }

  if (parseResult.ast.length > 0) {
    ast = parseResult.ast;

    // Phase 3: Semantic Analysis
    // Only proceed if we have a valid AST
    const semanticResult = analyze(ast);
    
    if (semanticResult.errors.length > 0) {
      errors.push(...semanticResult.errors);
    }

    symbolTable = semanticResult.symbolTable;
    annotatedAst = semanticResult.annotatedAst;
  }

  return {
    tokens,
    ast,
    symbolTable,
    annotatedAst,
    errors,
  };
}

/**
 * Extract lexical errors from ERROR tokens
 */
function collectLexicalErrors(tokens: Token[]): CompilerError[] {
  return tokens
    .filter((token) => token.type === 'ERROR')
    .map((token) => ({
      phase: 'lexical' as const,
      message: `Unexpected character '${token.lexeme}'`,
      position: token.position,
    }));
}
