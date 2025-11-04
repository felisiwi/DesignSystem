import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { addPropertyControls, ControlType } from 'framer'

// ========================================
// TYPES & INTERFACES
// ========================================

type TestPhase = 
  | 'intro'
  | 'calibration-name'
  | 'calibration-handsize'
  | 'calibration-grip'
  | 'calibration-thumbrest'
  | 'reach-test'
  | 'pain-assessment'
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
  isStruggleZone: boolean
  painReported: boolean
  painScore: number
  tapOrder: number
}

interface PainComparison {
  zoneA: string
  zoneB: string
  result: 'more' | 'less' | 'same'
  timestamp: Date
}

interface TestSession {
  sessionId: string
  timestamp: Date
  testDuration: number
  userName: string
  handSize: HandSize | null
  gripMode: GripMode | null
  thumbRestZone: string | null
  device: {
    model: string
    screenWidth: number
    screenHeight: number
    pixelDensity: number
    viewport: {
      width: number
      height: number
    }
  }
  zones: ZoneData[]
  struggleZones: string[]
  painComparisons: PainComparison[]
  averageTapTime: number
}

interface ThumbReachMapperProps {
  gridRows?: number
  gridColumns?: number
  theme?: 'light' | 'dark'
  showInstructions?: boolean
  onComplete?: (data: TestSession) => void
}

// ========================================
// CONSTANTS
// ========================================

const GRID_ROWS = 6
const GRID_COLUMNS = 3
const TOTAL_ZONES = GRID_ROWS * GRID_COLUMNS

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getZoneId(row: number, col: number): string {
  const columnLetter = String.fromCharCode(65 + col) // A, B, C
  const rowNumber = row + 1 // 1, 2, 3, 4, 5, 6
  return `${columnLetter}${rowNumber}`
}

function generateRandomZoneSequence(): string[] {
  const zones: string[] = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLUMNS; col++) {
      zones.push(getZoneId(row, col))
    }
  }
  // Shuffle array
  for (let i = zones.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [zones[i], zones[j]] = [zones[j], zones[i]]
  }
  return zones
}

function calculateZonePosition(
  zoneId: string,
  screenWidth: number,
  screenHeight: number
): { x: number; y: number } {
  const col = zoneId.charCodeAt(0) - 65 // A=0, B=1, C=2
  const row = parseInt(zoneId.substring(1)) - 1 // 1=0, 2=1, etc.
  
  const zoneWidth = screenWidth / GRID_COLUMNS
  const zoneHeight = screenHeight / GRID_ROWS
  
  const centerX = (col * zoneWidth) + (zoneWidth / 2)
  const centerY = (row * zoneHeight) + (zoneHeight / 2)
  
  return { x: centerX, y: centerY }
}

function calculateDistanceFromRest(
  zonePosition: { x: number; y: number },
  restPosition: { x: number; y: number }
): number {
  const dx = zonePosition.x - restPosition.x
  const dy = zonePosition.y - restPosition.y
  return Math.sqrt(dx * dx + dy * dy)
}

function detectStruggleZones(
  zoneData: ZoneData[],
  averageTapTime: number
): string[] {
  const struggleZones: string[] = []
  
  // Sort zones by tap time (slowest first)
  const sortedBySpeed = [...zoneData].sort((a, b) => b.tapTime - a.tapTime)
  const slowestSix = sortedBySpeed.slice(0, 6).map(z => z.zoneId)
  
  for (const zone of zoneData) {
    const isSlowOutlier = zone.tapTime > (averageTapTime + 1500)
    const hadMissedAttempt = zone.missedAttempts > 0
    const isInSlowestSix = slowestSix.includes(zone.zoneId)
    
    if (isSlowOutlier || hadMissedAttempt || isInSlowestSix) {
      struggleZones.push(zone.zoneId)
    }
  }
  
  return struggleZones
}

function calculatePainScores(
  painComparisons: PainComparison[],
  struggleZones: string[]
): Map<string, number> {
  const painScores = new Map<string, number>()
  
  // Initialize all struggle zones with 0
  struggleZones.forEach(zone => painScores.set(zone, 0))
  
  if (painComparisons.length === 0) {
    return painScores
  }
  
  // Find first zone with pain reported
  const firstPainZone = painComparisons[0]?.zoneA
  if (firstPainZone) {
    painScores.set(firstPainZone, 5) // Baseline score
  }
  
  // Process comparisons
  painComparisons.forEach(comp => {
    const zoneAScore = painScores.get(comp.zoneA) || 0
    let zoneBScore = painScores.get(comp.zoneB) || 0
    
    if (comp.result === 'more') {
      zoneBScore = Math.min(10, zoneAScore + 3)
    } else if (comp.result === 'less') {
      zoneBScore = Math.max(0, zoneAScore - 3)
    } else {
      zoneBScore = zoneAScore
    }
    
    painScores.set(comp.zoneB, zoneBScore)
  })
  
  return painScores
}

