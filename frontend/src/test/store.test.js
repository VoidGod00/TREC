import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { clearError } from '../store/slices/authSlice';
import transactionReducer, {
    setFilters, setPage, fetchTransactions, createTransaction, deleteTransaction, updateTransaction
} from '../store/slices/transactionSlice';
import analyticsReducer, { setSelectedPeriod } from '../store/slices/analyticsSlice';
import uiReducer, { toggleSidebar, toggleTheme, openModal, closeModal } from '../store/slices/uiSlice';

// ─── Auth Slice Tests ─────────────────────────────────────────────────────────
describe('authSlice', () => {
    let store;
    beforeEach(() => {
        store = configureStore({ reducer: { auth: authReducer } });
    });

    it('has correct initial state', () => {
        const state = store.getState().auth;
        expect(state.user).toBeNull();
        expect(state.loading).toBe(false);
        expect(state.error).toBeNull();
    });

    it('clearError removes error', () => {
        store.dispatch({ type: 'auth/login/rejected', payload: 'Invalid credentials' });
        store.dispatch(clearError());
        expect(store.getState().auth.error).toBeNull();
    });

    it('login pending sets loading true', () => {
        store.dispatch({ type: 'auth/login/pending' });
        expect(store.getState().auth.loading).toBe(true);
    });

    it('login rejected sets error', () => {
        store.dispatch({ type: 'auth/login/rejected', payload: 'Invalid credentials' });
        expect(store.getState().auth.error).toBe('Invalid credentials');
        expect(store.getState().auth.loading).toBe(false);
    });

    it('login fulfilled sets authenticated', () => {
        store.dispatch({
            type: 'auth/login/fulfilled',
            payload: { tokens: {}, user: { id: 1, name: 'Alice', email: 'alice@test.com' } },
        });
        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(true);
        expect(state.user?.name).toBe('Alice');
        expect(state.loading).toBe(false);
    });

    it('logout clears auth state', () => {
        store.dispatch({ type: 'auth/login/fulfilled', payload: { tokens: {}, user: { id: 1 } } });
        store.dispatch({ type: 'auth/logout/fulfilled' });
        const state = store.getState().auth;
        expect(state.isAuthenticated).toBe(false);
        expect(state.user).toBeNull();
    });
});

// ─── Transaction Slice Tests ──────────────────────────────────────────────────
describe('transactionSlice', () => {
    let store;
    const mockTransaction = {
        id: 1, amount: '500.00', category: 'food', type: 'expense',
        date: '2024-01-15T10:00:00Z', note: 'Lunch', merchant: null, is_recurring: false,
    };

    beforeEach(() => {
        store = configureStore({ reducer: { transactions: transactionReducer } });
    });

    it('has correct initial state', () => {
        const state = store.getState().transactions;
        expect(state.items).toEqual([]);
        expect(state.total).toBe(0);
        expect(state.loading).toBe(false);
        expect(state.filters.page).toBe(1);
        expect(state.filters.page_size).toBe(20);
    });

    it('setFilters resets page to 1 if no page is explicitly provided', () => {
        store.dispatch(setPage(3));
        store.dispatch(setFilters({ type: 'expense' }));

        const state = store.getState().transactions;
        expect(state.filters.type).toBe('expense');
        expect(state.filters.page).toBe(1);
    });

    it('setFilters keeps the explicitly requested page', () => {
        store.dispatch(setFilters({ type: 'expense', page: 3 }));

        const state = store.getState().transactions;
        expect(state.filters.type).toBe('expense');
        expect(state.filters.page).toBe(3);
    });

    it('setPage updates page in filters', () => {
        store.dispatch(setPage(5));
        expect(store.getState().transactions.filters.page).toBe(5);
    });

    // 👇 Here is where we are now using your imports! 👇
    it('fetchTransactions pending sets loading', () => {
        store.dispatch(fetchTransactions.pending());
        expect(store.getState().transactions.loading).toBe(true);
    });

    it('fetchTransactions fulfilled updates items', () => {
        const payload = { items: [mockTransaction], total: 1, page: 1, total_pages: 1 };
        store.dispatch(fetchTransactions.fulfilled(payload));

        const state = store.getState().transactions;
        expect(state.items).toHaveLength(1);
        expect(state.total).toBe(1);
        expect(state.loading).toBe(false);
    });

    it('createTransaction fulfilled prepends to list', () => {
        const initialPayload = { items: [mockTransaction], total: 1, page: 1, total_pages: 1 };
        store.dispatch(fetchTransactions.fulfilled(initialPayload));

        const newTx = { ...mockTransaction, id: 2, amount: '200.00' };
        store.dispatch(createTransaction.fulfilled(newTx));

        const state = store.getState().transactions;
        expect(state.items[0].id).toBe(2);
        expect(state.total).toBe(2);
    });

    it('updateTransaction fulfilled replaces item', () => {
        const initialPayload = { items: [mockTransaction], total: 1, page: 1, total_pages: 1 };
        store.dispatch(fetchTransactions.fulfilled(initialPayload));

        const updated = { ...mockTransaction, amount: '999.00' };
        store.dispatch(updateTransaction.fulfilled(updated));

        expect(store.getState().transactions.items[0].amount).toBe('999.00');
    });

    it('deleteTransaction fulfilled removes item', () => {
        const initialPayload = { items: [mockTransaction], total: 1, page: 1, total_pages: 1 };
        store.dispatch(fetchTransactions.fulfilled(initialPayload));

        store.dispatch(deleteTransaction.fulfilled(1));

        const state = store.getState().transactions;
        expect(state.items).toHaveLength(0);
        expect(state.total).toBe(0);
    });
});

