import { LRLanguage, LanguageSupport } from '@codemirror/language';
import { parser } from './minimath.parser';
import { highlight } from './minimath-highlight';

/**
 * Mini Math Language for CodeMirror
 * 
 * Provides syntax highlighting and parsing for the mini math language:
 * - Variable assignments: x = 42
 * - Arithmetic expressions: (a + b) * 2
 * - Operators: +, -, *, /, ^
 * - Number literals: integers and floats
 */
export const miniMathLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [highlight],
  }),
  languageData: {
    commentTokens: { line: '//' },
  },
});

/**
 * Extension to enable Mini Math language support in CodeMirror
 */
export function miniMath() {
  return new LanguageSupport(miniMathLanguage);
}
