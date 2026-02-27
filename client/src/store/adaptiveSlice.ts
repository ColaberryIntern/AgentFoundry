import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adaptiveApi } from '../services/adaptiveApi';
import type { AdaptivePreferences, NLSearchResult } from '../types/adaptive';
import type { AxiosError } from 'axios';

interface AdaptiveState {
  preferences: AdaptivePreferences | null;
  loading: boolean;
  error: string | null;
  nlSearchResult: NLSearchResult | null;
  nlSearchLoading: boolean;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: AdaptiveState = {
  preferences: null,
  loading: false,
  error: null,
  nlSearchResult: null,
  nlSearchLoading: false,
};

export const fetchAdaptivePreferences = createAsyncThunk(
  'adaptive/fetchPreferences',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await adaptiveApi.getAdaptivePreferences(userId);
      return response.data.preferences;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to fetch adaptive preferences',
      );
    }
  },
);

export const performNLSearch = createAsyncThunk(
  'adaptive/performNLSearch',
  async (query: string, { rejectWithValue }) => {
    try {
      const response = await adaptiveApi.naturalLanguageSearch(query);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Natural language search failed',
      );
    }
  },
);

const adaptiveSlice = createSlice({
  name: 'adaptive',
  initialState,
  reducers: {
    clearAdaptiveError(state) {
      state.error = null;
    },
    clearNLSearchResult(state) {
      state.nlSearchResult = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch adaptive preferences
    builder.addCase(fetchAdaptivePreferences.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchAdaptivePreferences.fulfilled, (state, action) => {
      state.loading = false;
      state.preferences = action.payload;
    });
    builder.addCase(fetchAdaptivePreferences.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // NL Search
    builder.addCase(performNLSearch.pending, (state) => {
      state.nlSearchLoading = true;
    });
    builder.addCase(performNLSearch.fulfilled, (state, action) => {
      state.nlSearchLoading = false;
      state.nlSearchResult = action.payload;
    });
    builder.addCase(performNLSearch.rejected, (state, action) => {
      state.nlSearchLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearAdaptiveError, clearNLSearchResult } = adaptiveSlice.actions;
export default adaptiveSlice.reducer;
