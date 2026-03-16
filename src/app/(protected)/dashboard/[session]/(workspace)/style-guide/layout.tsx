import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Hash, LayoutIcon, Type } from "lucide-react"
import React from "react"

type Props = {
    children: React.ReactNode
}

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

const Layout = ({ children }: Props) => {
    return (
        <Tabs
            defaultValue='colours'
            className='w-full'
        >
            <div className="mt-36 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div>
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-center justify-between">
                        <div>
                            <h1 className="text-3xl lg:text-left font-bold text-center text-foreground">Style Guide</h1>
                            <p className="text-muted-foreground mt-2 text-center lg:text-left">
                                Manage your design projects and continue where you left off
                            </p>
                        </div>

                        <TabsList className="grid w-full sm:w-fit h-auto grid-cols-3 rounded-full backdrop-blur-xl bg-muted border border-border/60 dark:border-white/[0.12] dark:bg-white/[0.08] dark:border-white/[0.12] saturate-150 p-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                return (
                                    <TabsTrigger
                                        key={tab.value}
                                        value={tab.value}
                                        className="flex items-center gap-2 rounded-xl data-[state=active]:bg-accent data-[state=active]:border data-[state=active]:border-border dark:data-[state=active]:bg-white/[0.15] dark:data-[state=active]:border-white/[0.2] data-[state=active]:backdrop-blur-xl transition-all duration-200 text-xs sm:text-sm"
                                    >
                                        <Icon className="w-4 h-4" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        <span className="sm:hidden">{tab.value}</span>
                                    </TabsTrigger>
                                )
                            })}
                        </TabsList>
                    </div>
                </div>
                <div className="container mx-auto px-4 sm:py-6 py-6 sm:py-8">
                    {children}
                </div>
            </div>
        </Tabs>
    )
}

export default Layout