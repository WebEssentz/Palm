/**
 * API Request/Response Types
 * Defines interfaces for all API endpoints
 */

export interface GenerateRequest {
  prompt: string
  projectId: string
  userId: string
  images?: string[]
  moodBoardImages?: string[]
}

export interface GenerateResponse {
  html: string
  json?: LayoutJSON
  crops?: Crop[]
}

export interface LayoutJSON {
  source: string
  layout: 'centered' | 'sidebar' | 'dashboard' | 'landing'
  contentContext: string
  visualStyle: 'dark' | 'light' | 'minimal' | 'bold'
  canvasWidth: number
  components: Component[]
}

export interface Component {
  type: string
  position: string
  widthPercent?: number
  heightPx?: number
  borderRadius?: string
  children?: Component[]
  content?: string
  style?: string
}

export interface Crop {
  label: string
  image: Uint8Array
}

export interface StyleGuideGenerateRequest {
  projectId: string
  images: string[]
  userId: string
}

export interface StyleGuideResponse {
  styleGuide: string
  success: boolean
}

export interface WorkflowGenerateRequest {
  projectId: string
  currentHTML: string
  userId: string
  styleGuide?: string
  images?: string[]
}

export interface WorkflowResponse {
  html: string
  success: boolean
}

export interface STTRequest {
  audio: File
}

export interface STTResponse {
  text: string
  success: boolean
}

export interface ErrorResponse {
  error: string
  code?: string
  details?: any
}
