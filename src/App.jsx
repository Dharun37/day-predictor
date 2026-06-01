import React, { useState, useEffect, Suspense, lazy } from 'react'
import './App.css'

// Asynchronously load the heavy Three.js background canvas
const LightPillar = lazy(() => import('./components/LightPillar/LightPillar'))

const funnyTexts = [
  "Calibrating Quantum Engine...",
  "Contacting Future Datacenter...",
  "Uploading your brain to cloud...",
  "AI is thinking very hard...",
  "Seeing Zomato for discounts...",
  "Aligning days with universe..."
]

const nextDayMap = {
  monday: "Tuesday",
  tuesday: "Wednesday",
  wednesday: "Thursday",
  thursday: "Friday",
  friday: "Saturday",
  saturday: "Sunday",
  sunday: "Monday"
}

// Isolated Telemetry Loader to encapsulate interval-based rendering updates.
// This prevents the parent App component (and select boxes/buttons) from re-rendering.
const TelemetryLoader = React.memo(({ funnyTexts, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let count = 0
    const intervalId = setInterval(() => {
      if (count < funnyTexts.length) {
        setProgress(((count + 1) / funnyTexts.length) * 100)
        setStepIndex(count)
        count++
      } else {
        clearInterval(intervalId)
        onComplete()
      }
    }, 1200)

    return () => clearInterval(intervalId)
  }, [funnyTexts, onComplete])

  return (
    <div className="loader-container">
      <div className="orbital-ring">
        <div className="orbital-planet"></div>
      </div>
      
      <div className="telemetry-text">
        {funnyTexts[stepIndex]}
      </div>

      <div className="progress-container">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  )
})

function App() {
  const [today, setToday] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [prediction, setPrediction] = useState("")

  // Real-time WebGL Telemetry State
  const [qualityTier, setQualityTier] = useState("adaptive")
  const [currentFps, setCurrentFps] = useState(0)
  const [activeQuality, setActiveQuality] = useState("high")

  const startTemporalProjection = () => {
    if (!today) {
      setError("Please select today's day to proceed")
      return
    }

    setError("")
    setPrediction("")
    setLoading(true)
  }

  // Memoized complete callback to prevent TelemetryLoader recreation
  const handleTelemetryComplete = React.useCallback(() => {
    setLoading(false)
    setPrediction(nextDayMap[today])
  }, [today])

  // Memoized FPS listener callback
  const handleFpsUpdate = React.useCallback((fps, qLevel) => {
    setCurrentFps(fps)
    setActiveQuality(qLevel)
  }, [])

  return (
    <>
      <div className="background-pillar-wrapper">
        <Suspense fallback={
          <div className="light-pillar-skeleton">
            <div className="skeleton-glow-top"></div>
            <div className="skeleton-glow-bottom"></div>
          </div>
        }>
          <LightPillar
            topColor="#5227FF"
            bottomColor="#FF9FFC"
            intensity={1}
            rotationSpeed={0.3}
            glowAmount={0.002}
            pillarWidth={3}
            pillarHeight={0.4}
            noiseIntensity={0.5}
            pillarRotation={25}
            interactive={false}
            mixBlendMode="screen"
            quality={qualityTier}
            onFpsUpdate={handleFpsUpdate}
          />
        </Suspense>
      </div>

      {/* Floating Performance Control HUD */}
      <div className="performance-hud">
        <div className="hud-header">
          <div className="hud-title-group">
            <span className="hud-indicator-dot"></span>
            <span className="hud-title">Quantum Engine Telemetry</span>
          </div>
          <span className={`hud-fps ${currentFps < 45 ? 'fps-low' : 'fps-high'}`}>
            {qualityTier === 'eco' ? 'OFF' : `${currentFps} FPS`}
          </span>
        </div>
        <div className="hud-body">
          <div className="hud-status">
            <span className="status-label">Active Quality:</span>
            <span className={`status-val text-${activeQuality}`}>
              {qualityTier === 'eco' ? 'ECO MODE (Static)' : `${activeQuality.toUpperCase()}${qualityTier === 'adaptive' ? ' (Auto)' : ''}`}
            </span>
          </div>
          <div className="hud-controls">
            <button
              className={`hud-btn ${qualityTier === 'adaptive' ? 'active' : ''}`}
              onClick={() => setQualityTier('adaptive')}
              title="Dynamically throttle WebGL settings to lock 60FPS"
            >
              Auto
            </button>
            <button
              className={`hud-btn ${qualityTier === 'high' ? 'active' : ''}`}
              onClick={() => setQualityTier('high')}
              title="Lock to maximum shader steps (80 iterations)"
            >
              High
            </button>
            <button
              className={`hud-btn ${qualityTier === 'medium' ? 'active' : ''}`}
              onClick={() => setQualityTier('medium')}
              title="Lock to balanced performance (40 iterations)"
            >
              Mid
            </button>
            <button
              className={`hud-btn ${qualityTier === 'low' ? 'active' : ''}`}
              onClick={() => setQualityTier('low')}
              title="Lock to low resources (20 iterations, 0.5x resolution)"
            >
              Low
            </button>
            <button
              className={`hud-btn eco-btn ${qualityTier === 'eco' ? 'active' : ''}`}
              onClick={() => setQualityTier('eco')}
              title="Disable 3D rendering. Run GPU-less CSS fallbacks"
            >
              Eco
            </button>
          </div>
        </div>
      </div>

      <div className="app-container">
        <div className="app-card">
          <h1 className="app-title">Temporal Engine</h1>
          <p className="app-subtitle">
            Over-engineered predictive algorithms for immediate 100% accurate weekly calculations.
          </p>

          <div className="select-wrapper">
            <select
              id="daySelect"
              value={today}
              disabled={loading}
              onChange={(e) => {
                setToday(e.target.value)
                setError("")
              }}
            >
              <option value="" disabled hidden>Select today's day</option>
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>

          <button
            className="predict-btn"
            onClick={startTemporalProjection}
            disabled={loading}
          >
            {loading ? "Projecting Temporal State..." : "Predict Next Day"}
          </button>

          {error && <span className="error-msg">{error}</span>}

          {loading && (
            <TelemetryLoader 
              funnyTexts={funnyTexts} 
              onComplete={handleTelemetryComplete} 
            />
          )}

          {prediction && !loading && (
            <div className="result-card">
              <span className="result-label">Predicted Tomorrow:</span>
              <span className="result-val">{prediction}</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default App
