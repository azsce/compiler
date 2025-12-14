/**
 * Compiler Worker Hook and Utilities
 * 
 * Provides a clean interface for using the compiler Web Worker from React components.
 * Handles request cancellation by tracking request IDs and ignoring stale responses.
 */

import type { WorkerRequest, WorkerResponse, CompilationResult } from '../compiler/types';

/**
 * Creates a compiler worker instance with request management
 */
export interface CompilerWorkerManager {
  /** Send a compilation request */
  compile: (source: string) => void;
  /** Set callback for compilation results */
  onResult: (callback: (result: CompilationResult) => void) => void;
  /** Terminate the worker */
  terminate: () => void;
  /** Check if worker is ready */
  isReady: () => boolean;
}

/**
 * Create a managed compiler worker instance
 * 
 * Handles:
 * - Request ID tracking for cancellation
 * - Ignoring stale responses from previous requests
 * - Worker lifecycle management
 */
export function createCompilerWorker(): CompilerWorkerManager {
  let worker: Worker | null = null;
  let currentRequestId = 0;
  let resultCallback: ((result: CompilationResult) => void) | null = null;
  let isWorkerReady = false;

  // Create the worker using Vite's worker import syntax
  try {
    worker = new Worker(
      new URL('./compiler.worker.ts', import.meta.url),
      { type: 'module' }
    );
    isWorkerReady = true;

    // Handle responses from the worker
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      
      // Only process response if it matches the current request ID
      // This implements request cancellation - stale responses are ignored
      if (response.id === currentRequestId && resultCallback) {
        resultCallback(response.result);
      }
    };

    // Handle worker errors
    worker.onerror = (event: ErrorEvent) => {
      console.error('Compiler worker error:', event.message);
      
      // Send error result to callback
      if (resultCallback) {
        resultCallback({
          tokens: [],
          ast: null,
          symbolTable: null,
          annotatedAst: null,
          errors: [{
            phase: 'lexical',
            message: `Worker error: ${event.message}`,
            position: { line: 1, column: 1 },
          }],
        });
      }
    };
  } catch (error) {
    console.error('Failed to create compiler worker:', error);
    isWorkerReady = false;
  }

  return {
    compile(source: string): void {
      if (!worker || !isWorkerReady) {
        // Fallback: run compilation synchronously if worker is not available
        console.warn('Worker not available, running compilation synchronously');
        import('../compiler/compiler').then(({ compile }) => {
          if (resultCallback) {
            resultCallback(compile(source));
          }
        });
        return;
      }

      // Increment request ID to cancel any pending requests
      // Previous responses with old IDs will be ignored
      currentRequestId++;

      const request: WorkerRequest = {
        id: currentRequestId,
        source,
      };

      worker.postMessage(request);
    },

    onResult(callback: (result: CompilationResult) => void): void {
      resultCallback = callback;
    },

    terminate(): void {
      if (worker) {
        worker.terminate();
        worker = null;
        isWorkerReady = false;
      }
    },

    isReady(): boolean {
      return isWorkerReady;
    },
  };
}
