import React, { useEffect, useState } from "react"
import ZoomBar from "./zoom"
import ToolBarShapes from "./shapes"
import HelpBar from "./help"
import Minimap from "../minimap"
import { motion, AnimatePresence } from "framer-motion"

const springTransition = { type: 'spring', damping: 28, stiffness: 320 } as const

const Toolbar = () => {
  const [workspaceTab, setWorkspaceTab] = useState<'canvas' | 'styles'>('canvas')
  const [showMinimap, setShowMinimap] = useState(false)
  const [isMinimapExpanded, setIsMinimapExpanded] = useState(false)

  const minimapHeight = isMinimapExpanded ? 150 : 100
  const minimapWidth = isMinimapExpanded ? 240 : 160

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
      {/* Left-edge tool strip */}
      <div className="fixed left-2 top-16 flex flex-col items-start gap-3 z-50 pointer-events-none">
        <div className="pointer-events-auto relative">
          <ToolBarShapes />
        </div>
      </div>

      {/* Bottom left — Zoom / Minimap Zone + Help pill */}
      <div className="fixed bottom-2.5 left-2 z-50 flex items-end gap-1.5 pointer-events-none">
        {/* Minimap + ZoomBar Interactive Group */}
        <motion.div
          animate={{ width: showMinimap ? minimapWidth : 'auto' }}
          transition={springTransition}
          className="relative pointer-events-auto flex items-end"
        >
          {/* Minimap — Appears at bottom left */}
          <AnimatePresence>
            {showMinimap && (
              <motion.div
                key="bottom-left-minimap"
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 10 }}
                transition={{
                  opacity: { duration: 0.18, ease: 'easeOut' },
                  scale: springTransition,
                  y: springTransition,
                }}
                className="absolute bottom-0 left-0 z-20 origin-bottom-left"
              >
                <Minimap
                  isVisible={true}
                  isExpanded={isMinimapExpanded}
                  onToggleExpand={() => setIsMinimapExpanded((v) => !v)}
                  onClose={() => setShowMinimap(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ZoomBar — Always visible, smoothly slides up above minimap when open, and glides down to bottom when closed */}
          <motion.div
            animate={{
              y: showMinimap ? -(minimapHeight + 6) : 0,
            }}
            transition={springTransition}
            className="relative z-30"
          >
            <ZoomBar
              isMinimapOpen={showMinimap}
              onToggleMinimap={() => setShowMinimap((v) => !v)}
            />
          </motion.div>
        </motion.div>

        {/* HelpBar (?) — stays distinct and smoothly shifts horizontally with minimap expansion/closing */}
        <motion.div
          layout
          transition={springTransition}
          className="pointer-events-auto relative z-10"
        >
          <HelpBar />
        </motion.div>
      </div>
    </>
  )
}

export default Toolbar