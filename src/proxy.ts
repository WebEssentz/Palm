import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from '@convex-dev/auth/nextjs/server'
import { isBypassRoutes, isProtectedRoutes, isPublicRoutes } from './lib/permissions'

const PublicMatcher = createRouteMatcher(isPublicRoutes)
const ProtectedMatcher = createRouteMatcher(isProtectedRoutes)
const BypassMatcher = createRouteMatcher(isBypassRoutes)

// A network blip to Convex makes isAuthenticated() silently return false,
// even when the session is valid. Retry a couple times before trusting
// a "false" result, so we don't log people out due to transient fetch errors.
async function checkAuthenticated(
  convexAuth: { isAuthenticated: () => Promise<boolean> },
  retries = 2
): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const authed = await convexAuth.isAuthenticated()
    if (authed) return true
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
    }
  }
  return false
}

export const proxy = convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (BypassMatcher(request)) return

  const authed = await checkAuthenticated(convexAuth)

  // Only redirect the root — not every public route
  // This avoids chaining with /dashboard's own slug redirect
  if (request.nextUrl.pathname === '/' && authed) {
    return nextjsMiddlewareRedirect(request, `/dashboard`)
  }

  if (ProtectedMatcher(request) && !authed) {
    return nextjsMiddlewareRedirect(request, `/auth/sign-in`)
  }
  return
},
  {
    cookieConfig: { maxAge: 60 * 60 * 24 * 30 } // 30 days
  }
)

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}