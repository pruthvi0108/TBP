'use client'

import { useEffect, useRef } from 'react'

type Props = {
  temperature?: number
  turbidity?: number
  predictedDo?: number
  aeratorState?: 'ON' | 'OFF'
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL'
  mode?: 'AUTO' | 'MANUAL'
  esp32Connected?: boolean
}

export function AquacultureVisualization({
  temperature = 28.4,
  turbidity = 42.7,
  predictedDo = 5.82,
  aeratorState = 'OFF',
  status = 'NORMAL',
  mode = 'AUTO',
  esp32Connected = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    // Particles for turbidity and aeration bubbles
    const isAerating = aeratorState === 'ON'
    const particleCount = Math.min(60, Math.max(12, Math.floor(turbidity * 0.4)))
    const bubbleCount = isAerating ? 45 : 6

    const turbidityParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 200 + 40,
      r: Math.random() * 2.2 + 0.8,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.4 + 0.2,
    }))

    const bubbles = Array.from({ length: bubbleCount }, () => ({
      x: 140 + Math.random() * 120, // Centered near aerator node
      y: 180 + Math.random() * 40,
      r: Math.random() * 3 + 1.2,
      speedY: Math.random() * 1.5 + 0.8,
      wobble: Math.random() * Math.PI * 2,
    }))

    const render = () => {
      time += 0.04
      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)

      // 1. Water Background Gradient (Color shifts based on status)
      const grad = ctx.createLinearGradient(0, 0, 0, height)
      if (status === 'CRITICAL') {
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.15)')
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)')
      } else if (status === 'WARNING') {
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.15)')
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.95)')
      } else {
        grad.addColorStop(0, 'rgba(20, 184, 166, 0.18)')
        grad.addColorStop(1, 'rgba(11, 19, 32, 0.95)')
      }
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)

      // 2. Animated Water Waves Surface
      ctx.beginPath()
      ctx.moveTo(0, 50)
      for (let x = 0; x <= width; x += 10) {
        const wave1 = Math.sin(x * 0.02 + time) * 6
        const wave2 = Math.cos(x * 0.035 - time * 0.8) * 4
        ctx.lineTo(x, 45 + wave1 + wave2)
      }
      ctx.lineTo(width, height)
      ctx.lineTo(0, height)
      ctx.closePath()

      ctx.fillStyle = status === 'CRITICAL'
        ? 'rgba(220, 38, 38, 0.12)'
        : status === 'WARNING'
        ? 'rgba(217, 119, 6, 0.12)'
        : 'rgba(45, 212, 191, 0.12)'
      ctx.fill()

      ctx.strokeStyle = status === 'CRITICAL'
        ? 'rgba(239, 68, 68, 0.6)'
        : status === 'WARNING'
        ? 'rgba(245, 158, 11, 0.6)'
        : 'rgba(45, 212, 191, 0.6)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 3. Turbidity Particles
      ctx.fillStyle = 'rgba(226, 232, 240, 0.35)'
      turbidityParticles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 45) p.y = height - 10
        if (p.y > height) p.y = 45

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // 4. Aerator Bubbles
      ctx.fillStyle = isAerating ? 'rgba(56, 189, 248, 0.85)' : 'rgba(148, 163, 184, 0.3)'
      bubbles.forEach((b) => {
        b.y -= b.speedY
        b.wobble += 0.08
        const currentX = b.x + Math.sin(b.wobble) * 4

        if (b.y < 45) {
          b.y = height - 20
          b.x = 140 + Math.random() * 120
        }

        ctx.beginPath()
        ctx.arc(currentX, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // 5. Aerator Machine Node Visual at Pond Center Base
      const centerX = width / 2
      const centerY = height - 35
      ctx.fillStyle = isAerating ? '#38bdf8' : '#64748b'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
      ctx.fill()

      // Aerator Ring Pulse if ON
      if (isAerating) {
        const pulseR = 8 + (Math.sin(time * 4) + 1) * 6
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2)
        ctx.stroke()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [aeratorState, status, turbidity])

  return (
    <div className="hero-console aquaculture-visual-card">
      <div className="console-top">
        <span className="flex items-center gap-2">
          <i className={`pulse-dot ${esp32Connected ? '' : 'offline'}`} />
          SHRIMP POND 01 · REAL-TIME AI VISUALIZATION
        </span>
        <span className="font-mono text-xs text-primary">
          {esp32Connected ? 'ESP32 HARDWARE LINKED' : 'DEMO MODE'}
        </span>
      </div>

      <div className="console-body p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="eyebrow">AQUACULTURE POND SENSORS</div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Water Quality & Aeration
            </h2>
          </div>
          <span className={`status-badge ${status.toLowerCase()}`}>
            <span className="status-dot" />
            {status}
          </span>
        </div>

        {/* Animated Canvas Pond Visualizer */}
        <div className="relative w-full h-[210px] rounded-xl overflow-hidden border border-white/10 bg-slate-950/80 mb-4 shadow-inner">
          <canvas
            ref={canvasRef}
            width={400}
            height={220}
            className="w-full h-full object-cover"
          />

          {/* Floating Sensor Readout Overlay Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-white/10 backdrop-blur text-[11px] text-slate-300 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Temp: <strong className="text-foreground">{temperature.toFixed(1)}°C</strong>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-white/10 backdrop-blur text-[11px] text-slate-300 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Turbidity: <strong className="text-foreground">{turbidity.toFixed(1)} NTU</strong>
            </div>
          </div>

          <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end pointer-events-none">
            <div className="px-2.5 py-1.5 rounded-md bg-teal-950/90 border border-teal-500/30 backdrop-blur text-[11px] text-teal-300 font-mono flex items-center gap-2 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              Est. DO:{' '}
              <strong className="text-white text-xs">{predictedDo.toFixed(2)} mg/L</strong>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center px-3 py-1.5 rounded-lg bg-slate-900/90 border border-white/10 backdrop-blur text-[11px] font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              Aerator Relay:
              <strong
                className={
                  aeratorState === 'ON' ? 'text-sky-400 font-bold' : 'text-slate-400'
                }
              >
                {aeratorState}
              </strong>
            </span>
            <span className="text-slate-400">
              Mode: <strong className="text-primary">{mode}</strong>
            </span>
          </div>
        </div>

        {/* Console Summary Row */}
        <div className="console-stats grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center font-mono">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase">Water Temp</span>
            <strong className="text-sm block">{temperature.toFixed(1)}°C</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase">Turbidity</span>
            <strong className="text-sm block">{turbidity.toFixed(1)} NTU</strong>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase">Predicted DO</span>
            <strong className="text-sm block text-primary">{predictedDo.toFixed(2)} mg/L</strong>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AquacultureVisualization
