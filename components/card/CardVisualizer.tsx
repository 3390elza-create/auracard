'use client'

import Image from 'next/image'
import { useRef } from 'react'

export function CardVisualizer() {
  const cardRef = useRef<HTMLDivElement>(null)

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const rx = (y - rect.height / 2) / 20
    const ry = (rect.width / 2 - x) / 20
    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`
  }

  function onMouseLeave() {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
    }
  }

  return (
    <div
      className="group relative"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-aurora-violet to-aurora-teal opacity-25 blur transition duration-1000 group-hover:opacity-40" />
      <div
        ref={cardRef}
        className="shimmer relative flex aspect-[1.58/1] flex-col justify-between overflow-hidden rounded-3xl border border-glass-border bg-glass-fill p-8 shadow-2xl backdrop-blur-glass transition-transform"
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-label-sm uppercase tracking-[0.2em] text-text-secondary">Aura Elite</span>
            <div className="relative mt-4 h-10 w-12 rounded-md bg-gradient-to-br from-yellow-600 to-yellow-200 opacity-80">
              <div className="absolute inset-0 rounded-md border border-white/20" />
            </div>
          </div>
          <Image src="/logo.svg" alt="" width={48} height={48} className="opacity-80" aria-hidden />
        </div>
        <div className="space-y-4">
          <div className="text-headline-md tracking-[0.1em] text-white/90">
            •••• •••• •••• 8821
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-text-secondary">Card Holder</span>
              <span className="text-label-md text-white">GENESIS MEMBER</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-500/80 mix-blend-screen" />
              <div className="-ml-4 h-8 w-8 rounded-full bg-orange-500/80 mix-blend-screen" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
