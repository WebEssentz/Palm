'use client'
import ZoomBar from "./zoom"
import ToolBarShapes from "./shapes"
import AutoSave from "../../../components/canvas/autosave"
import { ThemeToggle } from '../../theme/toggle'

const Toolbar = () => {
  return (
    <>
      {/* Right-edge tool strip */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col items-end gap-3 z-50 pointer-events-none">
        <div className="pointer-events-auto relative">
          <ToolBarShapes />
        </div>
      </div>

      {/* Bottom right — theme + autosave + zoom */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <ThemeToggle />
        </div>
        <div className="pointer-events-auto">
          <AutoSave />
        </div>
        <div className="pointer-events-auto">
          <ZoomBar />
        </div>
      </div>
    </>
  )
}

export default Toolbar