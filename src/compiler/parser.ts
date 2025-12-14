/**
 * Parser for the Mini Math Compiler
 * Performs syntax analysis: converts tokens into an Abstract Syntax Tree (AST)
 * Uses recursive descent parsing with precedence climbing for expressions
 */

import type {
  Token,
  TokenType,
  Position,
  ASTNode,
  AssignmentNode,
  BinaryExprNode,
  UnaryExprNode,
  LiteralNode,
  VariableNode,
  CompilerError,
} from './types';

/**
 * Parser result containing AST and any errors
 */
export interface ParseResult {
  ast: ASTNode[];
  errors: CompilerError[];
}

/**
 * Parser class that implements recursive descent parsing
 */
class Parser {
  private tokens: Token[];
  private current = 0;
  private errors: CompilerError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parse the token stream into an AST
   */
  parse(): ParseResult {
    const statements: ASTNode[] = [];

    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) {
          statements.push(stmt);
        }
      } catch {
        // Stop parsing on first error (no error recovery)
        break;
      }
    }

    return { ast: statements, errors: this.errors };
  }

  // ===========================================================================
  // Token Stream Navigation
  // ===========================================================================

  /**
   * Look at the current token without consuming it
   */
  private peek(): Token {
    return this.tokens[this.current];
  }

  /**
   * Look at the previous token
   */
  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  /**
   * Check if we've reached the end of tokens
   */
  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  /**
   * Advance to the next token and return the current one
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  /**
   * Check if the current token matches the given type
   */
  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  /**
   * Check if the current token matches any of the given types
   */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  /**
   * Expect a specific token type, throw error if not found
   */
  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    const token = this.peek();
    this.addError(message, token.position, type, token.type);
    throw new Error(message);
  }

  /**
   * Add a syntax error
   */
  private addError(
    message: string,
    position: Position,
    expected?: string,
    actual?: string
  ): void {
    this.errors.push({
      phase: 'syntax',
      message,
      position,
      expected,
      actual,
    });
  }

  // ===========================================================================
  // Statement Parsing
  // ===========================================================================

  /**
   * Parse a statement (assignment or expression)
   */
  private parseStatement(): ASTNode | null {
    // Skip ERROR tokens
    while (this.check('ERROR')) {
      this.advance();
    }

    if (this.isAtEnd()) {
      return null;
    }

    // Check for assignment: IDENTIFIER = expression
    if (this.check('IDENTIFIER') && this.lookAhead(1)?.type === 'EQUALS') {
      return this.parseAssignment();
    }

    return this.parseExpression();
  }

  /**
   * Look ahead n tokens
   */
  private lookAhead(n: number): Token | undefined {
    const index = this.current + n;
    if (index < this.tokens.length) {
      return this.tokens[index];
    }
    return undefined;
  }

  /**
   * Parse an assignment statement
   */
  private parseAssignment(): AssignmentNode {
    const nameToken = this.advance(); // consume IDENTIFIER
    const position = nameToken.position;
    this.advance(); // consume EQUALS

    const value = this.parseExpression();

    return {
      kind: 'Assignment',
      name: nameToken.lexeme,
      value,
      position,
    };
  }

  // ===========================================================================
  // Expression Parsing with Precedence Climbing
  // ===========================================================================

  /**
   * Parse an expression
   * Entry point for expression parsing
   */
  private parseExpression(): ASTNode {
    return this.parseAdditive();
  }

  /**
   * Parse additive expressions (+, -)
   * Lowest precedence, left-associative
   */
  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous().lexeme as '+' | '-';
      const position = this.previous().position;
      const right = this.parseMultiplicative();

      left = {
        kind: 'BinaryExpr',
        operator,
        left,
        right,
        position,
      } as BinaryExprNode;
    }

    return left;
  }

  /**
   * Parse multiplicative expressions (*, /)
   * Higher precedence than additive, left-associative
   */
  private parseMultiplicative(): ASTNode {
    let left = this.parsePower();

    while (this.match('STAR', 'SLASH')) {
      const operator = this.previous().lexeme as '*' | '/';
      const position = this.previous().position;
      const right = this.parsePower();

      left = {
        kind: 'BinaryExpr',
        operator,
        left,
        right,
        position,
      } as BinaryExprNode;
    }

    return left;
  }

  /**
   * Parse power expressions (^)
   * Higher precedence than multiplicative, RIGHT-associative
   */
  private parsePower(): ASTNode {
    const left = this.parseUnary();

    if (this.match('CARET')) {
      const operator = '^' as const;
      const position = this.previous().position;
      // Right-associative: recursively call parsePower for right operand
      const right = this.parsePower();

      return {
        kind: 'BinaryExpr',
        operator,
        left,
        right,
        position,
      } as BinaryExprNode;
    }

    return left;
  }

  /**
   * Parse unary expressions (-, +)
   * Higher precedence than power
   */
  private parseUnary(): ASTNode {
    if (this.match('MINUS', 'PLUS')) {
      const operator = this.previous().lexeme as '-' | '+';
      const position = this.previous().position;
      const operand = this.parseUnary(); // Allow chained unary operators

      return {
        kind: 'UnaryExpr',
        operator,
        operand,
        position,
      } as UnaryExprNode;
    }

    return this.parsePrimary();
  }

  // ===========================================================================
  // Primary Expression Parsing
  // ===========================================================================

  /**
   * Parse primary expressions (literals, variables, parenthesized)
   * Highest precedence
   */
  private parsePrimary(): ASTNode {
    // Integer literal
    if (this.match('INTEGER')) {
      const token = this.previous();
      return this.createLiteralNode(token, 'Integer');
    }

    // Float literal
    if (this.match('FLOAT')) {
      const token = this.previous();
      return this.createLiteralNode(token, 'Float');
    }

    // Variable reference
    if (this.match('IDENTIFIER')) {
      const token = this.previous();
      return this.createVariableNode(token);
    }

    // Parenthesized expression
    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.expect('RPAREN', "Expected ')' after expression");
      return expr;
    }

    // Error: unexpected token
    const token = this.peek();
    this.addError(
      'Expected expression',
      token.position,
      'expression',
      token.type
    );
    throw new Error('Expected expression');
  }

  /**
   * Create a LiteralNode from a token
   */
  private createLiteralNode(
    token: Token,
    dataType: 'Integer' | 'Float'
  ): LiteralNode {
    return {
      kind: 'Literal',
      value: token.literal ?? parseFloat(token.lexeme),
      dataType,
      position: token.position,
    };
  }

  /**
   * Create a VariableNode from a token
   */
  private createVariableNode(token: Token): VariableNode {
    return {
      kind: 'Variable',
      name: token.lexeme,
      position: token.position,
    };
  }
}

/**
 * Parse tokens into an AST
 * Main entry point for syntax analysis
 */
export function parse(tokens: Token[]): ParseResult {
  const parser = new Parser(tokens);
  return parser.parse();
}
