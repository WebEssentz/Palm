/**
 * Typed Environment Variables
 * Centralized, type-safe access to environment variables
 */

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key]
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not set`)
  }
  return value || defaultValue || ''
}

export const env = {
  // Convex
  NEXT_PUBLIC_CONVEX_URL: getEnv('NEXT_PUBLIC_CONVEX_URL'),
  CONVEX_DEPLOYMENT: getEnv('CONVEX_DEPLOYMENT'),
  
  // Auth
  GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET'),
  
  // AI/LLM
  OPENAI_API_KEY: getEnv('OPENAI_API_KEY', ''),
  GROQ_API_KEY: getEnv('GROQ_API_KEY', ''),
  ANTHROPIC_API_KEY: getEnv('ANTHROPIC_API_KEY', ''),
  
  // Polar (Payments)
  POLAR_ACCESS_TOKEN: getEnv('POLAR_ACCESS_TOKEN', ''),
  POLAR_WEBHOOK_SECRET: getEnv('POLAR_WEBHOOK_SECRET', ''),
  POLAR_ENV: getEnv('POLAR_ENV', 'sandbox'),
  POLAR_PRO_PLAN: getEnv('POLAR_PRO_PLAN', ''),
  
  // Inngest
  INNGEST_SIGNING_KEY: getEnv('INNGEST_SIGNING_KEY', ''),
  INNGEST_EVENT_KEY: getEnv('INNGEST_EVENT_KEY', ''),
  INNGEST_DEV: getEnv('INNGEST_DEV', '0'),
  
  // App URLs
  NEXT_PUBLIC_APP_URL: getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  CONVEX_SITE_URL: getEnv('CONVEX_SITE_URL', ''),
  
  // Node Environment
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
} as const

export type Env = typeof env
