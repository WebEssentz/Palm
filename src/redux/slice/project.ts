import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ProjectMetadata {
    id: string | null
    referenceUrls: string[]
}

const initialState: ProjectMetadata = {
    id: null,
    referenceUrls: [],
}

const projectSlice = createSlice({
    name: 'project',
    initialState,
    reducers: {
        setProjectMetadata: (state, action: PayloadAction<{ id?: string; referenceUrls?: string[] }>) => {
            if (action.payload.id !== undefined) state.id = action.payload.id
            if (action.payload.referenceUrls !== undefined) state.referenceUrls = action.payload.referenceUrls
        },
        clearProjectMetadata: (state) => {
            state.id = null
            state.referenceUrls = []
        },
    },
})

export const { setProjectMetadata, clearProjectMetadata } = projectSlice.actions
export default projectSlice.reducer
