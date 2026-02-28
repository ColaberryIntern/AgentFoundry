import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { registryApi } from '../services/registryApi';
import type {
  NaicsIndustry,
  TaxonomyNode,
  UseCase,
  AgentSkeleton,
  AgentVariant,
  CertificationRecord,
  SystemIntelligence,
  StackSimulationResult,
} from '../types/compliance';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

interface RegistryState {
  industries: NaicsIndustry[];
  industriesTotal: number;
  taxonomyNodes: TaxonomyNode[];
  taxonomyTotal: number;
  useCases: UseCase[];
  useCasesTotal: number;
  skeletons: AgentSkeleton[];
  variants: AgentVariant[];
  variantsTotal: number;
  certifications: CertificationRecord[];
  intelligence: SystemIntelligence[];
  simulation: StackSimulationResult | null;
  loading: boolean;
  industriesLoading: boolean;
  taxonomyLoading: boolean;
  variantsLoading: boolean;
  intelligenceLoading: boolean;
  error: string | null;
}

const initialState: RegistryState = {
  industries: [],
  industriesTotal: 0,
  taxonomyNodes: [],
  taxonomyTotal: 0,
  useCases: [],
  useCasesTotal: 0,
  skeletons: [],
  variants: [],
  variantsTotal: 0,
  certifications: [],
  intelligence: [],
  simulation: null,
  loading: false,
  industriesLoading: false,
  taxonomyLoading: false,
  variantsLoading: false,
  intelligenceLoading: false,
  error: null,
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosError<ApiErrorResponse>;
  return error.response?.data?.error?.message || fallback;
}

export const fetchIndustries = createAsyncThunk(
  'registry/fetchIndustries',
  async (
    params: { level?: number; sector?: string; page?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await registryApi.getIndustries(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch industries'));
    }
  },
);

export const fetchTaxonomyNodes = createAsyncThunk(
  'registry/fetchTaxonomyNodes',
  async (
    params: { node_type?: string; risk_tier?: string; page?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await registryApi.getTaxonomyNodes(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch taxonomy'));
    }
  },
);

export const fetchUseCases = createAsyncThunk(
  'registry/fetchUseCases',
  async (params: { status?: string; page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await registryApi.getUseCases(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch use cases'));
    }
  },
);

export const fetchAgentSkeletons = createAsyncThunk(
  'registry/fetchAgentSkeletons',
  async (_, { rejectWithValue }) => {
    try {
      const response = await registryApi.getAgentSkeletons();
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch agent skeletons'));
    }
  },
);

export const fetchAgentVariants = createAsyncThunk(
  'registry/fetchAgentVariants',
  async (
    params: {
      industry_code?: string;
      certification_status?: string;
      page?: number;
      limit?: number;
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await registryApi.getAgentVariants(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch agent variants'));
    }
  },
);

export const fetchIntelligence = createAsyncThunk(
  'registry/fetchIntelligence',
  async (params: { metric_type?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await registryApi.getIntelligence(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch intelligence'));
    }
  },
);

export const simulateStack = createAsyncThunk(
  'registry/simulateStack',
  async (data: { industry_code: string; use_case_id?: string }, { rejectWithValue }) => {
    try {
      const response = await registryApi.simulateStack(data);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to simulate stack'));
    }
  },
);

const registrySlice = createSlice({
  name: 'registry',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearSimulation(state) {
      state.simulation = null;
    },
  },
  extraReducers: (builder) => {
    // Industries
    builder
      .addCase(fetchIndustries.pending, (state) => {
        state.industriesLoading = true;
        state.error = null;
      })
      .addCase(fetchIndustries.fulfilled, (state, action) => {
        state.industriesLoading = false;
        state.industries = action.payload.data;
        state.industriesTotal = action.payload.pagination.total;
      })
      .addCase(fetchIndustries.rejected, (state, action) => {
        state.industriesLoading = false;
        state.error = action.payload as string;
      });

    // Taxonomy
    builder
      .addCase(fetchTaxonomyNodes.pending, (state) => {
        state.taxonomyLoading = true;
        state.error = null;
      })
      .addCase(fetchTaxonomyNodes.fulfilled, (state, action) => {
        state.taxonomyLoading = false;
        state.taxonomyNodes = action.payload.data;
        state.taxonomyTotal = action.payload.pagination.total;
      })
      .addCase(fetchTaxonomyNodes.rejected, (state, action) => {
        state.taxonomyLoading = false;
        state.error = action.payload as string;
      });

    // Use Cases
    builder
      .addCase(fetchUseCases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUseCases.fulfilled, (state, action) => {
        state.loading = false;
        state.useCases = action.payload.data;
        state.useCasesTotal = action.payload.pagination.total;
      })
      .addCase(fetchUseCases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Skeletons
    builder
      .addCase(fetchAgentSkeletons.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAgentSkeletons.fulfilled, (state, action) => {
        state.loading = false;
        state.skeletons = action.payload.data;
      })
      .addCase(fetchAgentSkeletons.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Variants
    builder
      .addCase(fetchAgentVariants.pending, (state) => {
        state.variantsLoading = true;
        state.error = null;
      })
      .addCase(fetchAgentVariants.fulfilled, (state, action) => {
        state.variantsLoading = false;
        state.variants = action.payload.data;
        state.variantsTotal = action.payload.pagination.total;
      })
      .addCase(fetchAgentVariants.rejected, (state, action) => {
        state.variantsLoading = false;
        state.error = action.payload as string;
      });

    // Intelligence
    builder
      .addCase(fetchIntelligence.pending, (state) => {
        state.intelligenceLoading = true;
        state.error = null;
      })
      .addCase(fetchIntelligence.fulfilled, (state, action) => {
        state.intelligenceLoading = false;
        state.intelligence = action.payload.data;
      })
      .addCase(fetchIntelligence.rejected, (state, action) => {
        state.intelligenceLoading = false;
        state.error = action.payload as string;
      });

    // Simulation
    builder
      .addCase(simulateStack.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(simulateStack.fulfilled, (state, action) => {
        state.loading = false;
        state.simulation = action.payload.data;
      })
      .addCase(simulateStack.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearSimulation } = registrySlice.actions;
export default registrySlice.reducer;