function generateHeatmapData(zoneData: ZoneData[]): Map<string, { score: number; color: string }> {
  const heatmap = new Map<string, { score: number; color: string }>()
  
  // Calculate average tap time
  const avgTime = zoneData.reduce((sum, z) => sum + z.tapTime, 0) / zoneData.length
  
  zoneData.forEach(zone => {
    // Reachability score (0-50): faster = higher score
    const reachabilityScore = Math.max(0, 50 - (zone.tapTime / avgTime) * 25)
    
    // Pain score (0-50): no pain = 50, pain = lower
    const painScore = zone.painReported ? Math.max(0, 50 - zone.painScore * 5) : 50
    
    // Combined score
    const combinedScore = (reachabilityScore + painScore) / 2
    
    // Determine color
    let color: string
    if (combinedScore >= 80) {
      color = '#4CAF50' // Green
    } else if (combinedScore >= 50) {
      color = '#FFC107' // Yellow
    } else {
      color = '#F44336' // Red
    }
    
    heatmap.set(zone.zoneId, { score: combinedScore, color })
  })
  
  return heatmap
}

function exportToCSV(sessionData: TestSession): void {
  const lines: string[] = []
  
  // Metadata header
  lines.push('# ThumbReach Test Results')
  lines.push(`# Test Date: ${sessionData.timestamp.toISOString()}`)
  lines.push(`# User: ${sessionData.userName}`)
  lines.push(`# Hand Size: ${sessionData.handSize || 'Not specified'}`)
  lines.push(`# Grip Mode: ${sessionData.gripMode || 'Not specified'}`)
  lines.push(`# Thumb Rest: ${sessionData.thumbRestZone || 'Not specified'}`)
  lines.push(`# Device: ${sessionData.device.model}`)
  lines.push(`# Screen: ${sessionData.device.screenWidth}x${sessionData.device.screenHeight}px`)
  lines.push(`# Pixel Density: ${sessionData.device.pixelDensity} PPI`)
  lines.push(`# Test Duration: ${sessionData.testDuration} seconds`)
  lines.push(`# Average Tap Time: ${sessionData.averageTapTime.toFixed(0)}ms`)
  lines.push(`# Struggle Zones: ${sessionData.struggleZones.join(',')}`)
  const painZones = sessionData.zones.filter(z => z.painReported).map(z => z.zoneId)
  lines.push(`# Pain Reported: ${painZones.join(',')}`)
  lines.push('')
  
  // CSV headers
  lines.push('zone_id,screen_x,screen_y,distance_from_rest,tap_time_ms,absolute_time_ms,missed_attempts,is_struggle_zone,pain_reported,pain_score,tap_order')
  
  // Data rows
  sessionData.zones.forEach(zone => {
    lines.push(
      `${zone.zoneId},${zone.screenX.toFixed(0)},${zone.screenY.toFixed(0)},${zone.distanceFromRest.toFixed(0)},${zone.tapTime},${zone.absoluteTime},${zone.missedAttempts},${zone.isStruggleZone},${zone.painReported},${zone.painScore},${zone.tapOrder}`
    )
  })
  
  // Create download
  const csvContent = lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  
  // Generate filename
  const dateStr = sessionData.timestamp.toISOString().split('T')[0]
  const deviceStr = sessionData.device.model.replace(/\s+/g, '')
  const filename = `thumbreach_${sessionData.userName}_${deviceStr}_${dateStr}.csv`
  
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getDeviceInfo() {
  const width = window.innerWidth
  const height = window.innerHeight
  const pixelDensity = window.devicePixelRatio * 96 // Approximate PPI
  
  // Try to detect device model (basic detection)
  let model = 'Unknown'
  const ua = navigator.userAgent
  if (ua.includes('iPhone')) {
    model = 'iPhone'
  } else if (ua.includes('iPad')) {
    model = 'iPad'
  } else if (ua.includes('Android')) {
    model = 'Android Device'
  }
  
  return {
    model,
    screenWidth: width,
    screenHeight: height,
    pixelDensity: Math.round(pixelDensity),
    viewport: {
      width,
      height
    }
  }
}

// ========================================
// MAIN COMPONENT
// ========================================

export default function ThumbReachMapper({
  gridRows = GRID_ROWS,
  gridColumns = GRID_COLUMNS,
  theme = 'light',
  showInstructions = true,
  onComplete
}: ThumbReachMapperProps) {
  // State
  const [currentPhase, setCurrentPhase] = useState<TestPhase>('intro')
  const [userName, setUserName] = useState('')
  const [handSize, setHandSize] = useState<HandSize | null>(null)
  const [gripMode, setGripMode] = useState<GripMode | null>(null)
  const [thumbRestZone, setThumbRestZone] = useState<string | null>(null)
  const [zoneSequence, setZoneSequence] = useState<string[]>([])
  const [zoneData, setZoneData] = useState<ZoneData[]>([])
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0)
  const [struggleZones, setStruggleZones] = useState<string[]>([])
  const [painComparisons, setPainComparisons] = useState<PainComparison[]>([])
  const [currentPainAssessmentIndex, setCurrentPainAssessmentIndex] = useState(0)
  const [testStartTime, setTestStartTime] = useState<number>(0)
  const [lastTapTime, setLastTapTime] = useState<number>(0)
  const [currentZoneTapAttempts, setCurrentZoneTapAttempts] = useState<Map<string, number>>(new Map())
  const [painAssessmentPhase, setPainAssessmentPhase] = useState<'instructions' | 'tapping' | 'question' | 'comparison'>('instructions')
  const [painZonePairs, setPainZonePairs] = useState<Array<{zone1: string, zone2: string}>>([])
  const [currentPainPairIndex, setCurrentPainPairIndex] = useState(0)
  const [tappedZones, setTappedZones] = useState<string[]>([])
  const [currentTappingZone, setCurrentTappingZone] = useState<'first' | 'second'>('first')
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const deviceInfo = useMemo(() => getDeviceInfo(), [])
  
  // Load progress from localStorage on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem('thumbreach_progress')
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress)
        if (progress.zoneData && progress.zoneData.length > 0 && progress.userName) {
          // Restore all progress data
          setUserName(progress.userName || '')
          setHandSize(progress.handSize || null)
          setGripMode(progress.gripMode || null)
          setThumbRestZone(progress.thumbRestZone || null)
          setZoneData(progress.zoneData || [])
          setCurrentZoneIndex(progress.currentZoneIndex || 0)
          setZoneSequence(progress.zoneSequence || [])
          setTestStartTime(progress.testStartTime || Date.now())
          setLastTapTime(progress.lastTapTime || Date.now())
          
          // If we have a zone sequence, resume the test
          if (progress.zoneSequence && progress.zoneSequence.length > 0) {
            setCurrentPhase('reach-test')
          }
        }
      } catch (e) {
        console.error('Failed to load progress:', e)
        localStorage.removeItem('thumbreach_progress')
      }
    }
  }, [])
  
  // Save progress to localStorage during reach test
  useEffect(() => {
    if (currentPhase === 'reach-test' && zoneData.length > 0) {
      const progress = {
        zoneData,
        currentZoneIndex,
        zoneSequence,
        testStartTime,
        lastTapTime,
        userName,
        handSize,
        gripMode,
        thumbRestZone
      }
      localStorage.setItem('thumbreach_progress', JSON.stringify(progress))
    }
  }, [zoneData, currentZoneIndex, currentPhase, zoneSequence, testStartTime, lastTapTime, userName, handSize, gripMode, thumbRestZone])
  
  // Clear localStorage when test completes or resets
  useEffect(() => {
    if (currentPhase === 'results' || currentPhase === 'intro') {
      localStorage.removeItem('thumbreach_progress')
    }
  }, [currentPhase])
  
  // Calculate zone positions
  const zonePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>()
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        const zoneId = getZoneId(row, col)
        const pos = calculateZonePosition(zoneId, deviceInfo.screenWidth, deviceInfo.screenHeight)
        positions.set(zoneId, pos)
      }
    }
    return positions
  }, [gridRows, gridColumns, deviceInfo])
  
  // Heatmap data
  const heatmapData = useMemo(() => {
    if (zoneData.length === 0) return new Map()
    return generateHeatmapData(zoneData)
  }, [zoneData])
  
  // Handlers
  const handleStartTest = () => {
    setCurrentPhase('calibration-name')
  }
  
  const handleNameNext = () => {
    if (userName.trim()) {
      setCurrentPhase('calibration-handsize')
    }
  }
  
  const handleHandSizeNext = (selectedSize?: HandSize) => {
    const sizeToUse = selectedSize || handSize
    if (sizeToUse) {
      setHandSize(sizeToUse)
      setCurrentPhase('calibration-grip')
    }
  }
  
  const handleGripNext = (selectedMode?: GripMode) => {
    const modeToUse = selectedMode || gripMode
    if (modeToUse) {
      setGripMode(modeToUse)
      setCurrentPhase('calibration-thumbrest')
    }
  }
  
  const handleThumbRestSelect = (zoneId: string) => {
    setThumbRestZone(zoneId)
    // Start reach test
    const sequence = generateRandomZoneSequence()
    setZoneSequence(sequence)
    setCurrentZoneIndex(0)
    setTestStartTime(Date.now())
    setLastTapTime(Date.now())
    setCurrentZoneTapAttempts(new Map())
    setCurrentPhase('reach-test')
  }
  
  const handleZoneTap = (tappedZoneId: string) => {
    const currentZone = zoneSequence[currentZoneIndex]
    const now = Date.now()
    
    if (currentPhase === 'calibration-thumbrest') {
      handleThumbRestSelect(tappedZoneId)
      return
    }
    
    if (currentPhase === 'pain-assessment' && painAssessmentPhase === 'tapping') {
      handlePainZoneTap(tappedZoneId)
      return
    }
    
    if (currentPhase !== 'reach-test') return
    
    const attempts = currentZoneTapAttempts.get(currentZone) || 0
    const missed = tappedZoneId !== currentZone ? 1 : 0
    
    if (missed > 0) {
      // Wrong zone tapped
      setCurrentZoneTapAttempts(new Map(currentZoneTapAttempts.set(currentZone, attempts + 1)))
      return
    }
    
    // Correct zone tapped
    const tapTime = currentZoneIndex === 0 ? 0 : now - lastTapTime
    const absoluteTime = now - testStartTime
    
    const restPosition = thumbRestZone ? zonePositions.get(thumbRestZone)! : { x: 0, y: 0 }
    const zonePosition = zonePositions.get(currentZone)!
    const distance = calculateDistanceFromRest(zonePosition, restPosition)
    
    const newZoneData: ZoneData = {
      zoneId: currentZone,
      screenX: zonePosition.x,
      screenY: zonePosition.y,
      distanceFromRest: distance,
      tapTime,
      absoluteTime,
      missedAttempts: attempts,
      isStruggleZone: false,
      painReported: false,
      painScore: 0,
      tapOrder: currentZoneIndex + 1
    }
    
    setZoneData(prev => [...prev, newZoneData])
    
    // Move to next zone
    if (currentZoneIndex < zoneSequence.length - 1) {
      setCurrentZoneIndex(prev => prev + 1)
      setLastTapTime(now)
      setCurrentZoneTapAttempts(new Map())
    } else {
      // Test complete, analyze struggle zones and prepare pain assessment
      const avgTapTime = [...zoneData, newZoneData].reduce((sum, z) => sum + z.tapTime, 0) / [...zoneData, newZoneData].length
      const struggles = detectStruggleZones([...zoneData, newZoneData], avgTapTime)
      
      // Update struggle flags
      const updatedData = [...zoneData, newZoneData].map(z => ({
        ...z,
        isStruggleZone: struggles.includes(z.zoneId)
      }))
      setZoneData(updatedData)
      setStruggleZones(struggles)
      
      // Generate zone pairs for pain assessment
      const pairs: Array<{zone1: string, zone2: string}> = []
      if (struggles.length >= 2) {
        // Pair up struggle zones
        for (let i = 0; i < struggles.length - 1; i += 2) {
          pairs.push({ zone1: struggles[i], zone2: struggles[i + 1] })
        }
        // If odd number, pair last with first
        if (struggles.length % 2 === 1) {
          pairs.push({ zone1: struggles[struggles.length - 1], zone2: struggles[0] })
        }
      }
      
      // If no struggles or only one, create pairs from slowest zones
      if (pairs.length === 0) {
        const sortedZones = [...updatedData].sort((a, b) => b.tapTime - a.tapTime)
        const zonesToUse = sortedZones.slice(0, Math.min(6, sortedZones.length))
        for (let i = 0; i < zonesToUse.length - 1; i += 2) {
          pairs.push({ zone1: zonesToUse[i].zoneId, zone2: zonesToUse[i + 1].zoneId })
        }
        if (zonesToUse.length % 2 === 1 && zonesToUse.length > 1) {
          pairs.push({ zone1: zonesToUse[zonesToUse.length - 1].zoneId, zone2: zonesToUse[0].zoneId })
        }
      }
      
      if (pairs.length > 0) {
        setPainZonePairs(pairs)
        setCurrentPainPairIndex(0)
        setTappedZones([])
        setCurrentTappingZone('first')
        setPainAssessmentPhase('instructions')
        setCurrentPhase('pain-assessment')
      } else {
        finishTest(updatedData, struggles)
      }
    }
  }
  
  const handlePainZoneTap = (tappedZoneId: string) => {
    const currentPair = painZonePairs[currentPainPairIndex]
    if (!currentPair) return
    
    if (currentTappingZone === 'first') {
      // First zone tapped
      if (tappedZoneId === currentPair.zone1) {
        setTappedZones([tappedZoneId])
        setCurrentTappingZone('second')
      }
    } else {
      // Second zone tapped
      if (tappedZoneId === currentPair.zone2) {
        setTappedZones(prev => [...prev, tappedZoneId])
        setPainAssessmentPhase('question')
      }
    }
  }
  
  const moveToNextPair = () => {
    if (currentPainPairIndex < painZonePairs.length - 1) {
      setCurrentPainPairIndex(prev => prev + 1)
      setTappedZones([])
      setCurrentTappingZone('first')
      setPainAssessmentPhase('tapping')
    } else {
      // All pairs done
      finishTest(zoneData, struggleZones)
    }
  }
  
  const handlePainComparison = (result: 'more' | 'less' | 'same') => {
    if (tappedZones.length >= 2) {
      const [firstZone, secondZone] = tappedZones
      
      const comparison: PainComparison = {
        zoneA: firstZone,
        zoneB: secondZone,
        result,
        timestamp: new Date()
      }
      
      setPainComparisons(prev => [...prev, comparison])
      
      // Update zone data
      const updatedData = zoneData.map(z => 
        z.zoneId === secondZone 
          ? { ...z, painReported: true }
          : z
      )
      setZoneData(updatedData)
    }
    
    moveToNextPair()
  }
  
  const finishTest = (finalZoneData: ZoneData[], finalStruggles: string[]) => {
    // Calculate final pain scores
    const painScores = calculatePainScores(painComparisons, finalStruggles)
    const finalData = finalZoneData.map(z => ({
      ...z,
      painScore: painScores.get(z.zoneId) || 0
    }))
    
    const avgTapTime = finalData.reduce((sum, z) => sum + z.tapTime, 0) / finalData.length
    const testDuration = (Date.now() - testStartTime) / 1000
    
    const sessionData: TestSession = {
      sessionId: `session_${Date.now()}`,
      timestamp: new Date(),
      testDuration,
      userName,
      handSize,
      gripMode,
      thumbRestZone,
      device: deviceInfo,
      zones: finalData,
      struggleZones: finalStruggles,
      painComparisons,
      averageTapTime: avgTapTime
    }
    
    // Export CSV
    exportToCSV(sessionData)
    
    // Callback
    if (onComplete) {
      onComplete(sessionData)
    }
    
    setCurrentPhase('results')
  }
  
  const handleDownloadProgress = () => {
    if (zoneData.length === 0) return
    
    const avgTapTime = zoneData.reduce((sum, z) => sum + z.tapTime, 0) / zoneData.length
    const testDuration = (Date.now() - testStartTime) / 1000
    const struggles = detectStruggleZones(zoneData, avgTapTime)
    const painScores = calculatePainScores(painComparisons, struggles)
    
    const finalData = zoneData.map(z => ({
      ...z,
      isStruggleZone: struggles.includes(z.zoneId),
      painScore: painScores.get(z.zoneId) || 0
    }))
    
    const sessionData: TestSession = {
      sessionId: `session_${Date.now()}`,
      timestamp: new Date(),
      testDuration,
      userName,
      handSize,
      gripMode,
      thumbRestZone,
      device: deviceInfo,
      zones: finalData,
      struggleZones: struggles,
      painComparisons,
      averageTapTime: avgTapTime
    }
    
    exportToCSV(sessionData)
  }
  
  const handleNewTest = () => {
    setCurrentPhase('intro')
    setUserName('')
    setHandSize(null)
    setGripMode(null)
    setThumbRestZone(null)
    setZoneSequence([])
    setZoneData([])
    setCurrentZoneIndex(0)
    setStruggleZones([])
    setPainComparisons([])
    setCurrentPainAssessmentIndex(0)
    setTestStartTime(0)
    setLastTapTime(0)
    setCurrentZoneTapAttempts(new Map())
    setPainAssessmentPhase('instructions')
    setPainZonePairs([])
    setCurrentPainPairIndex(0)
    setTappedZones([])
    setCurrentTappingZone('first')
  }
  
  // Render helpers
  const renderZoneGrid = (
    highlightZone?: string,
    showLabels: boolean = false,
    interactive: boolean = true
  ) => {
    const zones: React.ReactElement[] = []
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridColumns; col++) {
        const zoneId = getZoneId(row, col)
        const isHighlighted = highlightZone === zoneId
        const isCompleted = zoneData.some(z => z.zoneId === zoneId)
        const heatmapColor = heatmapData.get(zoneId)?.color
        
        zones.push(
          <div
            key={zoneId}
            onClick={() => interactive && handleZoneTap(zoneId)}
            style={{
              width: `${100 / gridColumns}%`,
              height: `${100 / gridRows}%`,
              border: '1px solid rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: interactive ? 'pointer' : 'default',
              backgroundColor: 
                currentPhase === 'results' && heatmapColor
                  ? heatmapColor
                  : isHighlighted
                  ? 'rgba(33, 150, 243, 0.3)'
                  : isCompleted
                  ? 'rgba(76, 175, 80, 0.2)'
                  : 'transparent',
              transition: 'background-color 0.2s',
              position: 'relative'
            }}
          >
            {showLabels && (
              <span style={{ 
                fontSize: '14px', 
                color: isHighlighted ? '#2196F3' : '#666',
                fontWeight: isHighlighted ? '600' : '400',
                zIndex: 10,
                position: 'relative'
              }}>
                {zoneId}
              </span>
            )}
            {isHighlighted && (
              <>
                <div
                  className="pulse-ring"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: '3px solid #2196F3',
                    animation: 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                />
                <div
                  className="pulse-core"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#2196F3',
                    animation: 'pulse-core 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                  }}
                />
              </>
            )}
          </div>
        )
      }
    }
    
    return zones
  }
  
  // Phase rendering
  const renderIntro = () => (
    <div style={{ padding: '16px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>ThumbReach & Pain Mapper</h1>
      <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '8px', color: '#666' }}>
        This test measures how easy it is to reach different areas of your screen.
        We'll track your tap speed and ask about any discomfort you experience.
      </p>
      <p style={{ fontSize: '14px', marginBottom: '16px', color: '#888' }}>
        Duration: ~2-3 minutes
      </p>
      <button
        onClick={handleStartTest}
        style={{
          padding: '14px 32px',
          fontSize: '16px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '500'
        }}
      >
        Start Test
      </button>
    </div>
  )
  
  const renderCalibrationName = () => (
    <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>What's your name?</h2>
      <input
        type="text"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        placeholder="Enter your name"
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          marginBottom: '8px',
          backgroundColor: '#FFFFFF'
        }}
        autoFocus
      />
      <button
        onClick={handleNameNext}
        disabled={!userName.trim()}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          backgroundColor: userName.trim() ? '#2196F3' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: userName.trim() ? 'pointer' : 'not-allowed',
          width: '100%'
        }}
      >
        Next
      </button>
    </div>
  )
  
  const renderCalibrationHandSize = () => (
    <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Hand Size</h2>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
        Measure your hand span (thumb to pinky, fully spread)
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(['small', 'medium', 'large'] as HandSize[]).map((size) => (
          <button
            key={size}
            onClick={() => handleHandSizeNext(size)}
            style={{
              padding: '16px',
              fontSize: '16px',
              backgroundColor: handSize === size ? '#2196F3' : '#F2F2F2',
              color: handSize === size ? 'white' : '#333',
              border: `2px solid ${handSize === size ? '#2196F3' : '#ddd'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left',
              textTransform: 'capitalize'
            }}
          >
            {size === 'small' && 'Small (under 7.5" / 19cm)'}
            {size === 'medium' && 'Medium (7.5-8.5" / 19-21.5cm)'}
            {size === 'large' && 'Large (over 8.5" / 21.5cm)'}
          </button>
        ))}
      </div>
    </div>
  )
  
  const renderCalibrationGrip = () => (
    <div style={{ padding: '16px', maxWidth: '500px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>How are you holding your phone?</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {([
          'one-hand-right',
          'one-hand-left',
          'two-hand-right',
          'two-hand-left'
        ] as GripMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleGripNext(mode)}
            style={{
              padding: '16px',
              fontSize: '16px',
              backgroundColor: gripMode === mode ? '#2196F3' : '#F2F2F2',
              color: gripMode === mode ? 'white' : '#333',
              border: `2px solid ${gripMode === mode ? '#2196F3' : '#ddd'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            {mode === 'one-hand-right' && 'One hand - Right thumb'}
            {mode === 'one-hand-left' && 'One hand - Left thumb'}
            {mode === 'two-hand-right' && 'Two hands - Right thumb'}
            {mode === 'two-hand-left' && 'Two hands - Left thumb'}
          </button>
        ))}
      </div>
    </div>
  )
  
  const renderCalibrationThumbRest = () => (
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', marginBottom: '8px', textAlign: 'center' }}>
        Thumb Rest Position
      </h2>
      <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px', textAlign: 'center' }}>
        Where does your thumb naturally hover over the screen?<br />
        Tap the zone closest to your thumb's resting position
      </p>
      <div
        style={{
          width: '100%',
          height: '70vh',
          display: 'flex',
          flexWrap: 'wrap',
          border: '2px solid #ddd',
          borderRadius: '16px',
          backgroundColor: '#FFFFFF'
        }}
      >
        {renderZoneGrid(undefined, true, true)}
      </div>
    </div>
  )
  
  const renderReachTest = () => {
    const currentZone = zoneSequence[currentZoneIndex]
    const progress = currentZoneIndex + 1
    
    return (
      <div style={{ 
        padding: '16px', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>
            Tap each highlighted zone as it appears
          </p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Progress: {progress}/{TOTAL_ZONES}
          </p>
        </div>
        
        <div
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            border: '2px solid #ddd',
            borderRadius: '16px',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden'
          }}
        >
          {renderZoneGrid(currentZone, true, true)}
        </div>
        
        <button
          onClick={handleDownloadProgress}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            fontSize: '14px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            alignSelf: 'flex-end'
          }}
        >
          Download Progress
        </button>
      </div>
    )
  }
  
  const renderPainAssessment = () => {
    const currentPair = painZonePairs[currentPainPairIndex]
    
    if (!currentPair) {
      // All pairs done
      finishTest(zoneData, struggleZones)
      return null
    }
    
    if (painAssessmentPhase === 'instructions') {
      return (
        <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', textAlign: 'center' }}>
            Pain Assessment
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '16px', lineHeight: '1.6', textAlign: 'center' }}>
            Now we'll assess any discomfort you experienced.<br />
            You'll tap two zones in sequence, then tell us about any pain.
          </p>
          <button
            onClick={() => setPainAssessmentPhase('tapping')}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'block',
              margin: '0 auto'
            }}
          >
            Start Pain Assessment
          </button>
        </div>
      )
    }
    
    if (painAssessmentPhase === 'tapping') {
      const targetZone = currentTappingZone === 'first' ? currentPair.zone1 : currentPair.zone2
      const instruction = currentTappingZone === 'first' 
        ? `Tap zone ${currentPair.zone1} first`
        : `Now tap zone ${currentPair.zone2}`
      
      return (
        <div style={{ 
          padding: '16px', 
          height: '100vh', 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>
              {instruction}
            </p>
            <p style={{ fontSize: '14px', color: '#666' }}>
              Pair {currentPainPairIndex + 1} of {painZonePairs.length}
            </p>
          </div>
          
          <div
            style={{
              flex: 1,
              width: '100%',
              display: 'flex',
              flexWrap: 'wrap',
              border: '2px solid #ddd',
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              overflow: 'hidden'
            }}
          >
            {renderZoneGrid(targetZone, true, true)}
          </div>
        </div>
      )
    }
    
    if (painAssessmentPhase === 'question') {
      const [firstZone, secondZone] = tappedZones
      
      if (!secondZone) {
        setPainAssessmentPhase('tapping')
        return null
      }
      
      return (
        <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            Pain Question
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '8px', lineHeight: '1.6' }}>
            Did tapping zone <strong>{secondZone}</strong> cause any pain or discomfort?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={() => {
                // Mark second zone as painful
                const updated = zoneData.map(z => 
                  z.zoneId === secondZone ? { ...z, painReported: true } : z
                )
                setZoneData(updated)
                
                // Ask comparison question
                setPainAssessmentPhase('comparison')
              }}
              style={{
                padding: '16px',
                fontSize: '16px',
                backgroundColor: '#F44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Yes, it was painful
            </button>
            <button
              onClick={() => {
                // No pain, move to next pair
                moveToNextPair()
              }}
              style={{
                padding: '16px',
                fontSize: '16px',
                backgroundColor: '#F2F2F2',
                color: '#333',
                border: '2px solid #ddd',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              No, just hard to reach
            </button>
          </div>
        </div>
      )
    }
    
    if (painAssessmentPhase === 'comparison') {
      const [firstZone, secondZone] = tappedZones
      
      if (!firstZone || !secondZone) {
        setPainAssessmentPhase('tapping')
        return null
      }
      
      return (
        <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            Pain Comparison
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '16px', lineHeight: '1.6' }}>
            Was zone <strong>{secondZone}</strong> MORE, LESS, or SAME pain as zone <strong>{firstZone}</strong>?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => {
                handlePainComparison('more')
              }}
              style={{
                padding: '16px',
                fontSize: '16px',
                backgroundColor: '#F44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              More painful
            </button>
            <button
              onClick={() => {
                handlePainComparison('same')
              }}
              style={{
                padding: '16px',
                fontSize: '16px',
                backgroundColor: '#FFC107',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Same pain
            </button>
            <button
              onClick={() => {
                handlePainComparison('less')
              }}
              style={{
                padding: '16px',
                fontSize: '16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Less painful
            </button>
          </div>
        </div>
      )
    }
    
    return null
  }
  
  const renderResults = () => {
    return (
      <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '16px', textAlign: 'center' }}>
          Test Complete! ✓
        </h2>
        
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>Your Reachability Map</h3>
          <div
            style={{
              width: '100%',
              height: '60vh',
              display: 'flex',
              flexWrap: 'wrap',
              border: '2px solid #ddd',
              borderRadius: '16px',
              marginBottom: '16px',
              backgroundColor: '#FFFFFF'
            }}
          >
            {renderZoneGrid(undefined, true, false)}
          </div>
          
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#4CAF50', borderRadius: '8px' }} />
              <span>Easy to reach + comfortable</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#FFC107', borderRadius: '8px' }} />
              <span>Moderate difficulty or some discomfort</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#F44336', borderRadius: '8px' }} />
              <span>Difficult to reach or painful</span>
            </div>
          </div>
        </div>
        
        <div style={{ marginBottom: '16px', padding: '16px', backgroundColor: '#F2F2F2', borderRadius: '16px' }}>
          <p style={{ marginBottom: '8px' }}><strong>Thumb rest:</strong> {thumbRestZone}</p>
          <p style={{ marginBottom: '8px' }}><strong>Hand size:</strong> {handSize}</p>
          <p style={{ marginBottom: '8px' }}><strong>Device:</strong> {deviceInfo.model}</p>
          <p style={{ marginBottom: '8px' }}><strong>Screen:</strong> {deviceInfo.screenWidth}×{deviceInfo.screenHeight}px</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              const avgTapTime = zoneData.reduce((sum, z) => sum + z.tapTime, 0) / zoneData.length
              const testDuration = (Date.now() - testStartTime) / 1000
              const painScores = calculatePainScores(painComparisons, struggleZones)
              const finalData = zoneData.map(z => ({
                ...z,
                painScore: painScores.get(z.zoneId) || 0
              }))
              
              const sessionData: TestSession = {
                sessionId: `session_${Date.now()}`,
                timestamp: new Date(),
                testDuration,
                userName,
                handSize,
                gripMode,
                thumbRestZone,
                device: deviceInfo,
                zones: finalData,
                struggleZones,
                painComparisons,
                averageTapTime: avgTapTime
              }
              
              exportToCSV(sessionData)
            }}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Download Data
          </button>
          <button
            onClick={handleNewTest}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              backgroundColor: '#F2F2F2',
              color: '#333',
              border: '2px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            New Test
          </button>
        </div>
      </div>
    )
  }
  
  // Main render
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: theme === 'dark' ? '#1a1a1a' : '#FFFFFF',
        color: theme === 'dark' ? '#ffffff' : '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhase}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentPhase === 'intro' && renderIntro()}
          {currentPhase === 'calibration-name' && renderCalibrationName()}
          {currentPhase === 'calibration-handsize' && renderCalibrationHandSize()}
          {currentPhase === 'calibration-grip' && renderCalibrationGrip()}
          {currentPhase === 'calibration-thumbrest' && renderCalibrationThumbRest()}
          {currentPhase === 'reach-test' && renderReachTest()}
          {currentPhase === 'pain-assessment' && renderPainAssessment()}
          {currentPhase === 'results' && renderResults()}
        </motion.div>
      </AnimatePresence>
      
      <style>{`
        @keyframes pulse-ring {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0;
          }
        }
        
        @keyframes pulse-core {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.15);
            opacity: 0.8;
          }
        }
        
        .pulse-ring {
          pointer-events: none;
        }
        
        .pulse-core {
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}

// Framer property controls
addPropertyControls(ThumbReachMapper, {
  gridRows: {
    type: ControlType.Number,
    title: 'Grid Rows',
    min: 4,
    max: 8,
    defaultValue: GRID_ROWS,
    step: 1
  },
  gridColumns: {
    type: ControlType.Number,
    title: 'Grid Columns',
    min: 2,
    max: 4,
    defaultValue: GRID_COLUMNS,
    step: 1
  },
  theme: {
    type: ControlType.Enum,
    title: 'Theme',
    options: ['light', 'dark'],
    optionTitles: ['Light', 'Dark'],
    defaultValue: 'light'
  },
  showInstructions: {
    type: ControlType.Boolean,
    title: 'Show Instructions',
    defaultValue: true
  }
})