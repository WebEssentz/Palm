import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const combinedSlug = (name: string, maxLen = 80): string => {
  const base = name
  if (!base) return "untitled"
  let s = base
    .normalize("NFKD") // Normalize to decompose accented characters
    .replace(/\p{M}+/gu, "") // Remove diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "") // Replace non-alphanumeric characters with hyphens
    .replace(/\s+/g, "") // Replace multiple spaces with a single hyphen
  if (!s) s = "untitled"
  if (s.length > maxLen) s = s.slice(0, maxLen)
  return s
}