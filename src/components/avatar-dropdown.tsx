'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/redux/store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StoredAccount {
    email: string
    name: string
    image?: string
    provider: 'password' | 'google' | 'github'
}

const ACCOUNTS_KEY = 'palm_accounts'

function getStoredAccounts(): StoredAccount[] {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]') }
    catch { return [] }
}

function saveAccount(account: StoredAccount) {
    const accounts = getStoredAccounts()
    const exists = accounts.find(a => a.email === account.email)
    if (!exists) {
        accounts.push(account)
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
    }
}

export function AvatarDropdown({ creditBalance }: { creditBalance?: number }) {
    const me = useAppSelector(s => s.profile)
    const { signOut, signIn } = useAuthActions()
    const router = useRouter()

    const [open, setOpen] = useState(false)
    const [accounts, setAccounts] = useState<StoredAccount[]>([])
    const [switchTarget, setSwitchTarget] = useState<StoredAccount | null>(null)
    const [switchPassword, setSwitchPassword] = useState('')
    const [switchError, setSwitchError] = useState('')
    const [switchLoading, setSwitchLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (me?.email && me?.name) {
            saveAccount({
                email: me.email,
                name: me.name,
                image: me.image || undefined,
                provider: (me.provider as StoredAccount['provider']) || 'password',
            })
            setAccounts(getStoredAccounts())
        }
    }, [me])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false)
                setSwitchTarget(null)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleSignOut = async () => {
        await signOut()
        router.push('/auth/sign-in')
    }

    const handleAddAccount = async () => {
        setOpen(false)
        await signOut()
        router.push('/auth/sign-in')
    }

    const handleSwitchAccount = async (account: StoredAccount) => {
        if (account.email === me?.email) return
        if (account.provider !== 'password') {
            setOpen(false)
            await signOut()
            router.push('/auth/sign-in')
            return
        }
        setSwitchTarget(account)
        setSwitchError('')
        setSwitchPassword('')
    }

    const confirmSwitch = async () => {
        if (!switchTarget || !switchPassword) return
        setSwitchLoading(true)
        setSwitchError('')
        try {
            await signOut()
            await signIn('password', {
                email: switchTarget.email,
                password: switchPassword,
                flow: 'signIn',
            })
            router.push('/dashboard')
            setOpen(false)
        } catch {
            setSwitchError('Wrong password')
        } finally {
            setSwitchLoading(false)
        }
    }

    const otherAccounts = accounts.filter(a => a.email !== me?.email)

    return (
        <div className='relative' ref={dropdownRef}>
            {/*
                Liquid glass SVG filters.
                MUST render before any Bubble — Chrome needs the filter in the DOM
                before backdrop-filter: url(#id) can reference it.

                palm-glass-dark  → dark mode, stronger displacement (18px scale)
                palm-glass-light → light/cream mode, subtler (12px scale)

                Safari ignores the url() part and falls back to blur() only — acceptable.
            */}
            <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden='true'>
                <defs>
                    <filter id='palm-glass-dark' x='-12%' y='-12%' width='124%' height='124%' colorInterpolationFilters='sRGB'>
                        <feTurbulence type='fractalNoise' baseFrequency='0.72 0.38' numOctaves='3' seed='8' result='noise'/>
                        <feGaussianBlur in='noise' stdDeviation='1.4' result='blurNoise'/>
                        <feDisplacementMap in='SourceGraphic' in2='blurNoise' scale='18' xChannelSelector='R' yChannelSelector='G' result='displaced'/>
                        <feComposite in='displaced' in2='SourceGraphic' operator='atop'/>
                    </filter>
                    <filter id='palm-glass-light' x='-12%' y='-12%' width='124%' height='124%' colorInterpolationFilters='sRGB'>
                        <feTurbulence type='fractalNoise' baseFrequency='0.65 0.42' numOctaves='3' seed='12' result='noise'/>
                        <feGaussianBlur in='noise' stdDeviation='1.6' result='blurNoise'/>
                        <feDisplacementMap in='SourceGraphic' in2='blurNoise' scale='12' xChannelSelector='R' yChannelSelector='G' result='displaced'/>
                        <feComposite in='displaced' in2='SourceGraphic' operator='atop'/>
                    </filter>
                </defs>
            </svg>

            {/* Trigger */}
            <button onClick={() => setOpen(o => !o)} className='focus:outline-none'>
                <Avatar className='size-8 ring-2 ring-border/30 hover:ring-border/60 transition-all'>
                    <AvatarImage src={me?.image || ''} />
                    <AvatarFallback className='bg-primary text-primary-foreground text-xs font-bold'>
                        {me?.name?.[0]?.toUpperCase() || <User className='size-3' />}
                    </AvatarFallback>
                </Avatar>
            </button>

            {open && (
                <div className={cn('absolute right-0 top-11 z-50 w-[240px]', 'animate-in fade-in-0 zoom-in-95 duration-200')}>
                    <button
                        onClick={() => { setOpen(false); setSwitchTarget(null) }}
                        className={cn(
                            'absolute -top-3 -right-3 z-10',
                            'w-7 h-7 rounded-full flex items-center justify-center',
                            'bg-background/80 backdrop-blur-xl',
                            'border border-border/40',
                            'shadow-lg shadow-black/10',
                            'text-muted-foreground hover:text-destructive',
                            'hover:border-destructive/30 hover:bg-destructive/5',
                            'hover:rotate-90 hover:scale-110',
                            'transition-all duration-200'
                        )}
                    >
                        <svg width='10' height='10' viewBox='0 0 12 12' fill='none'>
                            <path d='M1 1l10 10M11 1L1 11' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round'/>
                        </svg>
                    </button>

                    <div className='flex flex-col gap-1.5'>

                        <Bubble strong>
                            <div className='flex items-center gap-3 px-4 py-3.5'>
                                <Avatar className='size-9 rounded-xl'>
                                    <AvatarImage src={me?.image || ''} />
                                    <AvatarFallback className='rounded-xl bg-foreground text-background text-sm font-bold'>
                                        {me?.name?.[0]?.toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className='min-w-0'>
                                    <p className='text-sm font-semibold text-foreground truncate tracking-tight'>{me?.name}</p>
                                    <p className='text-[11px] text-muted-foreground truncate mt-0.5'>{me?.email}</p>
                                </div>
                            </div>
                        </Bubble>

                        {!switchTarget ? (
                            <Bubble>
                                <div className='p-1.5'>
                                    <p className='text-[9px] font-bold tracking-[0.1em] uppercase text-muted-foreground/60 px-2.5 py-1.5'>
                                        Accounts
                                    </p>
                                    <BubbleRow active>
                                        <AccountAvatar name={me?.name || ''} image={me?.image} />
                                        <div className='min-w-0 flex-1'>
                                            <p className='text-xs font-medium text-foreground truncate'>{me?.name}</p>
                                            <p className='text-[10px] text-muted-foreground/60'>Personal</p>
                                        </div>
                                        <span className='text-[9px] font-bold px-2 py-0.5 rounded-full bg-foreground/8 border border-border/40 text-muted-foreground'>
                                            Active
                                        </span>
                                    </BubbleRow>

                                    {otherAccounts.map(acc => (
                                        <BubbleRow key={acc.email} onClick={() => handleSwitchAccount(acc)}>
                                            <AccountAvatar name={acc.name} image={acc.image} muted />
                                            <div className='min-w-0 flex-1'>
                                                <p className='text-xs font-medium text-foreground truncate'>{acc.name}</p>
                                                <p className='text-[10px] text-muted-foreground/60 truncate'>{acc.email}</p>
                                            </div>
                                            <span className='text-[10px] text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity'>
                                                Switch →
                                            </span>
                                        </BubbleRow>
                                    ))}

                                    <BubbleRow onClick={handleAddAccount}>
                                        <div className='w-7 h-7 rounded-lg border border-dashed border-border/50 flex items-center justify-center flex-shrink-0'>
                                            <svg width='10' height='10' viewBox='0 0 12 12' fill='none'>
                                                <path d='M6 1v10M1 6h10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'/>
                                            </svg>
                                        </div>
                                        <span className='text-xs text-muted-foreground'>Add account</span>
                                    </BubbleRow>
                                </div>
                            </Bubble>
                        ) : (
                            <Bubble>
                                <div className='p-3'>
                                    <div className='flex items-center gap-2 mb-3'>
                                        <AccountAvatar name={switchTarget.name} image={switchTarget.image} />
                                        <div>
                                            <p className='text-xs font-semibold text-foreground'>{switchTarget.name}</p>
                                            <p className='text-[10px] text-muted-foreground/60'>{switchTarget.email}</p>
                                        </div>
                                    </div>
                                    <input
                                        autoFocus
                                        type='password'
                                        placeholder='Password'
                                        value={switchPassword}
                                        onChange={e => setSwitchPassword(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && confirmSwitch()}
                                        className={cn(
                                            'w-full text-xs px-3 py-2 rounded-lg mb-2',
                                            'bg-background/40 border border-border/50',
                                            'placeholder:text-muted-foreground/40 text-foreground',
                                            'focus:outline-none focus:border-border',
                                            'transition-colors'
                                        )}
                                    />
                                    {switchError && (
                                        <p className='text-[10px] text-destructive mb-2'>{switchError}</p>
                                    )}
                                    <div className='flex gap-2'>
                                        <button
                                            onClick={() => setSwitchTarget(null)}
                                            className='flex-1 text-xs py-1.5 rounded-lg border border-border/40 text-muted-foreground hover:bg-muted/40 transition-colors'
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmSwitch}
                                            disabled={!switchPassword || switchLoading}
                                            className='flex-1 text-xs py-1.5 rounded-lg bg-foreground text-background font-medium disabled:opacity-40 hover:opacity-90 transition-opacity'
                                        >
                                            {switchLoading ? 'Switching…' : 'Switch'}
                                        </button>
                                    </div>
                                </div>
                            </Bubble>
                        )}

                        <Bubble>
                            <div className='p-1.5 flex flex-col gap-0.5'>
                                <ActionRow icon={<UserIcon />} onClick={() => router.push(`/dashboard/${me?.name}/settings`)}>
                                    Profile
                                </ActionRow>
                                <ActionRow icon={<LeafIcon />} onClick={() => router.push(`/dashboard/${me?.name}/credits`)}>
                                    Credits
                                    <span className='ml-auto text-[10px] font-bold text-muted-foreground bg-muted/60 border border-border/40 px-2 py-0.5 rounded-full'>
                                        {creditBalance ?? 0}
                                    </span>
                                </ActionRow>
                                <ActionRow icon={<CardIcon />} onClick={() => router.push(`/dashboard/${me?.name}/billing`)}>
                                    Billing
                                    <span className='ml-auto text-[9px] font-bold text-muted-foreground bg-muted/60 border border-border/40 px-2 py-0.5 rounded-full uppercase tracking-wide'>
                                        Pro
                                    </span>
                                </ActionRow>
                            </div>
                        </Bubble>

                        <Bubble>
                            <button
                                onClick={handleSignOut}
                                className='w-full flex items-center gap-2.5 px-4 py-3 text-xs font-medium text-destructive hover:bg-destructive/5 rounded-[14px] transition-colors'
                            >
                                <SignOutIcon />
                                Sign out
                            </button>
                        </Bubble>

                    </div>
                </div>
            )}
        </div>
    )
}

