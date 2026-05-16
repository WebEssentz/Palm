'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Mic, X, Check } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface Props {
    onTranscript: (text: string) => void
    onRecordingChange?: (isRecording: boolean) => void
    disabled?: boolean
}

const SILENCE_THRESHOLD = 0.012  // RMS below this = silence
const MIN_SPEECH_DURATION = 400  // ms — ignore tiny blips

export function MicButton({ onTranscript, onRecordingChange, disabled }: Props) {
    const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle')
    const [bars, setBars] = useState<number[]>(Array(16).fill(2))

    const { theme, systemTheme } = useTheme()
    const effectiveTheme = theme === 'system' ? systemTheme : theme
    const isLight = effectiveTheme === 'light'
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const analyserRef = useRef<AnalyserNode | null>(null)
    const animFrameRef = useRef<number>(0)
    const audioCtxRef = useRef<AudioContext | null>(null)
    const speechDetectedRef = useRef(false)
    const speechStartTimeRef = useRef(0)
    const streamRef = useRef<MediaStream | null>(null)

    const stopAnimation = () => {
        cancelAnimationFrame(animFrameRef.current)
        setBars(Array(16).fill(2))
    }

    const startAnimation = () => {
        const analyser = analyserRef.current
        if (!analyser) return
        const data = new Uint8Array(analyser.frequencyBinCount)

        const tick = () => {
            analyser.getByteTimeDomainData(data)
            // RMS
            let sum = 0
            for (let i = 0; i < data.length; i++) {
                const v = (data[i] - 128) / 128
                sum += v * v
            }
            const rms = Math.sqrt(sum / data.length)

            // Track if speech occurred
            if (rms > SILENCE_THRESHOLD) {
                if (!speechDetectedRef.current) {
                    speechDetectedRef.current = true
                    speechStartTimeRef.current = Date.now()
                }
            }

            // Build bar heights based on frequency data
            analyser.getByteFrequencyData(data)
            const newBars = Array(16).fill(0).map((_, i) => {
                const idx = Math.floor(i * data.length / 16)
                const norm = data[idx] / 255
                // Only animate if above silence threshold
                return rms > SILENCE_THRESHOLD ? Math.max(2, norm * 22) : 2
            })
            setBars(newBars)
            animFrameRef.current = requestAnimationFrame(tick)
        }
        animFrameRef.current = requestAnimationFrame(tick)
    }

    const start = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: 16000,  // optimal for Whisper
                }
            })
            streamRef.current = stream

            // Audio analysis chain
            const ctx = new AudioContext()
            audioCtxRef.current = ctx
            const source = ctx.createMediaStreamSource(stream)

            // Dynamics compressor — boosts quiet speech
            const compressor = ctx.createDynamicsCompressor()
            compressor.threshold.value = -50
            compressor.knee.value = 40
            compressor.ratio.value = 12
            compressor.attack.value = 0
            compressor.release.value = 0.25

            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.8
            analyserRef.current = analyser

            source.connect(compressor)
            compressor.connect(analyser)

            // Use webm if supported, fallback
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'

            const recorder = new MediaRecorder(stream, { mimeType })
            chunksRef.current = []
            speechDetectedRef.current = false
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }
            recorder.start(100) // collect chunks every 100ms
            mediaRecorderRef.current = recorder

            setState('recording')
            onRecordingChange?.(true)
            startAnimation()
        } catch (err) {
            console.error('Mic error:', err)
        }
    }

    const stop = useCallback(async (confirm: boolean) => {
        stopAnimation()
        const recorder = mediaRecorderRef.current
        if (!recorder) return

        recorder.onstop = async () => {
            const cleanup = () => {
                streamRef.current?.getTracks().forEach(t => t.stop())
                audioCtxRef.current?.close()
                analyserRef.current = null
                audioCtxRef.current = null
                setState('idle')
                onRecordingChange?.(false)
            }

            if (!confirm) { cleanup(); return }

            // VAD check — if no speech or too short, discard
            const speechDuration = speechDetectedRef.current
                ? Date.now() - speechStartTimeRef.current
                : 0

            if (!speechDetectedRef.current || speechDuration < MIN_SPEECH_DURATION) {
                console.log('[VAD] No speech detected, discarding')
                cleanup()
                return
            }

            setState('processing')
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
            const form = new FormData()
            form.append('audio', blob, 'audio.webm')

            try {
                const res = await fetch('/api/stt', { method: 'POST', body: form })
                const { text } = await res.json()
                if (text?.trim()) onTranscript(text.trim())
            } catch (err) {
                console.error('STT error:', err)
            }
            cleanup()
        }

        recorder.stop()
    }, [onTranscript])

    // Cleanup on unmount
    useEffect(() => () => {
        stopAnimation()
        streamRef.current?.getTracks().forEach(t => t.stop())
        audioCtxRef.current?.close()
    }, [])

    if (state === 'idle') {
        return (
            <button
                onClick={start}
                disabled={disabled}
                className='w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer'
                style={isLight ? {
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
                        'inset 0 1px 0 rgba(255,255,255,0.08)',
                        'inset 0 -1px 0 rgba(0,0,0,0.2)',
                    ].join(', '),
                }}
            >
                <Mic className='w-4 h-4' />
            </button>
        )
    }

    return (
        <div className='flex items-center gap-2'>
            <div className='flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 h-10'>
                {/* Waveform */}
                <div className='flex items-center gap-[2px]'>
                    {bars.map((h, i) => (
                        <div
                            key={i}
                            className='w-[2px] rounded-full bg-foreground/60 transition-all duration-75'
                            style={{ height: `${h}px`, minHeight: '2px', maxHeight: '22px' }}
                        />
                    ))}
                </div>

                {/* Divider */}
                <div className='w-px h-4 bg-border/60 mx-1' />

                {/* X */}
                <button
                    onClick={() => stop(false)}
                    className='text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer'
                >
                    <X className='w-3.5 h-3.5' />
                </button>

                {/* Check */}
                <button
                    onClick={() => stop(true)}
                    disabled={state === 'processing'}
                    className='w-7 h-7 rounded-full bg-black dark:bg-white flex items-center justify-center flex-shrink-0 disabled:opacity-60 cursor-pointer'
                >
                    {state === 'processing'
                        ? <div className='w-3 h-3 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin' />
                        : <Check className='w-3.5 h-3.5 text-white dark:text-black' />
                    }
                </button>
            </div>
        </div>
    )
}
