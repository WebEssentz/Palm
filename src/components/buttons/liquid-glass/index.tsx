import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LiquidGlassButtonProps {
    children: React.ReactNode
    onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void
    className?: string
    size?: 'sm' | 'md' | 'lg'
    variant?: 'default' | 'subtle'
    disabled: boolean
    style?: React.CSSProperties
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
    children,
    onClick,
    className,
    size = 'md',
    variant = 'default',
    disabled = false,
    style
}) => {
    const sizeClasses = {
        sm: 'px-2 py-2 text-xs rounded-lg',
        md: 'px-3 py-2 text-sm rounded-xl',
        lg: 'px-4 py-3 text-base rounded-2xl'
    }

    const variantClasses = {
        default:
            'backdrop-blur-xl bg-foreground/[0.08] border border-foreground/[0.12] saturate-150',
        subtle: 
            'backdrop-blur-lg bg-foreground/[0.08] border border-foreground/[0.12] saturate-125',
    }

    return (
        <Button
            onClick={onClick}
            disabled={disabled}
            style={style}
            className={cn(
                'relative transition-all duration-200 ease-out whitespace-nowrap',
                'text-foreground/90 font-medium',
                'flex items-center gap-2',
                'pointer-events-auto cursor-pointer',

                variantClasses[variant],

                sizeClasses[size],

                'hover:bg-foreground/[0.12] hover:border-foreground/[0.16]',
                'active:bg-foreground/[0.06] active-scale-[0.90]',
                'focus:outline-none focus:ring-2 focus:ring-foreground/20',
                'focus:ring-offset-2 focus:ring-offset-transparent',

                disabled &&
                    'opacity-50 cursor-not-allowed hover:bg-foreground/[0.08] hover:border-foreground/[0.12] active:scale-100',

                className
            )}
        >
            {children}
        </Button>
    )
}