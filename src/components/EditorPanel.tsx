import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

// Custom syntax highlighting for our mini math language
const mathHighlightStyle = HighlightStyle.define([
  { tag: tags.number, color: '#b5cea8' },
  { tag: tags.variableName, color: '#9cdcfe' },
  { tag: tags.operator, color: '#d4d4d4' },
  { tag: tags.paren, color: '#ffd700' },
  { tag: tags.comment, color: '#6a9955', fontStyle: 'italic' },
]);

// Dark theme for the editor
const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    height: '100%',
  },
  '.cm-content': {
    caretColor: '#aeafad',
    fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
    fontSize: '14px',
    padding: '8px 0',
  },
  '.cm-cursor': {
    borderLeftColor: '#aeafad',
  },
  '.cm-activeLine': {
    backgroundColor: '#2a2d2e',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2d2e',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e1e',
    color: '#858585',
    border: 'none',
    borderRight: '1px solid #333',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 16px',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: '#264f78',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#515c6a',
  },
}, { dark: true });

export function EditorPanel({ value, onChange }: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isExternalUpdate = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isExternalUpdate.current) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        syntaxHighlighting(mathHighlightStyle),
        darkTheme,
        updateListener,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update editor content when value prop changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      isExternalUpdate.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      });
      isExternalUpdate.current = false;
    }
  }, [value]);

  return (
    <div className="panel editor-panel" ref={containerRef} />
  );
}
