import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { complianceApi } from '../services/complianceApi';
import type { CalendarListParams } from '../types/compliance';
import type {
  CalendarEvent,
  CalendarEventCreateInput,
  CalendarEventUpdateInput,
  MarketSignal,
  TaxonomyCategory,
  RiskAnalysisResult,
} from '../types/compliance';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

interface ComplianceState {
  calendarEvents: CalendarEvent[];
  upcomingDeadlines: CalendarEvent[];
  marketSignals: MarketSignal[];
  taxonomyCategories: TaxonomyCategory[];
  riskAnalysis: RiskAnalysisResult[];
  loading: boolean;
  calendarLoading: boolean;
  marketSignalsLoading: boolean;
  taxonomyLoading: boolean;
  error: string | null;
  calendarTotal: number;
  calendarPage: number;
  calendarLimit: number;
}

const initialState: ComplianceState = {
  calendarEvents: [],
  upcomingDeadlines: [],
  marketSignals: [],
  taxonomyCategories: [],
  riskAnalysis: [],
  loading: false,
  calendarLoading: false,
  marketSignalsLoading: false,
  taxonomyLoading: false,
  error: null,
  calendarTotal: 0,
  calendarPage: 1,
  calendarLimit: 20,
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosError<ApiErrorResponse>;
  return error.response?.data?.error?.message || fallback;
}

// Calendar thunks
export const fetchCalendarEvents = createAsyncThunk(
  'compliance/fetchCalendarEvents',
  async (params: CalendarListParams, { rejectWithValue }) => {
    try {
      const response = await complianceApi.listCalendarEvents(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch calendar events'));
    }
  },
);

export const fetchUpcomingDeadlines = createAsyncThunk(
  'compliance/fetchUpcomingDeadlines',
  async (userId: string | undefined, { rejectWithValue }) => {
    try {
      const response = await complianceApi.getUpcomingDeadlines(userId);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch upcoming deadlines'));
    }
  },
);

export const createCalendarEvent = createAsyncThunk(
  'compliance/createCalendarEvent',
  async (data: CalendarEventCreateInput, { rejectWithValue }) => {
    try {
      const response = await complianceApi.createCalendarEvent(data);
      return response.data.event;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create calendar event'));
    }
  },
);

export const updateCalendarEvent = createAsyncThunk(
  'compliance/updateCalendarEvent',
  async ({ id, data }: { id: string; data: CalendarEventUpdateInput }, { rejectWithValue }) => {
    try {
      const response = await complianceApi.updateCalendarEvent(id, data);
      return response.data.event;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update calendar event'));
    }
  },
);

export const deleteCalendarEvent = createAsyncThunk(
  'compliance/deleteCalendarEvent',
  async (id: string, { rejectWithValue }) => {
    try {
      await complianceApi.deleteCalendarEvent(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete calendar event'));
    }
  },
);

// Market signals thunk
export const fetchMarketSignals = createAsyncThunk(
  'compliance/fetchMarketSignals',
  async ({ industry, history }: { industry: string; history?: number[] }, { rejectWithValue }) => {
    try {
      const response = await complianceApi.analyzeMarketSignals(industry, history);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch market signals'));
    }
  },
);

// Taxonomy classification thunk
export const classifyRegulations = createAsyncThunk(
  'compliance/classifyRegulations',
  async (regulations: string[], { rejectWithValue }) => {
    try {
      const response = await complianceApi.classifyRegulations(regulations);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to classify regulations'));
    }
  },
);

const complianceSlice = createSlice({
  name: 'compliance',
  initialState,
  reducers: {
    clearComplianceError(state) {
      state.error = null;
    },
    setRiskAnalysis(state, action) {
      state.riskAnalysis = action.payload;
    },
  },
  extraReducers: (builder) => {
    // fetchCalendarEvents
    builder.addCase(fetchCalendarEvents.pending, (state) => {
      state.calendarLoading = true;
      state.error = null;
    });
    builder.addCase(fetchCalendarEvents.fulfilled, (state, action) => {
      state.calendarLoading = false;
      state.calendarEvents = action.payload.events;
      state.calendarTotal = action.payload.total;
      state.calendarPage = action.payload.page;
      state.calendarLimit = action.payload.limit;
    });
    builder.addCase(fetchCalendarEvents.rejected, (state, action) => {
      state.calendarLoading = false;
      state.error = action.payload as string;
    });

    // fetchUpcomingDeadlines
    builder.addCase(fetchUpcomingDeadlines.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUpcomingDeadlines.fulfilled, (state, action) => {
      state.loading = false;
      state.upcomingDeadlines = action.payload.events;
    });
    builder.addCase(fetchUpcomingDeadlines.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // createCalendarEvent
    builder.addCase(createCalendarEvent.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createCalendarEvent.fulfilled, (state, action) => {
      state.loading = false;
      state.calendarEvents.push(action.payload);
      state.calendarTotal += 1;
    });
    builder.addCase(createCalendarEvent.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // updateCalendarEvent
    builder.addCase(updateCalendarEvent.fulfilled, (state, action) => {
      const updated = action.payload;
      state.calendarEvents = state.calendarEvents.map((e) => (e.id === updated.id ? updated : e));
    });
    builder.addCase(updateCalendarEvent.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // deleteCalendarEvent
    builder.addCase(deleteCalendarEvent.fulfilled, (state, action) => {
      state.calendarEvents = state.calendarEvents.filter((e) => e.id !== action.payload);
      state.calendarTotal = Math.max(0, state.calendarTotal - 1);
    });
    builder.addCase(deleteCalendarEvent.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // fetchMarketSignals
    builder.addCase(fetchMarketSignals.pending, (state) => {
      state.marketSignalsLoading = true;
      state.error = null;
    });
    builder.addCase(fetchMarketSignals.fulfilled, (state, action) => {
      state.marketSignalsLoading = false;
      state.marketSignals = action.payload.signals;
    });
    builder.addCase(fetchMarketSignals.rejected, (state, action) => {
      state.marketSignalsLoading = false;
      state.error = action.payload as string;
    });

    // classifyRegulations
    builder.addCase(classifyRegulations.pending, (state) => {
      state.taxonomyLoading = true;
      state.error = null;
    });
    builder.addCase(classifyRegulations.fulfilled, (state, action) => {
      state.taxonomyLoading = false;
      state.taxonomyCategories = action.payload.categories;
    });
    builder.addCase(classifyRegulations.rejected, (state, action) => {
      state.taxonomyLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearComplianceError, setRiskAnalysis } = complianceSlice.actions;
export default complianceSlice.reducer;
