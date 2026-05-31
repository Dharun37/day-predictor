import React, { useState } from 'react'
import LightPillar from './components/LightPillar/LightPillar'
import './App.css'

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

function App() {
  const [today, setToday] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [prediction, setPrediction] = useState("")

  const startTemporalProjection = () => {
    if (!today) {
      setError("Please select today's day to proceed")
      return
    }

    setError("")
    setPrediction("")
    setLoading(true)
    setStepIndex(0)
    setProgress(0)

    let count = 0
    const intervalId = setInterval(() => {
      if (count < funnyTexts.length) {
        setProgress(((count + 1) / funnyTexts.length) * 100)
        setStepIndex(count)
        count++
      } else {
        clearInterval(intervalId)
        setLoading(false)
        setPrediction(nextDayMap[today])
      }
    }, 1200)
  }

  return (
    <>
      <div className="background-pillar-wrapper">
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
          quality="high"
        />
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

