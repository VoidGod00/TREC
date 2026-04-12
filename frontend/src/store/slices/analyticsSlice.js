import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { analyticsApi } from '../../services/api';

export const fetchDashboard = createAsyncThunk(
  'analytics/fetchDashboard',
  async ({ year, month }, { rejectWithValue }) => {
    try {
      const { data } = await analyticsApi.dashboard(year, month);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Fetch failed');
    }
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    dashboard: null,
    loading: false,
    error: null,
    selectedYear: new Date().getFullYear(),
    selectedMonth: new Date().getMonth() + 1,
  },
  reducers: {
    setSelectedPeriod: (state, action) => {
      state.selectedYear = action.payload.year;
      state.selectedMonth = action.payload.month;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboard = action.payload;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedPeriod } = analyticsSlice.actions;
export default analyticsSlice.reducer;


// ─── UI Slice ─────────────────────────────────────────────────────────────────
import { createSlice as cs } from '@reduxjs/toolkit';

const uiSlice = cs({
  name: 'ui',
  initialState: {
    sidebarOpen: true,
    theme: 'dark',
    modalOpen: null,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    toggleTheme: (state) => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; },
    openModal: (state, action) => { state.modalOpen = action.payload; },
    closeModal: (state) => { state.modalOpen = null; },
  },
});

export const { toggleSidebar, toggleTheme, openModal, closeModal } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
