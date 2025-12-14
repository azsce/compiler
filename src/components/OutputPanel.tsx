import type { CompilationResult, CompilerPhase } from '../compiler/types';
import { PhaseSelector } from './PhaseSelector';
import { TokenList } from './TokenList';
import { ASTViewer } from './ASTViewer';
import { SymbolTableView } from './SymbolTableView';
import { ErrorList } from './ErrorList';

export interface OutputPanelProps {
  result: CompilationResult | null;
  selectedPhase: CompilerPhase;
  onPhaseChange: (phase: CompilerPhase) => void;
  isLoading: boolean;
  isEmptyInput?: boolean;
}

export function OutputPanel({ result, selectedPhase, onPhaseChange, isLoading, isEmptyInput = false }: OutputPanelProps) {
  // Filter errors for the selected phase
  const phaseErrors = result?.errors.filter(e => e.phase === selectedPhase) ?? [];
  const hasErrors = phaseErrors.length > 0;

  const renderContent = () => {
    // Show loading indicator
    if (isLoading) {
      return (
        <div className="loading">
          <div className="loading-spinner" />
          <span>Compiling...</span>
        </div>
      );
    }

    // Show placeholder for empty/whitespace-only input (Requirements 8.1, 8.2)
    if (isEmptyInput) {
      return (
        <div className="placeholder empty-input-message">
          Please enter a valid expression to compile
        </div>
      );
    }

    // Show placeholder if no result
    if (!result) {
      return (
        <div className="placeholder">
          Enter code in the editor to see compilation output
        </div>
      );
    }

    // Show errors first if any exist for this phase
    if (hasErrors) {
      return <ErrorList errors={phaseErrors} />;
    }

    // Render phase-specific output
    switch (selectedPhase) {
      case 'lexical':
        return <TokenList tokens={result.tokens} />;
      
      case 'syntax':
        if (!result.ast) {
          return (
            <div className="placeholder">
              No AST available (check for lexical errors)
            </div>
          );
        }
        return <ASTViewer ast={result.ast} />;
      
      case 'semantic':
        if (!result.symbolTable || !result.annotatedAst) {
          return (
            <div className="placeholder">
              No semantic analysis available (check for syntax errors)
            </div>
          );
        }
        return (
          <SymbolTableView 
            symbolTable={result.symbolTable} 
            annotatedAst={result.annotatedAst} 
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="panel output-panel">
      <PhaseSelector selected={selectedPhase} onChange={onPhaseChange} />
      <div className="output-content">
        {renderContent()}
      </div>
    </div>
  );
}
