// Compiler module exports
// This file will export all compiler-related functionality

// Type definitions
export type {
  TokenType,
  Position,
  Token,
  DataType,
  ASTNode,
  AssignmentNode,
  BinaryExprNode,
  UnaryExprNode,
  LiteralNode,
  VariableNode,
  SymbolEntry,
  SymbolTable,
  CompilerPhase,
  CompilerError,
  CompilationResult,
  WorkerRequest,
  WorkerResponse,
} from './types';

// Lexer
export { tokenize } from './lexer';

// Parser
export { parse } from './parser';
export type { ParseResult } from './parser';

// Semantic Analyzer
export { analyze } from './semantic';
export type { SemanticResult } from './semantic';

// Pretty Printer
export { printAST, printASTArray } from './prettyPrint';

// Unified Compiler Pipeline
export { compile } from './compiler';

// Input Validation
export { isEmptyOrWhitespace, validateInput } from './validation';
export type { ValidationResult } from './validation';
