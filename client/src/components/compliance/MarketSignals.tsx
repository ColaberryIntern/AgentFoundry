import { useState, useRef, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMarketSignals } from '../../store/complianceSlice';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const INDUSTRIES = [
  'Healthcare',
  'Finance',
  'Technology',
  'Energy',
  'Manufacturing',
  'Telecommunications',
  'Retail',
  'Education',
];

function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return '\u2197';
    case 'down':
      return '\u2198';
    case 'stable':
      return '\u2192';
  }
}

function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'text-green-600 dark:text-green-400';
    case 'down':
      return 'text-red-600 dark:text-red-400';
    case 'stable':
      return 'text-yellow-600 dark:text-yellow-400';
  }
}

function getTrendLabel(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return 'Trending Up';
    case 'down':
      return 'Trending Down';
    case 'stable':
      return 'Stable';
  }
}

function MarketSignals() {
  const dispatch = useAppDispatch();
  const { marketSignals, marketSignalsLoading, error } = useAppSelector(
    (state) => state.compliance,
  );
  const [selectedIndustry, setSelectedIndustry] = useState('Finance');
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Determine overall trend from last few signals
  const overallTrend = (() => {
    if (marketSignals.length < 2) return 'stable';
    const lastFew = marketSignals.slice(-3);
    const upCount = lastFew.filter((s) => s.trend === 'up').length;
    const downCount = lastFew.filter((s) => s.trend === 'down').length;
    if (upCount > downCount) return 'up';
    if (downCount > upCount) return 'down';
    return 'stable';
  })() as 'up' | 'down' | 'stable';

  // Average confidence
  const avgConfidence =
    marketSignals.length > 0
      ? Math.round(
          (marketSignals.reduce((sum, s) => sum + s.confidence, 0) / marketSignals.length) * 100,
        )
      : 0;

  const handleAnalyze = () => {
    dispatch(fetchMarketSignals({ industry: selectedIndustry }));
  };

  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const chartData = {
    labels: marketSignals.map((s) => {
      const date = new Date(s.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Market Signal Value',
        data: marketSignals.map((s) => s.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Confidence',
        data: marketSignals.map((s) => s.confidence * 100),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderDash: [5, 5],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.2)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Market Signals
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            AI-powered market signal predictions for regulatory impact
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
          <button
            onClick={handleAnalyze}
            disabled={marketSignalsLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {marketSignalsLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              'Analyze'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Summary indicators */}
      {marketSignals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall Trend</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl ${getTrendColor(overallTrend)}`}>
                {getTrendIcon(overallTrend)}
              </span>
              <span className={`text-sm font-semibold ${getTrendColor(overallTrend)}`}>
                {getTrendLabel(overallTrend)}
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Average Confidence</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {avgConfidence}%
              </span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${avgConfidence}%` }}
                />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Data Points</p>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {marketSignals.length}
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      {marketSignals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="h-64 sm:h-80">
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {marketSignals.length === 0 && !marketSignalsLoading && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg
            className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select an industry and click "Analyze" to view market signals.
          </p>
        </div>
      )}

      {/* Individual signal details */}
      {marketSignals.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Signal Details
            </h4>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
            {marketSignals.map((signal, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center gap-4">
                <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">
                  {new Date(signal.date).toLocaleDateString()}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-16 shrink-0">
                  {signal.value.toFixed(1)}
                </span>
                <span className={`text-sm ${getTrendColor(signal.trend)} w-8 shrink-0`}>
                  {getTrendIcon(signal.trend)}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Confidence:</span>
                    <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${signal.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-300">
                      {Math.round(signal.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MarketSignals;
