import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const RESERVED_SLUGS = new Set([
  'success', 'cancel', 'user', 'undefined', 'null',
  'admin', 'api', 'billing', 'dashboard', 'settings',
  'sign-in', 'sign-up', 'sign-out', 'login', 'logout',
  'checkout', 'checkout-success', 'checkout-cancel',
  'callback', 'verify', 'reset', 'confirm',
])

export const combinedSlug = (name: string, userId?: string, maxLen = 80): string => {
  if (!name) return "untitled"
  let s = name
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .replace(/\s+/g, "")
  if (!s) s = "untitled"
  if (s.length > maxLen) s = s.slice(0, maxLen)

  if (RESERVED_SLUGS.has(s)) {
    // Derive a stable suffix from the userId so it's the same every call
    const suffix = userId
      ? userId.replace(/[^a-z0-9]/gi, '').slice(-5).toLowerCase()
      : Math.random().toString(36).slice(2, 7)
    s = `${s.slice(0, maxLen - 6)}-${suffix}`
  }

  return s
}

export const polylineBox = (
  points: ReadonlyArray<{ x: number; y: number }>
) => {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i];
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};