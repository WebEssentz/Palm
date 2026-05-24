import { Reducer } from "@reduxjs/toolkit";
import profile from './profile'
import projects from './projects'
import project from './project'
import shapes from './shapes'
import viewport from './viewport'
import ui from './ui'

export const slices: Record<string, Reducer> = {
    profile,
    projects,
    project,
    shapes,
    viewport,
    ui,
}