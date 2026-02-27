import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  webhooksApi,
  type Webhook,
  type WebhookLog,
  type CreateWebhookPayload,
  type UpdateWebhookPayload,
} from '../services/webhooksApi';
import type { AxiosError } from 'axios';

interface WebhooksState {
  webhooks: Webhook[];
  total: number;
  currentWebhook: Webhook | null;
  logs: WebhookLog[];
  logsTotal: number;
  isLoading: boolean;
  error: string | null;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: WebhooksState = {
  webhooks: [],
  total: 0,
  currentWebhook: null,
  logs: [],
  logsTotal: 0,
  isLoading: false,
  error: null,
};

export const fetchWebhooks = createAsyncThunk(
  'webhooks/fetchWebhooks',
  async (params: { page?: number; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      const response = await webhooksApi.list(params);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch webhooks');
    }
  },
);

export const fetchWebhook = createAsyncThunk(
  'webhooks/fetchWebhook',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await webhooksApi.get(id);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch webhook');
    }
  },
);

export const createWebhook = createAsyncThunk(
  'webhooks/createWebhook',
  async (data: CreateWebhookPayload, { rejectWithValue }) => {
    try {
      const response = await webhooksApi.create(data);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create webhook');
    }
  },
);

export const updateWebhook = createAsyncThunk(
  'webhooks/updateWebhook',
  async ({ id, data }: { id: string; data: UpdateWebhookPayload }, { rejectWithValue }) => {
    try {
      const response = await webhooksApi.update(id, data);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update webhook');
    }
  },
);

export const deleteWebhook = createAsyncThunk(
  'webhooks/deleteWebhook',
  async (id: string, { rejectWithValue }) => {
    try {
      await webhooksApi.delete(id);
      return id;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete webhook');
    }
  },
);

export const fetchWebhookLogs = createAsyncThunk(
  'webhooks/fetchWebhookLogs',
  async (
    { id, params }: { id: string; params?: { page?: number; limit?: number } },
    { rejectWithValue },
  ) => {
    try {
      const response = await webhooksApi.getLogs(id, params);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to fetch webhook logs',
      );
    }
  },
);

export const testWebhook = createAsyncThunk(
  'webhooks/testWebhook',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await webhooksApi.test(id);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to test webhook');
    }
  },
);

const webhooksSlice = createSlice({
  name: 'webhooks',
  initialState,
  reducers: {
    clearWebhooksError(state) {
      state.error = null;
    },
    clearCurrentWebhook(state) {
      state.currentWebhook = null;
      state.logs = [];
      state.logsTotal = 0;
    },
  },
  extraReducers: (builder) => {
    // Fetch Webhooks
    builder.addCase(fetchWebhooks.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchWebhooks.fulfilled, (state, action) => {
      state.isLoading = false;
      state.webhooks = action.payload.webhooks;
      state.total = action.payload.total;
    });
    builder.addCase(fetchWebhooks.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Single Webhook
    builder.addCase(fetchWebhook.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchWebhook.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentWebhook = action.payload;
      const index = state.webhooks.findIndex((w) => w.id === action.payload.id);
      if (index !== -1) {
        state.webhooks[index] = action.payload;
      }
    });
    builder.addCase(fetchWebhook.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create Webhook
    builder.addCase(createWebhook.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createWebhook.fulfilled, (state, action) => {
      state.isLoading = false;
      state.webhooks.unshift(action.payload);
      state.total += 1;
    });
    builder.addCase(createWebhook.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update Webhook
    builder.addCase(updateWebhook.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateWebhook.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.webhooks.findIndex((w) => w.id === action.payload.id);
      if (index !== -1) {
        state.webhooks[index] = action.payload;
      }
      if (state.currentWebhook?.id === action.payload.id) {
        state.currentWebhook = action.payload;
      }
    });
    builder.addCase(updateWebhook.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete Webhook
    builder.addCase(deleteWebhook.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteWebhook.fulfilled, (state, action) => {
      state.isLoading = false;
      state.webhooks = state.webhooks.filter((w) => w.id !== action.payload);
      state.total -= 1;
      if (state.currentWebhook?.id === action.payload) {
        state.currentWebhook = null;
      }
    });
    builder.addCase(deleteWebhook.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Webhook Logs
    builder.addCase(fetchWebhookLogs.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchWebhookLogs.fulfilled, (state, action) => {
      state.isLoading = false;
      state.logs = action.payload.logs;
      state.logsTotal = action.payload.total;
    });
    builder.addCase(fetchWebhookLogs.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Test Webhook
    builder.addCase(testWebhook.pending, (state) => {
      state.error = null;
    });
    builder.addCase(testWebhook.fulfilled, (state, action) => {
      // Prepend the test log to the logs list
      state.logs.unshift(action.payload.log);
      state.logsTotal += 1;
    });
    builder.addCase(testWebhook.rejected, (state, action) => {
      state.error = action.payload as string;
    });
  },
});

export const { clearWebhooksError, clearCurrentWebhook } = webhooksSlice.actions;
export default webhooksSlice.reducer;
