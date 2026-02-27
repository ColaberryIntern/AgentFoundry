import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchSuggestions } from '../store/searchSlice';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { suggestions } = useAppSelector((state) => state.search);

  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isVisible, setIsVisible] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setInputValue('');
      setSelectedIndex(-1);
      // Focus input after render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

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

  // Debounced suggestions
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (inputValue.trim().length < 2) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      dispatch(fetchSuggestions(inputValue.trim()));
      setSelectedIndex(-1);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, dispatch]);

  const navigateToSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;
      onClose();
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    },
    [navigate, onClose],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const visibleSuggestions = inputValue.trim().length >= 2 ? suggestions : [];

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
        navigateToSearch(inputValue);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const visibleSuggestions = inputValue.trim().length >= 2 ? suggestions : [];

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
            placeholder="Search compliance records, reports..."
            className="flex-1 px-3 py-4 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            Esc
          </kbd>
        </div>

        {/* Suggestions */}
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
