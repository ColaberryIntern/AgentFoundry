export function EmptyPanel() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <svg
        className="w-10 h-10 text-[var(--text-muted)] mb-3 opacity-40"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
        />
      </svg>
      <p className="text-sm text-[var(--text-muted)]">Click a node to view details</p>
      <p className="text-xs text-[var(--text-muted)] mt-1 opacity-60">
        Double-click to expand &middot; Alt+click to isolate
      </p>
    </div>
  );
}
