import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

// ============================================
// TYPES & INTERFACES
// ============================================

type TestPhase = 
  | 'intro'
  | 'calibration-name'
  | 'calibration-handsize'
  | 'calibration-grip'
  | 'calibration-thumbrest'
  | 'reach-test-instructions'
  | 'reach-test'
  | 'pain-test-instructions'
  | 'pain-test'
  | 'pain-question'
  | 'results'

type HandSize = 'small' | 'medium' | 'large'
type GripMode = 'one-hand-right' | 'one-hand-left' | 'two-hand-right' | 'two-hand-left'

interface ZoneData {
  zoneId: string
  screenX: number
  screenY: number
  distanceFromRest: number
  tapTime: number
  absoluteTime: number
  missedAttempts: number
  painReported: boolean
  painScore: number
  tapOrder: number
}

interface PainComparison {
  zoneA: string
  zoneB: string
  result: 'more' | 'less' | 'same'
}

interface ExportData {
  userName: string
  handSize: HandSize | null
  gripMode: GripMode | null
  thumbRestZone: string | null
  device: {
    model: string
    screenWidth: number
    screenHeight: number
    pixelDensity?: number
  }
  zones: ZoneData[]
  averageTapTime: number
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateRandomZoneSequence(rows: number, cols: number): string[] {
  const zones: string[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      zones.push(`${String.fromCharCode(65 + col)}${row + 1}`)
    }
  }
  for (let i = zones.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zones[i], zones[j]] = [zones[j], zones[i]]
  }
  return zones
}

function selectPainTestZones(rows: number, cols: number): string[] {
  // Select representative zones: corners, edges, center
  return [
    'A1', // top-left
    'C1', // top-right
    'B3', // upper-center
    'A4', // middle-left
    'C4', // middle-right
    'B5', // lower-center
    'A6', // bottom-left
    'C6', // bottom-right
  ]
}

function calculateZonePosition(
  zoneId: string,
  screenWidth: number,
  screenHeight: number,
  rows: number,
  cols: number
): { x: number, y: number } {
  const col = zoneId.charCodeAt(0) - 65
  const row = parseInt(zoneId.substring(1)) - 1
  
  const zoneWidth = screenWidth / cols
  const zoneHeight = screenHeight / rows
  
  return {
    x: (col * zoneWidth) + (zoneWidth / 2),
    y: (row * zoneHeight) + (zoneHeight / 2)
  }
}

function calculateDistance(p1: { x: number, y: number }, p2: { x: number, y: number }): number {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy)
}

function calculatePainScores(painComparisons: PainComparison[]): Map<string, number> {
  const scores = new Map<string, number>()
  if (painComparisons.length === 0) return scores
  
  scores.set(painComparisons[0].zoneA, 5)
  
  for (const comp of painComparisons) {
    const scoreA = scores.get(comp.zoneA) || 5
    let scoreB: number
    if (comp.result === 'more') scoreB = Math.min(scoreA + 3, 10)
    else if (comp.result === 'less') scoreB = Math.max(scoreA - 3, 0)
    else scoreB = scoreA
    scores.set(comp.zoneB, scoreB)
  }
  
  return scores
}

function getDeviceInfo() {
  const userAgent = navigator.userAgent
  let model = 'Unknown'
  if (userAgent.includes('iPhone')) model = 'iPhone'
  else if (userAgent.includes('iPad')) model = 'iPad'
  else if (userAgent.includes('Android')) model = 'Android'
  
  return {
    model,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelDensity: window.devicePixelRatio * 96
  }
}

