import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { recommendationsApi } from '../services/recommendationsApi';
import type { ListRecommendationsParams } from '../services/recommendationsApi';
import type {
  Recommendation,
  ComplianceGap,
  RegulatoryPrediction,
  RecommendationsPagination,
  FeedbackAction,
  InferenceHealthResponse,
} from '../types/recommendations';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

interface RecommendationsState {
  recommendations: Recommendation[];
  loading: boolean;
  error: string | null;
  pagination: RecommendationsPagination;
  selectedRecommendation: Recommendation | null;
  complianceGaps: ComplianceGap[];
  regulatoryPredictions: RegulatoryPrediction[];
  analysisLoading: boolean;
  predictionsLoading: boolean;
  inferenceHealth: InferenceHealthResponse | null;
  healthLoading: boolean;
}

const initialState: RecommendationsState = {
  recommendations: [],
  loading: false,
  error: null,
  pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
  selectedRecommendation: null,
  complianceGaps: [],
  regulatoryPredictions: [],
  analysisLoading: false,
  predictionsLoading: false,
  inferenceHealth: null,
  healthLoading: false,
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosError<ApiErrorResponse>;
  return error.response?.data?.error?.message || fallback;
}

export const fetchRecommendations = createAsyncThunk(
  'recommendations/fetchRecommendations',
  async (params: ListRecommendationsParams, { rejectWithValue }) => {
    try {
      const response = await recommendationsApi.listRecommendations(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch recommendations'));
    }
  },
);

export const fetchRecommendation = createAsyncThunk(
  'recommendations/fetchRecommendation',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await recommendationsApi.getRecommendation(id);
      return response.data.recommendation;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch recommendation'));
    }
  },
);

export const submitFeedback = createAsyncThunk(
  'recommendations/submitFeedback',
  async (
    { recommendationId, action }: { recommendationId: string; action: FeedbackAction },
    { rejectWithValue },
  ) => {
    try {
      const response = await recommendationsApi.submitFeedback(recommendationId, action);
      return response.data.recommendation;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to submit feedback'));
    }
  },
);

export const analyzeCompliance = createAsyncThunk(
  'recommendations/analyzeCompliance',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await recommendationsApi.analyzeCompliance(userId);
      return response.data.gaps;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to analyze compliance'));
    }
  },
);

export const fetchRegulatoryPredictions = createAsyncThunk(
  'recommendations/fetchRegulatoryPredictions',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await recommendationsApi.getRegulatoryPredictions(userId);
      return response.data.predictions;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch regulatory predictions'));
    }
  },
);

export const fetchInferenceHealth = createAsyncThunk(
  'recommendations/fetchInferenceHealth',
  async (_, { rejectWithValue }) => {
    try {
      const response = await recommendationsApi.getInferenceHealth();
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to check inference health'));
    }
  },
);

const recommendationsSlice = createSlice({
  name: 'recommendations',
  initialState,
  reducers: {
    clearRecommendationsError(state) {
      state.error = null;
    },
    clearSelectedRecommendation(state) {
      state.selectedRecommendation = null;
    },
  },
  extraReducers: (builder) => {
    // fetchRecommendations
    builder.addCase(fetchRecommendations.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecommendations.fulfilled, (state, action) => {
      state.loading = false;
      state.recommendations = action.payload.recommendations;
      state.pagination = {
        total: action.payload.total,
        page: action.payload.page,
        limit: action.payload.limit,
        totalPages: action.payload.totalPages,
      };
    });
    builder.addCase(fetchRecommendations.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchRecommendation
    builder.addCase(fetchRecommendation.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchRecommendation.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedRecommendation = action.payload;
    });
    builder.addCase(fetchRecommendation.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // submitFeedback
    builder.addCase(submitFeedback.fulfilled, (state, action) => {
      const updated = action.payload;
      state.recommendations = state.recommendations.map((r) => (r.id === updated.id ? updated : r));
      if (state.selectedRecommendation?.id === updated.id) {
        state.selectedRecommendation = updated;
      }
    });
    builder.addCase(submitFeedback.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // analyzeCompliance
    builder.addCase(analyzeCompliance.pending, (state) => {
      state.analysisLoading = true;
      state.error = null;
    });
    builder.addCase(analyzeCompliance.fulfilled, (state, action) => {
      state.analysisLoading = false;
      state.complianceGaps = action.payload;
    });
    builder.addCase(analyzeCompliance.rejected, (state, action) => {
      state.analysisLoading = false;
      state.error = action.payload as string;
    });

    // fetchRegulatoryPredictions
    builder.addCase(fetchRegulatoryPredictions.pending, (state) => {
      state.predictionsLoading = true;
      state.error = null;
    });
    builder.addCase(fetchRegulatoryPredictions.fulfilled, (state, action) => {
      state.predictionsLoading = false;
      state.regulatoryPredictions = action.payload;
    });
    builder.addCase(fetchRegulatoryPredictions.rejected, (state, action) => {
      state.predictionsLoading = false;
      state.error = action.payload as string;
    });

    // fetchInferenceHealth
    builder.addCase(fetchInferenceHealth.pending, (state) => {
      state.healthLoading = true;
    });
    builder.addCase(fetchInferenceHealth.fulfilled, (state, action) => {
      state.healthLoading = false;
      state.inferenceHealth = action.payload;
    });
    builder.addCase(fetchInferenceHealth.rejected, (state) => {
      state.healthLoading = false;
      state.inferenceHealth = {
        status: 'offline',
        modelServer: false,
        lastCheck: new Date().toISOString(),
      };
    });
  },
});

export const { clearRecommendationsError, clearSelectedRecommendation } =
  recommendationsSlice.actions;
export default recommendationsSlice.reducer;
