import type { ASTNode } from '../compiler/types';

export interface ASTViewerProps {
  ast: ASTNode[];
}

interface ASTNodeViewProps {
  node: ASTNode;
  depth?: number;
}

function ASTNodeView({ node, depth = 0 }: ASTNodeViewProps) {
  const indent = { marginLeft: `${depth * 16}px` };

  switch (node.kind) {
    case 'Assignment':
      return (
        <div className="ast-node" style={indent}>
          <span className="ast-node-kind">Assignment</span>
          <span className="ast-node-value">name: {node.name}</span>
          <ASTNodeView node={node.value} depth={depth + 1} />
        </div>
      );

    case 'BinaryExpr':
      return (
        <div className="ast-node" style={indent}>
          <span className="ast-node-kind">BinaryExpr</span>
          <span className="ast-node-value">op: {node.operator}</span>
          {node.resolvedType && (
            <span className="ast-node-type">: {node.resolvedType}</span>
          )}
          <div style={{ marginLeft: `${(depth + 1) * 16}px` }}>
            <span style={{ color: '#888' }}>left:</span>
          </div>
          <ASTNodeView node={node.left} depth={depth + 2} />
          <div style={{ marginLeft: `${(depth + 1) * 16}px` }}>
            <span style={{ color: '#888' }}>right:</span>
          </div>
          <ASTNodeView node={node.right} depth={depth + 2} />
        </div>
      );

    case 'UnaryExpr':
      return (
        <div className="ast-node" style={indent}>
          <span className="ast-node-kind">UnaryExpr</span>
          <span className="ast-node-value">op: {node.operator}</span>
          {node.resolvedType && (
            <span className="ast-node-type">: {node.resolvedType}</span>
          )}
          <ASTNodeView node={node.operand} depth={depth + 1} />
        </div>
      );

    case 'Literal':
      return (
        <div className="ast-node" style={indent}>
          <span className="ast-node-kind">Literal</span>
          <span className="ast-node-value">{node.value}</span>
          <span className="ast-node-type">: {node.dataType}</span>
        </div>
      );

    case 'Variable':
      return (
        <div className="ast-node" style={indent}>
          <span className="ast-node-kind">Variable</span>
          <span className="ast-node-value">{node.name}</span>
          {node.resolvedType && (
            <span className="ast-node-type">: {node.resolvedType}</span>
          )}
        </div>
      );

    default:
      return null;
  }
}

export function ASTViewer({ ast }: ASTViewerProps) {
  if (ast.length === 0) {
    return (
      <div className="placeholder">
        No AST nodes produced
      </div>
    );
  }

  return (
    <div className="ast-viewer">
      {ast.map((node, index) => (
        <div key={index} style={{ marginBottom: '16px' }}>
          <ASTNodeView node={node} />
        </div>
      ))}
    </div>
  );
}
