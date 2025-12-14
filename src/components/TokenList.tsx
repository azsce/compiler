import type { Token } from '../compiler/types';

export interface TokenListProps {
  tokens: Token[];
}

export function TokenList({ tokens }: TokenListProps) {
  if (tokens.length === 0) {
    return (
      <div className="placeholder">
        No tokens produced
      </div>
    );
  }

  return (
    <div className="token-list">
      {tokens.map((token, index) => (
        <div key={index} className="token-item">
          <span className="token-type">{token.type}</span>
          <span className="token-lexeme">
            {token.lexeme ? `"${token.lexeme}"` : '(empty)'}
          </span>
          <span className="token-position">
            L{token.position.line}:C{token.position.column}
          </span>
        </div>
      ))}
    </div>
  );
}
