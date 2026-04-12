import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { transactionApi } from '../../services/api';

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await transactionApi.list(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Fetch failed');
    }
  }
);

export const createTransaction = createAsyncThunk(
  'transactions/create',
  async (txData, { rejectWithValue }) => {
    try {
      const { data } = await transactionApi.create(txData);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Create failed');
    }
  }
);

export const updateTransaction = createAsyncThunk(
  'transactions/update',
  async ({ id, data: txData }, { rejectWithValue }) => {
    try {
      const { data } = await transactionApi.update(id, txData);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Update failed');
    }
  }
);

export const deleteTransaction = createAsyncThunk(
  'transactions/delete',
  async (id, { rejectWithValue }) => {
    try {
      await transactionApi.delete(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Delete failed');
    }
  }
);

const transactionSlice = createSlice({
  name: 'transactions',
  initialState: {
    items: [],
    total: 0,
    page: 1,
    totalPages: 0,
    loading: false,
    error: null,
    filters: { page: 1, page_size: 20 },
  },
  reducers: {
    setFilters: (state, action) => {
      // 1. Merge the incoming payload (e.g. { page: 2 } OR { search: 'amazon' })
      state.filters = { ...state.filters, ...action.payload };
      
      // 2. If the UI did NOT explicitly ask to change the page, it means they are 
      // searching or filtering. In that case, safely reset to page 1.
      if (action.payload.page === undefined) {
        state.filters.page = 1;
      }
    },
    setPage: (state, action) => {
      state.filters.page = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => { state.loading = true; })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.totalPages = action.payload.total_pages;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
        state.total -= 1;
      });
  },
});

export const { setFilters, setPage } = transactionSlice.actions;
export default transactionSlice.reducer;
