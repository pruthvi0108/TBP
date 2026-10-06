'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleStop,
  Cpu,
  Factory,
  LineChart,
  LogOut,
  Menu,
  Radar,
  Settings,
  Siren,
  Sparkles,
  User,
  Wrench,
  X,
  Zap,
  Waves,
  Gauge,
  Wind,
  Wifi,
  WifiOff,
  Sliders,
  FlaskConical,
} from 'lucide-react'
import { LiveTimeSeries } from '@/components/live-time-series'
import { AquacultureVisualization } from '@/components/aquaculture-visualization'
import {
  assessWaterQuality,
  createPondNode,
  getNow,
  seedPondNodes,
  stepTelemetry,
  type PondNode,
  type Role,
  type SimMode,
  type Telemetry,
} from '@/lib/mock-service'
import {
  fetchSystemStatus,
  sendTestSensorData,
  setAeratorMode,
  setAeratorState,
  type SystemStatus,
} from '@/lib/api-client'
import { subscribeToStatusUpdates } from '@/lib/websocket-client'

type Props = { initialRole?: Role }

const nav = (role: Role) =>
  role === 'admin'
    ? ([
        ['Dashboard', '/admin', Waves],
        ['Ponds', '/admin/machines', Gauge],
        ['Engineers', '/admin/engineers', User],
        ['Alerts', '/admin/alerts', Siren],
        ['Maintenance', '/admin/maintenance', Wrench],
        ['Reports', '/admin/reports', LineChart],
      ] as const)
    : ([
        ['Dashboard', '/engineer', Waves],
        ['My Ponds', '/engineer/machines', Gauge],
        ['Alerts', '/engineer/alerts', Siren],
        ['Maintenance', '/engineer/maintenance', Wrench],
        ['Reports', '/engineer/reports', LineChart],
      ] as const)

function Logo({ role, onClick }: { role?: Role; onClick?: () => void }) {
  return (
    <button className="flex items-center gap-3 text-left" onClick={onClick} aria-label="AquaSense home">
      <span className="brand-mark">
        <Waves className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">
        Aqua<span className="text-primary">Sense</span>
      </span>
    </button>
  )
}

function Badge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const displayClass =
    normalized === 'critical' || normalized === 'high risk'
      ? 'critical'
      : normalized === 'warning'
      ? 'warning'
      : normalized === 'offline'
      ? 'offline'
      : 'healthy'
  return (
    <span className={`status-badge ${displayClass}`}>
      <span className="status-dot" />
      {status}
    </span>
  )
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('engineer@aquasense.demo')
  const [password, setPassword] = useState('engineer123')
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const role: Role | null =
      email === 'admin@aquasense.demo' && password === 'admin123'
        ? 'admin'
        : email === 'engineer@aquasense.demo' && password === 'engineer123'
        ? 'engineer'
        : null
    if (!role) return setError('Invalid demo credentials')
    sessionStorage.setItem('machsense-role', role)
    router.push(`/${role}`)
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <Logo onClick={() => router.push('/')} />
        <div className="eyebrow mt-4">
          <span className="pulse-dot" /> Secure IoT Aquaculture Access
        </div>
        <h1>Predict oxygen levels.</h1>
        <p>Automate pond aeration with AI.</p>
        <form onSubmit={submit} className="login-form">
          <label className="field-label">
            Email
            <input
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field-label">
            Password
            <input
              className="field-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <div className="modal-callout critical">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          )}
          <button className="button primary full" type="submit">
            Sign In <ChevronRight className="size-4" />
          </button>
        </form>
        <div className="demo-accounts">
          <strong>Demo accounts</strong>
          <button
            onClick={() => {
              setEmail('admin@aquasense.demo')
              setPassword('admin123')
            }}
          >
            Pond Manager <span>admin@aquasense.demo</span>
          </button>
          <button
            onClick={() => {
              setEmail('engineer@aquasense.demo')
              setPassword('engineer123')
            }}
          >
            Aquaculture Eng. <span>engineer@aquasense.demo</span>
          </button>
        </div>
      </div>
    </main>
  )
}

