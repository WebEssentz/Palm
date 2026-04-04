/**
 * Style Guide & Design System Types
 * Defines all interfaces for typography, colors, themes, and style data
 */

export interface TypographyStyle {
  name: string
  description?: string
  fontFamily?: string
  fontSize?: number
  fontWeight?: number
  lineHeight?: number
  letterSpacing?: number
  textTransform?: string
}

export interface TypographySection {
  title: string
  styles: TypographyStyle[]
}

export interface ColorSwatch {
  name: string
  hexColor: string
  description?: string
  usage?: string
}

export interface ColorSection {
  title?: string
  swatches: ColorSwatch[]
}

export interface StyleGuide {
  colorSections: ColorSection[]
  typographySections: TypographySection[]
  theme?: ThemeConfig
}

export interface ThemeConfig {
  baseColor?: string
  accentColor?: string
  darkMode?: boolean
  fontFamily?: string
}

export interface MoodBoard {
  images: string[]
  description?: string
  theme?: string
}

export interface InspirationImage {
  url: string
  title?: string
  description?: string
}