// ─── Analytics Slice Tests ────────────────────────────────────────────────────
describe('analyticsSlice', () => {
    let store;
    beforeEach(() => {
        store = configureStore({ reducer: { analytics: analyticsReducer } });
    });

    it('has correct initial state', () => {
        const state = store.getState().analytics;
        expect(state.dashboard).toBeNull();
        expect(state.loading).toBe(false);
        expect(typeof state.selectedYear).toBe('number');
        expect(state.selectedMonth).toBeGreaterThanOrEqual(1);
        expect(state.selectedMonth).toBeLessThanOrEqual(12);
    });

    it('setSelectedPeriod updates year and month', () => {
        store.dispatch(setSelectedPeriod({ year: 2023, month: 6 }));
        const state = store.getState().analytics;
        expect(state.selectedYear).toBe(2023);
        expect(state.selectedMonth).toBe(6);
    });

    it('fetchDashboard pending sets loading', () => {
        store.dispatch({ type: 'analytics/fetchDashboard/pending' });
        expect(store.getState().analytics.loading).toBe(true);
    });

    it('fetchDashboard fulfilled sets dashboard', () => {
        const mockDashboard = {
            total_income: '5000', total_expense: '2500', net_savings: '2500',
            savings_rate: 50, category_breakdown: [], monthly_trends: [], budget_status: [],
        };
        store.dispatch({ type: 'analytics/fetchDashboard/fulfilled', payload: mockDashboard });
        const state = store.getState().analytics;
        expect(state.dashboard).toEqual(mockDashboard);
        expect(state.loading).toBe(false);
    });

    it('fetchDashboard rejected sets error', () => {
        store.dispatch({ type: 'analytics/fetchDashboard/rejected', payload: 'Network error' });
        const state = store.getState().analytics;
        expect(state.error).toBe('Network error');
        expect(state.loading).toBe(false);
    });
});

// ─── UI Slice Tests ────────────────────────────────────────────────────────────
describe('uiSlice', () => {
    let store;
    beforeEach(() => {
        localStorage.clear();
        store = configureStore({ reducer: { ui: uiReducer } });
    });

    it('toggleSidebar flips state', () => {
        const initial = store.getState().ui.sidebarOpen;
        store.dispatch(toggleSidebar());
        expect(store.getState().ui.sidebarOpen).toBe(!initial);
        store.dispatch(toggleSidebar());
        expect(store.getState().ui.sidebarOpen).toBe(initial);
    });

    it('openModal sets modal type and data', () => {
        store.dispatch(openModal({ type: 'addTransaction', data: { id: 1 } }));
        const modalState = store.getState().ui.modal;
        expect(modalState.type).toBe('addTransaction');
        expect(modalState.data).toEqual({ id: 1 });
    });

    it('closeModal clears modal state', () => {
        store.dispatch(openModal({ type: 'addTransaction', data: { id: 1 } }));
        store.dispatch(closeModal());
        const modalState = store.getState().ui.modal;
        expect(modalState.type).toBeNull();
        expect(modalState.data).toBeNull();
    });

    it('toggleTheme switches dark/light', () => {
        const initial = store.getState().ui.theme;
        store.dispatch(toggleTheme());
        const after = store.getState().ui.theme;
        expect(after).not.toBe(initial);
        expect(['dark', 'light']).toContain(after);
    });
});

// ─── Utility: Currency Formatting ─────────────────────────────────────────────
describe('formatINR utility', () => {
    const formatINR = (v) => `₹${Number(v).toLocaleString('en-IN')}`;

    it('formats whole number', () => {
        expect(formatINR(1000)).toBe('₹1,000');
    });

    it('formats large number', () => {
        expect(formatINR(100000)).toContain('₹');
    });

    it('handles zero', () => {
        expect(formatINR(0)).toBe('₹0');
    });

    it('handles string input', () => {
        expect(formatINR('500.00')).toBe('₹500');
    });
});