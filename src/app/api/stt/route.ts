import { NextRequest } from 'next/server'
import Groq from 'groq-sdk'
import { env } from '@/env'
import { ValidationError, InternalServerError } from '@/lib/errors'
import { apiHandlerFormData } from '@/lib/api-handler'
import type { STTResponse } from '@/types/api'

export async function POST(req: NextRequest) {
  return apiHandlerFormData(req, async (formData) => {
    const audio = formData.get('audio') as File
    if (!audio) {
      throw new ValidationError('Audio file is required')
    }

    try {
      const groq = new Groq({ apiKey: env.GROQ_API_KEY })

      const transcription = await groq.audio.transcriptions.create({
        file: audio,
        model: 'whisper-large-v3-turbo',
        temperature: 0,
        response_format: 'json',
      })

      const response: STTResponse = {
        text: transcription.text || '',
        success: true,
      }

      return response
    } catch (err) {
      console.error('STT error:', err)
      throw new InternalServerError('Transcription failed', { originalError: err })
    }
  })
}
