'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'
import { TextShape, updateShape } from '@/redux/slice/shapes'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { Bold, Italic, Palette, Strikethrough, Underline } from 'lucide-react'
import { Label } from 'recharts'
import React from "react"
import { Input } from '@/components/ui/input'

type Props = {
    isOpen: boolean
}

const TextSidebar = ({ isOpen }: Props) => {
    const dispatch = useAppDispatch()
    const selectedShapes = useAppSelector((state) => state.shapes.selected) 
    const shapeEntities = useAppSelector((state) => state.shapes.shapes.entities)

    const fontFamilies = [
        "Inter, sans-serif",
        "Arial, sans-serif",
        "Helvetica, sans-serif",
        "Georgia, sans-serif",
        "Times new Roman, serif",
        "Courier New, monospace",
        "Monaco, monospace",
        "system-ui, sans-serif"
    ]

    const selectedTextShape = Object.keys(selectedShapes)
        .map((id) => shapeEntities[id])
        .find((shape) => shape?.type === 'text') as TextShape | undefined


    const updateTextProperty = (property: keyof TextShape, value: any) => {
        if (!selectedTextShape) return

        dispatch(
            updateShape({
                id: selectedTextShape.id,
                patch: { [property]: value }
            })
        )
    }

    const [ colorInput, setColorInput ] = React.useState(
        selectedTextShape?.fill || '#ffffff'
    )

    const handleColorChange = (color: string) => {
        setColorInput(color)
        if (/^0[0-9A-F]{6}$/i.test(color)  ||  /^0[0-9A-F]{3}$/i.test(color)) {
            updateTextProperty('fill', color)
        }
    }

    if (!isOpen || !selectedTextShape) return null

  return (
    <div 
      data-text-sidebar="true"
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'fixed right-5 top-1/2 transform -translate-y-1/2 w-80 backdrop-blur-xl bg-muted border-border dark:bg-white/[0.08] dark:border-white/[0.12] gap-2 p-3 saturate-150 border rounded-lg z-50 transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full'
    )}>
        <div className='p-4 flex flex-col gap-10 overflow-y-auto max-h-[calc(100vh-8rem)]'>
            <div className='space-y-2'>
                <Label className='text-foreground/80'>Font Family</Label>
                <Select
                    value={selectedTextShape.fontFamily}
                    onValueChange={(value) => updateTextProperty('fontFamily', value)}
                >
                    <SelectTrigger 
                        onMouseDown={(e) => e.preventDefault()}
                        className='bg-accent border-border dark:bg-white/5 dark:border-white/10 w-full text-foreground'
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent 
                        onMouseDown={(e) => e.preventDefault()}
                        className='bg-background border-border dark:bg-black/90 dark:border-white/10'
                    >
                        {fontFamilies.map((font) => (
                            <SelectItem
                                key={font}
                                value={font}
                                onMouseDown={(e) => e.preventDefault()}
                                className='text-foreground hover:bg-accent dark:hover:bg-white/10'
                            >
                                <span style={{ fontFamily: font }}>{font.split(',')[0]}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className='space-y-2'>
                <Label className='text-foreground/80'>
                    Font Size: {selectedTextShape?.fontSize}px
                </Label>
                <Slider
                    value={[selectedTextShape?.fontSize]}
                    onValueChange={([value]) => updateTextProperty('fontSize', value)}
                    onMouseDown={(e) => e.preventDefault()}
                    min={8}
                    max={120}
                    step={1}
                    className="w-full"
                />
            </div>

            <div className='space-y-2'>
                <Label className='text-foreground/80'>
                    Font Weight: {selectedTextShape?.fontWeight}px
                </Label>
                <Slider
                    value={[selectedTextShape?.fontWeight]}
                    onValueChange={([value]) => updateTextProperty('fontWeight', value)}
                    onMouseDown={(e) => e.preventDefault()}
                    min={100}
                    max={900}
                    step={100}
                    className="w-full"
                />
            </div>

            <div className='space-y-3'>
                <Label className='text-foreground/80'>
                    Style
                </Label>
                <div className='flex gap-2'>
                    <Toggle
                        onMouseDown={(e) => e.preventDefault()}
                        pressed={selectedTextShape.fontWeight >= 600}
                        onPressedChange={(pressed) => 
                            updateTextProperty("fontWeight", pressed ? 700 : 400)
                        }
                        className='data-[state=on]:bg-blue-500 data-[state=on]:text-white'
                    >
                        <Bold className="w-4 h-4"/>
                    </Toggle>

                    <Toggle
                        onMouseDown={(e) => e.preventDefault()}
                        pressed={selectedTextShape.fontStyle === "italic"}
                        onPressedChange={(pressed) => 
                            updateTextProperty("fontStyle", pressed ? "italic" : "normal")
                        }
                        className='data-[state=on]:bg-blue-500 data-[state=on]:text-white'
                    >
                        <Italic className="w-4 h-4"/>
                    </Toggle>

                    <Toggle
                        onMouseDown={(e) => e.preventDefault()}
                        pressed={selectedTextShape.textDecoration === 'underline'}
                        onPressedChange={(pressed) => 
                            updateTextProperty("textDecoration", pressed ? "underline" : "none")
                        }
                        className='data-[state=on]:bg-blue-500 data-[state=on]:text-white'
                    >
                        <Underline className="w-4 h-4"/>
                    </Toggle>

                    <Toggle
                        onMouseDown={(e) => e.preventDefault()}
                        pressed={selectedTextShape.textDecoration === 'line-through'}
                        onPressedChange={(pressed) => 
                            updateTextProperty("textDecoration", pressed ? "line-through" : "none")
                        }
                        className='data-[state=on]:bg-blue-500 data-[state=on]:text-white'
                    >
                        <Strikethrough className="w-4 h-4"/>
                    </Toggle>
                </div>
            </div>

            <div className='space-y-2'>
                <Label className='text-foreground/80'>
                    Letter Spacing: {selectedTextShape.letterSpacing}px
                </Label>
                <Slider
                    value={[selectedTextShape.letterSpacing]}
                    onValueChange={([value]) => 
                        updateTextProperty('letterSpacing', value)
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    min={-2}
                    max={10}
                    step={0.1}
                    className='w-full'
                />
            </div>

            <div className='space-y-2'>
                <Label className='text-foreground/80 flex items-center gap-2'>
                    <Palette className='w-4 h-4' />
                    Text Color
                </Label>
                <div className='flex gap-2'>
                    <Input
                        value={colorInput}
                        onChange={(e) => handleColorChange(e.target.value)}
                        placeholder='#ffffff'
                        className='bg-accent border-border dark:bg-white/5 dark:border-white/10 text-foreground flex-1'
                    />

                    <div
                        className='w-10 h-10 rounded border border-border dark:border-white/10 flex-1'
                        style={{ backgroundColor: selectedTextShape.fill || '#ffffff' }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'color'
                            input.value = selectedTextShape.fill || '#ffffff'
                            input.onchange = (e) => {
                                const color = (e.target as HTMLInputElement).value
                                setColorInput(color)
                                updateTextProperty('fill', color)
                            }
                            input.click()
                        }}
                    />
                </div>
            </div>
        </div>
    </div>
  )
}

export default TextSidebar