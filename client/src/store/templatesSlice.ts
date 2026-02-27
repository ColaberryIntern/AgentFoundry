import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { templatesApi } from '../services/templatesApi';
import type {
  ReportTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from '../types/reports';
import type { AxiosError } from 'axios';

interface TemplatesState {
  templates: ReportTemplate[];
  currentTemplate: ReportTemplate | null;
  total: number;
  isLoading: boolean;
  error: string | null;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: TemplatesState = {
  templates: [],
  currentTemplate: null,
  total: 0,
  isLoading: false,
  error: null,
};

export const fetchTemplates = createAsyncThunk(
  'templates/fetchTemplates',
  async (params: { page?: number; limit?: number } | undefined, { rejectWithValue }) => {
    try {
      const response = await templatesApi.list(params);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch templates');
    }
  },
);

export const createTemplate = createAsyncThunk(
  'templates/createTemplate',
  async (data: CreateTemplatePayload, { rejectWithValue }) => {
    try {
      const response = await templatesApi.create(data);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create template');
    }
  },
);

export const updateTemplate = createAsyncThunk(
  'templates/updateTemplate',
  async ({ id, data }: { id: string; data: UpdateTemplatePayload }, { rejectWithValue }) => {
    try {
      const response = await templatesApi.update(id, data);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update template');
    }
  },
);

export const deleteTemplate = createAsyncThunk(
  'templates/deleteTemplate',
  async (id: string, { rejectWithValue }) => {
    try {
      await templatesApi.delete(id);
      return id;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete template');
    }
  },
);

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    clearTemplatesError(state) {
      state.error = null;
    },
    setCurrentTemplate(state, action) {
      state.currentTemplate = action.payload;
    },
    clearCurrentTemplate(state) {
      state.currentTemplate = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Templates
    builder.addCase(fetchTemplates.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplates.fulfilled, (state, action) => {
      state.isLoading = false;
      state.templates = action.payload.templates;
      state.total = action.payload.total;
    });
    builder.addCase(fetchTemplates.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Create Template
    builder.addCase(createTemplate.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(createTemplate.fulfilled, (state, action) => {
      state.isLoading = false;
      state.templates.unshift(action.payload);
      state.total += 1;
    });
    builder.addCase(createTemplate.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Update Template
    builder.addCase(updateTemplate.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(updateTemplate.fulfilled, (state, action) => {
      state.isLoading = false;
      const index = state.templates.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.templates[index] = action.payload;
      }
      if (state.currentTemplate?.id === action.payload.id) {
        state.currentTemplate = action.payload;
      }
    });
    builder.addCase(updateTemplate.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Delete Template
    builder.addCase(deleteTemplate.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(deleteTemplate.fulfilled, (state, action) => {
      state.isLoading = false;
      state.templates = state.templates.filter((t) => t.id !== action.payload);
      state.total -= 1;
      if (state.currentTemplate?.id === action.payload) {
        state.currentTemplate = null;
      }
    });
    builder.addCase(deleteTemplate.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
  },
});

export const { clearTemplatesError, setCurrentTemplate, clearCurrentTemplate } =
  templatesSlice.actions;
export default templatesSlice.reducer;
