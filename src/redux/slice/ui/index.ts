import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type UIState = {
    sidebarOpen: boolean;
};

const initialState: UIState = {
    sidebarOpen: false,
};

const slice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        setSidebarOpen(state, action: PayloadAction<boolean>) {
            state.sidebarOpen = action.payload;
        },
        toggleSidebar(state) {
            state.sidebarOpen = !state.sidebarOpen;
        },
    },
});

export const { setSidebarOpen, toggleSidebar } = slice.actions;
export default slice.reducer;
