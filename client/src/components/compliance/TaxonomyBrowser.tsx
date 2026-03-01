import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { classifyRegulations } from '../../store/complianceSlice';
import { fetchIndustries } from '../../store/registrySlice';
import type { TaxonomyCategory, NaicsIndustry } from '../../types/compliance';

function generateSampleClassification(regulations: string[]): TaxonomyCategory[] {
  const categories: TaxonomyCategory[] = [
    {
      id: 'cat-privacy',
      name: 'Data Privacy & Protection',
      description:
        'Regulations governing personal data collection, processing, storage, and deletion rights.',
      similarity: 0.92,
      parentCategory: 'Privacy',
      regulations: [],
    },
    {
      id: 'cat-financial',
      name: 'Financial Compliance',
      description:
        'Financial reporting, audit requirements, and internal controls for publicly traded companies.',
      similarity: 0.85,
      parentCategory: 'Finance',
      regulations: [],
    },
    {
      id: 'cat-health',
      name: 'Healthcare Privacy',
      description:
        'Patient health information protection, electronic health records, and healthcare provider obligations.',
      similarity: 0.88,
      parentCategory: 'Healthcare',
      regulations: [],
    },
    {
      id: 'cat-consumer',
      name: 'Consumer Rights',
      description:
        'Consumer data access, deletion, opt-out rights, and business transparency obligations.',
      similarity: 0.78,
      parentCategory: 'Privacy',
      regulations: [],
    },
    {
      id: 'cat-cybersecurity',
      name: 'Cybersecurity Standards',
      description:
        'Technical security controls, incident response, and risk management frameworks.',
      similarity: 0.71,
      parentCategory: 'Security',
      regulations: [],
    },
  ];
  // Distribute input regulations across categories
  regulations.forEach((reg, i) => {
    categories[i % categories.length].regulations.push(reg);
  });
  return categories.filter((c) => c.regulations.length > 0);
}

