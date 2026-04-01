import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

export async function POST(req: NextRequest) {
    // Init INSIDE the handler, not at module level
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
    
    try {
        const formData = await req.formData()
        const audio = formData.get('audio') as File
        if (!audio) return NextResponse.json({ error: 'No audio' }, { status: 400 })

        const transcription = await groq.audio.transcriptions.create({
            file: audio,
            model: 'whisper-large-v3-turbo',
            temperature: 0,
            response_format: 'json',
        })

        return NextResponse.json({ text: transcription.text })
    } catch (err) {
        console.error('STT error:', err)
        return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
    }
}
