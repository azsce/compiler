import type { CompilerError } from '../compiler/types';

export interface ErrorListProps {
  errors: CompilerError[];
}

export function ErrorList({ errors }: ErrorListProps) {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="error-list">
      {errors.map((error, index) => (
        <div key={index} className="error-item">
          <div className="error-phase">{error.phase} Error</div>
          <div className="error-position">
            Line {error.position.line}, Column {error.position.column}
          </div>
          <div className="error-message">
            {error.message}
            {error.expected && error.actual && (
              <span>
                {' '}(expected: {error.expected}, got: {error.actual})
              </span>
            )}
            {error.variableName && (
              <span> (variable: {error.variableName})</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
