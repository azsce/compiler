/**
 * Core type definitions for the Mini Math Compiler
 */

// =============================================================================
// Token Types (Lexical Analysis)
// =============================================================================

/**
 * All valid token types produced by the lexer
 */
export type TokenType =
  | 'INTEGER'    // Whole numbers (e.g., 42)
  | 'FLOAT'      // Decimal numbers (e.g., 3.14)
  | 'IDENTIFIER' // Variable names (e.g., x, result)
  | 'PLUS'       // +
  | 'MINUS'      // -
  | 'STAR'       // *
  | 'SLASH'      // /
  | 'CARET'      // ^
  | 'LPAREN'     // (
  | 'RPAREN'     // )
  | 'EQUALS'     // =
  | 'EOF'        // End of file
  | 'ERROR';     // Lexical error token

/**
 * Position in source code for error reporting
 */
export interface Position {
  line: number;
  column: number;
}

/**
 * A token produced by the lexer
 */
export interface Token {
  type: TokenType;
  lexeme: string;
  position: Position;
  literal?: number; // For INTEGER and FLOAT tokens
}

// =============================================================================
// AST Node Types (Syntax Analysis)
// =============================================================================

/**
 * Data types supported by the language
 */
export type DataType = 'Integer' | 'Float';

/**
 * Union type for all AST nodes
 */
export type ASTNode =
  | AssignmentNode
  | BinaryExprNode
  | UnaryExprNode
  | LiteralNode
  | VariableNode;

/**
 * Assignment statement: IDENTIFIER = expression
 */
export interface AssignmentNode {
  kind: 'Assignment';
  name: string;
  value: ASTNode;
  position: Position;
}

/**
 * Binary expression: left operator right
 */
export interface BinaryExprNode {
  kind: 'BinaryExpr';
  operator: '+' | '-' | '*' | '/' | '^';
  left: ASTNode;
  right: ASTNode;
  position: Position;
  resolvedType?: DataType; // Added by semantic analysis
}

/**
 * Unary expression: operator operand
 */
export interface UnaryExprNode {
  kind: 'UnaryExpr';
  operator: '-' | '+';
  operand: ASTNode;
  position: Position;
  resolvedType?: DataType; // Added by semantic analysis
}

/**
 * Literal value: integer or float
 */
export interface LiteralNode {
  kind: 'Literal';
  value: number;
  dataType: DataType;
  position: Position;
  resolvedType?: DataType; // Added by semantic analysis
}

/**
 * Variable reference
 */
export interface VariableNode {
  kind: 'Variable';
  name: string;
  position: Position;
  resolvedType?: DataType; // Added by semantic analysis
}

// =============================================================================
// Symbol Table Types (Semantic Analysis)
// =============================================================================

/**
 * Entry in the symbol table
 */
export interface SymbolEntry {
  name: string;
  type: DataType;
  definedAt: Position;
}

/**
 * Symbol table mapping variable names to their type information
 */
export type SymbolTable = Map<string, SymbolEntry>;

// =============================================================================
// Error Types
// =============================================================================

/**
 * Compilation phase where an error occurred
 */
export type CompilerPhase = 'lexical' | 'syntax' | 'semantic';

/**
 * Error produced during compilation
 */
export interface CompilerError {
  phase: CompilerPhase;
  message: string;
  position: Position;
  expected?: string;      // For syntax errors
  actual?: string;        // For syntax errors
  variableName?: string;  // For semantic errors
}

// =============================================================================
// Compilation Result
// =============================================================================

/**
 * Result of running the compiler pipeline
 */
export interface CompilationResult {
  tokens: Token[];
  ast: ASTNode[] | null;
  symbolTable: SymbolTable | null;
  annotatedAst: ASTNode[] | null;
  errors: CompilerError[];
}

// =============================================================================
// Web Worker Message Types
// =============================================================================

/**
 * Request sent to the compiler worker
 */
export interface WorkerRequest {
  id: number;
  source: string;
}

/**
 * Response from the compiler worker
 */
export interface WorkerResponse {
  id: number;
  result: CompilationResult;
}
