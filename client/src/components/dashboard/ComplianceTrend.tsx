import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { TrendPoint } from '../../services/dashboardApi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface ComplianceTrendProps {
  trend: TrendPoint[];
}

function ComplianceTrend({ trend }: ComplianceTrendProps) {
  if (trend.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          30-Day Compliance Trend
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
          No trend data available
        </div>
      </div>
    );
  }

  const labels = trend.map((point) => {
    const date = new Date(point.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Compliance Rate',
        data: trend.map((point) => point.rate),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          callback: (value: string | number) => `${value}%`,
          color: '#9ca3af',
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.15)',
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          color: '#9ca3af',
        },
        grid: {
          display: false,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            return `Rate: ${context.parsed.y}%`;
          },
        },
      },
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        30-Day Compliance Trend
      </h3>
      <div className="h-64">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}

export default ComplianceTrend;
