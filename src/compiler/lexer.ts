/**
 * Lexer for the Mini Math Compiler
 * Performs lexical analysis: converts source text into tokens
 */

import type { Token, TokenType, Position } from './types';

/**
 * Lexer class that performs character-by-character scanning
 */
class Lexer {
  private source: string;
  private tokens: Token[] = [];
  private start = 0;
  private current = 0;
  private line = 1;
  private column = 1;
  private startColumn = 1;

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Tokenize the source string into an array of tokens
   */
  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.startColumn = this.column;
      this.scanToken();
    }

    // Append EOF token at end (Requirement 3.6)
    this.tokens.push({
      type: 'EOF',
      lexeme: '',
      position: { line: this.line, column: this.column },
    });

    return this.tokens;
  }

  /**
   * Scan a single token from the current position
   */
  private scanToken(): void {
    const c = this.advance();

    switch (c) {
      // Single-character operators (Requirement 3.1)
      case '+':
        this.addToken('PLUS');
        break;
      case '-':
        this.addToken('MINUS');
        break;
      case '*':
        this.addToken('STAR');
        break;
      case '/':
        this.addToken('SLASH');
        break;
      case '^':
        this.addToken('CARET');
        break;
      case '(':
        this.addToken('LPAREN');
        break;
      case ')':
        this.addToken('RPAREN');
        break;
      case '=':
        this.addToken('EQUALS');
        break;

      // Whitespace handling (Requirement 3.3)
      case ' ':
      case '\r':
      case '\t':
        // Skip whitespace without producing tokens
        break;
      case '\n':
        this.line++;
        this.column = 1;
        break;

      default:
        if (this.isDigit(c)) {
          this.number();
        } else if (this.isAlpha(c)) {
          this.identifier();
        } else {
          // Error handling for unexpected characters (Requirement 3.4)
          this.addErrorToken(`Unexpected character '${c}'`);
        }
        break;
    }
  }

  /**
   * Scan a number token (INTEGER or FLOAT)
   */
  private number(): void {
    // Scan integer part
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    // Check for decimal point (FLOAT distinction)
    let isFloat = false;
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      isFloat = true;
      this.advance(); // consume '.'

      // Scan fractional part
      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    const lexeme = this.source.substring(this.start, this.current);
    const literal = parseFloat(lexeme);

    this.addToken(isFloat ? 'FLOAT' : 'INTEGER', literal);
  }

  /**
   * Scan an identifier token
   */
  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    this.addToken('IDENTIFIER');
  }

  /**
   * Check if we've reached the end of source
   */
  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  /**
   * Advance to the next character and return the current one
   */
  private advance(): string {
    const c = this.source[this.current];
    this.current++;
    this.column++;
    return c;
  }

  /**
   * Look at the current character without consuming it
   */
  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.current];
  }

  /**
   * Look at the next character without consuming it
   */
  private peekNext(): string {
    if (this.current + 1 >= this.source.length) return '\0';
    return this.source[this.current + 1];
  }

  /**
   * Check if a character is a digit
   */
  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  /**
   * Check if a character is a letter
   */
  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  /**
   * Check if a character is alphanumeric
   */
  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  /**
   * Get the current position for token creation
   */
  private getPosition(): Position {
    return { line: this.line, column: this.startColumn };
  }

  /**
   * Add a token to the token list
   */
  private addToken(type: TokenType, literal?: number): void {
    const lexeme = this.source.substring(this.start, this.current);
    const token: Token = {
      type,
      lexeme,
      position: this.getPosition(),
    };

    if (literal !== undefined) {
      token.literal = literal;
    }

    this.tokens.push(token);
  }

  /**
   * Add an error token for unexpected characters
   */
  private addErrorToken(_message: string): void {
    const lexeme = this.source.substring(this.start, this.current);
    this.tokens.push({
      type: 'ERROR',
      lexeme,
      position: this.getPosition(),
    });
  }
}

/**
 * Tokenize source code into an array of tokens
 * Main entry point for lexical analysis
 */
export function tokenize(source: string): Token[] {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}

