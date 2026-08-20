import fs from 'fs'
import path from 'path'
import os from 'os'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('audio') as File | null
    if (!file) return NextResponse.json({ error: 'No audio provided' }, { status: 400 })

    // write to tmp
    const tmpPath = path.join(os.tmpdir(), `palm-stt-${Date.now()}.webm`)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.promises.writeFile(tmpPath, buffer)

    const groq = new Groq({ apiKey: env.GROQ_API_KEY })

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
    })

    await fs.promises.unlink(tmpPath).catch(() => {})

    return NextResponse.json({ success: true, data: { text: transcription.text } })
  } catch (err) {
    console.error('STT error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }
}