import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  clearTemplatesError,
} from '../store/templatesSlice';
import {
  fetchSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  clearSchedulesError,
} from '../store/schedulesSlice';
import { createNewReport } from '../store/reportsSlice';
import type {
  ReportTemplate,
  ReportSection,
  ScheduledReport,
  CreateTemplatePayload,
  CreateSchedulePayload,
} from '../types/reports';
import { useAnalytics } from '../hooks/useAnalytics';

const REPORT_TYPES = [
  { value: 'compliance_summary', label: 'Compliance Summary' },
  { value: 'risk_assessment', label: 'Risk Assessment' },
  { value: 'audit_trail', label: 'Audit Trail' },
  { value: 'regulatory_status', label: 'Regulatory Status' },
] as const;

const SECTION_TYPES = [
  { value: 'summary', label: 'Summary' },
  { value: 'chart', label: 'Chart' },
  { value: 'table', label: 'Table' },
  { value: 'text', label: 'Text' },
] as const;

const CHART_TYPES = [
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
] as const;

const SCHEDULE_PRESETS = [
  { value: '0 9 * * *', label: 'Daily at 9:00 AM' },
  { value: '0 9 * * 1', label: 'Weekly Monday 9:00 AM' },
  { value: '0 9 1 * *', label: 'Monthly 1st at 9:00 AM' },
  { value: 'custom', label: 'Custom' },
] as const;

