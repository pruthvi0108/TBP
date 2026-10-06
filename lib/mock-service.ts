export type Role = 'admin' | 'engineer'
export type SimMode = 'normal' | 'warning' | 'critical'
export type PondStatus = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE'

export type Telemetry = {
  timestamp: number
  temperature: number
  turbidity: number
  predictedDo: number
  aeratorState: 'ON' | 'OFF'
}

export type PondNode = {
  id: string
  name: string
  location: string
  status: PondStatus
  healthScore: number
  baseline: {
    temperature: [number, number]
    turbidity: [number, number]
    predictedDo: [number, number]
  }
  telemetry: Telemetry[]
}

export type Alert = {
  id: string
  pondId: string
  level: 'HIGH' | 'MEDIUM' | 'INFO'
  title: string
  detail: string
  time: number
  acknowledged: boolean
}

export type TimelineEvent = {
  id: string
  pondId: string
  text: string
  actor: string
  time: number
}

export type Maintenance = {
  id: string
  pondId: string
  engineer: string
  date: string
  time: string
  type: string
  priority: string
  notes: string
}

const initialTelemetry = (mode: SimMode = 'normal'): Telemetry[] =>
  Array.from({ length: 60 }, (_, index) => {
    const t = index / 5
    const n = Math.sin(t) * 0.3 + Math.sin(t * 2.7) * 0.1
    const warning = mode === 'normal' ? 0 : mode === 'warning' ? index / 60 : index / 30

    const temperature = 28.4 + n * 0.4 + warning * (mode === 'critical' ? 4.5 : 2.2)
    const turbidity = 42.0 + n * 2.5 + warning * (mode === 'critical' ? 48.0 : 25.0)

    // Physics DO estimation: base solubility - turbidity penalty
    const baseDo = 11.2 - 0.12 * temperature - 0.0005 * (temperature ** 2)
    const turbidityPenalty = 0.015 * turbidity + 0.00012 * (turbidity ** 2)
    const predictedDo = Math.max(1.8, Math.min(9.5, baseDo - turbidityPenalty + n * 0.1))

    const aeratorState = predictedDo < 5.0 || mode === 'critical' ? 'ON' : 'OFF'

    return {
      timestamp: Date.now() - (59 - index) * 1000,
      temperature: Number(temperature.toFixed(1)),
      turbidity: Number(turbidity.toFixed(1)),
      predictedDo: Number(predictedDo.toFixed(2)),
      aeratorState,
    }
  })

export const createPondNode = (id: string, name: string, location: string): PondNode => ({
  id,
  name,
  location,
  status: 'NORMAL',
  healthScore: 96,
  baseline: {
    temperature: [26.0, 31.0],
    turbidity: [20.0, 50.0],
    predictedDo: [5.5, 8.5],
  },
  telemetry: initialTelemetry(),
})

export const seedPondNodes = (): PondNode[] => [
  createPondNode('POND-01', 'Vannamei Shrimp Pond A', 'Sector 1 / Main Basin'),
  createPondNode('POND-02', 'Vannamei Nursery Pond B', 'Sector 1 / Hatchery'),
  createPondNode('POND-03', 'Grow-Out Pond C', 'Sector 2 / South Field'),
  createPondNode('POND-04', 'Settling Basin 04', 'Utilities / Water Treatment'),
]

export const stepTelemetry = (last: Telemetry, mode: SimMode): Telemetry => {
  const target =
    mode === 'normal'
      ? { temp: 28.4, turb: 42.0 }
      : mode === 'warning'
      ? { temp: 30.5, turb: 68.0 }
      : { temp: 33.0, turb: 96.0 }

  const alpha = 0.08
  const drift = (val: number, goal: number, noise: number) =>
    val + (goal - val) * alpha + (Math.random() - 0.5) * noise

  const temperature = Math.max(20, Math.min(38, drift(last.temperature, target.temp, 0.15)))
  const turbidity = Math.max(5, Math.min(150, drift(last.turbidity, target.turb, 0.8)))

  const baseDo = 11.2 - 0.12 * temperature - 0.0005 * (temperature ** 2)
  const turbidityPenalty = 0.015 * turbidity + 0.00012 * (turbidity ** 2)
  let predictedDo = Math.max(1.8, Math.min(9.5, baseDo - turbidityPenalty + (Math.random() - 0.5) * 0.1))

  const aeratorState = predictedDo < 5.0 || mode === 'critical' ? 'ON' : last.aeratorState

  // Aeration boost when aerator is ON
  if (aeratorState === 'ON') {
    predictedDo = Math.min(8.5, predictedDo + 0.3)
  }

  return {
    timestamp: Date.now(),
    temperature: Number(temperature.toFixed(1)),
    turbidity: Number(turbidity.toFixed(1)),
    predictedDo: Number(predictedDo.toFixed(2)),
    aeratorState,
  }
}

export const assessWaterQuality = (t: Telemetry) => {
  if (t.predictedDo < 5.0) {
    return {
      label: 'CRITICAL HYPOXIA RISK',
      fault: 'Low Dissolved Oxygen (< 5.0 mg/L)',
      confidence: 96,
      level: 'CRITICAL' as const,
    }
  } else if (t.predictedDo < 6.0 || t.turbidity > 65.0) {
    return {
      label: 'ELEVATED RISK',
      fault: 'Sub-Optimal DO / High Turbidity',
      confidence: 88,
      level: 'WARNING' as const,
    }
  }
  return {
    label: 'OPTIMAL WATER QUALITY',
    fault: 'Parameters Within Safe Bounds',
    confidence: 97,
    level: 'NORMAL' as const,
  }
}

export const getNow = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export type MockState = {
  machines: PondNode[] // kept for compatibility with UI state shape
  mode: SimMode
  alerts: Alert[]
  maintenance: Maintenance[]
  timeline: TimelineEvent[]
  notifications: { id: string; text: string; read: boolean; href: string }[]
}

export const seedState = (): MockState => ({
  machines: seedPondNodes(),
  mode: 'normal',
  alerts: [],
  maintenance: [],
  timeline: [],
  notifications: [],
})

export const appendEvent = (
  state: MockState,
  pondId: string,
  text: string,
  actor: string
): MockState => ({
  ...state,
  timeline: [
    { id: crypto.randomUUID(), pondId, text, actor, time: Date.now() },
    ...state.timeline,
  ],
})

export const updatePondMode = (
  state: MockState,
  mode: SimMode,
  pondId = 'POND-01'
): MockState => ({
  ...state,
  mode,
  machines: state.machines.map((m) =>
    m.id === pondId
      ? {
          ...m,
          status: mode === 'normal' ? 'NORMAL' : mode === 'warning' ? 'WARNING' : 'CRITICAL',
          healthScore: mode === 'normal' ? 96 : mode === 'warning' ? 74 : 45,
        }
      : m
  ),
})
