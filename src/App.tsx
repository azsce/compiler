import { useState, useEffect, useCallback, useRef } from 'react';
import Split from 'react-split';
import './App.css';
import type { CompilationResult, CompilerPhase } from './compiler/types';
import { createCompilerWorker, type CompilerWorkerManager } from './workers/useCompilerWorker';
import { EditorPanel } from './components/EditorPanel';
import { OutputPanel } from './components/OutputPanel';

const DEFAULT_CODE = `// Mini Math Compiler
// Try some expressions:
x = 42
y = 3.14
result = x + y * 2
`;

function App() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [result, setResult] = useState<CompilationResult | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<CompilerPhase>('lexical');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmptyInput, setIsEmptyInput] = useState(false);
  
  const workerRef = useRef<CompilerWorkerManager | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize worker on mount
  useEffect(() => {
    workerRef.current = createCompilerWorker();
    
    workerRef.current.onResult((compilationResult) => {
      setResult(compilationResult);
      setIsLoading(false);
    });

    // Initial compilation
    if (code.trim()) {
      setIsLoading(true);
      workerRef.current.compile(code);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Handle code changes with debounce
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set up new debounce timer (300ms as per requirements)
    debounceTimerRef.current = setTimeout(() => {
      // Check for empty or whitespace-only input (Requirements 8.1, 8.2, 8.3)
      const isInputEmpty = !newCode.trim();
      setIsEmptyInput(isInputEmpty);
      
      if (isInputEmpty) {
        // Skip compilation for invalid input and clear result
        setResult(null);
        setIsLoading(false);
      } else {
        setIsLoading(true);
        workerRef.current?.compile(newCode);
      }
    }, 300);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Mini Math Compiler</h1>
      </header>
      <Split
        className="split-container"
        sizes={[50, 50]}
        minSize={200}
        gutterSize={8}
        direction="horizontal"
      >
        <EditorPanel value={code} onChange={handleCodeChange} />
        <OutputPanel
          result={result}
          selectedPhase={selectedPhase}
          onPhaseChange={setSelectedPhase}
          isLoading={isLoading}
          isEmptyInput={isEmptyInput}
        />
      </Split>
    </div>
  );
}

export default App;
