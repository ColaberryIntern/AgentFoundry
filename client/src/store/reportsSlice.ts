import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reportsApi, type Report, type CreateReportPayload } from '../services/reportsApi';
import type { AxiosError } from 'axios';

interface ReportsState {
  reports: Report[];
  total: number;
  currentReport: Report | null;
  isLoading: boolean;
  error: string | null;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: ReportsState = {
  reports: [],
  total: 0,
  currentReport: null,
  isLoading: false,
  error: null,
};

export const fetchReports = createAsyncThunk(
  'reports/fetchReports',
  async (
    params: { page?: number; limit?: number; status?: string } | undefined,
    { rejectWithValue },
  ) => {
    try {
      const response = await reportsApi.list(params);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch reports');
    }
  },
);

export const createNewReport = createAsyncThunk(
  'reports/createNewReport',
  async (data: CreateReportPayload, { rejectWithValue }) => {
    try {
      const response = await reportsApi.create(data);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create report');
    }
  },
);

export const fetchReport = createAsyncThunk(
  'reports/fetchReport',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await reportsApi.get(id);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch report');
    }
  },
);

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReportsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Reports
    builder.addCase(fetchReports.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchReports.fulfilled, (state, action) => {
      state.isLoading = false;
      state.reports = action.payload.reports;
      state.total = action.payload.total;
    });
    builder.addCase(fetchReports.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create Report
    builder.addCase(createNewReport.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createNewReport.fulfilled, (state, action) => {
      state.isLoading = false;
      state.reports.unshift(action.payload);
      state.total += 1;
    });
    builder.addCase(createNewReport.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Single Report
    builder.addCase(fetchReport.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchReport.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentReport = action.payload;
      // Also update the report in the list if present
      const index = state.reports.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.reports[index] = action.payload;
      }
    });
    builder.addCase(fetchReport.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearReportsError } = reportsSlice.actions;
export default reportsSlice.reducer;
