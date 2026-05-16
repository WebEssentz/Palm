'use client'

import React, { useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/redux/store'
import { useProjects } from '@/components/projects/list/provider'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { formatDistanceToNow } from 'date-fns'
import { Home, LayoutGrid, ChevronRight, ChevronLeft, ArrowUp } from 'lucide-react'
import { ThemeToggle } from '@/components/theme/toggle'
import { AvatarDropdown } from '@/components/avatar-dropdown'
import ParticleBackground from '@/components/home/particle-background'
import { CyclingWord } from '@/components/home/cycling-word'
import { MicButton } from '@/components/home/mic-button'
import { AttachmentMenu } from '@/components/home/attachment-menu'
import { cn } from '@/lib/utils'

function thumbnailToSrc(thumbnail: string | undefined): string | null {
    if (!thumbnail) return null
    if (thumbnail.startsWith('linear-gradient')) {
        const colors = thumbnail.match(/#[a-fA-F0-9]{6}/g) || ['#888888', '#444444']
        const [c1, c2] = colors.length >= 2 ? [colors[0], colors[1]] : [colors[0] || '#888', '#444']
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${c1}"/>
                    <stop offset="100%" stop-color="${c2}"/>
                </linearGradient>
            </defs>
            <rect width="20" height="20" rx="4" fill="url(#g)"/>
        </svg>`
        return `data:image/svg+xml,${encodeURIComponent(svg)}`
    }
    return null
}

function isColorDark(color: string): boolean {
    // Extract first hex color from the string (works for solid colors and gradients)
    const hex = (color.match(/#[a-fA-F0-9]{6}/) || [])[0]
    if (!hex) return true // assume dark if unparseable

    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)

    // Perceived luminance (standard formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance < 0.35
}

interface Props {
    profile: { name: string; image?: string | null }
}

const ALL_PROMPTS = [
    {
        short: "Landing page for a coffee roastery",
        long: "Build a modern landing page for an artisan coffee roastery called 'Bean Canvas'. Include a hero section with a large high-quality coffee image, sections for featured blends with tasting notes, an about section with the roaster's story, customer testimonials, and a newsletter signup form. Use warm earth tones like burnt sienna, cream, and dark brown."
    },
    {
        short: "Fitness tracker dashboard",
        long: "Create a comprehensive fitness tracking dashboard that displays daily step count, calories burned, heart rate trends, workout history with charts, weekly activity goals with progress bars, upcoming workout reminders, and a section for achievements/badges. Use a modern, energetic color scheme with vibrant accent colors."
    },
    {
        short: "E-commerce product listing",
        long: "Design an e-commerce product listing page with advanced filtering (by price, rating, category), grid view of products with images, prices, and star ratings, a sidebar filter panel, sorting options (newest, price: low to high, most popular), product quick-view cards on hover, and a shopping cart indicator in the header."
    },
    {
        short: "Task management app",
        long: "Build a task management application interface with a left sidebar showing project lists, main area displaying tasks in columns (To Do, In Progress, Done) with drag-and-drop capability, task cards showing title, assignee avatar, due date, and priority badge, add task buttons in each column, and a right sidebar showing task details and comments."
    },
    {
        short: "SaaS analytics dashboard",
        long: "Create a professional analytics dashboard for a SaaS platform showing key metrics like active users, revenue, conversion rates, and churn. Include line charts for trends, heatmaps for user activity by day/time, a data table with sortable columns, and summary cards with KPIs at the top. Use a clean, minimal design with data visualization best practices."
    },
    {
        short: "Hotel booking interface",
        long: "Design a luxury hotel booking platform with a hero search bar for dates and location, property cards with images, reviews, and pricing, detailed property pages with photo galleries, room options, and amenities, and a checkout flow. Use elegant typography, soft colors, and high-quality imagery to convey luxury."
    },
    {
        short: "Music streaming app",
        long: "Build a music streaming app interface with a sidebar navigation for playlists, main area showing currently playing track with album artwork, waveform visualization, playback controls, and a queue panel on the right. Include search functionality, artist pages with discography, and a dark theme with accent color highlights."
    },
    {
        short: "Social media feed",
        long: "Create a social media feed interface with story avatars at the top, post cards displaying user avatars, timestamps, content, images, and engagement metrics (likes, comments, shares), comment sections with nested replies, and a sidebar showing trending topics and suggested users to follow."
    },
    {
        short: "Project management board",
        long: "Design a Kanban-style project management board with multiple columns (Backlog, To Do, In Progress, Review, Done). Each task should be a draggable card showing title, assignee avatars, due date, priority level, and attachments. Include a sidebar with project settings, team members, and filters for viewing specific task types or team members."
    },
    {
        short: "Weather application",
        long: "Build a beautiful weather app showing current conditions with large temperature display, weather icon, and description. Include hourly forecast cards, daily forecast for the next 7 days, detailed metrics (humidity, wind speed, UV index, visibility), a radar map, and location search. Use weather-appropriate color gradients and smooth animations."
    },
]

const getRandomPrompts = () => {
    const shuffled = [...ALL_PROMPTS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
}

export default function HomeShell({ profile }: Props) {
    const { theme, systemTheme } = useTheme()
    const me = useAppSelector((state) => state.profile)
    const projects = useProjects()
    const router = useRouter()

    const [sideOpen, setSideOpen] = useState(false)
    const [prompt, setPrompt] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isRecordingActive, setIsRecordingActive] = useState(false)
    const [suggestedPrompts] = useState(() => getRandomPrompts())
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const creditBalance = useQuery(
        api.subscription.getCreditsBalance,
        me?.id ? { userId: me.id as Id<'users'> } : 'skip'
    )

    const handleSubmit = async () => {
        if (!prompt.trim() || isLoading) return
        setIsLoading(true)

        try {
            const res = await fetch('/api/projects/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    userId: me.id
                }),
            })

            const { projectId, error, details } = await res.json()
            if (!res.ok || !projectId) {
                console.error('Project creation failed:', { error, details })
                throw new Error(details || error)
            }

            router.push(
                `/dashboard/${me.name}/canvas?project=${projectId}&prompt=${encodeURIComponent(prompt.trim())}`
            )
        } catch (err) {
            console.error('Submit failed:', err)
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLightMode = effectiveTheme === 'light'

    // Shared liquid glass style — used on sidebar toggle, credits, prompt pills
    const liquidGlassStyle = (light: boolean): React.CSSProperties => light ? {
        background: 'rgba(250,246,238,0.88)',
        backdropFilter: 'url(#palm-glass-light) blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(120,96,60,0.10)',
        boxShadow: [
            '0 0 0 0.5px rgba(100,76,40,0.08)',
            '0 2px 4px rgba(80,60,30,0.06)',
            '0 8px 20px rgba(80,60,30,0.09)',
            'inset 0 1px 0 rgba(255,255,255,0.90)',
            'inset 0 -1px 0 rgba(100,76,40,0.04)',
        ].join(', '),
    } : {
        background: 'rgba(255,255,255,0.07)',
        backdropFilter: 'url(#palm-glass-light) blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: [
            '0 0 0 0.5px rgba(255,255,255,0.04)',
            '0 2px 4px rgba(0,0,0,0.12)',
            '0 8px 20px rgba(0,0,0,0.24)',
            '0 16px 40px rgba(0,0,0,0.18)',
            'inset 0 1px 0 rgba(255,255,255,0.08)',
            'inset 0 -1px 0 rgba(0,0,0,0.2)',
        ].join(', '),
    }

    // Textarea inner glass — same treatment both modes
    const textareaStyle: React.CSSProperties = isLightMode ? {
        minHeight: '120px',
        borderRadius: '10px',
        padding: '10px 12px',
        background: 'rgba(255,251,244,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: [
            'inset 0 1px 3px rgba(80,60,30,0.08)',
            'inset 0 0 0 1px rgba(120,96,60,0.09)',
            '0 1px 0 rgba(255,255,255,0.80)',
        ].join(', '),
    } : {
        minHeight: '120px',
        borderRadius: '10px',
        padding: '10px 12px',
        background: '#1e1e1e',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: [
            'inset 0 0 0 1px rgba(255,255,255,0.06)',
            'inset 0 1px 0 rgba(255,255,255,0.04)',
        ].join(', '),
    }

    return (
        <>
            <div className='relative flex min-h-screen overflow-hidden bg-background'>
                {/* Liquid glass SVG filters */}
                <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden='true'>
                    <defs>
                        <filter id='palm-glass-credit-light' x='-12%' y='-12%' width='124%' height='124%' colorInterpolationFilters='sRGB'>
                            <feTurbulence type='fractalNoise' baseFrequency='0.65 0.42' numOctaves='3' seed='12' result='noise'>
                                <animate attributeName='baseFrequency' values='0.65 0.42; 0.68 0.44; 0.65 0.42' dur='8s' repeatCount='indefinite' />
                            </feTurbulence>
                            <feGaussianBlur in='noise' stdDeviation='1.6' result='blurNoise' />
                            <feDisplacementMap in='SourceGraphic' in2='blurNoise' scale='12' xChannelSelector='R' yChannelSelector='G' result='displaced' />
                            <feColorMatrix in='displaced' type='saturate' values='1.35' result='saturated' />
                            <feComposite in='saturated' in2='SourceGraphic' operator='atop' />
                        </filter>
                        <filter id='palm-glass-light' x='-12%' y='-12%' width='124%' height='124%' colorInterpolationFilters='sRGB'>
                            <feTurbulence type='fractalNoise' baseFrequency='0.65 0.42' numOctaves='3' seed='12' result='noise'>
                                <animate attributeName='baseFrequency' values='0.65 0.42; 0.68 0.44; 0.65 0.42' dur='8s' repeatCount='indefinite' />
                            </feTurbulence>
                            <feGaussianBlur in='noise' stdDeviation='1.6' result='blurNoise' />
                            <feDisplacementMap in='SourceGraphic' in2='blurNoise' scale='12' xChannelSelector='R' yChannelSelector='G' result='displaced' />
                            <feColorMatrix in='displaced' type='saturate' values='1.35' result='saturated' />
                            <feComposite in='saturated' in2='SourceGraphic' operator='atop' />
                        </filter>
                    </defs>
                </svg>

                <ParticleBackground />

                {/* ── Sidebar ── */}
                <aside
                    className={cn(
                        'relative z-20 flex flex-col h-screen border-r border-border/40 bg-background/60 backdrop-blur-xl transition-all duration-200 ease-in-out flex-shrink-0',
                        sideOpen ? 'w-52' : 'w-14'
                    )}
                >
                    {/* Logo */}
                    <div className={cn('flex items-center px-3.5 py-4', sideOpen && 'gap-2.5')}>
                        <Link
                            href={`/dashboard/${me.name}`}
                            className='w-7 h-7 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center'
                        >
                            <div className='w-3.5 h-3.5 rounded-full bg-primary-foreground' />
                        </Link>
                        {sideOpen && (
                            <span className='font-semibold text-sm text-foreground tracking-tight'>Palm</span>
                        )}
                    </div>

                    {/* Nav */}
                    <nav className='flex flex-col gap-0.5 px-2 mt-1'>
                        <SideItem icon={<Home className='w-4 h-4' />} label='Home' open={sideOpen} active />
                        <SideItem
                            icon={<LayoutGrid className='w-4 h-4' />}
                            label='Projects'
                            open={sideOpen}
                            onClick={() => setSideOpen(true)}
                        />
                    </nav>

                    {/* Recent projects */}
                    {sideOpen && projects.length > 0 && (
                        <div className='mt-4 px-3'>
                            <p className='text-[10px] uppercase tracking-widest text-muted-foreground/50 mb-2 px-1'>Recent</p>
                            <div className='space-y-0.5'>
                                {projects.slice(0, 8).map((p: any) => (
                                    <Link
                                        key={p._id}
                                        href={`/dashboard/${me.name}/canvas?project=${p._id}`}
                                        className='flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors group'
                                        style={{ backgroundColor: 'transparent', color: 'var(--muted-foreground)' }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = isLightMode ? '#EFE7DD' : '#141414'
                                            e.currentTarget.style.color = 'var(--foreground)'
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent'
                                            e.currentTarget.style.color = 'var(--muted-foreground)'
                                        }}
                                    >
                                        {(() => {
                                            const src = thumbnailToSrc(p.thumbnail)
                                            const dark = isColorDark(p.thumbnail)

                                            return src
                                                ? <img src={src} className='w-5 h-5 rounded flex-shrink-0' alt='' />
                                                : <div
                                                    className='w-5 h-5 rounded flex-shrink-0'
                                                    style={{
                                                        background: (!isLightMode && dark)
                                                            ? '#ffffff'
                                                            : p.thumbnail || '#888888'
                                                    }}
                                                />
                                        })()}
                                        <div className='min-w-0'>
                                            <p className='text-xs text-muted-foreground truncate group-hover:text-foreground transition-colors'>
                                                {p.name}
                                            </p>
                                            <p className='text-[10px] text-muted-foreground/50'>
                                                {formatDistanceToNow(new Date(p.lastModified), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sidebar toggle — liquid glass */}
                    <button
                        onClick={() => setSideOpen((o) => !o)}
                        className={cn(
                            'mt-auto mb-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
                            sideOpen ? 'ml-auto mr-2' : 'mx-auto'
                        )}
                        style={liquidGlassStyle(isLightMode)}
                    >
                        {sideOpen ? <ChevronLeft className='w-3.5 h-3.5' /> : <ChevronRight className='w-3.5 h-3.5' />}
                    </button>
                </aside>

                {/* ── Main ── */}
                <div className='relative z-10 flex flex-col flex-1 min-w-0'>

                    {/* Topbar */}
                    <header className='flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0'>
                        {/* Credits — liquid glass */}
                        <div
                            className='flex items-center gap-1.5 rounded-full px-3 py-1.5 relative'
                            style={liquidGlassStyle(isLightMode)}
                        >
                            <div
                                className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 50%, transparent 95%)' }}
                            />
                            <PalmLeafIcon />
                            <span className='text-xs font-medium tabular-nums text-foreground/70'>
                                {creditBalance ?? 0}
                            </span>
                        </div>
                        <AvatarDropdown creditBalance={creditBalance ?? 0} />
                    </header>

                    {/* Center content */}
                    <main className='flex-1 flex flex-col items-center justify-center px-6 pb-16'>
                        <h1 className='font-display text-5xl font-bold tracking-tight text-foreground mb-10 text-center leading-tight'>
                            What will you <CyclingWord />
                        </h1>

                        {/* Input card */}
                        <motion.div
                            layout
                            transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                            className={cn(
                                'w-full max-w-2xl relative rounded-2xl transition-colors duration-200',
                                prompt.trim()
                                    ? 'bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)]'
                                    : 'bg-[rgba(250,246,238,0.88)] dark:bg-transparent'
                            )}
                            style={{
                                backdropFilter: 'url(#palm-glass-light) blur(32px)',
                                WebkitBackdropFilter: 'blur(32px)',
                                boxShadow: (!prompt.trim() && !isLightMode)
                                    ? 'none'
                                    : (isFocused
                                        ? [
                                            '0 0 0 2px rgba(160,120,60,0.40)',
                                            '0 0 0 1px rgba(120,96,60,0.20)',
                                            '0 8px 32px rgba(80,60,30,0.25)',
                                            '0 4px 16px rgba(80,60,30,0.18)',
                                            '0 1px 3px rgba(80,60,30,0.12)',
                                            'inset 0 1px 0 rgba(255,255,255,0.90)',
                                            'inset 0 -1px 0 rgba(100,76,40,0.04)',
                                        ].join(', ')
                                        : [
                                            '0 0 0 1px rgba(120,96,60,0.12)',
                                            '0 4px 24px rgba(80,60,30,0.14)',
                                            '0 1px 3px rgba(80,60,30,0.10)',
                                            '0 0 0 0.5px rgba(100,76,40,0.08)',
                                            '0 2px 4px rgba(80,60,30,0.06)',
                                            '0 8px 20px rgba(80,60,30,0.09)',
                                            '0 24px 48px rgba(80,60,30,0.07)',
                                            'inset 0 1px 0 rgba(255,255,255,0.90)',
                                            'inset 0 -1px 0 rgba(100,76,40,0.04)',
                                        ].join(', ')),
                            }}
                        >
                            {/* Specular rim */}
                            <div
                                className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 50%, transparent 95%)' }}
                            />
                            <div className='p-4'>
                                {/* Textarea — frosted inner glass, both light and dark */}
                                <textarea
                                    ref={textareaRef}
                                    value={prompt}
                                    onChange={(e) => {
                                        setPrompt(e.target.value)
                                        const el = e.target
                                        el.style.height = 'auto'
                                        el.style.height = el.scrollHeight + 'px'
                                    }}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    onKeyDown={handleKeyDown}
                                    placeholder='Describe a UI to generate…'
                                    className='w-full resize-none text-sm text-foreground placeholder:text-muted-foreground/65 outline-none leading-relaxed max-h-60'
                                    style={textareaStyle}
                                />

                                {/* Toolbar — smaller buttons, pushed down from textarea */}
                                <div className='flex items-center gap-2' style={{ marginTop: '12px' }}>
                                    <AttachmentMenu
                                        onUpload={(file) => console.log('file:', file)}
                                        onUrl={(url) => console.log('url:', url)}
                                        onEnhance={() => console.log('enhance')}
                                    />
                                    <div className='flex-1' />
                                    <MicButton
                                        onTranscript={(text) => setPrompt(p => p ? p + ' ' + text : text)}
                                        onRecordingChange={setIsRecordingActive}
                                        disabled={isLoading}
                                    />
                                    {!isRecordingActive && (
                                        <button
                                            onClick={handleSubmit}
                                            disabled={!prompt.trim() || isLoading}
                                            className={cn(
                                                'w-8 h-8 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                                                prompt.trim() && !isLoading
                                                    ? 'bg-black dark:bg-white'
                                                    : 'bg-transparent opacity-30'
                                            )}
                                        >
                                            {isLoading
                                                ? <div className='w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin' />
                                                : <ArrowUp className={cn('w-4 h-4', prompt.trim() ? 'text-white dark:text-black' : 'text-muted-foreground')} />
                                            }
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>

                        {/* Suggested prompts — liquid glass, both modes */}
                        <div className='w-full max-w-2xl mt-4 flex flex-wrap gap-3 justify-center'>
                            {suggestedPrompts.map((p, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setPrompt(p.long)}
                                    className='px-3 py-1.5 rounded-full text-xs transition-colors text-muted-foreground hover:text-foreground cursor-pointer relative'
                                    style={liquidGlassStyle(isLightMode)}
                                >
                                    <div
                                        className='pointer-events-none absolute inset-x-0 top-0 h-[1px] rounded-full'
                                        style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 50%, transparent 95%)' }}
                                    />
                                    {p.short}
                                </button>
                            ))}
                        </div>
                    </main>
                </div>
            </div>

            {/* Theme toggle — fixed bottom right */}
            <div className='fixed bottom-4 right-4 z-50'>
                <ThemeToggle />
            </div>
        </>
    )
}

function SideItem({
    icon, label, open, active, onClick,
}: {
    icon: React.ReactNode
    label: string
    open: boolean
    active?: boolean
    onClick?: () => void
}) {
    const { theme, systemTheme } = useTheme()
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLightMode = effectiveTheme === 'light'

    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm transition-colors hover:cursor-pointer',
                open ? 'justify-start' : 'justify-center',
                'text-muted-foreground'
            )}
            style={active ? {
                backgroundColor: isLightMode ? '#EFE7DD' : '#141414',
                color: 'var(--foreground)',
            } : {
                backgroundColor: 'transparent',
                color: 'var(--muted-foreground)',
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    e.currentTarget.style.backgroundColor = isLightMode ? '#EFE7DD' : '#141414'
                    e.currentTarget.style.color = 'var(--foreground)'
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = 'var(--muted-foreground)'
                }
            }}
        >
            {icon}
            {open && <span className='font-medium text-xs'>{label}</span>}
        </button>
    )
}

function PalmLeafIcon() {
    return (
        <svg width='14' height='14' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <path d='M8 14V8' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' />
            <path d='M8 8C8 8 4 7 3 4C5.5 3.5 8 5 8 8Z' fill='currentColor' opacity='0.8' />
            <path d='M8 8C8 8 12 7 13 4C10.5 3.5 8 5 8 8Z' fill='currentColor' opacity='0.8' />
            <path d='M8 8C8 8 7 4 9 2C10.5 3.5 10 6 8 8Z' fill='currentColor' opacity='0.9' />
            <path d='M8 9C8 9 5 9.5 4 7.5C6 6.5 8 8 8 9Z' fill='currentColor' opacity='0.6' />
            <path d='M8 9C8 9 11 9.5 12 7.5C10 6.5 8 8 8 9Z' fill='currentColor' opacity='0.6' />
        </svg>
    )
}