import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { agentsApi } from '../services/agentsApi';
import type {
  AgentStack,
  AgentStackCreateRequest,
  AgentStackUpdateRequest,
  AgentListParams,
  AgentMetrics,
  AgentOptimization,
} from '../types/agents';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

interface AgentsState {
  agents: AgentStack[];
  selectedAgent: AgentStack | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  metrics: AgentMetrics | null;
  metricsLoading: boolean;
  optimization: AgentOptimization | null;
  optimizationLoading: boolean;
}

const initialState: AgentsState = {
  agents: [],
  selectedAgent: null,
  loading: false,
  error: null,
  total: 0,
  page: 1,
  limit: 20,
  metrics: null,
  metricsLoading: false,
  optimization: null,
  optimizationLoading: false,
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosError<ApiErrorResponse>;
  return error.response?.data?.error?.message || fallback;
}

export const fetchAgents = createAsyncThunk(
  'agents/fetchAgents',
  async (params: AgentListParams, { rejectWithValue }) => {
    try {
      const response = await agentsApi.listAgents(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch agents'));
    }
  },
);

export const fetchAgent = createAsyncThunk(
  'agents/fetchAgent',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await agentsApi.getAgent(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch agent'));
    }
  },
);

export const createAgent = createAsyncThunk(
  'agents/createAgent',
  async (data: AgentStackCreateRequest, { rejectWithValue }) => {
    try {
      const response = await agentsApi.createAgent(data);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to create agent'));
    }
  },
);

export const updateAgent = createAsyncThunk(
  'agents/updateAgent',
  async ({ id, data }: { id: string; data: AgentStackUpdateRequest }, { rejectWithValue }) => {
    try {
      const response = await agentsApi.updateAgent(id, data);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update agent'));
    }
  },
);

export const deleteAgent = createAsyncThunk(
  'agents/deleteAgent',
  async (id: string, { rejectWithValue }) => {
    try {
      await agentsApi.deleteAgent(id);
      return id;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to delete agent'));
    }
  },
);

export const deployAgent = createAsyncThunk(
  'agents/deployAgent',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await agentsApi.deployAgent(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to deploy agent'));
    }
  },
);

export const pauseAgent = createAsyncThunk(
  'agents/pauseAgent',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await agentsApi.pauseAgent(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to pause agent'));
    }
  },
);

export const resumeAgent = createAsyncThunk(
  'agents/resumeAgent',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await agentsApi.resumeAgent(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to resume agent'));
    }
  },
);

export const stopAgent = createAsyncThunk(
  'agents/stopAgent',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await agentsApi.stopAgent(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to stop agent'));
    }
  },
);

export const fetchAgentMetrics = createAsyncThunk(
  'agents/fetchAgentMetrics',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await agentsApi.getMetrics(id);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch agent metrics'));
    }
  },
);

export const optimizeAgent = createAsyncThunk(
  'agents/optimizeAgent',
  async (
    { id, constraints }: { id: string; constraints?: Record<string, unknown> },
    { rejectWithValue },
  ) => {
    try {
      const response = await agentsApi.optimize(id, constraints);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to optimize agent'));
    }
  },
);

const agentsSlice = createSlice({
  name: 'agents',
  initialState,
  reducers: {
    clearAgentsError(state) {
      state.error = null;
    },
    clearSelectedAgent(state) {
      state.selectedAgent = null;
    },
    clearMetrics(state) {
      state.metrics = null;
    },
    clearOptimization(state) {
      state.optimization = null;
    },
  },
  extraReducers: (builder) => {
    // fetchAgents
    builder.addCase(fetchAgents.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchAgents.fulfilled, (state, action) => {
      state.loading = false;
      state.agents = action.payload.agents;
      state.total = action.payload.total;
      state.page = action.payload.page;
      state.limit = action.payload.limit;
    });
    builder.addCase(fetchAgents.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // fetchAgent
    builder.addCase(fetchAgent.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchAgent.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedAgent = action.payload;
    });
    builder.addCase(fetchAgent.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // createAgent
    builder.addCase(createAgent.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(createAgent.fulfilled, (state, action) => {
      state.loading = false;
      state.agents = [action.payload, ...state.agents];
      state.total += 1;
    });
    builder.addCase(createAgent.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // updateAgent
    builder.addCase(updateAgent.fulfilled, (state, action) => {
      const updated = action.payload;
      state.agents = state.agents.map((a) => (a.id === updated.id ? updated : a));
      if (state.selectedAgent?.id === updated.id) {
        state.selectedAgent = updated;
      }
    });
    builder.addCase(updateAgent.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // deleteAgent
    builder.addCase(deleteAgent.fulfilled, (state, action) => {
      state.agents = state.agents.filter((a) => a.id !== action.payload);
      state.total -= 1;
      if (state.selectedAgent?.id === action.payload) {
        state.selectedAgent = null;
      }
    });
    builder.addCase(deleteAgent.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // deployAgent
    builder.addCase(deployAgent.fulfilled, (state, action) => {
      const updated = action.payload;
      state.agents = state.agents.map((a) => (a.id === updated.id ? updated : a));
      if (state.selectedAgent?.id === updated.id) {
        state.selectedAgent = updated;
      }
    });
    builder.addCase(deployAgent.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // pauseAgent
    builder.addCase(pauseAgent.fulfilled, (state, action) => {
      const updated = action.payload;
      state.agents = state.agents.map((a) => (a.id === updated.id ? updated : a));
      if (state.selectedAgent?.id === updated.id) {
        state.selectedAgent = updated;
      }
    });
    builder.addCase(pauseAgent.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // resumeAgent
    builder.addCase(resumeAgent.fulfilled, (state, action) => {
      const updated = action.payload;
      state.agents = state.agents.map((a) => (a.id === updated.id ? updated : a));
      if (state.selectedAgent?.id === updated.id) {
        state.selectedAgent = updated;
      }
    });
    builder.addCase(resumeAgent.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // stopAgent
    builder.addCase(stopAgent.fulfilled, (state, action) => {
      const updated = action.payload;
      state.agents = state.agents.map((a) => (a.id === updated.id ? updated : a));
      if (state.selectedAgent?.id === updated.id) {
        state.selectedAgent = updated;
      }
    });
    builder.addCase(stopAgent.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // fetchAgentMetrics
    builder.addCase(fetchAgentMetrics.pending, (state) => {
      state.metricsLoading = true;
    });
    builder.addCase(fetchAgentMetrics.fulfilled, (state, action) => {
      state.metricsLoading = false;
      state.metrics = action.payload;
    });
    builder.addCase(fetchAgentMetrics.rejected, (state, action) => {
      state.metricsLoading = false;
      state.error = action.payload as string;
    });

    // optimizeAgent
    builder.addCase(optimizeAgent.pending, (state) => {
      state.optimizationLoading = true;
    });
    builder.addCase(optimizeAgent.fulfilled, (state, action) => {
      state.optimizationLoading = false;
      state.optimization = action.payload;
    });
    builder.addCase(optimizeAgent.rejected, (state, action) => {
      state.optimizationLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearAgentsError, clearSelectedAgent, clearMetrics, clearOptimization } =
  agentsSlice.actions;
export default agentsSlice.reducer;
