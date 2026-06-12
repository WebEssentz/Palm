'use client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2, Sparkles } from 'lucide-react'
import React from 'react'
import { useSubscriptionPlan } from '@/hooks/use-billings'

const SubscribeButton = () => {
  const { onSubscribe, isFetching } = useSubscriptionPlan()

  return (
    <Button
      type='button'
      onClick={onSubscribe}
      disabled={isFetching}
      className={cn(
        // Full width, pill shape
        "w-full rounded-full",
        // Solid dark bg in light mode, solid white in dark mode
        "bg-[#0a0a0a] text-[#F5F0E8]",
        "dark:bg-white dark:text-[#070707]",
        // Hover — slightly lighten/darken
        "hover:bg-[#252525] dark:hover:bg-[#e8e8e8]",
        // Transitions
        "transition-all duration-200 ease-in-out",
        // Disabled
        "disabled:opacity-50 disabled:cursor-not-allowed",
        // Focus ring in brand amber
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A07850]/60",
        // Typography
        "font-bold text-sm tracking-tight px-6 py-4"
      )}
    >
      {isFetching ? (
        <>
          <Loader2 className='w-4 h-4 mr-2 animate-spin' />
          Redirecting...
        </>
      ) : (
        <>
          <Sparkles className='w-4 h-4 mr-2' />
          Subscribe
        </>
      )}
    </Button>
  )
}

export default SubscribeButton