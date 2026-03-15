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
                "backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] shadow-lg saturate-150 rounded-full shadow-xl",
                "hover:bg-white/[0.12] hover:border-white/[0.18] hover:shadow-2xl transition-all duration-300 ease-in-out",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/[0.08]",
                "focus:outline-none focus:ring-2 focus:ring-white/20",
                "text-white font-medium text-sm px-6 py-3"
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