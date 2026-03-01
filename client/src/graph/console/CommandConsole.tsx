import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { useReactFlow } from '@xyflow/react';
import { parseCommand } from './CommandParser';
import { commandRegistry } from './CommandRegistry';
import { registerFilterCommands } from './commands/filterCommands';
import { registerNavigateCommands } from './commands/navigateCommands';
import { registerHighlightCommands } from './commands/highlightCommands';
import { registerViewCommands } from './commands/viewCommands';
import { registerSimulationCommands } from './commands/simulationCommands';

// Register all commands once
let registered = false;
function ensureRegistered() {
  if (registered) return;
  registerFilterCommands();
  registerNavigateCommands();
  registerHighlightCommands();
  registerViewCommands();
  registerSimulationCommands();
  registered = true;
}

interface HistoryEntry {
  input: string;
  output: string;
  ok: boolean;
}

export function CommandConsole() {
  ensureRegistered();

  const dispatch = useAppDispatch();
  const reactFlow = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Toggle with backtick
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '`' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Auto-focus on open
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Scroll history to bottom
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const execute = useCallback(
    (raw: string) => {
      const cmd = parseCommand(raw);
      if (!cmd) return;

      // Special: help
      if (cmd.type === 'help') {
        const lines = commandRegistry.getHelp();
        setHistory((h) => [...h, { input: raw, output: lines.join('\n'), ok: true }]);
        return;
      }

      const result = commandRegistry.execute(cmd, dispatch);

      // Handle zoom commands through ReactFlow
      if (result.ok && result.message.startsWith('zoom:')) {
        const action = result.message.split(':')[1];
        if (action === 'fit') reactFlow.fitView({ padding: 0.2 });
        if (action === 'in') reactFlow.zoomIn();
        if (action === 'out') reactFlow.zoomOut();
        setHistory((h) => [...h, { input: raw, output: `Zoom: ${action}`, ok: true }]);
        return;
      }

      setHistory((h) => [...h, { input: raw, output: result.message, ok: result.ok }]);
    },
    [dispatch, reactFlow],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    execute(input.trim());
    setInput('');
    setHistoryIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    // History navigation
    const pastInputs = history.map((h) => h.input);
    if (e.key === 'ArrowUp' && pastInputs.length > 0) {
      e.preventDefault();
      const next = historyIdx < pastInputs.length - 1 ? historyIdx + 1 : historyIdx;
      setHistoryIdx(next);
      setInput(pastInputs[pastInputs.length - 1 - next]);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        const next = historyIdx - 1;
        setHistoryIdx(next);
        setInput(pastInputs[pastInputs.length - 1 - next]);
      }
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-[var(--surface-primary)]/60 backdrop-blur-md border border-white/5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/10 transition-colors"
        title="Open command console (` key)"
      >
        &gt;_ Console
      </button>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-[var(--surface-primary)]/95 backdrop-blur-xl border-t border-white/10">
      {/* History */}
      {history.length > 0 && (
        <div
          ref={historyRef}
          className="max-h-48 overflow-y-auto px-4 pt-2 space-y-1 font-mono text-xs"
        >
          {history.map((entry, i) => (
            <div key={i}>
              <div className="text-blue-400">&gt; {entry.input}</div>
              <div className={entry.ok ? 'text-emerald-400/70' : 'text-red-400/70'}>
                {entry.output.split('\n').map((line, j) => (
                  <div key={j}>{line}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center px-4 py-2 gap-2">
        <span className="text-blue-400 text-sm font-mono">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command... (help for list, Esc to close)"
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)]/50 outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          ESC
        </button>
      </form>
    </div>
  );
}
