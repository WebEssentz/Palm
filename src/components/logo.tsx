import React from 'react'
import { cn } from '@/lib/utils'

export const LogoIcon = ({ className }: { className?: string }) => {
    return (
        <div className={cn('w-5 h-5 rounded-[5px] bg-foreground flex items-center justify-center flex-shrink-0', className)}>
            <div className="w-[7px] h-[7px] rounded-full bg-background" />
        </div>
    )
}

export const Logo = ({ className }: { className?: string }) => {
    return (
        <div className={cn('flex items-center gap-2 select-none', className)}>
            <LogoIcon />
            <span className="font-semibold tracking-tight text-[13px] text-foreground font-sans">
                Palm
            </span>
        </div>
    )
}
