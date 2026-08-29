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
}: {
    shape: Shape
    selectedShapes: Record<string, boolean>
    toggleInspiration: () => void
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
            return <GeneratedUI shape={shape}/>
        default:
            break;
    }
}

export default ShapeRenderer

