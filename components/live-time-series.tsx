'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { PondNode, SimMode, Telemetry } from '@/lib/mock-service'

type MetricKey = 'predictedDo' | 'temperature' | 'turbidity'

type Props = {
  pond: PondNode
  mode: SimMode
  metric?: MetricKey
  height?: number
  showControls?: boolean
}

const labels: Record<MetricKey, string> = {
  predictedDo: 'Est. Dissolved Oxygen',
  temperature: 'Water Temperature',
  turbidity: 'Turbidity',
}

const units: Record<MetricKey, string> = {
  predictedDo: 'mg/L',
  temperature: '°C',
  turbidity: 'NTU',
}

function getValue(point: Telemetry, metric: MetricKey) {
  return point[metric] ?? 0
}

function formatValue(value: number, metric: MetricKey) {
  return value.toFixed(metric === 'predictedDo' ? 2 : 1)
}

export function LiveTimeSeries({
  pond,
  mode,
  metric: initialMetric = 'predictedDo',
  height = 240,
  showControls = true,
}: Props) {
  const [metric, setMetric] = useState<MetricKey>(initialMetric)
  const [range, setRange] = useState<30 | 60 | 120>(60)
  const [series, setSeries] = useState<Telemetry[]>(() => pond.telemetry)

  useEffect(() => {
    setSeries(pond.telemetry)
  }, [pond.id, pond.telemetry])

  const visible = useMemo(() => series.slice(-range), [series, range])
  const values = visible.map((point) => getValue(point, metric))
  const latest = values.at(-1) ?? 0

  const min = useMemo(() => {
    const floor = metric === 'predictedDo' ? 1.0 : metric === 'temperature' ? 20.0 : 0.0
    return Math.max(0, Math.min(floor, ...values) - 0.5)
  }, [metric, values])

  const max = useMemo(() => {
    const ceiling = metric === 'predictedDo' ? 10.0 : metric === 'temperature' ? 38.0 : 120.0
    return Math.max(ceiling, ...values) + 0.5
  }, [metric, values])

  const points = values
    .map(
      (value, index) =>
        `${(index / Math.max(values.length - 1, 1)) * 100},${
          100 - ((value - min) / Math.max(max - min, 0.01)) * 100
        }`
    )
    .join(' ')

  const markerY = 100 - ((latest - min) / Math.max(max - min, 0.01)) * 100

  // Critical DO Threshold line (5.0 mg/L)
  const criticalDoY = 100 - ((5.0 - min) / Math.max(max - min, 0.01)) * 100

  return (
    <div className="live-series-card">
      <div className="live-series-toolbar">
        <div>
          <div className="eyebrow">Streaming water quality telemetry</div>
          <strong>{labels[metric]}</strong>
          <span className="live-series-value font-mono">
            {formatValue(latest, metric)} {units[metric]}
          </span>
        </div>
        {showControls && (
          <div className="live-series-controls">
            <select
              aria-label="Water metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricKey)}
            >
              {Object.entries(labels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <div className="segmented-control" role="group" aria-label="Chart time range">
              {([30, 60, 120] as const).map((item) => (
                <button
                  key={item}
                  className={range === item ? 'active' : ''}
                  onClick={() => setRange(item)}
                >
                  {item}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="live-series-plot" style={{ height }}>
        <div className="chart-grid" />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-label={`${labels[metric]} live chart`}
          role="img"
        >
          {/* Critical Threshold Line for DO */}
          {metric === 'predictedDo' && criticalDoY >= 0 && criticalDoY <= 100 && (
            <line
              x1="0"
              x2="100"
              y1={criticalDoY}
              y2={criticalDoY}
              stroke="var(--destructive)"
              strokeDasharray="2 2"
              opacity="0.75"
            />
          )}

          <polyline
            points={points}
            fill="none"
            stroke="var(--primary)"
            strokeOpacity="0.15"
            strokeWidth="6"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={points}
            fill="none"
            stroke={
              metric === 'predictedDo' && latest < 5.0
                ? 'var(--destructive)'
                : 'var(--primary)'
            }
            strokeWidth="2.4"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <motion.circle
            animate={{ cy: markerY }}
            transition={{ type: 'spring', stiffness: 140, damping: 24 }}
            cx="100"
            r="2.4"
            fill={
              metric === 'predictedDo' && latest < 5.0
                ? 'var(--destructive)'
                : 'var(--primary)'
            }
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="chart-axis top">
          {formatValue(max, metric)} {units[metric]}
        </div>
        <div className="chart-axis bottom">
          {formatValue(min, metric)} {units[metric]}
        </div>
        <span className="chart-live-label">
          <i /> LIVE · STREAMING
        </span>
      </div>

      <div className="live-series-footer">
        <span>
          <i className="legend-dot blue" /> Live Sensor Stream
        </span>
        {metric === 'predictedDo' && (
          <span>
            <i className="legend-line red" /> Low DO Limit (5.0 mg/L)
          </span>
        )}
        <span>{range}s rolling window</span>
      </div>
    </div>
  )
}

export default LiveTimeSeries
