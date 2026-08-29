'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const options = [
  { label: 'Light',  value: 'light',  icon: Sun     },
  { label: 'Dark',   value: 'dark',   icon: Moon     },
  { label: 'System', value: 'system', icon: Monitor  },
]

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!mounted) {
    return <div className="w-8 h-8 rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900" />
  }

  const activeOption = options.find(o => o.value === theme) ?? options[2]
  const currentIcon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <div ref={ref} className="relative select-none">
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle theme"
        title="Toggle theme"
        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all duration-150 active:scale-95 shadow-sm"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={resolvedTheme}
            initial={{ opacity: 0, rotate: -30, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 30, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            {theme === 'system' ? (
              <Monitor className="w-3.5 h-3.5" />
            ) : resolvedTheme === 'dark' ? (
              <Moon className="w-3.5 h-3.5" />
            ) : (
              <Sun className="w-3.5 h-3.5" />
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: 'spring', damping: 24, stiffness: 340 }}
            className="absolute bottom-11 right-0 w-36 rounded-2xl overflow-hidden z-50 border border-black/10 dark:border-white/10 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl shadow-xl p-1.5 flex flex-col gap-0.5"
          >
            {options.map(({ label, value, icon: ItemIcon }) => {
              const isActive = theme === value

              return (
                <button
                  key={value}
                  onClick={() => {
                    setTheme(value)
                    setOpen(false)
                  }}
                  className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-xs cursor-pointer text-left transition-colors duration-120 ${
                    isActive
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-neutral-900 dark:hover:text-neutral-200 font-normal'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{label}</span>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.12 }}
                    >
                      <Check className="w-3 h-3 text-neutral-900 dark:text-neutral-100 opacity-70" />
                    </motion.div>
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}