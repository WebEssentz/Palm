'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const WORDS = ['design', 'create', 'build', 'ship', 'prototype', 'imagine']

export function CyclingWord() {
  const [index, setIndex]     = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIndex(i => (i + 1) % WORDS.length); setVisible(true) }, 400)
    }, 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <span className={cn('transition-all duration-400', visible ? 'opacity-100 blur-0' : 'opacity-0 blur-sm')}>
      {WORDS[index]}
    </span>
  )
}