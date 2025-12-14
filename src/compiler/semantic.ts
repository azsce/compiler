/**
 * Semantic Analyzer for the Mini Math Compiler
 * Performs semantic analysis: type inference, symbol table construction,
 * and undefined variable detection
 */

import type {
  ASTNode,
  AssignmentNode,
  BinaryExprNode,
  UnaryExprNode,
  LiteralNode,
  VariableNode,
  DataType,
  SymbolTable,
  SymbolEntry,
  CompilerError,
  Position,
} from './types';

/**
 * Result of semantic analysis
 */
export interface SemanticResult {
  symbolTable: SymbolTable;
  annotatedAst: ASTNode[];
  errors: CompilerError[];
}

/**
 * Semantic Analyzer class
 */
class SemanticAnalyzer {
  private symbolTable: SymbolTable = new Map();
  private errors: CompilerError[] = [];

  /**
   * Analyze an array of AST nodes
   */
  analyze(ast: ASTNode[]): SemanticResult {
    const annotatedAst: ASTNode[] = [];

    for (const node of ast) {
      const annotated = this.analyzeNode(node);
      annotatedAst.push(annotated);
    }

    return {
      symbolTable: this.symbolTable,
      annotatedAst,
      errors: this.errors,
    };
  }

  /**
   * Analyze a single AST node and return annotated version
   */
  private analyzeNode(node: ASTNode): ASTNode {
    switch (node.kind) {
      case 'Assignment':
        return this.analyzeAssignment(node);
      case 'BinaryExpr':
        return this.analyzeBinaryExpr(node);
      case 'UnaryExpr':
        return this.analyzeUnaryExpr(node);
      case 'Literal':
        return this.analyzeLiteral(node);
      case 'Variable':
        return this.analyzeVariable(node);
    }
  }


  /**
   * Analyze an assignment node
   * Adds the variable to the symbol table with its inferred type
   */
  private analyzeAssignment(node: AssignmentNode): AssignmentNode {
    // First analyze the value expression to get its type
    const annotatedValue = this.analyzeNode(node.value);
    const valueType = this.getResolvedType(annotatedValue);

    // Add variable to symbol table
    if (valueType) {
      const entry: SymbolEntry = {
        name: node.name,
        type: valueType,
        definedAt: node.position,
      };
      this.symbolTable.set(node.name, entry);
    }

    return {
      ...node,
      value: annotatedValue,
    };
  }

  /**
   * Analyze a binary expression
   * Implements type promotion rules:
   * - Integer op Integer = Integer (except division)
   * - Integer op Float = Float
   * - Float op Integer = Float
   * - Float op Float = Float
   * - Division always produces Float
   */
  private analyzeBinaryExpr(node: BinaryExprNode): BinaryExprNode {
    const annotatedLeft = this.analyzeNode(node.left);
    const annotatedRight = this.analyzeNode(node.right);

    const leftType = this.getResolvedType(annotatedLeft);
    const rightType = this.getResolvedType(annotatedRight);

    let resolvedType: DataType | undefined;

    if (leftType && rightType) {
      // Division always produces Float
      if (node.operator === '/') {
        resolvedType = 'Float';
      }
      // Type promotion: if either operand is Float, result is Float
      else if (leftType === 'Float' || rightType === 'Float') {
        resolvedType = 'Float';
      }
      // Both are Integer
      else {
        resolvedType = 'Integer';
      }
    }

    return {
      ...node,
      left: annotatedLeft,
      right: annotatedRight,
      resolvedType,
    };
  }

  /**
   * Analyze a unary expression
   * Type is same as operand type
   */
  private analyzeUnaryExpr(node: UnaryExprNode): UnaryExprNode {
    const annotatedOperand = this.analyzeNode(node.operand);
    const operandType = this.getResolvedType(annotatedOperand);

    return {
      ...node,
      operand: annotatedOperand,
      resolvedType: operandType,
    };
  }

  /**
   * Analyze a literal node
   * Type is determined by the dataType field set during parsing
   */
  private analyzeLiteral(node: LiteralNode): LiteralNode {
    return {
      ...node,
      resolvedType: node.dataType,
    };
  }

  /**
   * Analyze a variable reference
   * Looks up the variable in the symbol table
   * Produces an error if the variable is undefined
   */
  private analyzeVariable(node: VariableNode): VariableNode {
    const entry = this.symbolTable.get(node.name);

    if (!entry) {
      this.addError(
        `Undefined variable '${node.name}'`,
        node.position,
        node.name
      );
      return node; // Return without resolvedType
    }

    return {
      ...node,
      resolvedType: entry.type,
    };
  }

  /**
   * Get the resolved type from an annotated node
   */
  private getResolvedType(node: ASTNode): DataType | undefined {
    switch (node.kind) {
      case 'Assignment':
        return this.getResolvedType(node.value);
      case 'BinaryExpr':
      case 'UnaryExpr':
      case 'Literal':
      case 'Variable':
        return node.resolvedType;
    }
  }

  /**
   * Add a semantic error
   */
  private addError(message: string, position: Position, variableName?: string): void {
    this.errors.push({
      phase: 'semantic',
      message,
      position,
      variableName,
    });
  }
}

/**
 * Perform semantic analysis on an AST
 * Main entry point for semantic analysis
 */
export function analyze(ast: ASTNode[]): SemanticResult {
  const analyzer = new SemanticAnalyzer();
  return analyzer.analyze(ast);
}
