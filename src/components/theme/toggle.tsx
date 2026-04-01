'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

const options = [
    { label: 'Light', value: 'light', icon: Sun },
    { label: 'System', value: 'system', icon: Monitor },
    { label: 'Dark', value: 'dark', icon: Moon },
]

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const Icon = options.find(o => o.value === theme)?.icon ?? Sun

    return (
        <div ref={ref} className='relative'>
            <button
                onClick={() => setOpen(o => !o)}
                className='w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors'
                style={{
                    background: 'bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)]',
                    backdropFilter: 'url(#palm-glass-light) blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(120,96,60,0.10) dark:rgba(255,255,255,0.12)',
                    boxShadow: [
                        '0 0 0 0.5px rgba(100,76,40,0.08)',
                        '0 2px 4px rgba(80,60,30,0.06)',
                        '0 8px 20px rgba(80,60,30,0.09)',
                        'inset 0 1px 0 rgba(255,255,255,0.90)',
                        'inset 0 -1px 0 rgba(100,76,40,0.04)',
                    ].join(', '),
                }}
            >
                <Icon className='w-3.5 h-3.5' />
            </button>

            {open && (
                <div
                    className={cn(
                        'absolute bottom-10 right-0 z-50 w-36',
                        'animate-in fade-in-0 zoom-in-95 duration-200',
                        'rounded-2xl overflow-hidden',
                        'bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)]',
                        'border border-[rgba(120,96,60,0.10)] dark:border-[rgba(255,255,255,0.12)]',
                    )}
                    style={{
                        backdropFilter: 'url(#palm-glass-light) blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                        boxShadow: [
                            '0 0 0 0.5px rgba(100,76,40,0.08)',
                            '0 2px 4px rgba(80,60,30,0.06)',
                            '0 8px 20px rgba(80,60,30,0.09)',
                            '0 24px 48px rgba(80,60,30,0.07)',
                            'inset 0 1px 0 rgba(255,255,255,0.90)',
                            'inset 0 -1px 0 rgba(100,76,40,0.04)',
                        ].join(', '),
                    }}
                >
                    {/* Specular rim */}
                    <div
                        className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                        style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 50%, transparent 95%)' }}
                    />
                    <div className='p-1.5 flex flex-col gap-0.5'>
                        {options.map(({ label, value, icon: ItemIcon }) => (
                            <button
                                key={value}
                                onClick={() => { setTheme(value); setOpen(false) }}
                                className={cn(
                                    'flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-xs font-medium transition-colors',
                                    theme === value
                                        ? 'bg-foreground/[0.08] text-foreground'
                                        : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground'
                                )}
                            >
                                <ItemIcon className='w-3.5 h-3.5 flex-shrink-0' />
                                {label}
                                {theme === value && (
                                    <svg className='ml-auto w-3 h-3 text-primary' viewBox='0 0 12 12' fill='none'>
                                        <path d='M2 6l3 3 5-5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'/>
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
