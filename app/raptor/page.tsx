"use client"

import { useEffect, useRef, useState } from 'react'
import anime from 'animejs'
import styles from './raptor.module.css'

const TABS = [
  'About Us', 'Sponsorship', 'Tier System', 'Incentives',
  'What\'s Covered', 'How It Works', 'Why Join', 'Tournaments'
]

export default function RaptorLanding() {
  const [active, setActive] = useState(0)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const navRefs = useRef<HTMLButtonElement[]>([])
  const sceneRef = useRef<HTMLDivElement>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    setIsReady(true)
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!indicatorRef.current || !navRefs.current[active]) return
    const el = navRefs.current[active]
    const rect = el.getBoundingClientRect()
    const navRect = el.parentElement!.getBoundingClientRect()
    anime({
      targets: indicatorRef.current,
      translateX: rect.left - navRect.left,
      width: rect.width,
      duration: 500,
      easing: 'easeOutExpo'
    })
  }, [active, isReady])

  function switchScene(next: number) {
    if (!sceneRef.current) return
    const container = sceneRef.current
    const current = container.querySelector(`.${styles.sceneActive}`)
    const nextEl = container.querySelectorAll(`.${styles.scene}`)[next] as HTMLElement
    if (current === nextEl) return

    // Exit animation
    if (current) {
      anime({
        targets: current,
        opacity: [1, 0],
        scale: [1, 0.98],
        translateX: ['0%', '-12%'],
        duration: 400,
        easing: 'easeInQuad',
        complete: () => current.classList.remove(styles.sceneActive)
      })
    }

    // Enter animation
    nextEl.classList.add(styles.sceneActive)
    anime.set(nextEl, { opacity: 0, translateX: '12%', scale: 1.02 })
    anime({
      targets: nextEl,
      opacity: [0, 1],
      translateX: ['12%', '0%'],
      scale: [1.02, 1],
      duration: 550,
      easing: 'easeOutCubic'
    })

    setActive(next)
  }

  return (
    <div className={styles.world}>
      <AmbientBackground />

      <nav className={styles.navBar}>
        <div className={styles.navInner}>
          {TABS.map((t, i) => (
            <button
              key={t}
              ref={(el) => { if (el) navRefs.current[i] = el }}
              className={`${styles.navItem} ${i === active ? styles.active : ''}`}
              onClick={() => switchScene(i)}
            >
              {t}
            </button>
          ))}
          <div ref={indicatorRef} className={styles.activeIndicator} />
        </div>
      </nav>

      <div ref={sceneRef} className={styles.sceneContainer}>
        {TABS.map((t, i) => (
          <section key={t} className={`${styles.scene} ${i === 0 ? styles.sceneActive : ''}`}>
            <Placeholder title={t} index={i} />
          </section>
        ))}
      </div>

      <footer className={styles.footer}>Raptor Esports — Public Preview</footer>
    </div>
  )
}

function AmbientBackground() {
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!gridRef.current) return
    anime({ targets: gridRef.current, scale: [1, 1.06], rotate: '1turn', duration: 30000, easing: 'linear', loop: true })
  }, [])
  return <div className={styles.ambient}>
    <div ref={gridRef} className={styles.holoGrid} />
    <div className={styles.lightSweep} />
  </div>
}

function Placeholder({ title, index }: { title: string, index: number }) {
  return (
    <div className={styles.placeholder}>
      <div className={styles.placeholderInner}>
        <h1>{title}</h1>
        <p>Scene {index + 1} — Cinematic lobby placeholder</p>
      </div>
    </div>
  )
}