import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchCalendarEvents,
  fetchUpcomingDeadlines,
  createCalendarEvent,
  deleteCalendarEvent,
} from '../../store/complianceSlice';
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarEventCreateInput,
} from '../../types/compliance';

const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  deadline: 'bg-red-500',
  audit: 'bg-purple-500',
  regulatory_change: 'bg-blue-500',
  review: 'bg-orange-500',
  training: 'bg-green-500',
};

const EVENT_TYPE_BADGE: Record<CalendarEventType, string> = {
  deadline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  audit: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  regulatory_change: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  training: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-green-500',
  medium: 'border-l-yellow-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const EVENT_TYPES: CalendarEventType[] = [
  'deadline',
  'audit',
  'regulatory_change',
  'review',
  'training',
];

function formatEventType(type: CalendarEventType): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function ComplianceCalendar() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { calendarEvents, upcomingDeadlines, calendarLoading, error } = useAppSelector(
    (state) => state.compliance,
  );

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filterType, setFilterType] = useState<CalendarEventType | ''>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState<CalendarEventCreateInput>({
    title: '',
    eventType: 'deadline',
    date: '',
    priority: 'medium',
    description: '',
  });

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const loadEvents = useCallback(() => {
    const startDate = new Date(currentYear, currentMonth, 1);
    const endDate = new Date(currentYear, currentMonth + 1, 0);

    dispatch(
      fetchCalendarEvents({
        dateFrom: startDate.toISOString().split('T')[0],
        dateTo: endDate.toISOString().split('T')[0],
        ...(filterType ? { eventType: filterType } : {}),
      }),
    );
  }, [dispatch, currentYear, currentMonth, filterType]);

  useEffect(() => {
    loadEvents();
    dispatch(fetchUpcomingDeadlines(user ? String(user.id) : undefined));
  }, [loadEvents, dispatch, user]);

  // Group events by day of month
  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (const evt of calendarEvents) {
      const evtDate = new Date(evt.date);
      if (evtDate.getFullYear() === currentYear && evtDate.getMonth() === currentMonth) {
        const day = evtDate.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(evt);
      }
    }
    return map;
  }, [calendarEvents, currentYear, currentMonth]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth);
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === currentYear &&
    today.getMonth() === currentMonth &&
    today.getDate() === day;

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.eventType) return;

    dispatch(createCalendarEvent(newEvent)).then(() => {
      setShowAddForm(false);
      setNewEvent({
        title: '',
        eventType: 'deadline',
        date: '',
        priority: 'medium',
        description: '',
      });
      loadEvents();
    });
  };

  const handleDeleteEvent = (id: string) => {
    dispatch(deleteCalendarEvent(id)).then(() => {
      setSelectedEvent(null);
      loadEvents();
    });
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Compliance Calendar
              </h3>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as CalendarEventType | '')}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="">All Types</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {formatEventType(type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
              >
                Add Event
              </button>
            </div>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {monthLabel}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Calendar grid */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
              {dayNames.map((name) => (
                <div
                  key={name}
                  className="px-1 py-2 text-xs font-medium text-center text-gray-500 dark:text-gray-400"
                >
                  {name}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {/* Empty cells for days before first of month */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="min-h-[80px] p-1 border-b border-r border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/30"
                />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsByDay[day] || [];
                const todayClass = isToday(day)
                  ? 'bg-primary-50 dark:bg-primary-900/20'
                  : 'bg-white dark:bg-gray-800';

                return (
                  <div
                    key={day}
                    className={`min-h-[80px] p-1 border-b border-r border-gray-100 dark:border-gray-700/50 ${todayClass}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                          isToday(day)
                            ? 'bg-primary-600 text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {day}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((evt) => (
                        <button
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`w-full text-left px-1 py-0.5 rounded text-[10px] truncate flex items-center gap-1 hover:opacity-80 transition-opacity ${
                            EVENT_TYPE_BADGE[evt.eventType]
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_TYPE_COLORS[evt.eventType]}`}
                          />
                          {evt.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 px-1">
                          +{dayEvents.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-3">
            {EVENT_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${EVENT_TYPE_COLORS[type]}`} />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {formatEventType(type)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: upcoming deadlines + selected event details */}
        <div className="lg:w-72 space-y-4">
          {/* Selected event detail */}
          {selectedEvent && (
            <div
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 border-l-4 ${PRIORITY_BORDER[selectedEvent.priority]}`}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {selectedEvent.title}
                </h4>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
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

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_TYPE_BADGE[selectedEvent.eventType]}`}
                >
                  {formatEventType(selectedEvent.eventType)}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[selectedEvent.priority]}`}
                >
                  {selectedEvent.priority.charAt(0).toUpperCase() + selectedEvent.priority.slice(1)}
                </span>
              </div>

              {selectedEvent.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {selectedEvent.description}
                </p>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Date: {new Date(selectedEvent.date).toLocaleDateString()}</p>
                {selectedEvent.endDate && (
                  <p>End: {new Date(selectedEvent.endDate).toLocaleDateString()}</p>
                )}
                <p>Status: {selectedEvent.status.replace('_', ' ')}</p>
                {selectedEvent.regulationId && <p>Regulation: {selectedEvent.regulationId}</p>}
                <p>Reminder: {selectedEvent.reminderDays} days before</p>
              </div>

              <button
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                className="mt-3 w-full px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
              >
                Delete Event
              </button>
            </div>
          )}

          {/* Upcoming deadlines */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Upcoming Deadlines
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Next 30 days</p>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-80 overflow-y-auto">
              {calendarLoading && upcomingDeadlines.length === 0 && (
                <div className="p-4 text-center">
                  <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                </div>
              )}
              {upcomingDeadlines.length === 0 && !calendarLoading && (
                <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  No upcoming deadlines
                </div>
              )}
              {upcomingDeadlines.map((evt) => {
                const daysUntil = Math.ceil(
                  (new Date(evt.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
                );
                return (
                  <button
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-l-3 ${PRIORITY_BORDER[evt.priority]}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full ${EVENT_TYPE_COLORS[evt.eventType]}`}
                      />
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                        {evt.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {new Date(evt.date).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${
                          daysUntil <= 3
                            ? 'text-red-600 dark:text-red-400'
                            : daysUntil <= 7
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {daysUntil === 0
                          ? 'Today'
                          : daysUntil === 1
                            ? 'Tomorrow'
                            : `${daysUntil} days`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Add Calendar Event
              </h4>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                  placeholder="Event title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Type *
                  </label>
                  <select
                    value={newEvent.eventType}
                    onChange={(e) =>
                      setNewEvent({ ...newEvent, eventType: e.target.value as CalendarEventType })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {formatEventType(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={newEvent.priority}
                    onChange={(e) =>
                      setNewEvent({
                        ...newEvent,
                        priority: e.target.value as 'low' | 'medium' | 'high' | 'critical',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={newEvent.description || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 resize-none h-20"
                  placeholder="Optional description"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={!newEvent.title || !newEvent.date}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceCalendar;
