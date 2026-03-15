import SubscribeButton from '@/components/buttons/checkout'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, Sparkles, Layers, ImagePlus, Move, Magnet, MessageSquare } from 'lucide-react'
import React from 'react'

const Page = () => {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='w-full max-w-lg'>
        <div className='text-center mb-8'>
            <div className='inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-primary to-primary/60 rounded-full mb-4 shadow-lg'>
              <Sparkles className='w-6 h-6 text-primary-foreground' />
            </div>
            <h1 className='text-2xl font-bold text-foreground mb-3'>
                Palm Pro
            </h1>
            <p className='text-muted-foreground text-sm max-w-sm mx-auto'>
              Transform your design ideas into reality with Palm
            </p>
        </div>
        <Card className='backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] shadow-xl saturate-150'>
          <CardHeader className='text-center pb-4'>
            <div className='flex items-center justify-center mb-3'>
              <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 text-xs font-medium rounded-full">
                Most Popular
              </Badge>
            </div>
            <CardTitle className='text-2xl font-bold text-foreground mb-2'>
              Pro Plan
            </CardTitle>
            <div className='flex items-baseline justify-center gap-2'>
              <span className='text-4xl font-bold text-foreground'>$20</span>
              <span className='text-base text-muted-foreground'>/month</span>
            </div>
            <CardDescription>
              Get 10 credits every month to power your AI assisted workflow
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4 px-6'>
            <div className="text-center">
              <p className='text-muted-foreground text-sm leading-relaxed'>
                Perfect for freelancers and creators
              </p>
              <p className='text-muted-foreground text-sm leading-relaxed mt-2'>
                Each credit unlocks a full AI powered task.
              </p>
            </div>
            <div className='space-y-3'>
              <h3 className='text-base font-semibold text-foreground text-center mb-3'>
                What&apos;s Included
              </h3>
              <div className='grid gap-2'>
                <div className='flex items-center gap-3 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]'>
                  <div className='w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0'>
                    <Palette className='w-3 h-3 text-primary'/>
                  </div>
                  <div>
                    <p className='text-foreground font-medium text-sm'>
                      AI powered design generation
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Generate unique design variations from a single prompt
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-3 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]'>
                  <div className='w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0'>
                    <Layers className='w-3 h-3 text-primary'/>
                  </div>
                  <div>
                    <p className='text-foreground font-medium text-sm'>
                      Smart style guides
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Auto-generate typography, colors, and brand guidelines
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-3 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]'>
                  <div className='w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0'>
                    <ImagePlus className='w-3 h-3 text-primary'/>
                  </div>
                  <div>
                    <p className='text-foreground font-medium text-sm'>
                      Mood board creation
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Curate and organize visual inspiration for every project
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-3 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]'>
                  <div className='w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0'>
                    <Move className='w-3 h-3 text-primary'/>
                  </div>
                  <div>
                    <p className='text-foreground font-medium text-sm'>
                      Infinite canvas workspace
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Sketch, draw, and arrange ideas on a boundless canvas
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-3 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]'>
                  <div className='w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0'>
                    <Magnet className='w-3 h-3 text-primary'/>
                  </div>
                  <div>
                    <p className='text-foreground font-medium text-sm'>
                      Precision snap &amp; alignment
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Snap shapes to endpoints for pixel-perfect layouts
                    </p>
                  </div>
                </div>

                <div className='flex items-center gap-3 p-2 rounded-lg bg-white/[0.05] border border-white/[0.08]'>
                  <div className='w-6 h-6 bg-primary/20 rounded-md flex items-center justify-center flex-shrink-0'>
                    <MessageSquare className='w-3 h-3 text-primary'/>
                  </div>
                  <div>
                    <p className='text-foreground font-medium text-sm'>
                      AI design assistant chat
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      Get real-time feedback and suggestions as you design
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <SubscribeButton />
            <p className='text-xs text-muted-foreground text-center'>
              Cancel anytime
            </p>
          </CardFooter>
        </Card>

        <div className='mt-6 space-y-3 text-center'>
          <div className='flex items-center justify-center gap-4 text-xs text-muted-foreground'>
            <a href='/terms' className='hover:text-foreground transition-colors underline underline-offset-4'>
              Terms of Service
            </a>
            <span className='text-white/10'>|</span>
            <a href='/privacy' className='hover:text-foreground transition-colors underline underline-offset-4'>
              Privacy Policy
            </a>
            <span className='text-white/10'>|</span>
            <a href='mailto:support@palm.app' className='hover:text-foreground transition-colors underline underline-offset-4'>
              Contact Support
            </a>
          </div>
          <p className='text-[11px] text-muted-foreground/60'>
            Payments are securely processed. By subscribing, you agree to our terms and billing policy.
          </p>
        </div>

      </div>
    </div>
  )
}

export default Page