# Lexical Analysis

## What is Lexical Analysis?

Lexical analysis is the first phase of compilation. It transforms raw source code (a stream of characters) into a sequence of meaningful units called **tokens**. This process is also known as **tokenization** or **scanning**.

The lexer reads the source text character by character, grouping characters into lexemes and classifying each lexeme with a token type. For example, the characters `4`, `2` are grouped into the lexeme `42` and classified as an `INTEGER` token.

The lexer also tracks the position (line and column) of each token in the source code, which is essential for error reporting. When the lexer encounters an unexpected character, it produces an `ERROR` token rather than halting, allowing the compiler to report multiple errors in a single pass.

## The Scanning Process

The Mini Math Compiler's lexer performs **character-by-character scanning** with position tracking. The scanning algorithm works as follows:

1. **Initialize** the scanner at position (line 1, column 1)
2. **Read** the next character from the source
3. **Classify** the character:
   - If it's whitespace (space, tab, carriage return), skip it
   - If it's a newline, increment the line counter and reset the column
   - If it's a digit, scan a complete number (INTEGER or FLOAT)
   - If it's a letter or underscore, scan an identifier
   - If it's an operator or punctuation, create the corresponding token
   - Otherwise, create an ERROR token
4. **Record** the token with its lexeme and position
5. **Repeat** until end of input
6. **Append** an EOF token to mark the end


## Token Structure

Each token produced by the lexer contains the following information:

```typescript
interface Token {
  type: TokenType;    // The category of the token
  lexeme: string;     // The actual text from source code
  position: Position; // Location in source (line, column)
  literal?: number;   // Numeric value (for INTEGER and FLOAT only)
}

interface Position {
  line: number;       // Line number (starting from 1)
  column: number;     // Column number (starting from 1)
}
```

| Field | Description | Example |
|-------|-------------|---------|
| `type` | Token category (one of 13 types) | `INTEGER`, `PLUS`, `IDENTIFIER` |
| `lexeme` | The exact text matched from source | `"42"`, `"+"`, `"result"` |
| `position` | Source location for error reporting | `{ line: 1, column: 5 }` |
| `literal` | Parsed numeric value (optional) | `42`, `3.14` |

The `literal` field is only present for `INTEGER` and `FLOAT` tokens, storing the parsed numeric value for direct use by later compiler phases.


## Token Types

The Mini Math Compiler recognizes 13 token types:

| Type | Description | Example Lexeme | Has Literal |
|------|-------------|----------------|-------------|
| `INTEGER` | Whole numbers without decimal point | `42`, `0`, `123` | Yes |
| `FLOAT` | Numbers with decimal point | `3.14`, `0.5`, `2.0` | Yes |
| `IDENTIFIER` | Variable names (letters, digits, underscore) | `x`, `result`, `var_1` | No |
| `PLUS` | Addition operator | `+` | No |
| `MINUS` | Subtraction operator | `-` | No |
| `STAR` | Multiplication operator | `*` | No |
| `SLASH` | Division operator | `/` | No |
| `CARET` | Exponentiation operator | `^` | No |
| `LPAREN` | Left parenthesis | `(` | No |
| `RPAREN` | Right parenthesis | `)` | No |
| `EQUALS` | Assignment operator | `=` | No |
| `EOF` | End of file marker | (empty) | No |
| `ERROR` | Invalid/unexpected character | `@`, `#`, `$` | No |


## Number Recognition

The lexer distinguishes between `INTEGER` and `FLOAT` tokens based on the presence of a decimal point. The number scanning algorithm:

1. **Scan integer part**: Consume all consecutive digits
2. **Check for decimal**: Look ahead for a `.` followed by a digit
3. **Scan fractional part**: If decimal found, consume the `.` and all following digits
4. **Classify**: Token is `FLOAT` if decimal was found, otherwise `INTEGER`

```matlab
Input: "42"     → INTEGER (no decimal point)
Input: "3.14"   → FLOAT   (has decimal point)
Input: "2.0"    → FLOAT   (has decimal point)
Input: "100"    → INTEGER (no decimal point)
```

The lexer uses **lookahead** to ensure the decimal point is followed by a digit. This prevents `42.` from being incorrectly parsed—the `.` would be treated as an unexpected character if not followed by digits.

```typescript
// Simplified number scanning logic
if (peek() === '.' && isDigit(peekNext())) {
  isFloat = true;
  advance(); // consume '.'
  while (isDigit(peek())) advance();
}
```


## Error Handling

When the lexer encounters an unexpected character, it produces an `ERROR` token instead of halting. This approach allows the compiler to continue scanning and report multiple errors in a single compilation pass.

Characters that produce `ERROR` tokens include:
- Special characters not in the language: `@`, `#`, `$`, `&`, `!`, etc.
- Unicode characters outside ASCII letters and digits
- Any character not recognized as part of a valid token

```typescript
// Error token creation
{
  type: 'ERROR',
  lexeme: '@',           // The unexpected character
  position: { line: 1, column: 5 }
}
```

The lexer records the position of each error token, enabling precise error messages that point to the exact location of the problem in the source code.


## Tokenization Example

**Input Source Code:**
```matlab
x = 42 + 3.14
```

**Output Token Stream:**

| # | Type | Lexeme | Position | Literal |
|---|------|--------|----------|---------|
| 1 | `IDENTIFIER` | `x` | line 1, col 1 | — |
| 2 | `EQUALS` | `=` | line 1, col 3 | — |
| 3 | `INTEGER` | `42` | line 1, col 5 | `42` |
| 4 | `PLUS` | `+` | line 1, col 8 | — |
| 5 | `FLOAT` | `3.14` | line 1, col 10 | `3.14` |
| 6 | `EOF` | (empty) | line 1, col 14 | — |


Note how whitespace characters (spaces between tokens) are consumed but do not produce tokens. The lexer tracks column positions accurately, accounting for multi-character lexemes like `42` and `3.14`.
