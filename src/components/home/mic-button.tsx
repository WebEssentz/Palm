'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Mic, X, Check } from 'lucide-react'
import { useTheme } from 'next-themes'

interface Props {
    onTranscript: (text: string) => void
    onRecordingChange?: (isRecording: boolean) => void
    onStateChange?: (state: 'idle' | 'recording' | 'processing') => void
    disabled?: boolean
}


export function MicButton({ onTranscript, onRecordingChange, onStateChange, disabled }: Props) {
    const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle')
    const [bars, setBars] = useState<number[]>(Array(16).fill(2))

    const { theme, systemTheme } = useTheme()
    const isLight = (theme === 'system' ? systemTheme : theme) === 'light'

    const text = isLight ? '#0a0a0a' : '#ffffff'
    const muted = isLight ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.38)'
    const border = isLight ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)'

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const analyserRef = useRef<AnalyserNode | null>(null)
    const audioCtxRef = useRef<AudioContext | null>(null)
    const gateGainRef = useRef<GainNode | null>(null)
    const sourceRef = useRef<MediaStream | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const vadIntervalRef = useRef<number | null>(null)

    const stop = useCallback(async (confirm: boolean) => {
        if (vadIntervalRef.current) {
            window.clearInterval(vadIntervalRef.current)
            vadIntervalRef.current = null
        }
        setBars(Array(16).fill(2))

        const recorder = mediaRecorderRef.current
        if (!recorder || recorder.state === 'inactive') return

        recorder.onstop = async () => {
            const cleanup = () => {
                streamRef.current?.getTracks().forEach(t => t.stop())
                sourceRef.current?.getTracks().forEach(t => t.stop())
                audioCtxRef.current?.close().catch(() => { })
                analyserRef.current = null
                audioCtxRef.current = null
                gateGainRef.current = null
                mediaRecorderRef.current = null
                setState('idle')
                onRecordingChange?.(false)
                onStateChange?.('idle')
            }

            if (!confirm) {
                cleanup()
                return
            }

            if (chunksRef.current.length === 0) {
                cleanup()
                return
            }

            setState('processing')
            onStateChange?.('processing')

            const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
            const form = new FormData()
            form.append('audio', blob, 'audio.webm')

            try {
                const res = await fetch('/api/stt', { method: 'POST', body: form })
                if (!res.ok) throw new Error(`STT failed: ${res.status}`)
                const data = await res.json()
                const HALLUCINATIONS = ['you', 'thank you', 'thanks', 'bye', '.', '']
                const transcribed = data.data?.text?.trim()
                if (transcribed && !HALLUCINATIONS.includes(transcribed.toLowerCase())) {
                    onTranscript(transcribed)
                }
            } catch (err) {
                console.error('STT error:', err)
            } finally {
                cleanup()
            }
        }

        recorder.stop()
    }, [onTranscript, onRecordingChange, onStateChange])

    const start = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            streamRef.current = stream

            const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext)
            const ctx = new AudioCtx()
            if (ctx.state === 'suspended') await ctx.resume()
            audioCtxRef.current = ctx

            const source = ctx.createMediaStreamSource(stream)
            sourceRef.current = stream

            const highpass = ctx.createBiquadFilter()
            highpass.type = 'highpass'
            highpass.frequency.value = 90

            const lowpass = ctx.createBiquadFilter()
            lowpass.type = 'lowpass'
            lowpass.frequency.value = 8000

            const gateGain = ctx.createGain()
            gateGain.gain.value = 1
            gateGainRef.current = gateGain

            const analyser = ctx.createAnalyser()
            analyser.fftSize = 2048
            analyser.smoothingTimeConstant = 0.3
            analyserRef.current = analyser

            source.connect(highpass)
            highpass.connect(lowpass)
            lowpass.connect(analyser)
            lowpass.connect(gateGain)

            const destination = ctx.createMediaStreamDestination()
            gateGain.connect(destination)

            const recorder = new MediaRecorder(destination.stream)
            chunksRef.current = []
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
            }
            recorder.start() // no timeslice
            mediaRecorderRef.current = recorder

            // VAD
            const VAD_INTERVAL = 110
            const CALIBRATION_MS = 500
            const MIN_SPEECH_MS = 200
            const HANGOVER_MS = 1800

            const data = new Uint8Array(analyser.frequencyBinCount)
            let noiseFloor = 0
            let noiseSamples = 0
            let lastVoiceTime = Date.now()
            let seenVoice = false
            let speechStartTime = 0
            const calibrateUntil = Date.now() + CALIBRATION_MS

            const computeLevel = () => {
                analyser.getByteTimeDomainData(data)
                let sum = 0
                for (let i = 0; i < data.length; i++) {
                    const v = data[i] - 128
                    sum += v * v
                }
                return Math.sqrt(sum / data.length)
            }

            vadIntervalRef.current = window.setInterval(() => {
                try {
                    const level = computeLevel()

                    if (Date.now() < calibrateUntil) {
                        noiseFloor = (noiseFloor * noiseSamples + level) / (noiseSamples + 1)
                        noiseSamples++
                        return
                    }

                    const threshold = Math.max(6, noiseFloor * 1.8)
                    const speaking = level > threshold

                    // gate: reduce gain during silence
                    if (speaking) {
                        gateGain.gain.setTargetAtTime(1, ctx.currentTime, 0.05)
                        lastVoiceTime = Date.now()
                        if (!seenVoice) { seenVoice = true; speechStartTime = Date.now() }
                    } else {
                        gateGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.05)
                    }

                    // update waveform bars
                    analyser.getByteFrequencyData(data)
                    const newBars = Array(16).fill(0).map((_, i) => {
                        const idx = Math.floor(i * data.length / 16)
                        const norm = data[idx] / 255
                        return speaking ? Math.max(3, norm * 24) : Math.max(2, Math.random() * 3)
                    })
                    setBars(newBars)

                    const speechDuration = seenVoice ? Date.now() - speechStartTime : 0
                    if (seenVoice && speechDuration >= MIN_SPEECH_MS && Date.now() - lastVoiceTime > HANGOVER_MS) {
                        stop(true) // auto-stop after hangover
                    }
                } catch (e) { }
            }, VAD_INTERVAL)

            setState('recording')
            onRecordingChange?.(true)
            onStateChange?.('recording')

        } catch (err) {
            console.error('Mic error:', err)
        }
    }

    useEffect(() => () => {
        if (vadIntervalRef.current) window.clearInterval(vadIntervalRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        sourceRef.current?.getTracks().forEach(t => t.stop())
        audioCtxRef.current?.close().catch(() => { })
    }, [])

    // ── Idle ──
    if (state === 'idle') {
        return (
            <button
                onClick={start}
                disabled={disabled}
                type="button"
                aria-label="Voice input"
                style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'}`,
                    background: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: disabled ? 'default' : 'pointer',
                    color: isLight ? 'rgba(0,0,0,0.52)' : 'rgba(255,255,255,0.55)',
                    transition: 'all 0.15s ease',
                    opacity: disabled ? 0.35 : 1,
                    flexShrink: 0,
                }}
                onMouseEnter={e => {
                    if (!disabled) {
                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.16)'
                        e.currentTarget.style.color = isLight ? '#0a0a0a' : '#ffffff'
                    }
                }}
                onMouseLeave={e => {
                    if (!disabled) {
                        e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'
                        e.currentTarget.style.borderColor = isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.color = isLight ? 'rgba(0,0,0,0.52)' : 'rgba(255,255,255,0.55)'
                    }
                }}
            >
                <Mic style={{ width: 15, height: 15, strokeWidth: 1.9 }} />
            </button>
        )
    }

    // ── Recording / Processing ──
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 10px 0 12px', height: 36, borderRadius: 18,
            border: `1px solid ${state === 'recording' ? 'rgba(239,68,68,0.3)' : border}`,
            background: state === 'recording'
                ? (isLight ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.08)')
                : (isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)'),
            transition: 'all 0.2s ease',
            flexShrink: 0,
        }}>

            {/* Live dot */}
            {state === 'recording' && (
                <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#ef4444', flexShrink: 0,
                    animation: 'pulse-dot 1.2s ease-in-out infinite',
                }} />
            )}

            {/* Waveform bars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {bars.map((h, i) => (
                    <div key={i} style={{
                        width: 2, borderRadius: 9999, flexShrink: 0,
                        height: `${h}px`, minHeight: 2, maxHeight: 22,
                        background: state === 'recording' ? '#ef4444' : muted,
                        opacity: state === 'recording' ? 0.75 : 0.4,
                        transition: 'height 0.075s ease',
                    }} />
                ))}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 14, background: border, flexShrink: 0, marginLeft: 4 }} />

            {/* Cancel */}
            <button
                onClick={() => stop(false)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: muted, padding: 4, display: 'flex', borderRadius: 4,
                    transition: 'color 0.12s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = text}
                onMouseLeave={e => e.currentTarget.style.color = muted}
            >
                <X style={{ width: 13, height: 13 }} />
            </button>

            {/* Confirm */}
            <button
                onClick={() => stop(true)}
                disabled={state === 'processing'}
                style={{
                    width: 26, height: 26, borderRadius: '50%', border: 'none',
                    background: text, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: state === 'processing' ? 'default' : 'pointer',
                    opacity: state === 'processing' ? 0.6 : 1,
                    transition: 'opacity 0.15s',
                }}
            >
                {state === 'processing'
                    ? <div style={{
                        width: 11, height: 11, borderRadius: '50%',
                        border: `2px solid ${isLight ? '#fff' : '#000'}`,
                        borderTopColor: 'transparent',
                        animation: 'spin 0.6s linear infinite',
                    }} />
                    : <Check style={{ width: 12, height: 12, color: isLight ? '#fff' : '#000' }} />
                }
            </button>
        </div>
    )
}