function CategoryCard({
  category,
  expanded,
  onToggle,
}: {
  category: TaxonomyCategory;
  expanded: boolean;
  onToggle: () => void;
}) {
  const similarityPercent = Math.round(category.similarity * 100);
  const similarityColor =
    similarityPercent >= 80
      ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30'
      : similarityPercent >= 50
        ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30'
        : 'text-gray-700 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {category.name}
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${similarityColor}`}
          >
            {similarityPercent}% match
          </span>
          {category.parentCategory && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
              {category.parentCategory}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 dark:text-gray-400 transform transition-transform shrink-0 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 mb-3">
            {category.description}
          </p>

          {/* Similarity bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Similarity Score</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {similarityPercent}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  similarityPercent >= 80
                    ? 'bg-green-500'
                    : similarityPercent >= 50
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                }`}
                style={{ width: `${similarityPercent}%` }}
              />
            </div>
          </div>

          {/* Related regulations */}
          {category.regulations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Related Regulations ({category.regulations.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {category.regulations.map((reg) => (
                  <span
                    key={reg}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  >
                    {reg}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IndustryNode({ industry, depth = 0 }: { industry: NaicsIndustry; depth?: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = industry.children && industry.children.length > 0;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors rounded group"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <svg
          className={`w-3 h-3 text-gray-400 group-hover:text-blue-500 transform transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
          {industry.code}
        </span>
        <span className="text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
          {industry.title}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto shrink-0">
          L{industry.level}
        </span>
      </button>
      {expanded && hasChildren && (
        <div>
          {industry.children!.map((child) => (
            <IndustryNode key={child.code} industry={child} depth={depth + 1} />
          ))}
        </div>
      )}
      {expanded && !hasChildren && (
        <div
          className="text-xs text-gray-400 dark:text-gray-500 py-2 italic"
          style={{ paddingLeft: `${32 + depth * 20}px` }}
        >
          No sub-industries at this level. Sector {industry.code} — {industry.title}.
        </div>
      )}
    </div>
  );
}

function TaxonomyBrowser() {
  const dispatch = useAppDispatch();
  const {
    taxonomyCategories: rawCategories,
    taxonomyLoading,
    error,
  } = useAppSelector((state) => state.compliance);
  const { industries: rawIndustries, industriesLoading } = useAppSelector(
    (state) => state.registry,
  );
  const taxonomyCategories = rawCategories ?? [];
  const industries = rawIndustries ?? [];

  const [activeTab, setActiveTab] = useState<'industry' | 'classification'>('industry');
  const [inputText, setInputText] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sampleCategories, setSampleCategories] = useState<TaxonomyCategory[]>([]);
  const [isSampleData, setIsSampleData] = useState(false);

  // Load NAICS industries on mount
  useEffect(() => {
    if (industries.length === 0) {
      dispatch(fetchIndustries({ level: 2, limit: 100 }));
    }
  }, [dispatch, industries.length]);

  const handleClassify = () => {
    const regulations = inputText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (regulations.length > 0) {
      setIsSampleData(false);
      setSampleCategories([]);
      dispatch(classifyRegulations(regulations)).then((result) => {
        if (result.meta.requestStatus === 'rejected') {
          const sample = generateSampleClassification(regulations);
          setSampleCategories(sample);
          setIsSampleData(true);
        }
      });
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Use real categories if available, otherwise sample
  const displayCategories = taxonomyCategories.length > 0 ? taxonomyCategories : sampleCategories;

  const expandAll = () => {
    setExpandedIds(new Set(displayCategories.map((c) => c.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  // Group by parent category
  const grouped = displayCategories.reduce<Record<string, TaxonomyCategory[]>>((acc, cat) => {
    const key = cat.parentCategory || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Taxonomy Browser
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Browse industry taxonomy (NAICS) or classify regulations with AI
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('industry')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'industry'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Industry Taxonomy
        </button>
        <button
          onClick={() => setActiveTab('classification')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'classification'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          AI Classification
        </button>
      </div>

      {/* Industry Taxonomy Tab */}
      {activeTab === 'industry' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              NAICS 2022 Industry Classification ({industries.length} sectors)
            </p>
          </div>

          {industriesLoading && (
            <div className="text-center py-8">
              <span className="w-6 h-6 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin inline-block" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Loading industries...</p>
            </div>
          )}

          {!industriesLoading && industries.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700/50 max-h-[500px] overflow-y-auto">
              {industries.map((ind) => (
                <IndustryNode key={ind.code} industry={ind} />
              ))}
            </div>
          )}

          {!industriesLoading && industries.length === 0 && (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No industry data available. Deploy the registry to populate NAICS taxonomy.
              </p>
            </div>
          )}
        </div>
      )}

      {/* AI Classification Tab */}
      {activeTab === 'classification' && (
        <>
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Enter regulation names below (one per line) and click <strong>Classify</strong> to
              automatically categorize them into compliance taxonomy groups using AI.
            </p>
          </div>

          {/* Input area */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <label
              htmlFor="regulation-input"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Regulation names or descriptions (one per line)
            </label>
            <textarea
              id="regulation-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`GDPR Article 17 - Right to Erasure\nHIPAA Privacy Rule\nSOX Section 404\nCCPA Consumer Rights`}
              className="w-full h-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {inputText.split('\n').filter((l) => l.trim()).length} regulation(s) entered
              </span>
              <button
                onClick={handleClassify}
                disabled={taxonomyLoading || !inputText.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {taxonomyLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Classifying...
                  </span>
                ) : (
                  'Classify'
                )}
              </button>
            </div>
          </div>

          {error && !isSampleData && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {isSampleData && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                Showing sample results — AI model server not connected. Deploy the model server for
                live classification.
              </p>
            </div>
          )}

          {/* Results */}
          {displayCategories.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Classification Results ({displayCategories.length} categories)
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={expandAll}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Grouped display */}
              {Object.entries(grouped).map(([groupName, categories]) => (
                <div key={groupName}>
                  <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 mt-4">
                    {groupName} ({categories.length})
                  </h5>
                  <div className="space-y-2">
                    {categories
                      .sort((a, b) => b.similarity - a.similarity)
                      .map((cat) => (
                        <CategoryCard
                          key={cat.id}
                          category={cat}
                          expanded={expandedIds.has(cat.id)}
                          onToggle={() => toggleExpanded(cat.id)}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {displayCategories.length === 0 && !taxonomyLoading && (
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter regulation names above and click "Classify" to see taxonomy results.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default TaxonomyBrowser;
