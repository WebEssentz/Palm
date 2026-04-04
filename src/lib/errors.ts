/**
 * Error Classes & Utilities
 * Centralized error handling for consistent error responses
 */

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
    this.name = 'ConflictError'
  }
}

export class InternalServerError extends APIError {
  constructor(message: string = 'Internal server error', details?: any) {
    super('INTERNAL_SERVER_ERROR', message, 500, details)
    this.name = 'InternalServerError'
  }
}

export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError
}

export function getErrorResponse(error: unknown) {
  if (isAPIError(error)) {
    return {
      error: error.message,
      code: error.code,
      ...(error.details && { details: error.details }),
    }
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: 'INTERNAL_SERVER_ERROR',
    }
  }

  return {
    error: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
  }
}
