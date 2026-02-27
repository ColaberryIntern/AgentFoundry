import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { performSearch, fetchSuggestions, setSearchQuery } from '../store/searchSlice';
import { performNLSearch, clearNLSearchResult } from '../store/adaptiveSlice';
import type { SearchParams } from '../services/searchApi';
import { useAnalytics } from '../hooks/useAnalytics';
import { useInteractionTracking } from '../hooks/useInteractionTracking';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'reports', label: 'Reports' },
] as const;

const STATUS_OPTIONS = [
  'All',
  'Compliant',
  'Non-Compliant',
  'Pending',
  'Review',
  'Completed',
  'Failed',
] as const;

const TYPE_BADGE_STYLES: Record<string, string> = {
  compliance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  reports: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const STATUS_BADGE_STYLES: Record<string, string> = {
  compliant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'non-compliant': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const ENTITY_COLOR_MAP: Record<string, string> = {
  type: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  status: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  date: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  regulation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  keyword: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

function SearchPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const {
    results,
    total,
    page,
    limit,
    query: storeQuery,
    suggestions,
    isLoading,
    error,
  } = useAppSelector((state) => state.search);
  const { nlSearchResult, nlSearchLoading } = useAppSelector((state) => state.adaptive);
  const { trackPageView, trackFeatureUse } = useAnalytics();
  const { trackSearch, trackFilterApply } = useInteractionTracking('search');

  const [inputValue, setInputValue] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState<'all' | 'compliance' | 'reports'>('all');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [nlMode, setNlMode] = useState(searchParams.get('mode') === 'nl');

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    trackPageView('search');
  }, [trackPageView]);

  // Execute search
  const executeSearch = useCallback(
    (q: string, pageNum = 1) => {
      if (!q.trim()) return;

      trackSearch(q.trim());
      trackFeatureUse('search', { query: q.trim(), mode: nlMode ? 'nl' : 'standard' });

      if (nlMode) {
        dispatch(performNLSearch(q.trim()));
        setSearchParams({ q: q.trim(), mode: 'nl' });
      } else {
        dispatch(clearNLSearchResult());
        const params: SearchParams = {
          q: q.trim(),
          page: pageNum,
          limit: 10,
        };
        if (typeFilter !== 'all') params.type = typeFilter;
        if (statusFilter !== 'All') params.status = statusFilter.toLowerCase();
        if (dateFrom) params.dateFrom = dateFrom;
        if (dateTo) params.dateTo = dateTo;

        dispatch(performSearch(params));
        setSearchParams({ q: q.trim() });
      }
      setShowSuggestions(false);
    },
    [
      dispatch,
      typeFilter,
      statusFilter,
      dateFrom,
      dateTo,
      setSearchParams,
      trackFeatureUse,
      trackSearch,
      nlMode,
    ],
  );

  // Init from URL param
  useEffect(() => {
    const qParam = searchParams.get('q');
    const modeParam = searchParams.get('mode');
    if (modeParam === 'nl') {
      setNlMode(true);
    }
    if (qParam && qParam !== inputValue) {
      setInputValue(qParam);
      dispatch(setSearchQuery(qParam));
      executeSearch(qParam);
    }
    // Only run on mount or when searchParams change
  }, []); // eslint-disable-line

  // Debounced suggestions (only in standard mode)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (inputValue.trim().length < 2 || nlMode) {
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      dispatch(fetchSuggestions(inputValue.trim()));
      setShowSuggestions(true);
      setSelectedSuggestionIndex(-1);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, dispatch, nlMode]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    executeSearch(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedSuggestionIndex];
      setInputValue(selected);
      executeSearch(selected);
    }
  };

  const handleClearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('All');
    setDateFrom('');
    setDateTo('');
  };

  const handleTypeFilterChange = (value: 'all' | 'compliance' | 'reports') => {
    setTypeFilter(value);
    trackFilterApply('type', value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    trackFilterApply('status', value);
  };

  const handlePageChange = (newPage: number) => {
    executeSearch(inputValue, newPage);
  };

  const handleNlModeToggle = () => {
    setNlMode((prev) => !prev);
    dispatch(clearNLSearchResult());
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const totalPages = Math.ceil(total / limit);
  const showNlResults = nlMode && nlSearchResult && !nlSearchLoading;
  const showStandardResults = !nlMode && !isLoading && !error && storeQuery;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Search</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Search across compliance records and reports
          </p>
        </div>
        {/* NL Mode Toggle */}
        <button
          type="button"
          onClick={handleNlModeToggle}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            nlMode
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          {nlMode ? 'Natural Language' : 'Standard Search'}
        </button>
      </div>

      {/* NL Mode hint banner */}
      {nlMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30 rounded-lg">
          <svg
            className="w-4 h-4 text-primary-500 flex-shrink-0"
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
          <span className="text-sm text-primary-700 dark:text-primary-400">
            Natural Language mode is active. Type your query in plain English, e.g. &quot;show me
            non-compliant reports from last month&quot;
          </span>
        </div>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
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
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (!nlMode && suggestions.length > 0 && inputValue.trim().length >= 2) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={
                nlMode
                  ? 'Type your query in natural language...'
                  : 'Search compliance records, reports...'
              }
              className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 dark:placeholder-gray-500"
            />

            {/* Suggestions dropdown (standard mode only) */}
            {!nlMode && showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
              >
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      idx === selectedSuggestionIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2">
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
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || nlSearchLoading || !inputValue.trim()}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Search
          </button>
        </div>
      </form>

      {/* Filter Panel (standard mode only) */}
      {!nlMode && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setFiltersExpanded((prev) => !prev)}
            className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 md:hidden"
          >
            <span>Filters</span>
            <svg
              className={`w-4 h-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <div className={`px-6 py-4 ${filtersExpanded ? 'block' : 'hidden md:block'}`}>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-end">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <div className="flex gap-1 rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleTypeFilterChange(opt.value as typeof typeFilter)}
                      className={`px-3 py-1.5 text-sm transition-colors ${
                        typeFilter === opt.value
                          ? 'bg-primary-600 text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label
                  htmlFor="statusFilter"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Status
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label
                  htmlFor="dateFrom"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  From
                </label>
                <input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="dateTo"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  To
                </label>
                <input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Clear Filters */}
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading (both modes) */}
      {(isLoading || nlSearchLoading) && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {nlMode ? 'Interpreting your query...' : 'Searching...'}
            </p>
          </div>
        </div>
      )}

      {/* Error (standard mode) */}
      {!nlMode && error && !isLoading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <p className="text-red-800 dark:text-red-400 font-medium">Search failed</p>
          <p className="text-red-600 dark:text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={() => executeSearch(inputValue)}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* NL Search Results */}
      {showNlResults && nlSearchResult && (
        <div className="space-y-4">
          {/* NL Interpretation Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            {/* Interpretation text */}
            <p className="text-sm text-gray-700 dark:text-gray-300 italic mb-3">
              {nlSearchResult.interpretation}
            </p>

            {/* Intent + Confidence */}
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                Intent: {nlSearchResult.intent}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {Math.round(nlSearchResult.confidence * 100)}% confidence
              </span>
            </div>

            {/* Entities */}
            {nlSearchResult.entities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {nlSearchResult.entities.map((entity, idx) => (
                  <span
                    key={`${entity.type}-${idx}`}
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      ENTITY_COLOR_MAP[entity.type] || ENTITY_COLOR_MAP.keyword
                    }`}
                  >
                    <span className="opacity-60 mr-1">{entity.type}:</span>
                    {entity.value}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Result count */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {nlSearchResult.results.length}{' '}
            {nlSearchResult.results.length === 1 ? 'result' : 'results'} found
          </p>

          {nlSearchResult.results.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No results found for your query
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Try rephrasing your question or use different keywords
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {nlSearchResult.results.map((result) => (
                <div
                  key={result.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_STYLES[result.type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                          {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_STYLES[result.status.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
                        >
                          {result.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {result.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                        {formatDate(result.updatedAt)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${Math.round(result.score * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {Math.round(result.score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Standard Results */}
      {showStandardResults && (
        <div className="space-y-4">
          {/* Result count */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {total} {total === 1 ? 'result' : 'results'} for &apos;{storeQuery}&apos;
          </p>

          {results.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                No results found for &apos;{storeQuery}&apos;
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Try different keywords or adjust your filters
              </p>
            </div>
          ) : (
            <>
              {/* Result cards */}
              <div className="space-y-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_STYLES[result.type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
                          >
                            {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE_STYLES[result.status.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
                          >
                            {result.status}
                          </span>
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {result.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {result.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                          {formatDate(result.createdAt)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${Math.round(result.matchScore * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {Math.round(result.matchScore * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                    results
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === totalPages}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Initial empty state -- no search performed yet */}
      {!isLoading && !nlSearchLoading && !error && !storeQuery && !nlSearchResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-12 text-center">
          <svg
            className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {nlMode
              ? 'Ask a question in natural language to get started'
              : 'Enter a search query to get started'}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {nlMode
              ? 'e.g. "Show me non-compliant reports from January"'
              : 'Search across compliance records and reports'}
          </p>
        </div>
      )}
    </div>
  );
}

export default SearchPage;
