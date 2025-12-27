import { styleTags, tags as t } from '@lezer/highlight';

/**
 * Syntax highlighting configuration for the Mini Math language
 */
export const highlight = styleTags({
  Number: t.number,
  Identifier: t.variableName,
  'Assignment/Identifier': t.definition(t.variableName),
  '( )': t.paren,
  '+ - "+" "-" "*" "/" "^"': t.operator,
  '=': t.definitionOperator,
});