function Landing({ liveStatus }: { liveStatus?: SystemStatus }) {
  const router = useRouter()

  const temp = liveStatus?.temperature ?? 28.4
  const turb = liveStatus?.turbidity ?? 42.7
  const doVal = liveStatus?.predicted_do ?? 5.82
  const aerator = liveStatus?.aerator_state ?? 'OFF'
  const status = liveStatus?.water_quality_status ?? 'NORMAL'
  const mode = liveStatus?.mode ?? 'AUTO'
  const esp32Connected = liveStatus?.esp32_connected ?? true

  return (
    <main className="landing">
      <div className="landing-nav">
        <Logo />
        <button className="button secondary" onClick={() => router.push('/login')}>
          Explore Dashboard <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="landing-grid">
        <section className="landing-copy">
          <div className="eyebrow">
            <span className="pulse-dot" /> AI-Powered Shrimp Pond Water Quality Monitoring
          </div>
          <h1>Know your pond oxygen before hypoxia strikes.</h1>
          <p>
            AquaSense combines low-cost ESP32 temperature & turbidity sensors with a real-time ML
            regression model to predict Dissolved Oxygen (DO) and automate aerator control.
          </p>
          <div className="landing-actions">
            <button className="button primary large" onClick={() => router.push('/login')}>
              Open Control Center <ChevronRight className="size-4" />
            </button>
            <button
              className="button ghost large"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            >
              See How It Works
            </button>
          </div>
        </section>

        {/* REPLACED VIDEO AREA WITH CUSTOM ANIMATED AQUACULTURE VISUALIZATION */}
        <section className="hero-visual">
          <div className="visual-glow" />
          <AquacultureVisualization
            temperature={temp}
            turbidity={turb}
            predictedDo={doVal}
            aeratorState={aerator}
            status={status}
            mode={mode}
            esp32Connected={esp32Connected}
          />
        </section>
      </div>

      <section id="how-it-works" className="landing-footer">
        <span>01 · ESP32 Sensor Ingestion</span>
        <span>02 · ML Dissolved Oxygen Regression</span>
        <span>03 · Automated Aerator Relay Control</span>
        <strong>Real-Time Aquaculture Protection</strong>
      </section>
    </main>
  )
}

