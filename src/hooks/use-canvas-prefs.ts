'use client'

import { useSyncExternalStore } from 'react'

export type ToolbarPosition = 'left' | 'right' | 'bottom'

type Prefs = {
    toolbarPosition: ToolbarPosition
    showDotGrid: boolean
}

const KEY = 'palm:canvas-prefs'
const DEFAULTS: Prefs = { toolbarPosition: 'left', showDotGrid: true }

let cache: Prefs = DEFAULTS
let loaded = false
const listeners = new Set<() => void>()

function load() {
    if (loaded || typeof window === 'undefined') return
    loaded = true
    try {
        const raw = window.localStorage.getItem(KEY)
        if (raw) cache = { ...DEFAULTS, ...JSON.parse(raw) }
    } catch {}
}

function subscribe(cb: () => void) {
    listeners.add(cb)
    return () => {
        listeners.delete(cb)
    }
}

const getSnapshot = () => {
    load()
    return cache
}
const getServerSnapshot = () => DEFAULTS

function update(patch: Partial<Prefs>) {
    cache = { ...cache, ...patch }
    try {
        window.localStorage.setItem(KEY, JSON.stringify(cache))
    } catch {}
    listeners.forEach((l) => l())
}

export function useCanvasPrefs() {
    const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    return {
        ...prefs,
        setToolbarPosition: (p: ToolbarPosition) => update({ toolbarPosition: p }),
        setShowDotGrid: (v: boolean) => update({ showDotGrid: v }),
    }
}
