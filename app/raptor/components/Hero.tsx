"use client"

import { useEffect, useRef, useState } from 'react'
import anime from 'animejs'
import styles from '../raptor.module.css'

export default function Hero() {
  const logoRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const [dragging, setDragging] = useState(false)
  const offset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Logo drop + shockwave
    if (!logoRef.current) return
    anime.set(logoRef.current, { translateY: -120, opacity: 0, scale: 0.9 })
    anime.timeline({ easing: 'easeOutExpo', duration: 900 })
      .add({ targets: logoRef.current, translateY: 0, opacity: 1, scale: 1 })
      .add({ targets: logoRef.current, scale: [1, 1.06, 1], duration: 400, easing: 'easeOutBack' }, '-=300')

    // Typewriter tagline
    if (taglineRef.current) typeWriter(taglineRef.current, 'Enter the Arena.', 26)

    // CTA heartbeat
    if (ctaRef.current) {
      anime({ targets: ctaRef.current, scale: [1, 1.03, 1], duration: 1600, easing: 'easeInOutSine', loop: true })
    }
  }, [])

  // Draggable logo
  useEffect(() => {
    const el = logoRef.current
    if (!el) return
    function onDown(e: PointerEvent) {
      setDragging(true)
      const rect = el.getBoundingClientRect()
      offset.current.x = e.clientX - rect.left
      offset.current.y = e.clientY - rect.top
      el.setPointerCapture(e.pointerId)
    }
    function onMove(e: PointerEvent) {
      if (!dragging) return
      anime.set(el, { translateX: e.clientX - offset.current.x - window.innerWidth / 2 + rectHalf(el).w, translateY: e.clientY - offset.current.y - window.innerHeight / 2 + rectHalf(el).h })
    }
    function onUp(e: PointerEvent) {
      setDragging(false)
      try { el.releasePointerCapture(e.pointerId) } catch {}
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging])

  function spawnParticles() {
    const el = ctaRef.current
    if (!el) return
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('span')
      p.className = styles.particle
      el.appendChild(p)
      anime({
        targets: p,
        translateX: (Math.random() - 0.5) * 60,
        translateY: (Math.random() - 0.5) * 30 - 20,
        opacity: [1, 0],
        scale: [1, 0.2],
        duration: 600 + Math.random() * 400,
        easing: 'easeOutQuad',
        complete: () => p.remove()
      })
    }
  }

  return (
    <div className={styles.hero}>
      <div ref={logoRef} className={styles.raptorLogo} aria-label="Raptor Mascot" />
      <div ref={taglineRef} className={styles.tagline} />
      <button ref={ctaRef} className={styles.cta} onMouseEnter={spawnParticles}>
        Enter Lobby
      </button>
    </div>
  )
}

function typeWriter(el: HTMLElement, text: string, speed = 30) {
  el.innerHTML = ''
  let i = 0
  const timer = setInterval(() => {
    el.innerHTML = text.slice(0, i) + '<span class="cursor">_</span>'
    i++
    if (i > text.length) {
      clearInterval(timer)
      el.innerHTML = text
      anime({ targets: el, opacity: [0.8, 1], duration: 800, easing: 'easeOutQuad' })
    }
  }, speed)
}

function rectHalf(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  return { w: r.width / 2, h: r.height / 2 }
}