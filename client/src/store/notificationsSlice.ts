import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { notificationsApi, type Notification } from '../services/notificationsApi';
import type { AxiosError } from 'axios';

interface NotificationsState {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

interface ApiErrorResponse {
  error: { code: string; message: string; details?: unknown };
}

const initialState: NotificationsState = {
  notifications: [],
  total: 0,
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async (
    params: { page?: number; limit?: number; unreadOnly?: boolean } | undefined,
    { rejectWithValue },
  ) => {
    try {
      const response = await notificationsApi.list(params);
      return response.data;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to fetch notifications',
      );
    }
  },
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationsApi.getUnreadCount();
      return response.data.count;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to fetch unread count',
      );
    }
  },
);

export const readNotification = createAsyncThunk(
  'notifications/readNotification',
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationsApi.markAsRead(id);
      return id;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to mark notification as read',
      );
    }
  },
);

export const readAllNotifications = createAsyncThunk(
  'notifications/readAllNotifications',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationsApi.markAllAsRead();
      return response.data.updated;
    } catch (err) {
      const error = err as AxiosError<ApiErrorResponse>;
      return rejectWithValue(
        error.response?.data?.error?.message || 'Failed to mark all notifications as read',
      );
    }
  },
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotificationsError(state) {
      state.error = null;
    },
    addNotification(state, action: PayloadAction<Notification>) {
      state.notifications.unshift(action.payload);
      state.total += 1;
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch Notifications
    builder.addCase(fetchNotifications.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchNotifications.fulfilled, (state, action) => {
      state.isLoading = false;
      state.notifications = action.payload.notifications;
      state.total = action.payload.total;
    });
    builder.addCase(fetchNotifications.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Unread Count
    builder.addCase(fetchUnreadCount.pending, (state) => {
      state.error = null;
    });
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });
    builder.addCase(fetchUnreadCount.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Mark as Read
    builder.addCase(readNotification.fulfilled, (state, action) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.isRead) {
        notification.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });
    builder.addCase(readNotification.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Mark All as Read
    builder.addCase(readAllNotifications.fulfilled, (state) => {
      state.notifications.forEach((n) => {
        n.isRead = true;
      });
      state.unreadCount = 0;
    });
    builder.addCase(readAllNotifications.rejected, (state, action) => {
      state.error = action.payload as string;
    });
  },
});

export const { clearNotificationsError, addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;
