/**
 * API Handler Utility
 * Base handler for consistent request/response/error handling across all routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAPIError, getErrorResponse } from './errors'

export type HandlerFunction<T, R> = (data: T) => Promise<R>

export async function apiHandler<T, R>(
  req: NextRequest,
  handler: HandlerFunction<T, R>,
  options?: {
    requireAuth?: boolean
    requireJson?: boolean
  }
): Promise<NextResponse> {
  try {
    let data: T

    if (options?.requireJson !== false) {
      try {
        data = (await req.json()) as T
      } catch (err) {
        return NextResponse.json(
          getErrorResponse(new Error('Invalid JSON in request body')),
          { status: 400 }
        )
      }
    } else {
      data = {} as T
    }

    const result = await handler(data)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    const statusCode = isAPIError(error) ? error.statusCode : 500

    console.error('API Error:', {
      error: errorResponse,
      originalError: error,
    })

    return NextResponse.json(errorResponse, { status: statusCode })
  }
}

// FormData variant for multipart requests (file uploads)
export async function apiHandlerFormData<T, R>(
  req: NextRequest,
  handler: (formData: FormData) => Promise<R>
): Promise<NextResponse> {
  try {
    const formData = await req.formData()
    const result = await handler(formData)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    const errorResponse = getErrorResponse(error)
    const statusCode = isAPIError(error) ? error.statusCode : 500

    console.error('API Error (FormData):', {
      error: errorResponse,
      originalError: error,
    })

    return NextResponse.json(errorResponse, { status: statusCode })
  }
}
