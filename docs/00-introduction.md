# Introduction

## Project Overview

The Mini Math Compiler is a compiler designed to process mathematical expressions. It transforms human-readable mathematical notation into structured representations that can be analyzed and evaluated.

## Scope

This compiler focuses exclusively on the analysis phases of compilation:

- **Lexical Analysis**: Converting source text into a stream of tokens
- **Syntax Analysis**: Building an Abstract Syntax Tree (AST) from tokens
- **Semantic Analysis**: Performing type inference and building a symbol table

## Supported Features

The Mini Math Compiler supports the following language features:

| Feature | Description | Examples |
|---------|-------------|----------|
| **Integers** | Whole numbers without decimal points | `42`, `0`, `123` |
| **Floats** | Decimal numbers with fractional parts | `3.14`, `0.5`, `2.0` |
| **Variables** | Named storage for values | `x`, `result`, `total` |
| **Arithmetic Operators** | Basic mathematical operations | `+`, `-`, `*`, `/`, `^` |
| **Assignment** | Storing values in variables | `x = 42`, `y = x + 1` |
| **Parentheses** | Grouping expressions | `(2 + 3) * 4` |
| **Unary Operators** | Sign operators | `-5`, `+3` |