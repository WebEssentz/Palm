import React, { useEffect, useState } from "react"
import ZoomBar from "./zoom"
import ToolBarShapes from "./shapes"
import HistoryBar from "./history"
import HelpBar from "./help"
import Minimap from "../minimap"

const Toolbar = () => {
  const [workspaceTab, setWorkspaceTab] = useState<'canvas' | 'styles'>('canvas')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWorkspaceTab(window.location.pathname.includes('style-guide') ? 'styles' : 'canvas')
    }
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ tab: 'canvas' | 'styles' }>
      if (customEvent.detail?.tab) {
        setWorkspaceTab(customEvent.detail.tab)
      }
    }
    const handlePopState = () => {
      setWorkspaceTab(window.location.pathname.includes('style-guide') ? 'styles' : 'canvas')
    }
    window.addEventListener('workspace-tab-change', handleTabChange)
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('workspace-tab-change', handleTabChange)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  if (workspaceTab !== 'canvas') return null
  return (
    <>
      {/* Right-edge tool strip — raised slightly to clear expanded minimap */}
      <div className="fixed right-0 top-[42%] -translate-y-1/2 flex flex-col items-end gap-3 z-50 pointer-events-none">
        <div className="pointer-events-auto relative">
          <ToolBarShapes />
        </div>
      </div>

      {/* Bottom left — undo/redo pill (left) + zoom pill (middle) + help pill (right) */}
      <div className="fixed bottom-5 left-3 z-50 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <HistoryBar />
        </div>
        <div className="pointer-events-auto">
          <ZoomBar />
        </div>
        <div className="pointer-events-auto">
          <HelpBar />
        </div>
      </div>

      {/* Bottom right — Minimap pinned to bottom right */}
      <div className="fixed bottom-5 right-3 z-40 pointer-events-none flex items-end justify-end">
        <div className="pointer-events-auto">
          <Minimap />
        </div>
      </div>
    </>
  )
}

export default Toolbar