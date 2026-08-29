import { FrameShape } from "@/redux/slice/shapes";
import { LiquidGlassButton } from "@/components/buttons/liquid-glass";
import { Brush, Monitor } from "lucide-react";
import { useFrame } from "@/hooks/use-canvas";
import { useAppSelector } from "@/redux/store";

export const Frame = ({
  shape,
  toggleInspiration,
}: {
  shape: FrameShape;
  toggleInspiration: () => void;
}) => {
  const viewportScale = useAppSelector((state) => state.viewport.scale);
  const labelScale = Math.min(Math.max(1, 1 / (viewportScale || 1)), 4);
  const maxTitleWidth = Math.max(60, (shape.w - 20) / labelScale);
  const { isGenerating, handleGenerateDesign } = useFrame(shape);

  return (
    <>
      <div
        className="absolute pointer-events-none backdrop-blur-xl bg-foreground/[0.06] border border-foreground/[0.12] saturate-150"
        style={{
          left: shape.x,
          top: shape.y,
          width: shape.w,
          height: shape.h,
          borderRadius: "12px", // Slightly more rounded for modern feel
        }}
      />
      <div
        className="absolute pointer-events-none font-semibold text-foreground/80 select-none flex items-center gap-1.5"
        style={{
          left: shape.x,
          bottom: `calc(100% - ${shape.y}px)`,
          marginBottom: 8 * labelScale,
          maxWidth: maxTitleWidth,
          transformOrigin: "bottom left",
          transform: `scale(${labelScale})`,
          fontSize: "14px",
          lineHeight: "1.2",
          transition: "transform 0.05s ease-out, margin-bottom 0.05s ease-out",
        }}>
        <Monitor size={15} className="opacity-75 flex-shrink-0" />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            display: "block",
          }}
        >
          Frame {Number.isFinite(shape.frameNumber) ? shape.frameNumber : '—'}
        </span>
      </div>
      <div
        className="absolute pointer-events-auto flex gap-4"
        style={{
          left: shape.x + shape.w - 235, // Position at top right, accounting for button width
          top: shape.y - 36, // Position above the frame with some spacing
          zIndex: 1000, // Ensure button is on top
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}>
        <LiquidGlassButton
          size="sm"
          variant="subtle"
          onClick={toggleInspiration}
          style={{ pointerEvents: "auto" }}>
          <Palette size={12} />
          Inspiration
        </LiquidGlassButton>
        <LiquidGlassButton
          size="sm"
          variant="subtle"
          onClick={handleGenerateDesign}
          disabled={isGenerating}
          className={isGenerating ? "animate-pulse" : ""}
          style={{ pointerEvents: "auto" }}>
          <Brush size={12} className={isGenerating ? "animate-spin" : ""} />
          {isGenerating ? "Generating..." : "Generate Design"}
        </LiquidGlassButton>
      </div>
    </>
  );
};
