import type { SymbolTable, ASTNode } from '../compiler/types';

export interface SymbolTableViewProps {
  symbolTable: SymbolTable;
  annotatedAst: ASTNode[];
}

export function SymbolTableView({ symbolTable, annotatedAst }: SymbolTableViewProps) {
  const entries = Array.from(symbolTable.values());

  return (
    <div className="symbol-table">
      <h3 style={{ margin: '0 0 12px 0', color: '#ccc', fontSize: '14px' }}>
        Symbol Table
      </h3>
      
      {entries.length === 0 ? (
        <div className="placeholder" style={{ height: 'auto', padding: '16px' }}>
          No variables defined
        </div>
      ) : (
        <>
          <div className="symbol-table-header">
            <span className="symbol-name">Name</span>
            <span className="symbol-type">Type</span>
            <span className="symbol-position">Defined At</span>
          </div>
          {entries.map((entry) => (
            <div key={entry.name} className="symbol-entry">
              <span className="symbol-name">{entry.name}</span>
              <span className="symbol-type">{entry.type}</span>
              <span className="symbol-position">
                L{entry.definedAt.line}:C{entry.definedAt.column}
              </span>
            </div>
          ))}
        </>
      )}

      <h3 style={{ margin: '24px 0 12px 0', color: '#ccc', fontSize: '14px' }}>
        Annotated AST ({annotatedAst.length} node{annotatedAst.length !== 1 ? 's' : ''})
      </h3>
      <div style={{ color: '#888', fontSize: '12px' }}>
        View the Syntax tab for full AST structure with type annotations
      </div>
    </div>
  );
}
