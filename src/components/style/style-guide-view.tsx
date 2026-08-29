'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hash, LayoutIcon, Type, Palette } from "lucide-react"
import { ThemeContent } from "@/components/style/theme"
import StyleGuideTypography from "@/components/style/typography"
import MoodBoard from "@/components/style/mood-board"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { MoodBoardImage } from "@/hooks/use-styles"
import { StyleGuide } from "@/redux/api/style-guide"
import { useSearchParams } from "next/navigation"
import { cn } from '@/lib/utils'

const tabs = [
    {
        value: 'colours',
        label: 'Colours',
        icon: Hash
    },
    {
        value: 'typography',
        label: 'Typography',
        icon: Type
    },
    {
        value: 'moodboard',
        label: 'Moodboard',
        icon: LayoutIcon
    }
] as const

type TabValue = (typeof tabs)[number]['value']

interface Props {
    projectId?: string | null
}

export function StyleGuideView({ projectId: propProjectId }: Props) {
    const searchParams = useSearchParams()
    const projectId = propProjectId ?? searchParams.get('project')
    const [activeTab, setActiveTab] = useState<TabValue>('colours')

    const isValidProjectId = projectId && projectId.length === 32 && projectId !== "null" && projectId !== "undefined"

    const styleGuideDoc = useQuery(
        api.projects.getProjectStyleGuide,
        isValidProjectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const moodBoardDoc = useQuery(
        api.moodboard.getMoodBoardImages,
        isValidProjectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const isLoading = isValidProjectId && (styleGuideDoc === undefined || moodBoardDoc === undefined)

    if (!isValidProjectId) {
        return (
            <div className="w-full pt-40 pb-20 flex items-center justify-center">
                <p className="text-muted-foreground text-sm">No valid project selected</p>
            </div>
        )
    }

    const guide = (styleGuideDoc as unknown as StyleGuide) || null
    const colorGuide = guide?.colorSections || []
    const typographyGuide = guide?.typographySections || []
    const guideImages = (moodBoardDoc as unknown as MoodBoardImage[]) || []

    return (
        <div className="w-full min-h-screen bg-background overflow-y-auto pt-16">
            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-center justify-between">
                    <div>
                        <h1 className="text-3xl lg:text-left font-bold text-center text-foreground">Style Guide</h1>
                        <p className="text-muted-foreground mt-1.5 text-center lg:text-left text-sm">
                            Manage your design projects and continue where you left off
                        </p>
                    </div>

                    {/* Optimistic Tab Switcher with animated spring pill */}
                    <div className="flex items-center p-1 rounded-full backdrop-blur-xl bg-muted/80 border border-border/60 dark:border-white/[0.12] dark:bg-white/[0.08] saturate-150">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.value
                            return (
                                <button
                                    key={tab.value}
                                    type="button"
                                    onClick={() => setActiveTab(tab.value)}
                                    className={cn(
                                        "relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none z-10",
                                        isActive
                                            ? "text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="style-guide-active-tab"
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 35,
                                            }}
                                            className="absolute inset-0 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/10 -z-10"
                                        />
                                    )}
                                    <Icon className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden">{tab.value}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Tab Content with Centered Spinner */}
                <div className="py-8 sm:py-10">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div
                                key="loading-style-guide"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="flex flex-col items-center justify-center py-32 gap-3"
                            >
                                <div className="w-5 h-5 border-2 border-black/15 dark:border-white/15 border-t-black dark:border-t-white rounded-full animate-spin" />
                            </motion.div>
                        ) : activeTab === 'colours' ? (
                            <motion.div
                                key="tab-colours"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                className="space-y-6"
                            >
                                {!guideImages.length && !colorGuide.length ? (
                                    <div className="text-center py-24">
                                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                                            <Palette className="w-7 h-7 text-muted-foreground" />
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground mb-1.5">
                                            No colors added yet
                                        </h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                                            Upload images to your mood board and let Palm generate style guides with colors and typography.
                                        </p>
                                    </div>
                                ) : (
                                    <ThemeContent colorGuide={colorGuide} />
                                )}
                            </motion.div>
                        ) : activeTab === 'typography' ? (
                            <motion.div
                                key="tab-typography"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                            >
                                <StyleGuideTypography typographyGuide={typographyGuide} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="tab-moodboard"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                            >
                                <MoodBoard guideImages={guideImages} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}

export default StyleGuideView
