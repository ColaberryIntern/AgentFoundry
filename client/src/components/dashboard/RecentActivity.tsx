import type { ComplianceRecord } from '../../services/dashboardApi';
import { sanitize } from '../../utils/sanitize';

interface RecentActivityProps {
  records: ComplianceRecord[];
}

const statusBadge: Record<string, string> = {
  compliant: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  non_compliant: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  review: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

function statusLabel(status: string): string {
  switch (status) {
    case 'compliant':
      return 'Compliant';
    case 'non_compliant':
      return 'Non-Compliant';
    case 'pending':
      return 'Pending';
    case 'review':
      return 'Review';
    default:
      return status;
  }
}

function RecentActivity({ records }: RecentActivityProps) {
  const displayed = records.slice(0, 10);

  if (displayed.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recent Activity
        </h3>
        <p className="text-gray-400 dark:text-gray-500 text-center py-8">
          No recent compliance updates
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Recent Activity
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
              <th className="pb-3 pr-4 font-medium">Type</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Regulation</th>
              <th className="pb-3 pr-4 font-medium">Last Checked</th>
              <th className="pb-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((record) => (
              <tr
                key={record.id}
                className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
              >
                <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                  {sanitize(record.complianceType)}
                </td>
                <td className="py-3 pr-4">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusBadge[record.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}
                  >
                    {statusLabel(record.status)}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                  {record.regulationId ? sanitize(record.regulationId) : '--'}
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                  {record.lastChecked
                    ? new Date(record.lastChecked).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '--'}
                </td>
                <td className="py-3 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                  {record.details ? sanitize(record.details) : '--'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentActivity;
