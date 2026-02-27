import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { schedulesApi } from '../services/schedulesApi';
import type {
  ScheduledReport,
  CreateSchedulePayload,
  UpdateSchedulePayload,
} from '../types/reports';
import type { AxiosError } from 'axios';

interface SchedulesState {
  schedules: ScheduledReport[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: SchedulesState = {
  schedules: [],
  total: 0,
  isLoading: false,
  error: null,
};

export const fetchSchedules = createAsyncThunk(
  'schedules/fetchSchedules',
  async (params: { page?: number; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      const response = await schedulesApi.list(params);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch schedules');
    }
  },
);

export const createSchedule = createAsyncThunk(
  'schedules/createSchedule',
  async (data: CreateSchedulePayload, { rejectWithValue }) => {
    try {
      const response = await schedulesApi.create(data);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create schedule');
    }
  },
);

export const updateSchedule = createAsyncThunk(
  'schedules/updateSchedule',
  async ({ id, data }: { id: string; data: UpdateSchedulePayload }, { rejectWithValue }) => {
    try {
      const response = await schedulesApi.update(id, data);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update schedule');
    }
  },
);

export const deleteSchedule = createAsyncThunk(
  'schedules/deleteSchedule',
  async (id: string, { rejectWithValue }) => {
    try {
      await schedulesApi.delete(id);
      return id;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete schedule');
    }
  },
);

const schedulesSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    clearSchedulesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Schedules
    builder.addCase(fetchSchedules.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchSchedules.fulfilled, (state, action) => {
      state.isLoading = false;
      state.schedules = action.payload.schedules;
      state.total = action.payload.total;
    });
    builder.addCase(fetchSchedules.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create Schedule
    builder.addCase(createSchedule.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createSchedule.fulfilled, (state, action) => {
      state.isLoading = false;
      state.schedules.unshift(action.payload);
      state.total += 1;
    });
    builder.addCase(createSchedule.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update Schedule
    builder.addCase(updateSchedule.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateSchedule.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.schedules.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.schedules[index] = action.payload;
      }
    });
    builder.addCase(updateSchedule.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete Schedule
    builder.addCase(deleteSchedule.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteSchedule.fulfilled, (state, action) => {
      state.isLoading = false;
      state.schedules = state.schedules.filter((s) => s.id !== action.payload);
      state.total -= 1;
    });
    builder.addCase(deleteSchedule.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearSchedulesError } = schedulesSlice.actions;
export default schedulesSlice.reducer;