function Workspace({ role }: { role: Role }) {
  const router = useRouter()
  const pathname = usePathname()

  const [backendStatus, setBackendStatus] = useState<SystemStatus | null>(null)
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false)
  const [actionLoading, setActionLoading] = useState<boolean>(false)

  const [localPonds, setLocalPonds] = useState<PondNode[]>(() => seedPondNodes())
  const [simMode, setSimMode] = useState<SimMode>('normal')
  const [mobileNav, setMobileNav] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)

  // 1. Initial REST fetch from FastAPI
  useEffect(() => {
    fetchSystemStatus()
      .then((data) => {
        setBackendStatus(data)
        setIsBackendConnected(true)
      })
      .catch(() => {
        setIsBackendConnected(false)
      })
  }, [])

  // 2. Subscribe to WebSocket real-time updates from FastAPI
  useEffect(() => {
    const unsubscribe = subscribeToStatusUpdates(
      (data) => {
        setBackendStatus(data)
        setIsBackendConnected(true)
      },
      () => {
        setIsBackendConnected(false)
      }
    )
    return () => unsubscribe()
  }, [])

  // 3. Fallback streaming interval for simulation if backend is offline
  useEffect(() => {
    const timer = window.setInterval(() => {
      setLocalPonds((prev) =>
        prev.map((pond) => {
          if (pond.id === 'POND-01' && backendStatus) {
            // Overlay backend state onto main node
            const nextTel: Telemetry = {
              timestamp: Date.now(),
              temperature: backendStatus.temperature,
              turbidity: backendStatus.turbidity,
              predictedDo: backendStatus.predicted_do,
              aeratorState: backendStatus.aerator_state,
            }
            return {
              ...pond,
              status: backendStatus.water_quality_status,
              telemetry: [...pond.telemetry.slice(-59), nextTel],
            }
          }
          // Simulate other nodes
          const last = pond.telemetry.at(-1)!
          const next = stepTelemetry(last, pond.id === 'POND-01' ? simMode : 'normal')
          const assess = assessWaterQuality(next)
          return {
            ...pond,
            status: assess.level,
            telemetry: [...pond.telemetry.slice(-59), next],
          }
        })
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [backendStatus, simMode])

  const activePond = localPonds[0]

  // Handlers for Aerator Control
  const handleToggleMode = async (newMode: 'AUTO' | 'MANUAL') => {
    setActionLoading(true)
    try {
      const updated = await setAeratorMode(newMode)
      setBackendStatus(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(false)
    }
  }

  const handleManualAerator = async (state: 'ON' | 'OFF') => {
    setActionLoading(true)
    try {
      const updated = await setAeratorState(state)
      setBackendStatus(updated)
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(false)
    }
  }

  const handleTestSensorInput = async (temp: number, turb: number) => {
    try {
      const updated = await sendTestSensorData(temp, turb)
      setBackendStatus(updated)
    } catch (e) {
      console.error(e)
    }
  }

  const pageTitle = pathname.includes('alerts')
    ? 'Alerts'
    : pathname.includes('maintenance')
    ? 'Maintenance'
    : pathname.includes('reports')
    ? 'Reports'
    : pathname.includes('machines')
    ? 'Pond Directory'
    : 'Aquaculture Water Monitor'

  const currentTemp = backendStatus?.temperature ?? activePond.telemetry.at(-1)?.temperature ?? 28.4
  const currentTurb = backendStatus?.turbidity ?? activePond.telemetry.at(-1)?.turbidity ?? 42.7
  const currentDo = backendStatus?.predicted_do ?? activePond.telemetry.at(-1)?.predictedDo ?? 5.82
  const aeratorState = backendStatus?.aerator_state ?? activePond.telemetry.at(-1)?.aeratorState ?? 'OFF'
  const controlMode = backendStatus?.mode ?? 'AUTO'
  const qualityStatus = backendStatus?.water_quality_status ?? activePond.status
  const esp32Connected = backendStatus?.esp32_connected ?? isBackendConnected
  const lastUpdate = backendStatus?.last_update ?? getNow()

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <Logo role={role} onClick={() => router.push(`/${role}`)} />
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileNav(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-icon">
            <Waves className="size-4" />
          </div>
          <div>
            <div className="eyebrow">Facility</div>
            <div className="font-medium">Shrimp Pond Sector 1</div>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {nav(role).map(([label, path, Icon]) => (
            <button
              key={path}
              className={`nav-item ${pathname === path ? 'active' : ''}`}
              onClick={() => {
                router.push(path)
                setMobileNav(false)
              }}
            >
              <Icon className="size-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="user-card"
            onClick={() => {
              sessionStorage.removeItem('machsense-role')
              router.push('/login')
            }}
          >
            <div className="avatar">{role === 'admin' ? 'AQ' : 'JD'}</div>
            <div className="min-w-0 text-left">
              <div className="truncate text-sm font-medium">
                {role === 'admin' ? 'Alex Morgan' : 'Jordan Diaz'}
              </div>
              <div className="text-xs text-muted-foreground">
                {role === 'admin' ? 'Aqua Manager' : 'Aquaculture Eng.'}
              </div>
            </div>
            <LogOut className="ml-auto size-4 text-muted-foreground" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <button
            className="icon-button mobile-only"
            onClick={() => setMobileNav(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            <span>Shrimp Sector 1</span>
            <ChevronRight className="size-3" />
            <strong>{pageTitle}</strong>
          </div>

          <div className="topbar-actions">
            {/* ESP32 Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-lg bg-card text-xs">
              {esp32Connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-emerald-400 font-medium">ESP32 CONNECTED</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="font-mono text-slate-400">ESP32 OFFLINE</span>
                </>
              )}
            </div>

            {/* Test Simulation Controls */}
            <div className="simulation-control">
              <FlaskConical className="size-3.5 text-primary" />
              <span>FastAPI Simulation:</span>
              <button
                className="button ghost text-xs py-0.5 px-1.5"
                onClick={() => handleTestSensorInput(32.5, 95.0)}
              >
                Trigger Low DO
              </button>
              <button
                className="button ghost text-xs py-0.5 px-1.5"
                onClick={() => handleTestSensorInput(27.5, 25.0)}
              >
                Simulate Normal
              </button>
            </div>
          </div>
        </header>

        <div className="content-wrap">
          <div className="page-heading">
            <div>
              <div className="eyebrow flex items-center gap-2">
                <span className="pulse-dot" /> LIVE SENSOR STREAM · Updated {lastUpdate}
              </div>
              <h1>AQUACULTURE WATER MONITOR</h1>
              <p>Real-time water temperature, turbidity, ML predicted DO & aerator control.</p>
            </div>
          </div>

          {/* 4 Key Metric Cards */}
          <section className="metric-grid">
            <div className="metric-card">
              <div className="metric-icon blue">
                <Activity className="size-4" />
              </div>
              <div className="metric-copy">
                <span>Water Temperature</span>
                <strong>{currentTemp.toFixed(1)} °C</strong>
                <div>
                  <b>Optimal:</b> 26.0 – 32.0 °C
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon amber">
                <Gauge className="size-4" />
              </div>
              <div className="metric-copy">
                <span>Turbidity</span>
                <strong>{currentTurb.toFixed(1)} NTU</strong>
                <div>
                  <b>Target:</b> 25.0 – 50.0 NTU
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon violet">
                <Waves className="size-4" />
              </div>
              <div className="metric-copy">
                <span>Estimated Dissolved Oxygen</span>
                <strong className={currentDo < 5.0 ? 'text-destructive' : 'text-primary'}>
                  {currentDo.toFixed(2)} mg/L
                </strong>
                <div>
                  <Badge status={qualityStatus} />
                </div>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon blue">
                <Wind className="size-4" />
              </div>
              <div className="metric-copy">
                <span>Aerator Status & Mode</span>
                <strong className={aeratorState === 'ON' ? 'text-sky-400' : 'text-slate-400'}>
                  {aeratorState}
                </strong>
                <div>
                  <b>Mode:</b> {controlMode}
                </div>
              </div>
            </div>
          </section>

          {/* Main 2-Column Dashboard Layout */}
          <div className="dashboard-grid lower">
            {/* Left Column: Live Time Series Chart */}
            <div className="panel signal-panel">
              <div className="panel-header">
                <div>
                  <h2>{activePond.name} Telemetry</h2>
                  <p>Streaming water sensors & ML Dissolved Oxygen inference</p>
                </div>
              </div>
              <LiveTimeSeries pond={activePond} mode={simMode} />
            </div>

            {/* Right Column: Aerator Controls & ML Intelligence */}
            <div className="flex flex-col gap-3">
              {/* Aerator Control Panel */}
              <div className="panel p-5">
                <div className="eyebrow mb-1">AERATOR CONTROL CENTER</div>
                <h2 className="text-base font-bold text-foreground mb-4">Relay Switch & Thresholds</h2>

                <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-slate-900/60 mb-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">Control Mode</span>
                    <strong className="text-sm font-mono text-primary">{controlMode}</strong>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      className={`button ${controlMode === 'AUTO' ? 'primary' : 'ghost'} text-xs`}
                      onClick={() => handleToggleMode('AUTO')}
                      disabled={actionLoading}
                    >
                      AUTOMATIC
                    </button>
                    <button
                      className={`button ${controlMode === 'MANUAL' ? 'primary' : 'ghost'} text-xs`}
                      onClick={() => handleToggleMode('MANUAL')}
                      disabled={actionLoading}
                    >
                      MANUAL
                    </button>
                  </div>
                </div>

                {/* Manual Aerator Toggle Buttons */}
                <div className="flex flex-col gap-2 mb-4">
                  <div className="text-xs text-muted-foreground">Manual Override Commands</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={`button ${aeratorState === 'ON' ? 'primary' : 'secondary'} full`}
                      onClick={() => handleManualAerator('ON')}
                      disabled={actionLoading}
                    >
                      <Zap className="size-4" /> TURN ON AERATOR
                    </button>
                    <button
                      className={`button ${aeratorState === 'OFF' ? 'danger' : 'secondary'} full`}
                      onClick={() => handleManualAerator('OFF')}
                      disabled={actionLoading}
                    >
                      <CircleStop className="size-4" /> TURN OFF AERATOR
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-white/10 bg-card text-xs space-y-2">
                  <div className="flex justify-between text-muted-foreground font-mono">
                    <span>Low DO Trigger:</span>
                    <strong className="text-destructive">5.00 mg/L</strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground font-mono">
                    <span>Recovery Target:</span>
                    <strong className="text-primary">6.00 mg/L</strong>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-white/10">
                    Hysteresis prevents rapid ON/OFF relay flapping around thresholds.
                  </p>
                </div>
              </div>

              {/* AI Inference & Hypoxia Assessment */}
              <div className="panel ai-panel">
                <div className="ai-heading">
                  <div className="ai-icon">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <div className="eyebrow">ML DO REGRESSION MODEL</div>
                    <h2>
                      {currentDo < 5.0
                        ? 'CRITICAL HYPOXIA WARNING'
                        : currentDo < 6.0
                        ? 'SUB-OPTIMAL OXYGEN'
                        : 'OPTIMAL WATER PARAMETERS'}
                    </h2>
                  </div>
                </div>
                <p className="ai-copy">
                  ML model inferred <strong>{currentDo.toFixed(2)} mg/L DO</strong> from{' '}
                  {currentTemp.toFixed(1)}°C water temp and {currentTurb.toFixed(1)} NTU turbidity.
                </p>

                <div className="evidence">
                  <div className="evidence-row">
                    <span>Temperature Contribution:</span>
                    <strong>-{(currentTemp * 0.12).toFixed(2)} mg/L</strong>
                  </div>
                  <div className="evidence-row">
                    <span>Turbidity BOD Impact:</span>
                    <strong>-{(currentTurb * 0.02).toFixed(2)} mg/L</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function MachSenseApp({ initialRole }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<Role | null>(initialRole ?? null)
  const [liveStatus, setLiveStatus] = useState<SystemStatus | undefined>(undefined)

  useEffect(() => {
    // Poll or subscribe to status for landing page visualizer
    fetchSystemStatus().then(setLiveStatus).catch(() => {})
  }, [])

  useEffect(() => {
    const stored =
      typeof window !== 'undefined'
        ? (sessionStorage.getItem('machsense-role') as Role | null)
        : null
    if (pathname === '/login' || pathname === '/') return
    const requested = pathname.startsWith('/admin') ? 'admin' : 'engineer'
    if (stored !== requested) router.replace('/login')
    else setRole(stored)
  }, [pathname, router])

  if (pathname === '/') return <Landing liveStatus={liveStatus} />
  if (pathname === '/login') return <Login />
  if (!role)
    return (
      <main className="login-page">
        <div className="login-card">
          <p>Checking demo session…</p>
        </div>
      </main>
    )

  return <Workspace role={role} />
}
