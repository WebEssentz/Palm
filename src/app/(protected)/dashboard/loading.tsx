'use client'

export default function Loading() {
    return (
        <div className='min-h-screen bg-background flex items-center justify-center'>
            <div className='relative w-14 h-14'>

                {/* Logo */}
                <div className='w-14 h-14 rounded-2xl bg-foreground flex items-center justify-center'>
                    <div className='w-6 h-6 rounded-full bg-background' />
                </div>

                {/* Trace ring */}
                <svg
                    className='absolute -inset-1.5'
                    width='68'
                    height='68'
                    viewBox='0 0 68 68'
                    fill='none'
                >
                    <rect
                        x='2' y='2'
                        width='64' height='64'
                        rx='18'
                        stroke='currentColor'
                        strokeWidth='2'
                        strokeLinecap='round'
                        className='text-foreground animate-[trace_1.8s_ease-in-out_infinite]'
                        style={{
                            strokeDasharray: 200,
                            strokeDashoffset: 200,
                        }}
                    />
                </svg>
            </div>
        </div>
    )
}