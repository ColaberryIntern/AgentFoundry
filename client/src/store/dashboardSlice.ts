import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardApi, type DashboardData } from '../services/dashboardApi';
import type { AxiosError } from 'axios';

interface DashboardState {
  dashboard: DashboardData | null;
  isLoading: boolean;
  error: string | null;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: DashboardState = {
  dashboard: null,
  isLoading: false,
  error: null,
};

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await dashboardApi.getDashboard();
      return response.data.dashboard;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to fetch dashboard data',
      );
    }
  },
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchDashboard.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchDashboard.fulfilled, (state, action) => {
      state.isLoading = false;
      state.dashboard = action.payload;
    });
    builder.addCase(fetchDashboard.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
