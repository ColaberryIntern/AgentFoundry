import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { searchApi, type SearchResult, type SearchParams } from '../services/searchApi';
import type { AxiosError } from 'axios';

interface SearchState {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  query: string;
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: SearchState = {
  results: [],
  total: 0,
  page: 1,
  limit: 10,
  query: '',
  suggestions: [],
  isLoading: false,
  error: null,
};

export const performSearch = createAsyncThunk(
  'search/performSearch',
  async (params: SearchParams, { rejectWithValue }) => {
    try {
      const response = await searchApi.search(params);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to perform search');
    }
  },
);

export const fetchSuggestions = createAsyncThunk(
  'search/fetchSuggestions',
  async (q: string, { rejectWithValue }) => {
    try {
      const response = await searchApi.suggestions(q);
      return response.data.suggestions;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch suggestions');
    }
  },
);

const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    clearSearchResults(state) {
      state.results = [];
      state.total = 0;
      state.page = 1;
      state.query = '';
    },
    clearSearchError(state) {
      state.error = null;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(performSearch.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(performSearch.fulfilled, (state, action) => {
      state.isLoading = false;
      state.results = action.payload.results;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
      state.query = action.payload.query;
    });
    builder.addCase(performSearch.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    builder.addCase(fetchSuggestions.fulfilled, (state, action) => {
      state.suggestions = action.payload;
    });
    builder.addCase(fetchSuggestions.rejected, (state) => {
      state.suggestions = [];
    });
  },
});

export const { clearSearchResults, clearSearchError, setSearchQuery } = searchSlice.actions;
export default searchSlice.reducer;
