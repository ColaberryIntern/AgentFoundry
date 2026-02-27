import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { onboardingApi, type OnboardingProgress } from '../services/onboardingApi';
import type { AxiosError } from 'axios';

interface OnboardingState {
  progress: OnboardingProgress | null;
  isLoading: boolean;
  error: string | null;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: OnboardingState = {
  progress: null,
  isLoading: false,
  error: null,
};

export const fetchOnboarding = createAsyncThunk(
  'onboarding/fetchOnboarding',
  async (_, { rejectWithValue }) => {
    try {
      return await onboardingApi.getProgress();
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to fetch onboarding progress',
      );
    }
  },
);

export const advanceOnboardingStep = createAsyncThunk(
  'onboarding/advanceStep',
  async (step: number, { rejectWithValue }) => {
    try {
      return await onboardingApi.advanceStep(step);
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to advance onboarding step',
      );
    }
  },
);

export const skipOnboarding = createAsyncThunk(
  'onboarding/skip',
  async (_, { rejectWithValue }) => {
    try {
      return await onboardingApi.skip();
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to skip onboarding');
    }
  },
);

export const resetOnboarding = createAsyncThunk(
  'onboarding/reset',
  async (_, { rejectWithValue }) => {
    try {
      return await onboardingApi.reset();
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to reset onboarding');
    }
  },
);

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    clearOnboardingError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder.addCase(fetchOnboarding.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchOnboarding.fulfilled, (state, action) => {
      state.isLoading = false;
      state.progress = action.payload;
    });
    builder.addCase(fetchOnboarding.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Advance step
    builder.addCase(advanceOnboardingStep.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(advanceOnboardingStep.fulfilled, (state, action) => {
      state.isLoading = false;
      state.progress = action.payload;
    });
    builder.addCase(advanceOnboardingStep.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Skip
    builder.addCase(skipOnboarding.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(skipOnboarding.fulfilled, (state, action) => {
      state.isLoading = false;
      state.progress = action.payload;
    });
    builder.addCase(skipOnboarding.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Reset
    builder.addCase(resetOnboarding.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(resetOnboarding.fulfilled, (state, action) => {
      state.isLoading = false;
      state.progress = action.payload;
    });
    builder.addCase(resetOnboarding.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearOnboardingError } = onboardingSlice.actions;
export default onboardingSlice.reducer;
