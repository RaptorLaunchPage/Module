"use client"

import { useEffect, useRef } from 'react'

export default function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const pointsRef = useRef<{x:number,y:number,t:number}[]>([])

  useEffect(() => {
    const canvas = canvasRef.current!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!
    ctxRef.current = ctx

    function onMove(e: MouseEvent) {
      pointsRef.current.push({ x: e.clientX, y: e.clientY, t: Date.now() })
      if (pointsRef.current.length > 200) pointsRef.current.shift()
    }

    function onResize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('resize', onResize)

    let raf = 0
    function loop() {
      raf = requestAnimationFrame(loop)
      const ctx = ctxRef.current!
      ctx.clearRect(0,0,canvas.width, canvas.height)
      const now = Date.now()
      for (const p of pointsRef.current) {
        const age = (now - p.t) / 800
        if (age > 1) continue
        const alpha = 1 - age
        const radius = 10 * (1 - age)
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius*3)
        grad.addColorStop(0, `rgba(0,255,255,${0.25*alpha})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius*3, 0, Math.PI*2)
        ctx.fill()
      }
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:5 }} />
}