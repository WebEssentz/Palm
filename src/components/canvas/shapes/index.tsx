import { Shape } from '@/redux/slice/shapes'
import { Frame } from './frame'
import { Rectangle } from './rectangle'
import { Stroke } from './stroke'
import { Arrow } from './arrow'
import { Line } from './line'
import { Text } from './text'
import { Ellipse } from './ellipse'
import GeneratedUI from './generatedui'

const ShapeRenderer = ({
    shape,
    selectedShapes,
    toggleInspiration,
    toggleChat,
    generateWorkflow,
    exportDesign,
}: {
    shape: Shape
    selectedShapes: Record<string, boolean>
    toggleInspiration: () => void
    toggleChat: (generatedUIId: string) => void
    generateWorkflow: (generatedUIId: string) => void
    exportDesign: (generatedUIId: string, element: HTMLElement | null) => void
}) => {
    switch (shape.type) {
        case 'frame':
            return <Frame shape={shape} toggleInspiration={toggleInspiration}/>
        case 'rect':
            return <Rectangle shape={shape}/>
        case 'freedraw':
            return <Stroke shape={shape}/>
        case 'arrow':
            return <Arrow shape={shape}/>
        case 'line':
            return <Line shape={shape}/>
        case 'text':
            return <Text shape={shape} isSelected={!!selectedShapes[shape.id]}/>
        case 'ellipse':
            return <Ellipse shape={shape}/>
        case 'generatedui':
            return <GeneratedUI shape={shape} toggleInspiration={toggleInspiration} toggleChat={toggleChat} generateWorkflow={generateWorkflow} exportDesign={exportDesign}/>
        default:
            break;
    }
}

export default ShapeRenderer