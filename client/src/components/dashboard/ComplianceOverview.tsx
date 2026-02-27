import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { ComplianceRecord } from '../../services/dashboardApi';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ComplianceOverviewProps {
  records: ComplianceRecord[];
}

function ComplianceOverview({ records }: ComplianceOverviewProps) {
  if (records.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Compliance Overview
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const statusCounts = records.reduce(
    (acc, record) => {
      acc[record.status] = (acc[record.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const total = records.length;
  const labels = ['Compliant', 'Non-Compliant', 'Pending', 'Review'];
  const keys: Array<'compliant' | 'non_compliant' | 'pending' | 'review'> = [
    'compliant',
    'non_compliant',
    'pending',
    'review',
  ];
  const dataValues = keys.map((key) => statusCounts[key] || 0);

  const data = {
    labels,
    datasets: [
      {
        data: dataValues,
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)', // green
          'rgba(239, 68, 68, 0.8)', // red
          'rgba(234, 179, 8, 0.8)', // yellow
          'rgba(59, 130, 246, 0.8)', // blue
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(59, 130, 246, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          color: '#9ca3af',
        },
      },
      tooltip: {
        callbacks: {
          label: (context: { label?: string; parsed: number }) => {
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
            return `${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '60%',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Compliance Overview
      </h3>
      <div className="h-64">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}

export default ComplianceOverview;