// ── Bubble ──────────────────────────────────────────────────────────
// The key line is backdropFilter: `url(#palm-glass-light) blur(Xpx)`
// url() must come FIRST — Chrome applies filters left to right.
// The displacement map runs on the backdrop pixels first (bending edges),
// then blur softens it. Remove url() and you just get plain frosted glass.
function Bubble({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
    const blur = strong ? '48px' : '32px'
    return (
        <div
            className={cn(
                'rounded-2xl overflow-hidden relative',
                'bg-[rgba(250,246,238,0.88)] dark:bg-[rgba(255,255,255,0.07)]',
                'border border-[rgba(120,96,60,0.10)] dark:border-[rgba(255,255,255,0.12)]',
            )}
            style={{
                // This is the actual liquid glass line — url() fires the SVG displacement filter
                // on whatever is behind the element, then blur() softens the result.
                backdropFilter: `url(#palm-glass-light) blur(${blur})`,
                WebkitBackdropFilter: `blur(${blur})`,
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
            {/* Specular top rim */}
            <div
                className='pointer-events-none absolute inset-x-0 top-0 h-[1px]'
                style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.95) 50%, transparent 95%)' }}
            />
            {children}
        </div>
    )
}

function BubbleRow({ children, active, onClick }: {
    children: React.ReactNode
    active?: boolean
    onClick?: () => void
}) {
    return (
        <div
            onClick={onClick}
            className={cn(
                'group flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all',
                onClick && 'cursor-pointer hover:bg-foreground/[0.06]',
                active && 'bg-foreground/[0.05]'
            )}
        >
            {children}
        </div>
    )
}

function AccountAvatar({ name, image, muted }: { name: string; image?: string; muted?: boolean }) {
    return (
        <Avatar className={cn('size-7 rounded-lg flex-shrink-0', muted && 'opacity-70')}>
            <AvatarImage src={image || ''} />
            <AvatarFallback className='rounded-lg bg-foreground text-background text-[10px] font-bold'>
                {name[0]?.toUpperCase()}
            </AvatarFallback>
        </Avatar>
    )
}

function ActionRow({ children, icon, onClick }: {
    children: React.ReactNode
    icon: React.ReactNode
    onClick?: () => void
}) {
    return (
        <button
            onClick={onClick}
            className='w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-xs font-medium text-foreground hover:bg-foreground/[0.06] transition-colors'
        >
            <span className='text-muted-foreground w-4 h-4 flex items-center justify-center flex-shrink-0'>
                {icon}
            </span>
            {children}
        </button>
    )
}

const UserIcon = () => (
    <svg width='14' height='14' viewBox='0 0 16 16' fill='none'>
        <circle cx='8' cy='5.5' r='2.5' stroke='currentColor' strokeWidth='1.3'/>
        <path d='M2.5 13.5c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round'/>
    </svg>
)
const LeafIcon = () => (
    <svg width='14' height='14' viewBox='0 0 16 16' fill='none'>
        <path d='M8 14V8' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round'/>
        <path d='M8 8C8 8 4 7 3 4C5.5 3.5 8 5 8 8Z' fill='currentColor' opacity='0.8'/>
        <path d='M8 8C8 8 12 7 13 4C10.5 3.5 8 5 8 8Z' fill='currentColor' opacity='0.8'/>
    </svg>
)
const CardIcon = () => (
    <svg width='14' height='14' viewBox='0 0 16 16' fill='none'>
        <rect x='1.5' y='4' width='13' height='9' rx='2' stroke='currentColor' strokeWidth='1.3'/>
        <path d='M1.5 7.5h13' stroke='currentColor' strokeWidth='1.3'/>
    </svg>
)
const SignOutIcon = () => (
    <svg width='14' height='14' viewBox='0 0 16 16' fill='none'>
        <path d='M6 3H3.5A1.5 1.5 0 002 4.5v7A1.5 1.5 0 003.5 13H6' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round'/>
        <path d='M10.5 11l3-3-3-3M13.5 8H6' stroke='currentColor' strokeWidth='1.3' strokeLinecap='round' strokeLinejoin='round'/>
    </svg>
)