import { TextShape } from "@/redux/slice/shapes";
import { useDispatch } from "react-redux";
import { updateShape, removeShape } from "@/redux/slice/shapes";
import { useState, useRef, useEffect } from "react";

export const Text = ({ shape, isSelected }: { shape: TextShape; isSelected: boolean }) => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const originalTextRef = useRef(shape.text);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-enter edit on fresh creation
  useEffect(() => {
    if (shape.text === "Type here...") {
      startEditing()
    }
  }, [])

  // Focus input whenever isEditing becomes true
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Listen for double-click signal from canvas
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent
      if (custom.detail.id === shape.id) {
        startEditing()
      }
    }
    window.addEventListener('text-enter-edit', handler)
    return () => window.removeEventListener('text-enter-edit', handler)
  }, [shape.id, shape.text])

  // Reset hover when selection changes
  useEffect(() => {
    if (isSelected) setIsHovered(false)
  }, [isSelected])

  // Clean up blur timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    }
  }, [])

  const startEditing = () => {
    originalTextRef.current = shape.text
    setIsEditing(true)
    window.dispatchEvent(new CustomEvent('text-editing-change', { detail: { editing: true } }))
  }

  const stopEditing = (save: boolean) => {
    setIsEditing(false)
    window.dispatchEvent(new CustomEvent('text-editing-change', { detail: { editing: false } }))

    const current = inputRef.current?.value ?? shape.text

    if (!save) {
      if (originalTextRef.current === 'Type here...') {
        dispatch(removeShape(shape.id))
      } else {
        dispatch(updateShape({ id: shape.id, patch: { text: originalTextRef.current } }))
      }
      return
    }

    const final = current.trim()
    if (!final || final === 'Type here...') {
      dispatch(removeShape(shape.id))
    } else {
      dispatch(updateShape({ id: shape.id, patch: { text: final } }))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') stopEditing(true)
    if (e.key === 'Escape') stopEditing(false)
  }

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      const active = document.activeElement as HTMLElement

      // Only keep editing if focus is inside sidebar or Radix portal
      const isInSidebar =
        active?.closest('[data-text-sidebar]') !== null ||
        active?.closest('[data-radix-popper-content-wrapper]') !== null

      if (!isInSidebar) {
        stopEditing(true)
      } else {
        // Focus went to sidebar — pull it back so user can keep typing
        inputRef.current?.focus()
      }
    }, 150)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        data-text-editing="true"
        type="text"
        className="absolute pointer-events-auto bg-transparent outline-none"
        style={{
          left: shape.x,
          top: shape.y,
          padding: '4px 8px',
          fontSize: shape.fontSize,
          fontFamily: shape.fontFamily,
          fontWeight: shape.fontWeight,
          fontStyle: shape.fontStyle,
          textAlign: shape.textAlign,
          textDecoration: shape.textDecoration,
          lineHeight: shape.lineHeight,
          letterSpacing: shape.letterSpacing,
          textTransform: shape.textTransform,
          color: shape.fill || 'currentColor',
          minWidth: '100px',
          whiteSpace: 'nowrap',
          border: '1.5px dashed #3b82f6',
          borderRadius: 4,
          zIndex: 9999,
        }}
        defaultValue={shape.text}
        onChange={(e) => {
          dispatch(updateShape({ id: shape.id, patch: { text: e.target.value } }))
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
    )
  }

  return (
    <div
      data-text-shape="true"
      className="absolute select-none"
      style={{
        left: shape.x,
        top: shape.y,
        padding: '4px 8px',
        fontSize: shape.fontSize,
        fontFamily: shape.fontFamily,
        fontWeight: shape.fontWeight,
        fontStyle: shape.fontStyle,
        textAlign: shape.textAlign,
        textDecoration: shape.textDecoration,
        lineHeight: shape.lineHeight,
        letterSpacing: shape.letterSpacing,
        textTransform: shape.textTransform,
        color: shape.fill || 'currentColor',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        cursor: 'default',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && !isSelected && !isEditing && (
        <div className="absolute pointer-events-none" style={{
          inset: '-4px',
          border: '1px dashed rgba(59,130,246,0.5)',
          borderRadius: 4,
        }} />
      )}
      {shape.text}
    </div>
  )
};