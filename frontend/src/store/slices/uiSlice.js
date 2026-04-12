import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
    name: 'ui',
    initialState: {
        sidebarOpen: true,
        theme: localStorage.getItem('theme') || 'dark',
        // Change 1: Renamed to 'modal' and structured as an object to hold edit data
        modal: { type: null, data: null },
        notification: null,
    },
    reducers: {
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        toggleTheme: (state) => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', state.theme);
        },
        // Change 2: Expect action.payload to be { type: string, data?: any }
        openModal: (state, action) => {
            state.modal = {
                type: action.payload.type,
                data: action.payload.data || null
            };
        },
        closeModal: (state) => {
            state.modal = { type: null, data: null };
        },
        setNotification: (state, action) => {
            state.notification = action.payload;
        },
        clearNotification: (state) => {
            state.notification = null;
        },
    },
});

export const {
    toggleSidebar,
    toggleTheme,
    openModal,
    closeModal,
    setNotification,
    clearNotification
} = uiSlice.actions;

export default uiSlice.reducer;