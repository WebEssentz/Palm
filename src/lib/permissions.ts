export const isPublicRoutes = [
    '/auth(.*)',
    '/'
]

export const isProtectedRoutes = [
    '/dashboard(.*)',
    '/projects(.*)',
]

export const isBypassRoutes = [
    '/api/polar/webhook',
    '/api/inngest(.*)',
    '/api/auth(.*)',
    '/convex(.*)',
]