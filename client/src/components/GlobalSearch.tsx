import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSuggestions } from '../store/searchSlice';
import { performNLSearch, clearNLSearchResult } from '../store/adaptiveSlice';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const ENTITY_COLOR_MAP: Record<string, string> = {
  type: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  status: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  date: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  regulation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  keyword: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { suggestions } = useAppSelector((state) => state.search);
  const { nlSearchResult, nlSearchLoading } = useAppSelector((state) => state.adaptive);

  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);
  const [nlMode, setNlMode] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setInputValue('');
      setSelectedIndex(-1);
      dispatch(clearNLSearchResult());
      // Focus input after render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen, dispatch]);

  // Close on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]); // eslint-disable-line

  // Global keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKeydown);
    return () => document.removeEventListener('keydown', handleGlobalKeydown);
  }, [isOpen, onClose]);

  // Debounced suggestions (only in standard mode)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (inputValue.trim().length < 2 || nlMode) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      dispatch(fetchSuggestions(inputValue.trim()));
      setSelectedIndex(-1);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, dispatch, nlMode]);

  const navigateToSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      if (nlMode) {
        onClose();
        navigate(`/search?q=${encodeURIComponent(query.trim())}&mode=nl`);
      } else {
        onClose();
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
    },
    [navigate, onClose, nlMode],
  );

  const handleSubmit = useCallback(() => {
    const query = inputValue.trim();
    if (!query) return;

    if (nlMode) {
      dispatch(performNLSearch(query));
    }
    navigateToSearch(query);
  }, [inputValue, nlMode, dispatch, navigateToSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const visibleSuggestions = !nlMode && inputValue.trim().length >= 2 ? suggestions : [];

    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (visibleSuggestions.length > 0) {
        setSelectedIndex((prev) => Math.min(prev + 1, visibleSuggestions.length - 1));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (visibleSuggestions.length > 0) {
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && visibleSuggestions[selectedIndex]) {
        navigateToSearch(visibleSuggestions[selectedIndex]);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const visibleSuggestions = !nlMode && inputValue.trim().length >= 2 ? suggestions : [];

  const modal = (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 transition-opacity duration-150 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-transform duration-150 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-gray-200 dark:border-gray-700">
          <svg
            className="w-5 h-5 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              nlMode
                ? 'Ask in natural language, e.g. "show me failed compliance reports"'
                : 'Search compliance records, reports...'
            }
            className="flex-1 px-3 py-4 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-base"
          />
          {/* NL Mode Toggle */}
          <button
            type="button"
            onClick={() => setNlMode((prev) => !prev)}
            className={`flex-shrink-0 ml-2 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              nlMode
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
            title={nlMode ? 'Natural Language mode active' : 'Standard search mode'}
          >
            {nlMode ? 'NL' : 'Std'}
          </button>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 ml-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            Esc
          </kbd>
        </div>

        {/* NL Mode indicator */}
        {nlMode && (
          <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-800/30">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-primary-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="text-xs text-primary-700 dark:text-primary-400">
                Natural Language search is active — type your query in plain English
              </span>
            </div>
          </div>
        )}

        {/* NL Search loading indicator */}
        {nlSearchLoading && (
          <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
            <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Interpreting your query...
            </span>
          </div>
        )}

        {/* NL Search result preview */}
        {nlMode && nlSearchResult && !nlSearchLoading && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
            {/* Interpretation */}
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              {nlSearchResult.interpretation}
            </p>

            {/* Intent + Confidence */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                {nlSearchResult.intent}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(nlSearchResult.confidence * 100)}% confidence
              </span>
            </div>

            {/* Entities */}
            {nlSearchResult.entities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {nlSearchResult.entities.map((entity, idx) => (
                  <span
                    key={`${entity.type}-${idx}`}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      ENTITY_COLOR_MAP[entity.type] || ENTITY_COLOR_MAP.keyword
                    }`}
                  >
                    <span className="opacity-60 mr-1">{entity.type}:</span>
                    {entity.value}
                  </span>
                ))}
              </div>
            )}

            {/* Result count */}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {nlSearchResult.results.length} result
              {nlSearchResult.results.length !== 1 ? 's' : ''} found — press Enter to view
            </p>
          </div>
        )}

        {/* Standard Suggestions */}
        {visibleSuggestions.length > 0 && (
          <div className="max-h-64 overflow-y-auto py-2">
            {visibleSuggestions.map((suggestion, idx) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => navigateToSearch(suggestion)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${
                  idx === selectedIndex
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 mr-1">
              &uarr;
            </kbd>
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 mr-1">
              &darr;
            </kbd>
            to navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 mr-1">
              Enter
            </kbd>
            to search
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default GlobalSearch;
