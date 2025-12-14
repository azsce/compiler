/**
 * Compiler Web Worker
 * 
 * Runs the compiler pipeline in a background thread to keep the UI responsive.
 * Handles WorkerRequest messages and posts WorkerResponse results.
 */

import { compile } from '../compiler/compiler';
import type { WorkerRequest, WorkerResponse, CompilationResult } from '../compiler/types';

/**
 * Current request ID being processed.
 * Used to track and potentially ignore stale requests.
 */
let currentRequestId: number | null = null;

/**
 * Handle incoming messages from the main thread
 */
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  
  // Track the current request ID for cancellation support
  currentRequestId = request.id;
  
  try {
    // Run the compiler pipeline
    const result: CompilationResult = compile(request.source);
    
    // Only post response if this request is still current (not cancelled)
    if (currentRequestId === request.id) {
      const response: WorkerResponse = {
        id: request.id,
        result,
      };
      
      self.postMessage(response);
    }
  } catch (error) {
    // Handle unexpected errors in the compiler
    if (currentRequestId === request.id) {
      const errorResult: CompilationResult = {
        tokens: [],
        ast: null,
        symbolTable: null,
        annotatedAst: null,
        errors: [{
          phase: 'lexical',
          message: error instanceof Error ? error.message : 'Unknown compilation error',
          position: { line: 1, column: 1 },
        }],
      };
      
      const response: WorkerResponse = {
        id: request.id,
        result: errorResult,
      };
      
      self.postMessage(response);
    }
  }
};

/**
 * Handle worker errors
 */
self.onerror = (event) => {
  const message = typeof event === 'string' ? event : (event as ErrorEvent).message;
  console.error('Compiler worker error:', message);
};
