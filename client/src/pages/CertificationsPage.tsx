import { useEffect, useState } from 'react';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { registryApi } from '../services/registryApi';

interface CertRecord {
  id: string;
  agentVariantId: string;
  certificationType: string;
  complianceFramework: string;
  bestPracticeScore: number;
  auditPassed: boolean;
  findings: unknown;
  expiryDate: string | null;
  lastReviewed: string | null;
  variant?: { name: string; certificationStatus: string };
}

type CertTypeFilter =
  | ''
  | 'regulatory_compliance'
  | 'security_audit'
  | 'performance_benchmark'
  | 'data_governance';

export default function CertificationsPage() {
  const [certifications, setCertifications] = useState<CertRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [certType, setCertType] = useState<CertTypeFilter>('');

  useEffect(() => {
    setLoading(true);
    registryApi
      .getCertifications({
        page,
        limit: 20,
        ...(certType ? { certification_type: certType } : {}),
      })
      .then((res) => {
        setCertifications(res.data?.data || []);
        setTotal(res.data?.pagination?.total || 0);
      })
      .catch(() => setCertifications([]))
      .finally(() => setLoading(false));
  }, [page, certType]);

  const totalPages = Math.ceil(total / 20);

  function isExpiringSoon(date: string | null): boolean {
    if (!date) return false;
    const diff = new Date(date).getTime() - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000; // 30 days
  }

  function isExpired(date: string | null): boolean {
    if (!date) return false;
    return new Date(date).getTime() < Date.now();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Certifications</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Agent variant certification records and compliance status
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={certType}
          onChange={(e) => {
            setCertType(e.target.value as CertTypeFilter);
            setPage(1);
          }}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[var(--text-primary)]"
        >
          <option value="">All Types</option>
          <option value="regulatory_compliance">Regulatory Compliance</option>
          <option value="security_audit">Security Audit</option>
          <option value="performance_benchmark">Performance Benchmark</option>
          <option value="data_governance">Data Governance</option>
        </select>
        <span className="text-sm text-[var(--text-muted)]">{total} total</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certifications.length === 0 ? (
        <GlassCard>
          <p className="text-sm text-[var(--text-secondary)] text-center py-12">
            No certifications found
          </p>
        </GlassCard>
      ) : (
        <GlassCard padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Framework
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Type
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Score
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Audit
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Expiry
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-[var(--text-muted)] uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {certifications.map((cert) => (
                  <tr
                    key={cert.id}
                    className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="p-3">
                      <span className="font-medium text-[var(--text-primary)]">
                        {cert.complianceFramework}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-secondary)] capitalize">
                      {cert.certificationType?.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3">
                      <span
                        className={`font-mono font-medium ${
                          cert.bestPracticeScore >= 80
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : cert.bestPracticeScore >= 50
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {cert.bestPracticeScore?.toFixed(1)}
                      </span>
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        variant={cert.auditPassed ? 'certified' : 'failed'}
                        label={cert.auditPassed ? 'Passed' : 'Failed'}
                      />
                    </td>
                    <td className="p-3">
                      {cert.expiryDate ? (
                        <span
                          className={`text-sm ${
                            isExpired(cert.expiryDate)
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : isExpiringSoon(cert.expiryDate)
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {new Date(cert.expiryDate).toLocaleDateString()}
                          {isExpired(cert.expiryDate) && ' (expired)'}
                          {isExpiringSoon(cert.expiryDate) &&
                            !isExpired(cert.expiryDate) &&
                            ' (expiring)'}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">--</span>
                      )}
                    </td>
                    <td className="p-3">
                      {cert.variant?.certificationStatus ? (
                        <StatusBadge
                          variant={
                            cert.variant.certificationStatus === 'certified'
                              ? 'certified'
                              : cert.variant.certificationStatus === 'pending'
                                ? 'pending'
                                : cert.variant.certificationStatus === 'expired'
                                  ? 'expired'
                                  : cert.variant.certificationStatus === 'revoked'
                                    ? 'revoked'
                                    : 'uncertified'
                          }
                        />
                      ) : (
                        <StatusBadge variant="uncertified" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
