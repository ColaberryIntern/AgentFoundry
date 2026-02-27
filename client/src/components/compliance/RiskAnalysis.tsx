import { useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { analyzeCompliance } from '../../store/recommendationsSlice';
import { setRiskAnalysis } from '../../store/complianceSlice';
import type { ComplianceGap } from '../../types/recommendations';
import type { RiskAnalysisResult } from '../../types/compliance';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

type SortField = 'riskScore' | 'severity' | 'title';
type SortDir = 'asc' | 'desc';

const SEVERITY_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function gapToRisk(gap: ComplianceGap, index: number): RiskAnalysisResult {
  const likelihood = gap.confidence;
  const impactMap: Record<string, number> = { critical: 0.95, high: 0.75, medium: 0.5, low: 0.25 };
  const impact = impactMap[gap.severity] || 0.5;
  const riskScore = Math.round(likelihood * impact * 100);

  return {
    id: gap.id || `risk-${index}`,
    title: gap.title,
    description: gap.description,
    severity: gap.severity,
    likelihood,
    impact,
    riskScore,
    category: gap.category || 'General',
    regulation: gap.regulation,
    suggestedAction: gap.suggestedAction,
  };
}

function RiskMatrix({ risks }: { risks: RiskAnalysisResult[] }) {
  // 4x4 grid: severity (x) vs likelihood (y)
  const severityLabels = ['Low', 'Medium', 'High', 'Critical'];
  const likelihoodLabels = ['High', 'Medium-High', 'Medium-Low', 'Low'];

  const getCell = (sevIdx: number, likIdx: number): RiskAnalysisResult[] => {
    const sevRange = [
      [0, 0.25],
      [0.25, 0.5],
      [0.5, 0.75],
      [0.75, 1.01],
    ];
    const likRange = [
      [0.75, 1.01],
      [0.5, 0.75],
      [0.25, 0.5],
      [0, 0.25],
    ];

    return risks.filter((r) => {
      const impactVal = r.impact;
      const likVal = r.likelihood;
      return (
        impactVal >= sevRange[sevIdx][0] &&
        impactVal < sevRange[sevIdx][1] &&
        likVal >= likRange[likIdx][0] &&
        likVal < likRange[likIdx][1]
      );
    });
  };

  const cellColor = (sevIdx: number, likIdx: number): string => {
    const score = (sevIdx + 1) * (4 - likIdx);
    if (score >= 12) return 'bg-red-100 dark:bg-red-900/20';
    if (score >= 8) return 'bg-orange-100 dark:bg-orange-900/20';
    if (score >= 4) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-green-100 dark:bg-green-900/20';
  };

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Risk Matrix (Severity vs Likelihood)
      </h4>
      <div className="overflow-x-auto">
        <div className="min-w-[400px]">
          <div className="grid grid-cols-5 gap-0.5">
            {/* Header row */}
            <div className="p-2 text-xs font-medium text-gray-500 dark:text-gray-400" />
            {severityLabels.map((label) => (
              <div
                key={label}
                className="p-2 text-xs font-medium text-center text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800"
              >
                {label}
              </div>
            ))}

            {/* Data rows */}
            {likelihoodLabels.map((likLabel, likIdx) => (
              <div key={likLabel} className="contents">
                <div className="p-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 flex items-center">
                  {likLabel}
                </div>
                {severityLabels.map((_, sevIdx) => {
                  const cellRisks = getCell(sevIdx, likIdx);
                  return (
                    <div
                      key={`${likIdx}-${sevIdx}`}
                      className={`p-2 min-h-[48px] ${cellColor(sevIdx, likIdx)} border border-gray-200 dark:border-gray-700 flex flex-wrap gap-1 items-center justify-center`}
                    >
                      {cellRisks.map((r) => (
                        <span
                          key={r.id}
                          className={`w-3 h-3 rounded-full ${SEVERITY_DOT[r.severity]}`}
                          title={`${r.title} (Score: ${r.riskScore})`}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400 px-2">
            <span>Impact (Severity) &rarr;</span>
            <span>&uarr; Likelihood</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskAnalysis() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { complianceGaps, analysisLoading } = useAppSelector((state) => state.recommendations);
  const { riskAnalysis, error } = useAppSelector((state) => state.compliance);

  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Convert compliance gaps to risk analysis items
  const risks: RiskAnalysisResult[] = useMemo(() => {
    if (riskAnalysis.length > 0) return riskAnalysis;
    return complianceGaps.map((gap, i) => gapToRisk(gap, i));
  }, [complianceGaps, riskAnalysis]);

  const sortedRisks = useMemo(() => {
    const sorted = [...risks].sort((a, b) => {
      if (sortField === 'riskScore') {
        return sortDir === 'asc' ? a.riskScore - b.riskScore : b.riskScore - a.riskScore;
      }
      if (sortField === 'severity') {
        const diff = (SEVERITY_ORDER[a.severity] || 0) - (SEVERITY_ORDER[b.severity] || 0);
        return sortDir === 'asc' ? diff : -diff;
      }
      // title
      const cmp = a.title.localeCompare(b.title);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [risks, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const handleAnalyze = () => {
    if (user) {
      dispatch(analyzeCompliance(String(user.id)));
    }
  };

  const handleGenerateRisks = () => {
    const generated = complianceGaps.map((gap, i) => gapToRisk(gap, i));
    dispatch(setRiskAnalysis(generated));
  };

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Risk Analysis
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Comprehensive risk assessment based on compliance gap analysis
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analysisLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {analysisLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </span>
            ) : (
              'Run Gap Analysis'
            )}
          </button>
          {complianceGaps.length > 0 && (
            <button
              onClick={handleGenerateRisks}
              className="px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-md transition-colors"
            >
              Generate Risk Matrix
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {risks.length === 0 && !analysisLoading && (
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No risk data available. Run a compliance gap analysis first.
          </p>
        </div>
      )}

      {risks.length > 0 && (
        <>
          <RiskMatrix risks={risks} />

          {/* Risk items table */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <th
                      className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-primary-600"
                      onClick={() => handleSort('title')}
                    >
                      Risk Item{sortArrow('title')}
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-primary-600"
                      onClick={() => handleSort('severity')}
                    >
                      Severity{sortArrow('severity')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      Likelihood
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      Impact
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-primary-600"
                      onClick={() => handleSort('riskScore')}
                    >
                      Risk Score{sortArrow('riskScore')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedRisks.map((risk) => (
                    <tr
                      key={risk.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {risk.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                            {risk.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_COLORS[risk.severity]}`}
                        >
                          {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {Math.round(risk.likelihood * 100)}%
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {Math.round(risk.impact * 100)}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            risk.riskScore >= 75
                              ? SEVERITY_COLORS.critical
                              : risk.riskScore >= 50
                                ? SEVERITY_COLORS.high
                                : risk.riskScore >= 25
                                  ? SEVERITY_COLORS.medium
                                  : SEVERITY_COLORS.low
                          }`}
                        >
                          {risk.riskScore}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {risk.category}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RiskAnalysis;
