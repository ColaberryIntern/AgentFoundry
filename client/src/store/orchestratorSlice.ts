import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orchestratorApi } from '../services/orchestratorApi';
import type {
  OrchestratorDashboard,
  OrchestratorIntent,
  OrchestratorAction,
  OrchestratorSetting,
  GuardrailViolation,
  ScanLogEntry,
  MarketplaceSubmission,
} from '../types/orchestrator';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

interface OrchestratorState {
  dashboard: OrchestratorDashboard | null;
  dashboardLoading: boolean;
  intents: OrchestratorIntent[];
  intentsTotal: number;
  intentsLoading: boolean;
  actions: OrchestratorAction[];
  actionsTotal: number;
  actionsLoading: boolean;
  settings: OrchestratorSetting[];
  settingsLoading: boolean;
  violations: GuardrailViolation[];
  violationsTotal: number;
  violationsLoading: boolean;
  scans: ScanLogEntry[];
  scansTotal: number;
  scansLoading: boolean;
  marketplace: MarketplaceSubmission[];
  marketplaceTotal: number;
  marketplaceLoading: boolean;
  error: string | null;
}

const initialState: OrchestratorState = {
  dashboard: null,
  dashboardLoading: false,
  intents: [],
  intentsTotal: 0,
  intentsLoading: false,
  actions: [],
  actionsTotal: 0,
  actionsLoading: false,
  settings: [],
  settingsLoading: false,
  violations: [],
  violationsTotal: 0,
  violationsLoading: false,
  scans: [],
  scansTotal: 0,
  scansLoading: false,
  marketplace: [],
  marketplaceTotal: 0,
  marketplaceLoading: false,
  error: null,
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const error = err as AxiosError<ApiErrorResponse>;
  return error.response?.data?.error?.message || fallback;
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchDashboard = createAsyncThunk(
  'orchestrator/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.getDashboard();
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch dashboard'));
    }
  },
);

export const fetchIntents = createAsyncThunk(
  'orchestrator/fetchIntents',
  async (
    params: {
      status?: string;
      type?: string;
      priority?: string;
      page?: number;
      limit?: number;
    } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await orchestratorApi.getIntents(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch intents'));
    }
  },
);

export const fetchActions = createAsyncThunk(
  'orchestrator/fetchActions',
  async (
    params: { status?: string; intent_id?: string; page?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await orchestratorApi.getActions(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch actions'));
    }
  },
);

export const fetchSettings = createAsyncThunk(
  'orchestrator/fetchSettings',
  async (params: { category?: string } = {}, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.getSettings(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch settings'));
    }
  },
);

export const updateSetting = createAsyncThunk(
  'orchestrator/updateSetting',
  async ({ key, value }: { key: string; value: unknown }, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.updateSetting(key, { value });
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to update setting'));
    }
  },
);

export const fetchViolations = createAsyncThunk(
  'orchestrator/fetchViolations',
  async (
    params: { resolved?: string; page?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await orchestratorApi.getViolations(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch violations'));
    }
  },
);

export const fetchScans = createAsyncThunk(
  'orchestrator/fetchScans',
  async (
    params: { scan_type?: string; page?: number; limit?: number } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await orchestratorApi.getScans(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch scans'));
    }
  },
);

export const fetchMarketplace = createAsyncThunk(
  'orchestrator/fetchMarketplace',
  async (params: { status?: string; page?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.getMarketplace(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to fetch marketplace'));
    }
  },
);

export const approveIntent = createAsyncThunk(
  'orchestrator/approveIntent',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.approveIntent(id, { reason });
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to approve intent'));
    }
  },
);

export const rejectIntent = createAsyncThunk(
  'orchestrator/rejectIntent',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.rejectIntent(id, { reason });
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to reject intent'));
    }
  },
);

export const approveAction = createAsyncThunk(
  'orchestrator/approveAction',
  async ({ id, reason }: { id: string; reason?: string }, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.approveAction(id, { reason });
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to approve action'));
    }
  },
);

export const rejectAction = createAsyncThunk(
  'orchestrator/rejectAction',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.rejectAction(id, { reason });
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to reject action'));
    }
  },
);