function exportToCSV(data: ExportData): void {
  const date = new Date().toISOString().split('T')[0]
  const deviceName = data.device.model.replace(/\s+/g, '')
  const filename = `thumbreach_${data.userName}_${deviceName}_${date}.csv`
  
  const metadata = [
    '# ThumbReach Test Results',
    `# Date: ${new Date().toISOString()}`,
    `# User: ${data.userName}`,
    `# Hand Size: ${data.handSize}`,
    `# Grip: ${data.gripMode}`,
    `# Thumb Rest: ${data.thumbRestZone}`,
    `# Device: ${data.device.model}`,
    `# Screen: ${data.device.screenWidth}x${data.device.screenHeight}px`,
    `# Average Tap Time: ${Math.round(data.averageTapTime)}ms`,
    ''
  ].join('\n')
  
  const headers = 'zone_id,screen_x,screen_y,distance_from_rest,tap_time_ms,pain_reported,pain_score,tap_order'
  const rows = data.zones.map((z: ZoneData) => 
    `${z.zoneId},${Math.round(z.screenX)},${Math.round(z.screenY)},${Math.round(z.distanceFromRest)},${z.tapTime},${z.painReported},${z.painScore},${z.tapOrder}`
  ).join('\n')
  
  const csv = `${metadata}${headers}\n${rows}`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ThumbReachMapper() {
  const ROWS = 6
  const COLS = 3
  const TOTAL_ZONES = ROWS * COLS
  
  const [currentPhase, setCurrentPhase] = useState<TestPhase>('intro')
  
  // Calibration
  const [userName, setUserName] = useState('')
  const [handSize, setHandSize] = useState<HandSize | null>(null)
  const [gripMode, setGripMode] = useState<GripMode | null>(null)
  const [thumbRestZone, setThumbRestZone] = useState<string | null>(null)
  
  // Reach test
  const [zoneSequence, setZoneSequence] = useState<string[]>([])
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0)
  const [zoneData, setZoneData] = useState<ZoneData[]>([])
  const [testStartTime, setTestStartTime] = useState<number>(0)
  const [lastTapTime, setLastTapTime] = useState<number>(0)
  
  // Pain test
  const [painTestZones, setPainTestZones] = useState<string[]>([])
  const [currentPainIndex, setCurrentPainIndex] = useState(0)
  const [currentPainZone, setCurrentPainZone] = useState<string | null>(null)
  const [painfulZones, setPainfulZones] = useState<string[]>([])
  const [painComparisons, setPainComparisons] = useState<PainComparison[]>([])
  const [zoneTapped, setZoneTapped] = useState(false)
  
  const [deviceInfo] = useState(getDeviceInfo())
  const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (containerRef.current) {
      setScreenDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      })
    }
  }, [currentPhase])
  
  // Start reach test
  const startReachTest = () => {
    const sequence = generateRandomZoneSequence(ROWS, COLS)
    setZoneSequence(sequence)
    setCurrentZoneIndex(0)
    setTestStartTime(Date.now())
    setLastTapTime(Date.now())
    setZoneData([])
    setCurrentPhase('reach-test')
  }
  
  // Handle reach test tap
  const handleReachTap = (tappedZoneId: string) => {
    const expectedZoneId = zoneSequence[currentZoneIndex]
    if (tappedZoneId !== expectedZoneId) return // Must tap correct zone
    
    const now = Date.now()
    const tapTime = currentZoneIndex === 0 ? 0 : now - lastTapTime
    
    const position = calculateZonePosition(tappedZoneId, screenDimensions.width, screenDimensions.height, ROWS, COLS)
    const restPosition = thumbRestZone 
      ? calculateZonePosition(thumbRestZone, screenDimensions.width, screenDimensions.height, ROWS, COLS)
      : position
    const distance = calculateDistance(position, restPosition)
    
    const zoneRecord: ZoneData = {
      zoneId: expectedZoneId,
      screenX: position.x,
      screenY: position.y,
      distanceFromRest: distance,
      tapTime,
      absoluteTime: now - testStartTime,
      missedAttempts: 0,
      painReported: false,
      painScore: 0,
      tapOrder: currentZoneIndex + 1
    }
    
    setZoneData(prev => [...prev, zoneRecord])
    setLastTapTime(now)
    
    if (currentZoneIndex + 1 < TOTAL_ZONES) {
      setCurrentZoneIndex(prev => prev + 1)
    } else {
      // Reach test complete - start pain test
      const painZones = selectPainTestZones(ROWS, COLS)
      setPainTestZones(painZones)
      setCurrentPainIndex(0)
      setCurrentPhase('pain-test-instructions')
    }
  }
  
  // Start pain test
  const startPainTest = () => {
    setCurrentPainZone(painTestZones[0])
    setZoneTapped(false)
    setCurrentPhase('pain-test')
  }
  
  // Handle pain test tap
  const handlePainTap = (tappedZoneId: string) => {
    if (tappedZoneId === currentPainZone && !zoneTapped) {
      setZoneTapped(true)
      setCurrentPhase('pain-question')
    }
  }
  
  // Handle pain response
  const handlePainResponse = (hasPain: boolean) => {
    if (!currentPainZone) return
    
    if (hasPain) {
      setPainfulZones(prev => [...prev, currentPainZone])
    }
    
    // Move to next zone or finish
    if (currentPainIndex + 1 < painTestZones.length) {
      setCurrentPainIndex(prev => prev + 1)
      setCurrentPainZone(painTestZones[currentPainIndex + 1])
      setZoneTapped(false)
      setCurrentPhase('pain-test')
    } else {
      finishTests()
    }
  }
  
  // Handle pain comparison
  const handlePainComparison = (result: 'more' | 'less' | 'same') => {
    if (!currentPainZone) return
    
    const previousPainful = painfulZones[painfulZones.length - 1]
    setPainComparisons(prev => [...prev, {
      zoneA: previousPainful,
      zoneB: currentPainZone,
      result
    }])
    setPainfulZones(prev => [...prev, currentPainZone])
    
    if (currentPainIndex + 1 < painTestZones.length) {
      setCurrentPainIndex(prev => prev + 1)
      setCurrentPainZone(painTestZones[currentPainIndex + 1])
      setZoneTapped(false)
      setCurrentPhase('pain-test')
    } else {
      finishTests()
    }
  }
  
  // Finish and generate results
  const finishTests = () => {
    const painScores = calculatePainScores(painComparisons)
    const updatedZones = zoneData.map(z => ({
      ...z,
      painReported: painfulZones.indexOf(z.zoneId) !== -1,
      painScore: painScores.get(z.zoneId) || 0
    }))
    setZoneData(updatedZones)
    setCurrentPhase('results')
  }
  
  // Download functions
  const downloadProgress = () => {
    const tapTimes = zoneData.slice(1).map(z => z.tapTime)
    const avgTapTime = tapTimes.length > 0 ? tapTimes.reduce((a, b) => a + b) / tapTimes.length : 0
    
    exportToCSV({
      userName,
      handSize,
      gripMode,
      thumbRestZone,
      device: deviceInfo,
      zones: zoneData,
      averageTapTime: avgTapTime
    })
  }
  
  const downloadResults = () => {
    const tapTimes = zoneData.slice(1).map(z => z.tapTime)
    const avgTapTime = tapTimes.length > 0 ? tapTimes.reduce((a, b) => a + b) / tapTimes.length : 0
    
    exportToCSV({
      userName,
      handSize,
      gripMode,
      thumbRestZone,
      device: deviceInfo,
      zones: zoneData,
      averageTapTime: avgTapTime
    })
  }
  
  // Heatmap color
  const getZoneColor = (zoneId: string): string => {
    const zone = zoneData.find(z => z.zoneId === zoneId)
    if (!zone) return '#E5E5E5'
    
    const tapTimes = zoneData.filter(z => z.tapTime > 0).map(z => z.tapTime)
    const avgTapTime = tapTimes.reduce((a, b) => a + b) / tapTimes.length
    
    const reachScore = zone.tapTime === 0 ? 50 : Math.max(0, 50 - ((zone.tapTime - avgTapTime) / avgTapTime * 50))
    const painScore = zone.painReported ? Math.max(0, 50 - (zone.painScore * 5)) : 50
    const totalScore = reachScore + painScore
    
    if (totalScore >= 80) return '#4CAF50'
    if (totalScore >= 50) return '#FFC107'
    return '#F44336'
  }
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div ref={containerRef} style={styles.container}>
      {/* INTRO */}
      {currentPhase === 'intro' && (
        <div style={styles.phase}>
          <h1 style={styles.title}>ThumbReach & Pain Mapper</h1>
          <p style={styles.description}>
            This test measures how easy it is to reach different areas of your screen.
          </p>
          <p style={styles.description}>Duration: ~2-3 minutes</p>
          <button style={styles.button} onClick={() => setCurrentPhase('calibration-name')}>
            Start Test
          </button>
        </div>
      )}
      
      {/* NAME */}
      {currentPhase === 'calibration-name' && (
        <div style={styles.phase}>
          <h2 style={styles.subtitle}>What's your name?</h2>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={styles.input}
            placeholder="Enter your name"
          />
          <button 
            style={styles.button} 
            onClick={() => setCurrentPhase('calibration-handsize')}
            disabled={!userName.trim()}
          >
            Next
          </button>
        </div>
      )}
      
      {/* HAND SIZE */}
      {currentPhase === 'calibration-handsize' && (
        <div style={styles.phase}>
          <h2 style={styles.subtitle}>Measure your hand span</h2>
          <p style={styles.smallText}>(thumb to pinky, fully spread)</p>
          
          <div style={styles.optionGroup}>
            <button 
              style={styles.option}
              onClick={() => {
                setHandSize('small')
                setTimeout(() => setCurrentPhase('calibration-grip'), 200)
              }}
            >
              Small<br/><span style={styles.smallText}>under 7.5" / 19cm</span>
            </button>
            <button 
              style={styles.option}
              onClick={() => {
                setHandSize('medium')
                setTimeout(() => setCurrentPhase('calibration-grip'), 200)
              }}
            >
              Medium<br/><span style={styles.smallText}>7.5-8.5" / 19-21.5cm</span>
            </button>
            <button 
              style={styles.option}
              onClick={() => {
                setHandSize('large')
                setTimeout(() => setCurrentPhase('calibration-grip'), 200)
              }}
            >
              Large<br/><span style={styles.smallText}>over 8.5" / 21.5cm</span>
            </button>
          </div>
        </div>
      )}
      
      {/* GRIP */}
      {currentPhase === 'calibration-grip' && (
        <div style={styles.phase}>
          <h2 style={styles.subtitle}>How are you holding your phone?</h2>
          
          <div style={styles.optionGroup}>
            <button 
              style={styles.option}
              onClick={() => {
                setGripMode('one-hand-right')
                setTimeout(() => setCurrentPhase('calibration-thumbrest'), 200)
              }}
            >
              One hand - Right thumb
            </button>
            <button 
              style={styles.option}
              onClick={() => {
                setGripMode('one-hand-left')
                setTimeout(() => setCurrentPhase('calibration-thumbrest'), 200)
              }}
            >
              One hand - Left thumb
            </button>
            <button 
              style={styles.option}
              onClick={() => {
                setGripMode('two-hand-right')
                setTimeout(() => setCurrentPhase('calibration-thumbrest'), 200)
              }}
            >
              Two hands - Right thumb
            </button>
            <button 
              style={styles.option}
              onClick={() => {
                setGripMode('two-hand-left')
                setTimeout(() => setCurrentPhase('calibration-thumbrest'), 200)
              }}
            >
              Two hands - Left thumb
            </button>
          </div>
        </div>
      )}
      
      {/* THUMB REST */}
      {currentPhase === 'calibration-thumbrest' && (
        <div style={styles.fullscreen}>
          <div style={styles.instructionOverlay}>
            <h2 style={styles.subtitle}>Where does your thumb naturally hover?</h2>
            <p style={styles.smallText}>Tap the zone closest to your thumb's resting position</p>
          </div>
          
          <div style={styles.gridFullscreen}>
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const zoneId = `${String.fromCharCode(65 + col)}${row + 1}`
                return (
                  <button
                    key={zoneId}
                    style={styles.zoneWithLabel}
                    onClick={() => {
                      setThumbRestZone(zoneId)
                      setTimeout(() => setCurrentPhase('reach-test-instructions'), 300)
                    }}
                  >
                    {zoneId}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
      
      {/* REACH TEST INSTRUCTIONS */}
      {currentPhase === 'reach-test-instructions' && (
        <div style={styles.phase}>
          <h2 style={styles.subtitle}>Part 1: Reach Test</h2>
          <p style={styles.description}>Tap each highlighted zone as it appears.</p>
          <p style={styles.description}>Try to be quick but comfortable.</p>
          <p style={styles.smallText}>We'll ask about pain in a separate test afterwards.</p>
          <button style={styles.button} onClick={startReachTest}>
            Start Reach Test
          </button>
        </div>
      )}
      
      {/* REACH TEST */}
      {currentPhase === 'reach-test' && (
        <div style={styles.fullscreen}>
          <div style={styles.progress}>
            {currentZoneIndex + 1} / {TOTAL_ZONES}
          </div>
          <button style={styles.downloadBtn} onClick={downloadProgress}>
            Download Progress
          </button>
          
          <div style={styles.gridFullscreen}>
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const zoneId = `${String.fromCharCode(65 + col)}${row + 1}`
                const isActive = zoneId === zoneSequence[currentZoneIndex]
                const isTapped = zoneData.some(z => z.zoneId === zoneId)
                
                return (
                  <motion.button
                    key={zoneId}
                    style={{
                      ...styles.zoneWithLabel,
                      ...(isActive ? styles.zoneActive : {}),
                      ...(isTapped ? styles.zoneTapped : {})
                    }}
                    animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    onClick={() => handleReachTap(zoneId)}
                  >
                    <span style={styles.zoneLabel}>{zoneId}</span>
                    {isActive && <span style={styles.zonePulse}>●</span>}
                  </motion.button>
                )
              })
            )}
          </div>
        </div>
      )}
      
      {/* PAIN TEST INSTRUCTIONS */}
      {currentPhase === 'pain-test-instructions' && (
        <div style={styles.phase}>
          <h2 style={styles.subtitle}>Part 2: Pain Test</h2>
          <p style={styles.description}>Now we'll test specific zones for discomfort.</p>
          <p style={styles.description}>We'll ask you to tap a zone, then tell us if it hurt.</p>
          <p style={styles.smallText}>This helps us map painful areas separately from reach difficulty.</p>
          <button style={styles.button} onClick={startPainTest}>
            Start Pain Test
          </button>
        </div>
      )}
      
      {/* PAIN TEST */}
      {currentPhase === 'pain-test' && (
        <div style={styles.fullscreen}>
          <div style={styles.instructionOverlay}>
            <h3 style={styles.subtitle}>Tap zone {currentPainZone}</h3>
            <p style={styles.smallText}>Zone {currentPainIndex + 1} of {painTestZones.length}</p>
          </div>
          
          <div style={styles.gridFullscreen}>
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const zoneId = `${String.fromCharCode(65 + col)}${row + 1}`
                const isTarget = zoneId === currentPainZone
                
                return (
                  <motion.button
                    key={zoneId}
                    style={{
                      ...styles.zoneWithLabel,
                      ...(isTarget ? styles.zonePainTarget : {})
                    }}
                    animate={isTarget ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    onClick={() => handlePainTap(zoneId)}
                  >
                    <span style={styles.zoneLabel}>{zoneId}</span>
                    {isTarget && <span style={styles.zonePulse}>●</span>}
                  </motion.button>
                )
              })
            )}
          </div>
        </div>
      )}
      
      {/* PAIN QUESTION */}
      {currentPhase === 'pain-question' && (
        <div style={styles.phase}>
          <h2 style={styles.subtitle}>Zone {currentPainZone}</h2>
          
          {painfulZones.length === 0 ? (
            <>
              <p style={styles.description}>Did that zone cause any discomfort?</p>
              <div style={styles.buttonGroup}>
                <button style={styles.button} onClick={() => handlePainResponse(true)}>
                  Yes, it hurt
                </button>
                <button style={{...styles.button, ...styles.buttonSecondary}} onClick={() => handlePainResponse(false)}>
                  No discomfort
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={styles.description}>
                Was {currentPainZone} MORE, LESS, or SAME pain as {painfulZones[painfulZones.length - 1]}?
              </p>
              <div style={styles.buttonGroup}>
                <button style={styles.button} onClick={() => handlePainComparison('more')}>
                  More painful
                </button>
                <button style={styles.button} onClick={() => handlePainComparison('same')}>
                  Same pain
                </button>
                <button style={styles.button} onClick={() => handlePainComparison('less')}>
                  Less painful
                </button>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* RESULTS */}
      {currentPhase === 'results' && (
        <div style={styles.phase}>
          <h2 style={styles.subtitle}>Test Complete! ✓</h2>
          
          <h3 style={styles.sectionTitle}>Your Reachability Map</h3>
          <div style={styles.heatmapGrid}>
            {Array.from({ length: ROWS }).map((_, row) =>
              Array.from({ length: COLS }).map((_, col) => {
                const zoneId = `${String.fromCharCode(65 + col)}${row + 1}`
                return (
                  <div
                    key={zoneId}
                    style={{
                      ...styles.heatmapZone,
                      backgroundColor: getZoneColor(zoneId)
                    }}
                    title={zoneId}
                  >
                    <span style={styles.heatmapLabel}>{zoneId}</span>
                  </div>
                )
              })
            )}
          </div>
          
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <div style={{...styles.legendColor, backgroundColor: '#4CAF50'}} />
              <span>Easy + comfortable</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{...styles.legendColor, backgroundColor: '#FFC107'}} />
              <span>Moderate or some pain</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{...styles.legendColor, backgroundColor: '#F44336'}} />
              <span>Difficult or painful</span>
            </div>
          </div>
          
          <div style={styles.metadata}>
            <p>Thumb rest: {thumbRestZone}</p>
            <p>Hand size: {handSize}</p>
            <p>Device: {deviceInfo.model}</p>
          </div>
          
          <div style={styles.buttonGroup}>
            <button style={styles.button} onClick={downloadResults}>
              Download Data
            </button>
            <button style={{...styles.button, ...styles.buttonSecondary}} onClick={() => window.location.reload()}>
              New Test
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// STYLES
// ============================================

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden'
  },
  phase: {
    maxWidth: '500px',
    textAlign: 'center',
    padding: '40px 20px'
  },
  fullscreen: {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  instructionOverlay: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '16px 24px',
    borderRadius: '12px',
    textAlign: 'center',
    maxWidth: '90%'
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '16px',
    color: '#333'
  },
  subtitle: {
    fontSize: '22px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#333'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginTop: '24px',
    marginBottom: '12px',
    color: '#333'
  },
  description: {
    fontSize: '16px',
    lineHeight: '1.5',
    marginBottom: '12px',
    color: '#666'
  },
  smallText: {
    fontSize: '14px',
    color: '#999'
  },
  button: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: '#007AFF',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '20px',
    marginRight: '8px',
    transition: 'all 0.2s'
  },
  buttonSecondary: {
    backgroundColor: '#666'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px',
    alignItems: 'center'
  },
  input: {
    width: '100%',
    maxWidth: '300px',
    padding: '12px',
    fontSize: '16px',
    border: '2px solid #DDD',
    borderRadius: '8px',
    marginTop: '16px'
  },
  optionGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '20px'
  },
  option: {
    padding: '18px',
    fontSize: '16px',
    backgroundColor: 'white',
    border: '2px solid #DDD',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  gridFullscreen: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(6, 1fr)',
    gap: '4px',
    flex: 1,
    padding: '4px',
    width: '100%'
  },
  zoneWithLabel: {
    backgroundColor: 'white',
    border: '2px solid #DDD',
    borderRadius: '8px',
    fontSize: '20px',
    fontWeight: '600',
    cursor: 'pointer',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '0'
  },
  zoneLabel: {
    fontSize: '16px',
    color: '#666',
    position: 'absolute',
    top: '8px',
    left: '8px'
  },
  zonePulse: {
    fontSize: '48px',
    color: '#007AFF'
  },
  zoneActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
    borderWidth: '3px'
  },
  zoneTapped: {
    backgroundColor: '#F0F0F0',
    borderColor: '#CCC'
  },
  zonePainTarget: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: '3px'
  },
  progress: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    fontSize: '18px',
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '12px 20px',
    borderRadius: '8px',
    zIndex: 10
  },
  downloadBtn: {
    position: 'absolute',
    top: '70px',
    right: '20px',
    padding: '10px 16px',
    fontSize: '14px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    zIndex: 10
  },
  heatmapGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(6, 1fr)',
    gap: '4px',
    width: '100%',
    maxWidth: '300px',
    aspectRatio: '1/2',
    margin: '0 auto'
  },
  heatmapZone: {
    borderRadius: '6px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40px'
  },
  heatmapLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: 'rgba(0, 0, 0, 0.6)'
  },
  legend: {
    marginTop: '20px',
    textAlign: 'left'
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
    fontSize: '14px'
  },
  legendColor: {
    width: '20px',
    height: '20px',
    borderRadius: '4px'
  },
  metadata: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6'
  }
}