import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchReports,
  createNewReport,
  fetchReport,
  clearReportsError,
} from '../store/reportsSlice';
import { reportsApi } from '../services/reportsApi';
import { sanitize } from '../utils/sanitize';
import { useAnalytics } from '../hooks/useAnalytics';

const REPORT_TYPES = [
  { value: 'compliance_summary', label: 'Compliance Summary' },
  { value: 'risk_assessment', label: 'Risk Assessment' },
  { value: 'audit_trail', label: 'Audit Trail' },
  { value: 'regulatory_status', label: 'Regulatory Status' },
] as const;

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

function formatReportType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function ReportsPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { reports, total, isLoading, error } = useAppSelector((state) => state.reports);
  const { trackPageView } = useAnalytics();

  const [reportType, setReportType] = useState('compliance_summary');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    trackPageView('reports');
  }, [trackPageView]);

  const loadReports = useCallback(() => {
    dispatch(fetchReports({ page, limit }));
  }, [dispatch, page]);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user, loadReports]);

  // Auto-refresh for queued/processing reports
  useEffect(() => {
    const pendingReports = reports.filter(
      (r) => r.status === 'queued' || r.status === 'processing',
    );
    if (pendingReports.length === 0) return;

    const interval = setInterval(() => {
      pendingReports.forEach((r) => {
        dispatch(fetchReport(r.id));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [reports, dispatch]);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleGenerate = async () => {
    dispatch(clearReportsError());
    await dispatch(createNewReport({ reportType, format }));
  };

  const handleDownload = async (downloadUrl: string) => {
    // Extract filename from the URL
    const filename = downloadUrl.split('/').pop() || downloadUrl;
    try {
      const response = await reportsApi.download(filename);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Download error is non-critical; the user can retry
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Generate and download compliance reports
        </p>
      </div>

      {/* Report Creation Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Generate New Report
        </h2>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="reportType"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Report Type
            </label>
            <select
              id="reportType"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === 'pdf'}
                  onChange={() => setFormat('pdf')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={() => setFormat('csv')}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">CSV</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="px-5 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Report History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report History</h2>
        </div>

        {reports.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 dark:text-gray-500">No reports generated yet</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {formatReportType(report.reportType)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 uppercase">
                        {report.format}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[report.status] || ''}`}
                        >
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(report.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {report.status === 'completed' && report.downloadUrl ? (
                          <button
                            onClick={() => handleDownload(report.downloadUrl!)}
                            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                          >
                            Download
                          </button>
                        ) : report.status === 'failed' ? (
                          <span className="text-red-500 dark:text-red-400 text-xs">
                            {report.errorMessage
                              ? sanitize(report.errorMessage)
                              : 'Generation failed'}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            {report.status === 'queued' ? 'Waiting...' : 'Processing...'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                  reports
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
}

export default ReportsPage;