export const resolveViolation = createAsyncThunk(
  'orchestrator/resolveViolation',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await orchestratorApi.resolveViolation(id, { reason });
      return response.data;
    } catch (err) {
      return rejectWithValue(extractErrorMessage(err, 'Failed to resolve violation'));
    }
  },
);

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const orchestratorSlice = createSlice({
  name: 'orchestrator',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Dashboard
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.dashboardLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.dashboardLoading = false;
        state.dashboard = action.payload.data;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.dashboardLoading = false;
        state.error = action.payload as string;
      });

    // Intents
    builder
      .addCase(fetchIntents.pending, (state) => {
        state.intentsLoading = true;
        state.error = null;
      })
      .addCase(fetchIntents.fulfilled, (state, action) => {
        state.intentsLoading = false;
        state.intents = action.payload.data;
        state.intentsTotal = action.payload.pagination.total;
      })
      .addCase(fetchIntents.rejected, (state, action) => {
        state.intentsLoading = false;
        state.error = action.payload as string;
      });

    // Actions
    builder
      .addCase(fetchActions.pending, (state) => {
        state.actionsLoading = true;
        state.error = null;
      })
      .addCase(fetchActions.fulfilled, (state, action) => {
        state.actionsLoading = false;
        state.actions = action.payload.data;
        state.actionsTotal = action.payload.pagination.total;
      })
      .addCase(fetchActions.rejected, (state, action) => {
        state.actionsLoading = false;
        state.error = action.payload as string;
      });

    // Settings
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.settingsLoading = true;
        state.error = null;
      })
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.settingsLoading = false;
        state.settings = action.payload.data;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.settingsLoading = false;
        state.error = action.payload as string;
      });

    // Update Setting
    builder
      .addCase(updateSetting.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const idx = state.settings.findIndex((s) => s.settingKey === updated.settingKey);
        if (idx >= 0) state.settings[idx] = updated;
      })
      .addCase(updateSetting.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Violations
    builder
      .addCase(fetchViolations.pending, (state) => {
        state.violationsLoading = true;
        state.error = null;
      })
      .addCase(fetchViolations.fulfilled, (state, action) => {
        state.violationsLoading = false;
        state.violations = action.payload.data;
        state.violationsTotal = action.payload.pagination.total;
      })
      .addCase(fetchViolations.rejected, (state, action) => {
        state.violationsLoading = false;
        state.error = action.payload as string;
      });

    // Scans
    builder
      .addCase(fetchScans.pending, (state) => {
        state.scansLoading = true;
        state.error = null;
      })
      .addCase(fetchScans.fulfilled, (state, action) => {
        state.scansLoading = false;
        state.scans = action.payload.data;
        state.scansTotal = action.payload.pagination.total;
      })
      .addCase(fetchScans.rejected, (state, action) => {
        state.scansLoading = false;
        state.error = action.payload as string;
      });

    // Marketplace
    builder
      .addCase(fetchMarketplace.pending, (state) => {
        state.marketplaceLoading = true;
        state.error = null;
      })
      .addCase(fetchMarketplace.fulfilled, (state, action) => {
        state.marketplaceLoading = false;
        state.marketplace = action.payload.data;
        state.marketplaceTotal = action.payload.pagination.total;
      })
      .addCase(fetchMarketplace.rejected, (state, action) => {
        state.marketplaceLoading = false;
        state.error = action.payload as string;
      });

    // Approve/Reject Intent — refresh dashboard after mutation
    builder
      .addCase(approveIntent.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const idx = state.intents.findIndex((i) => i.id === updated.id);
        if (idx >= 0) state.intents[idx] = updated;
      })
      .addCase(approveIntent.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(rejectIntent.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const idx = state.intents.findIndex((i) => i.id === updated.id);
        if (idx >= 0) state.intents[idx] = updated;
      })
      .addCase(rejectIntent.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Approve/Reject Action
    builder
      .addCase(approveAction.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const idx = state.actions.findIndex((a) => a.id === updated.id);
        if (idx >= 0) state.actions[idx] = updated;
      })
      .addCase(approveAction.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(rejectAction.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const idx = state.actions.findIndex((a) => a.id === updated.id);
        if (idx >= 0) state.actions[idx] = updated;
      })
      .addCase(rejectAction.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Resolve Violation
    builder
      .addCase(resolveViolation.fulfilled, (state, action) => {
        const updated = action.payload.data;
        const idx = state.violations.findIndex((v) => v.id === updated.id);
        if (idx >= 0) state.violations[idx] = updated;
      })
      .addCase(resolveViolation.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = orchestratorSlice.actions;
export default orchestratorSlice.reducer;
