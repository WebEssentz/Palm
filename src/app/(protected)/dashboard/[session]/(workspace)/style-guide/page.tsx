import { ThemeContent } from "@/components/style/theme"
import StyleGuideTypography from "@/components/style/typography"
import MoodBoard from "@/components/style/mood-board"
import { TabsContent } from "@/components/ui/tabs"
import { MoodBoardImagesQuery, StyleGuideQuery } from "@/convex/query.config"
import { MoodBoardImage } from "@/hooks/use-styles"
import { StyleGuide } from "@/redux/api/style-guide"
import { Palette } from "lucide-react"
import React from "react"
import { redirect } from "next/navigation"

type Props = {
    searchParams: Promise<{
        project?: string
    }>
}

const Page = async ({ searchParams }: Props) => {
    const projectId = (await searchParams).project
    
    // Validate that projectId is provided and not the string "null"
    if (!projectId || projectId === "null" || projectId === "undefined") {
        redirect("/dashboard")
    }
    
    const existingStyleGuide = await StyleGuideQuery(projectId)

    const guide = existingStyleGuide.styleGuide?._valueJSON as unknown as StyleGuide

    const colorGuide = guide?.colorSections || []
    const typographyGuide = guide?.typographySections || []

    const exisitingMoodBoardImages = await MoodBoardImagesQuery(projectId)

    const guideImages = exisitingMoodBoardImages.images._valueJSON as unknown as MoodBoardImage[]

    return (
        <div>
            <TabsContent
                value="colours"
                className="space-y-6"
            >
                {!guideImages.length ? (
                    <div className="space-y-8">
                        <div className="text-center py-20">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                                <Palette className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                No colors added yet
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                                Upload images to your mood board and let Palm generate style guides with colors and typography.
                            </p>
                        </div>
                    </div>
                ) : (
                    <ThemeContent colorGuide={colorGuide} />
                )}
            </TabsContent>

            <TabsContent value="typography">
                <StyleGuideTypography typographyGuide={typographyGuide} />
            </TabsContent>

            <TabsContent value="moodboard">
                <MoodBoard guideImages={guideImages} />
            </TabsContent>
        </div>
    )
}

export default Page