function formatCronHumanReadable(cron: string): string {
  const map: Record<string, string> = {
    '0 9 * * *': 'Daily at 9:00 AM',
    '0 9 * * 1': 'Weekly Monday 9:00 AM',
    '0 9 1 * *': 'Monthly 1st at 9:00 AM',
  };
  return map[cron] || cron;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '--';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reportTypeLabel(type: string): string {
  const found = REPORT_TYPES.find((r) => r.value === type);
  return found ? found.label : type;
}

/* ---------- Toast Notification ---------- */

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}
      >
        {type === 'success' ? (
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span>{message}</span>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ---------- Delete Confirm Dialog ---------- */

function DeleteConfirmDialog({
  title,
  itemName,
  onConfirm,
  onCancel,
  isLoading,
}: {
  title: string;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Are you sure you want to delete this item?
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-6 break-all font-medium bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
          {itemName}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Tab 1: Template Builder ---------- */

function TemplateBuilderTab({
  onToast,
}: {
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const dispatch = useAppDispatch();
  const { templates, isLoading, error } = useAppSelector((state) => state.templates);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value as string);
  const [defaultParams, setDefaultParams] = useState('');
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<ReportTemplate | null>(null);

  useEffect(() => {
    dispatch(fetchTemplates());
  }, [dispatch]);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setReportType(REPORT_TYPES[0].value);
    setDefaultParams('');
    setSections([]);
    setIsPublic(false);
  };

  const loadTemplate = (template: ReportTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setDescription(template.description || '');
    setReportType(template.reportType);
    setDefaultParams(
      template.defaultParameters ? JSON.stringify(template.defaultParameters, null, 2) : '',
    );
    setSections(template.sections || []);
    setIsPublic(template.isPublic);
  };

  const addSection = () => {
    setSections((prev) => [...prev, { type: 'summary', title: '' }]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, updates: Partial<ReportSection>) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveSectionDown = (index: number) => {
    setSections((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    dispatch(clearTemplatesError());

    let parsedParams: Record<string, unknown> | undefined;
    if (defaultParams.trim()) {
      try {
        parsedParams = JSON.parse(defaultParams);
      } catch {
        onToast('Invalid JSON in default parameters', 'error');
        return;
      }
    }

    const payload: CreateTemplatePayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      reportType,
      defaultParameters: parsedParams,
      sections: sections.length > 0 ? sections : undefined,
      isPublic,
    };

    if (editingId) {
      const result = await dispatch(updateTemplate({ id: editingId, data: payload }));
      if (updateTemplate.fulfilled.match(result)) {
        onToast('Template updated successfully', 'success');
        resetForm();
      } else {
        onToast('Failed to update template', 'error');
      }
    } else {
      const result = await dispatch(createTemplate(payload));
      if (createTemplate.fulfilled.match(result)) {
        onToast('Template created successfully', 'success');
        resetForm();
      } else {
        onToast('Failed to create template', 'error');
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    dispatch(clearTemplatesError());
    const result = await dispatch(deleteTemplate(deletingTemplate.id));
    if (deleteTemplate.fulfilled.match(result)) {
      setDeletingTemplate(null);
      if (editingId === deletingTemplate.id) {
        resetForm();
      }
      onToast('Template deleted', 'success');
    } else {
      onToast('Failed to delete template', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {editingId ? 'Edit Template' : 'Create Template'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Type <span className="text-red-500">*</span>
              </label>
              <select
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Default Parameters (JSON)
            </label>
            <textarea
              value={defaultParams}
              onChange={(e) => setDefaultParams(e.target.value)}
              placeholder='{"key": "value"}'
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            />
          </div>

          {/* Sections Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sections
              </label>
              <button
                type="button"
                onClick={addSection}
                className="px-3 py-1 text-xs bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
              >
                + Add Section
              </button>
            </div>
            {sections.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center border border-dashed border-gray-300 dark:border-gray-600 rounded-md">
                No sections added. Click "Add Section" to start.
              </p>
            ) : (
              <div className="space-y-3">
                {sections.map((section, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-gray-50 dark:bg-gray-900/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Section {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveSectionUp(index)}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                          title="Move up"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSectionDown(index)}
                          disabled={index === sections.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                          title="Move down"
                        >
                          <svg
                            className="w-4 h-4"
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
                        <button
                          type="button"
                          onClick={() => removeSection(index)}
                          className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300"
                          title="Remove section"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Type
                        </label>
                        <select
                          value={section.type}
                          onChange={(e) =>
                            updateSection(index, {
                              type: e.target.value as ReportSection['type'],
                              chartType: e.target.value === 'chart' ? 'bar' : undefined,
                              columns: e.target.value === 'table' ? [] : undefined,
                            })
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          {SECTION_TYPES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSection(index, { title: e.target.value })}
                          placeholder="Section title"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      {section.type === 'chart' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Chart Type
                          </label>
                          <select
                            value={section.chartType || 'bar'}
                            onChange={(e) =>
                              updateSection(index, {
                                chartType: e.target.value as 'bar' | 'line' | 'pie',
                              })
                            }
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          >
                            {CHART_TYPES.map((ct) => (
                              <option key={ct.value} value={ct.value}>
                                {ct.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {section.type === 'table' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Columns (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={(section.columns || []).join(', ')}
                            onChange={(e) =>
                              updateSection(index, {
                                columns: e.target.value
                                  .split(',')
                                  .map((c) => c.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="col1, col2, col3"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Public toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Public template</span>
            </label>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-5 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : editingId ? 'Update Template' : 'Save Template'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Templates List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Templates</h2>
        </div>
        {isLoading && templates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 dark:text-gray-500">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 dark:text-gray-500">No templates created yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Use the form above to create your first template
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {template.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {reportTypeLabel(template.reportType)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {template.isPublic && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Public
                      </span>
                    )}
                  </div>
                </div>
                {template.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Created {formatDate(template.createdAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadTemplate(template)}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingTemplate(template)}
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      {deletingTemplate && (
        <DeleteConfirmDialog
          title="Delete Template"
          itemName={deletingTemplate.name}
          onConfirm={handleDelete}
          onCancel={() => setDeletingTemplate(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

/* ---------- Tab 2: Schedules ---------- */

function ScheduleModal({
  schedule,
  templates,
  onSave,
  onCancel,
  isLoading,
}: {
  schedule: ScheduledReport | null;
  templates: ReportTemplate[];
  onSave: (data: CreateSchedulePayload) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [reportType, setReportType] = useState(schedule?.reportType || REPORT_TYPES[0].value);
  const [templateId, setTemplateId] = useState(schedule?.templateId || '');
  const [format, setFormat] = useState<'pdf' | 'csv'>(schedule?.format || 'pdf');
  const [schedulePreset, setSchedulePreset] = useState<string>(() => {
    if (!schedule) return SCHEDULE_PRESETS[0].value;
    const found = SCHEDULE_PRESETS.find((p) => p.value === schedule.schedule);
    return found ? found.value : 'custom';
  });
  const [customCron, setCustomCron] = useState(
    schedule && !SCHEDULE_PRESETS.find((p) => p.value === schedule.schedule)
      ? schedule.schedule
      : '',
  );
  const [isActive, setIsActive] = useState(schedule?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cronValue = schedulePreset === 'custom' ? customCron.trim() : schedulePreset;
    if (!cronValue) return;

    onSave({
      reportType,
      templateId: templateId || undefined,
      format,
      schedule: cronValue,
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {schedule ? 'Edit Schedule' : 'Create Schedule'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Report Type <span className="text-red-500">*</span>
            </label>
            <select
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
              Template (optional)
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Format <span className="text-red-500">*</span>
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Schedule <span className="text-red-500">*</span>
            </label>
            <select
              value={schedulePreset}
              onChange={(e) => setSchedulePreset(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {SCHEDULE_PRESETS.map((sp) => (
                <option key={sp.value} value={sp.value}>
                  {sp.label}
                </option>
              ))}
            </select>
            {schedulePreset === 'custom' && (
              <input
                type="text"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                placeholder="Cron expression (e.g., 0 9 * * *)"
                className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (schedulePreset === 'custom' && !customCron.trim())}
              className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : schedule ? 'Save Changes' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SchedulesTab({
  onToast,
  templates,
}: {
  onToast: (msg: string, type: 'success' | 'error') => void;
  templates: ReportTemplate[];
}) {
  const dispatch = useAppDispatch();
  const { schedules, isLoading, error } = useAppSelector((state) => state.schedules);
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduledReport | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<ScheduledReport | null>(null);

  useEffect(() => {
    dispatch(fetchSchedules());
  }, [dispatch]);

  const handleCreate = async (data: CreateSchedulePayload) => {
    dispatch(clearSchedulesError());
    const result = await dispatch(createSchedule(data));
    if (createSchedule.fulfilled.match(result)) {
      setShowModal(false);
      onToast('Schedule created successfully', 'success');
    } else {
      onToast('Failed to create schedule', 'error');
    }
  };

  const handleUpdate = async (data: CreateSchedulePayload) => {
    if (!editingSchedule) return;
    dispatch(clearSchedulesError());
    const result = await dispatch(updateSchedule({ id: editingSchedule.id, data }));
    if (updateSchedule.fulfilled.match(result)) {
      setEditingSchedule(null);
      onToast('Schedule updated successfully', 'success');
    } else {
      onToast('Failed to update schedule', 'error');
    }
  };

  const handleToggleActive = async (schedule: ScheduledReport) => {
    dispatch(clearSchedulesError());
    const result = await dispatch(
      updateSchedule({ id: schedule.id, data: { isActive: !schedule.isActive } }),
    );
    if (updateSchedule.fulfilled.match(result)) {
      onToast(`Schedule ${schedule.isActive ? 'paused' : 'activated'} successfully`, 'success');
    }
  };

  const handleDelete = async () => {
    if (!deletingSchedule) return;
    dispatch(clearSchedulesError());
    const result = await dispatch(deleteSchedule(deletingSchedule.id));
    if (deleteSchedule.fulfilled.match(result)) {
      setDeletingSchedule(null);
      onToast('Schedule deleted', 'success');
    } else {
      onToast('Failed to delete schedule', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Scheduled Reports
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
        >
          + Create Schedule
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {isLoading && schedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-12 text-center">
          <p className="text-gray-400 dark:text-gray-500">Loading schedules...</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-6 py-12 text-center">
          <p className="text-gray-400 dark:text-gray-500">No scheduled reports yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Create a schedule to automate report generation
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {reportTypeLabel(schedule.reportType)}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        schedule.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {schedule.isActive ? 'Active' : 'Paused'}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 uppercase">
                      {schedule.format}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Schedule: {formatCronHumanReadable(schedule.schedule)}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                    <span>Last run: {formatDate(schedule.lastRunAt)}</span>
                    <span>Next run: {formatDate(schedule.nextRunAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(schedule)}
                    className={`text-xs font-medium ${
                      schedule.isActive
                        ? 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300'
                        : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300'
                    }`}
                  >
                    {schedule.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setEditingSchedule(schedule)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingSchedule(schedule)}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <ScheduleModal
          schedule={null}
          templates={templates}
          onSave={handleCreate}
          onCancel={() => setShowModal(false)}
          isLoading={isLoading}
        />
      )}

      {/* Edit Modal */}
      {editingSchedule && (
        <ScheduleModal
          schedule={editingSchedule}
          templates={templates}
          onSave={handleUpdate}
          onCancel={() => setEditingSchedule(null)}
          isLoading={isLoading}
        />
      )}

      {/* Delete Confirmation */}
      {deletingSchedule && (
        <DeleteConfirmDialog
          title="Delete Schedule"
          itemName={`${reportTypeLabel(deletingSchedule.reportType)} - ${formatCronHumanReadable(deletingSchedule.schedule)}`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingSchedule(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

/* ---------- Tab 3: Generate Report ---------- */

function GenerateReportTab({
  onToast,
  templates,
}: {
  onToast: (msg: string, type: 'success' | 'error') => void;
  templates: ReportTemplate[];
}) {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.reports);

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [reportType, setReportType] = useState(REPORT_TYPES[0].value as string);
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [complianceStatuses, setComplianceStatuses] = useState<string[]>([]);
  const [regulationId, setRegulationId] = useState('');
  const [previewSections, setPreviewSections] = useState<ReportSection[]>([]);

  const statusOptions = [
    { value: 'compliant', label: 'Compliant' },
    { value: 'non_compliant', label: 'Non-Compliant' },
    { value: 'pending', label: 'Pending' },
    { value: 'review', label: 'Review' },
  ];

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        setReportType(template.reportType);
        setPreviewSections(template.sections || []);
      }
    } else {
      setPreviewSections([]);
    }
  };

  const toggleStatus = (status: string) => {
    setComplianceStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const parameters: Record<string, unknown> = {};
    if (dateFrom) parameters.dateFrom = dateFrom;
    if (dateTo) parameters.dateTo = dateTo;
    if (complianceStatuses.length > 0) parameters.complianceStatuses = complianceStatuses;
    if (regulationId.trim()) parameters.regulationId = regulationId.trim();
    if (selectedTemplateId) parameters.templateId = selectedTemplateId;
    if (previewSections.length > 0) parameters.sections = previewSections;

    const result = await dispatch(
      createNewReport({
        reportType,
        format,
        parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
      }),
    );

    if (createNewReport.fulfilled.match(result)) {
      onToast('Report generation started', 'success');
    } else {
      onToast('Failed to generate report', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Generate Report
        </h2>

        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Template Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template (optional)
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">No template - Custom report</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({reportTypeLabel(t.reportType)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Report Type <span className="text-red-500">*</span>
              </label>
              <select
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
                Format <span className="text-red-500">*</span>
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'pdf' | 'csv')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          {/* Custom Filters */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Custom Filters</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Compliance Status
              </label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={complianceStatuses.includes(opt.value)}
                      onChange={() => toggleStatus(opt.value)}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Regulation ID
              </label>
              <input
                type="text"
                value={regulationId}
                onChange={(e) => setRegulationId(e.target.value)}
                placeholder="e.g., GDPR, SOC2, HIPAA"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              />
            </div>
          </div>

          {/* Sections Preview */}
          {previewSections.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sections Preview
              </h3>
              <div className="space-y-1">
                {previewSections.map((section, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 capitalize">
                      {section.type}
                    </span>
                    <span>{section.title || '(Untitled)'}</span>
                    {section.chartType && (
                      <span className="text-xs text-gray-400">({section.chartType})</span>
                    )}
                    {section.columns && section.columns.length > 0 && (
                      <span className="text-xs text-gray-400">[{section.columns.join(', ')}]</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Generating...' : 'Generate Report'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- Main Page ---------- */

type TabId = 'builder' | 'schedules' | 'generate';

const TABS: { id: TabId; label: string }[] = [
  { id: 'builder', label: 'Template Builder' },
  { id: 'schedules', label: 'Schedules' },
  { id: 'generate', label: 'Generate Report' },
];

function CustomReportsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { templates } = useAppSelector((state) => state.templates);
  const { trackPageView } = useAnalytics();

  const [activeTab, setActiveTab] = useState<TabId>('builder');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    trackPageView('custom_reports');
  }, [trackPageView]);

  const handleToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Custom Reports
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create templates, schedule automated reports, and generate custom reports
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px space-x-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'builder' && <TemplateBuilderTab onToast={handleToast} />}
      {activeTab === 'schedules' && <SchedulesTab onToast={handleToast} templates={templates} />}
      {activeTab === 'generate' && (
        <GenerateReportTab onToast={handleToast} templates={templates} />
      )}
    </div>
  );
}

export default CustomReportsPage;
