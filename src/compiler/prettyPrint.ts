/**
 * Pretty printers for the Mini Math Compiler
 * Converts AST back to source text for round-trip testing
 */

import type { ASTNode } from './types';

/**
 * Pretty print an AST node back to source text
 * Generates parentheses to preserve structure
 */
export function printAST(node: ASTNode): string {
  switch (node.kind) {
    case 'Literal':
      // For integers, ensure no decimal point
      // For floats, preserve decimal representation
      if (node.dataType === 'Integer') {
        return Math.floor(node.value).toString();
      }
      return node.value.toString();

    case 'Variable':
      return node.name;

    case 'UnaryExpr':
      // Wrap operand in parentheses if it's a binary expression
      // to preserve structure
      const operand = printAST(node.operand);
      if (node.operand.kind === 'BinaryExpr') {
        return `${node.operator}(${operand})`;
      }
      return `${node.operator}${operand}`;

    case 'BinaryExpr':
      // Always wrap binary expressions in parentheses to preserve structure
      const left = printAST(node.left);
      const right = printAST(node.right);
      return `(${left} ${node.operator} ${right})`;

    case 'Assignment':
      return `${node.name} = ${printAST(node.value)}`;
  }
}

/**
 * Pretty print an array of AST nodes
 * Each statement is printed on its own line
 */
export function printASTArray(nodes: ASTNode[]): string {
  return nodes.map(printAST).join('\n');
}
