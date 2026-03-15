import { convexAuthNextjsMiddleware, createRouteMatcher, nextjsMiddlewareRedirect } from '@convex-dev/auth/nextjs/server'
import { isBypassRoutes, isProtectedRoutes, isPublicRoutes } from './lib/permissions'

const PublicMatcher = createRouteMatcher(isPublicRoutes)
const ProtectedMatcher = createRouteMatcher(isProtectedRoutes)
const BypassMatcher = createRouteMatcher(isBypassRoutes);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (BypassMatcher(request)) return
  const authed = await convexAuth.isAuthenticated()
  if (PublicMatcher(request) && authed) {
    return nextjsMiddlewareRedirect(request, `/dashboard`)
  }
  if (ProtectedMatcher(request) && !authed) {
    return nextjsMiddlewareRedirect(request, `/auth/sign-in`)
  }
  // Check subscription for protected routes
  if (ProtectedMatcher(request) && authed) {
    try {
      const hasSubscription = await convexAuth.isAuthenticated()
      // TODO: Check actual subscription status via Convex query
      // For now, allow access - pro-only features use direct checks
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
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