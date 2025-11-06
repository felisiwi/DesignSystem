import React, { useState, useRef, useEffect } from 'react'
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion'

// ============================================
// TYPES & INTERFACES
// ============================================

interface SetupData {
  name: string
  handSpan: string // optional, in cm
  doneBefore: boolean
  carouselPosition: 'top' | 'bottom'
}

interface CalibrationData {
  holdingHand: 'left' | 'right'
  usingHands: 'one' | 'two'
  thumbRestPosition: { x: number; y: number }
}

interface TrajectoryPoint {
  timestamp: number
  x: number
  y: number
  velocityX: number
  velocityY: number
}

interface GestureData {
  id: number
  type: 'flick' | 'glide'
  timestamp: string
  carousel: '1-column' | '2-column'
  
  // Basic metrics
  velocity: number
  distance: number
  duration: number
  peakVelocity: number
  avgVelocity: number
  peakAvgRatio: number
  acceleration: number
  avgJerk: number
  maxJerk: number
  initialVelocity: number
  peakAcceleration: number
  velocityVariance: number
  velocityCV: number
  distanceDurationRatio: number
  straightness: number
  pauseBeforeRelease: number
  yMovement: number
  
  // NEW: Advanced metrics
  touchPressureAvg: number
  touchPressureMax: number
  touchPressureVariance: number
  trajectoryLength: number
  pathDirectness: number
  curvatureScore: number
  inflectionPoints: number
  
  // NEW: Device motion
  deviceMotionX: number
  deviceMotionY: number
  deviceMotionZ: number
  deviceMotionVariance: number
  
  // NEW: Retry detection
  isRetry: boolean
  timeSinceLastGesture: number
  
  // NEW: Outlier detection
  isOutlier: boolean
  outlierReasons: string
}

interface DeviceInfo {
  model: string
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  userAgent: string
}

// ============================================
// GESTURE DETECTION CONSTANTS
// ============================================

const GLIDE_DISTANCE_HIGH_CONFIDENCE = 170
const GLIDE_DISTANCE_MEDIUM = 140
const GLIDE_VELOCITY_MEDIUM = 120
const GLIDE_ACCELERATION_MEDIUM = 30
const GLIDE_DISTANCE_ENERGETIC = 155
const GLIDE_VELOCITY_HIGH = 180
const GLIDE_ACCELERATION_HIGH = 50

// ============================================
// MINI CAROUSEL COMPONENT
// ============================================

interface MiniCarouselProps {
  columns: 1 | 2
  onGestureComplete: (data: Partial<GestureData>) => void
  isActive: boolean
  hasMotionPermission: boolean
}

const MiniCarousel: React.FC<MiniCarouselProps> = ({ columns, onGestureComplete, isActive, hasMotionPermission }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemWidth, setItemWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  
  // Gesture tracking
  const trajectoryData = useRef<TrajectoryPoint[]>([])
  const velocityHistory = useRef<number[]>([])
  const dragStartTime = useRef<number>(0)
  const touchPressures = useRef<number[]>([])
  const lastGestureTime = useRef<number>(0)
  const deviceMotionStart = useRef<{ x: number; y: number; z: number } | null>(null)
  const deviceMotionData = useRef<Array<{ x: number; y: number; z: number }>>([])
  
  // Animation frame tracking for trajectory capture
  const animationFrameRef = useRef<number | null>(null)
  const isDragging = useRef(false)
  const dragStartPosition = useRef<{ x: number; y: number } | null>(null)
  const lastYPosition = useRef<number>(0)
  
  const totalItems = 10 // Fixed number of cards
  const gap = 8
  const horizontalPadding = 16
  const maxIndex = Math.max(0, totalItems - columns)
  
  // Calculate item width
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const totalGapSpace = gap * (columns - 1)
        const availableWidth = containerWidth - (2 * horizontalPadding) - totalGapSpace
        const width = availableWidth / columns
        setItemWidth(width)
      }
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [columns])
  
  // Device motion tracking - only starts after permission granted
  useEffect(() => {
    if (!hasMotionPermission) {
      // Clear data if permission revoked
      deviceMotionData.current = []
      return
    }
    
    const handleMotion = (event: DeviceMotionEvent) => {
      if (event.accelerationIncludingGravity) {
        deviceMotionData.current.push({
          x: event.accelerationIncludingGravity.x || 0,
          y: event.accelerationIncludingGravity.y || 0,
          z: event.accelerationIncludingGravity.z || 0,
        })
      }
    }
    
    window.addEventListener('devicemotion', handleMotion)
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [hasMotionPermission]) // Re-run when permission changes
  
  const handleDragStart = () => {
    dragStartTime.current = Date.now()
    trajectoryData.current = []
    velocityHistory.current = []
    touchPressures.current = []
    deviceMotionData.current = []
    deviceMotionStart.current = deviceMotionData.current.length > 0 
      ? deviceMotionData.current[deviceMotionData.current.length - 1]
      : null
    
    // Store the starting position to calculate offsets
    dragStartPosition.current = { x: x.get(), y: 0 }
    lastYPosition.current = 0
    isDragging.current = true
    
    // Start capturing trajectory every frame using requestAnimationFrame
    const captureFrame = () => {
      if (isDragging.current && dragStartPosition.current) {
        const currentTime = Date.now()
        const currentX = x.get()
        
        // Calculate offset from drag start
        const xOffset = currentX - dragStartPosition.current.x
        const yOffset = lastYPosition.current
        
        // Calculate velocity from motion value
        const currentVelocity = x.getVelocity()
        
        trajectoryData.current.push({
          timestamp: currentTime,
          x: xOffset,
          y: yOffset,
          velocityX: currentVelocity,
          velocityY: 0, // Y velocity would need separate tracking
        })
        
        animationFrameRef.current = requestAnimationFrame(captureFrame)
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(captureFrame)
  }
  
  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Update last known Y position for next animation frame
    lastYPosition.current = info.offset.y
    
    // Update the most recent trajectory point with Y data if available
    if (trajectoryData.current.length > 0) {
      const lastPoint = trajectoryData.current[trajectoryData.current.length - 1]
      lastPoint.y = info.offset.y
      lastPoint.velocityY = info.velocity.y
    } else {
      // Fallback: add trajectory point if animation frame hasn't started yet
      trajectoryData.current.push({
        timestamp: Date.now(),
        x: info.offset.x,
        y: info.offset.y,
        velocityX: info.velocity.x,
        velocityY: info.velocity.y,
      })
    }
    
    // Capture velocity history
    velocityHistory.current.push(Math.abs(info.velocity.x))
    
    // Capture touch pressure (if available)
    if ('touches' in event && event.touches.length > 0) {
      const touch = event.touches[0]
      // @ts-ignore - force is available on some devices
      const pressure = touch.force || (touch as any).webkitForce || 0
      touchPressures.current.push(pressure)
    }
  }
  
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    isDragging.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Add final position to trajectory
    trajectoryData.current.push({
      timestamp: Date.now(),
      x: info.offset.x,
      y: info.offset.y,
      velocityX: info.velocity.x,
      velocityY: info.velocity.y,
    })
    
    const duration = Date.now() - dragStartTime.current
    const distance = Math.abs(info.offset.x)
    const velocity = Math.abs(info.velocity.x)
    
    // Calculate advanced metrics
    const trajectoryLength = calculateTrajectoryLength(trajectoryData.current)
    const pathDirectness = distance / (trajectoryLength || 1)
    const curvature = calculateCurvature(trajectoryData.current)
    const inflections = countInflectionPoints(trajectoryData.current)
    
    // Touch pressure metrics
    const pressureAvg = touchPressures.current.length > 0
      ? touchPressures.current.reduce((a, b) => a + b, 0) / touchPressures.current.length
      : 0
    const pressureMax = touchPressures.current.length > 0
      ? Math.max(...touchPressures.current)
      : 0
    const pressureVariance = calculateVariance(touchPressures.current)
    
    // Device motion metrics
    const motionMetrics = calculateDeviceMotion(deviceMotionData.current, deviceMotionStart.current)
    
    // Calculate all standard metrics
    const peakVelocity = Math.max(...velocityHistory.current, 0)
    const avgVelocity = velocityHistory.current.length > 0
      ? velocityHistory.current.reduce((a, b) => a + b, 0) / velocityHistory.current.length
      : 0
    
    const peakAcceleration = calculatePeakAcceleration(velocityHistory.current, duration)
    const avgJerk = calculateAvgJerk(velocityHistory.current, duration)
    const maxJerk = calculateMaxJerk(velocityHistory.current, duration)
    const velocityVariance = calculateVariance(velocityHistory.current)
    const velocityCV = avgVelocity > 0 ? Math.sqrt(velocityVariance) / avgVelocity : 0
    const straightness = calculateStraightness(info.offset.x, info.offset.y, distance)
    const yMovement = Math.abs(info.offset.y)
    
    // Retry detection
    const timeSinceLast = lastGestureTime.current > 0 
      ? Date.now() - lastGestureTime.current 
      : 9999
    const isRetry = timeSinceLast < 2000
    lastGestureTime.current = Date.now()
    
    // Animate to target
    const dragDirection = info.offset.x > 0 ? -1 : 1
    let targetIndex = currentIndex
    
    // Gesture detection (simplified)
    const isMultiSkip = detectGlide(distance, velocity, peakAcceleration)
    
    if (isMultiSkip) {
      targetIndex = Math.max(0, Math.min(maxIndex, currentIndex + (dragDirection * 2)))
    } else {
      if (distance > itemWidth * 0.1) {
        targetIndex = Math.max(0, Math.min(maxIndex, currentIndex + dragDirection))
      }
    }
    
    const targetX = -(targetIndex * (itemWidth + gap))
    animate(x, targetX, { stiffness: 300, damping: 40 })
    setCurrentIndex(targetIndex)
    
    // Report gesture data
    onGestureComplete({
      velocity,
      distance,
      duration,
      peakVelocity,
      avgVelocity,
      peakAvgRatio: avgVelocity > 0 ? peakVelocity / avgVelocity : 0,
      acceleration: peakAcceleration,
      avgJerk,
      maxJerk,
      initialVelocity: velocityHistory.current[0] || 0,
      peakAcceleration,
      velocityVariance,
      velocityCV,
      distanceDurationRatio: duration > 0 ? distance / duration : 0,
      straightness,
      pauseBeforeRelease: 0, // Could be calculated from velocity decay
      yMovement,
      touchPressureAvg: pressureAvg,
      touchPressureMax: pressureMax,
      touchPressureVariance: pressureVariance,
      trajectoryLength,
      pathDirectness,
      curvatureScore: curvature,
      inflectionPoints: inflections,
      deviceMotionX: motionMetrics.x,
      deviceMotionY: motionMetrics.y,
      deviceMotionZ: motionMetrics.z,
      deviceMotionVariance: motionMetrics.variance,
      isRetry,
      timeSinceLastGesture: timeSinceLast,
    })
  }
  
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '350px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        opacity: isActive ? 1 : 0.5,
        transition: 'opacity 0.3s',
        position: 'relative',
      }}
    >
      {/* Carousel container */}
      <div style={{
        flex: 1,
        overflow: 'hidden',
        position: 'relative',
        borderRadius: '16px',
        background: '#fff',
      }}>
        <motion.div
          drag="x"
          dragConstraints={{ left: -(maxIndex * (itemWidth + gap)), right: 0 }}
          dragElastic={0.1}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{
            x,
            display: 'flex',
            gap: `${gap}px`,
            padding: `0 ${horizontalPadding}px`,
            height: '100%',
            alignItems: 'center',
            cursor: 'grab',
          }}
        >
          {Array.from({ length: totalItems }).map((_, i) => (
            <div
              key={i}
              style={{
                width: `${itemWidth}px`,
                height: '280px',
                background: '#F2F2F2',
                borderRadius: '16px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 600,
                color: '#999',
              }}
            >
              {i + 1}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function detectGlide(distance: number, velocity: number, peakAccel: number): boolean {
  // Tier 1: High confidence glide
  if (distance > GLIDE_DISTANCE_HIGH_CONFIDENCE) return true
  
  // Tier 2: Medium consensus
  if (distance > GLIDE_DISTANCE_MEDIUM && 
      velocity > GLIDE_VELOCITY_MEDIUM && 
      peakAccel > GLIDE_ACCELERATION_MEDIUM) return true
  
  // Tier 3: Energetic gesture
  if (distance > GLIDE_DISTANCE_ENERGETIC && 
      (velocity > GLIDE_VELOCITY_HIGH || peakAccel > GLIDE_ACCELERATION_HIGH)) return true
  
  return false
}

function calculateTrajectoryLength(trajectory: TrajectoryPoint[]): number {
  if (trajectory.length < 2) return 0
  
  let length = 0
  for (let i = 1; i < trajectory.length; i++) {
    const dx = trajectory[i].x - trajectory[i - 1].x
    const dy = trajectory[i].y - trajectory[i - 1].y
    length += Math.sqrt(dx * dx + dy * dy)
  }
  
  // Ensure minimum is straight-line distance
  if (trajectory.length >= 2) {
    const first = trajectory[0]
    const last = trajectory[trajectory.length - 1]
    const straightLine = Math.sqrt(
      Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2)
    )
    return Math.max(length, straightLine)
  }
  
  return length
}

function calculateCurvature(trajectory: TrajectoryPoint[]): number {
  if (trajectory.length < 3) return 0
  
  let totalCurvature = 0
  for (let i = 1; i < trajectory.length - 1; i++) {
    const prev = trajectory[i - 1]
    const curr = trajectory[i]
    const next = trajectory[i + 1]
    
    const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
    const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x)
    const angleDiff = Math.abs(angle2 - angle1)
    totalCurvature += angleDiff
  }
  
  return totalCurvature / (trajectory.length - 2)
}

function countInflectionPoints(trajectory: TrajectoryPoint[]): number {
  if (trajectory.length < 3) return 0
  
  let inflections = 0
  let prevDirection = 0
  
  for (let i = 1; i < trajectory.length - 1; i++) {
    const curr = trajectory[i]
    const next = trajectory[i + 1]
    const direction = Math.sign(next.x - curr.x)
    
    if (prevDirection !== 0 && direction !== prevDirection) {
      inflections++
    }
    prevDirection = direction
  }
  
  return inflections
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
}

function calculatePeakAcceleration(velocities: number[], duration: number): number {
  if (velocities.length < 2) return 0
  const dt = duration / velocities.length
  let maxAccel = 0
  
  for (let i = 1; i < velocities.length; i++) {
    const accel = Math.abs((velocities[i] - velocities[i - 1]) / dt)
    maxAccel = Math.max(maxAccel, accel)
  }
  
  return maxAccel
}

function calculateAvgJerk(velocities: number[], duration: number): number {
  if (velocities.length < 3) return 0
  const dt = duration / velocities.length
  let totalJerk = 0
  
  for (let i = 2; i < velocities.length; i++) {
    const accel1 = (velocities[i - 1] - velocities[i - 2]) / dt
    const accel2 = (velocities[i] - velocities[i - 1]) / dt
    const jerk = Math.abs((accel2 - accel1) / dt)
    totalJerk += jerk
  }
  
  return totalJerk / (velocities.length - 2)
}

function calculateMaxJerk(velocities: number[], duration: number): number {
  if (velocities.length < 3) return 0
  const dt = duration / velocities.length
  let maxJerk = 0
  
  for (let i = 2; i < velocities.length; i++) {
    const accel1 = (velocities[i - 1] - velocities[i - 2]) / dt
    const accel2 = (velocities[i] - velocities[i - 1]) / dt
    const jerk = Math.abs((accel2 - accel1) / dt)
    maxJerk = Math.max(maxJerk, jerk)
  }
  
  return maxJerk
}

function calculateStraightness(offsetX: number, offsetY: number, distance: number): number {
  const totalDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)
  return totalDistance > 0 ? (Math.abs(offsetX) / totalDistance) * 100 : 100
}

function calculateDeviceMotion(
  motionData: Array<{ x: number; y: number; z: number }>,
  startMotion: { x: number; y: number; z: number } | null
): { x: number; y: number; z: number; variance: number } {
  if (motionData.length === 0 || !startMotion) {
    return { x: 0, y: 0, z: 0, variance: 0 }
  }
  
  const deltaX = motionData.map(m => Math.abs(m.x - startMotion.x))
  const deltaY = motionData.map(m => Math.abs(m.y - startMotion.y))
  const deltaZ = motionData.map(m => Math.abs(m.z - startMotion.z))
  
  return {
    x: Math.max(...deltaX),
    y: Math.max(...deltaY),
    z: Math.max(...deltaZ),
    variance: calculateVariance([...deltaX, ...deltaY, ...deltaZ]),
  }
}

function detectOutlier(value: number, allValues: number[]): boolean {
  if (allValues.length < 4) return false
  
  const sorted = [...allValues].sort((a, b) => a - b)
  const q1 = sorted[Math.floor(sorted.length * 0.25)]
  const q3 = sorted[Math.floor(sorted.length * 0.75)]
  const iqr = q3 - q1
  
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr
  
  return value < lowerBound || value > upperBound
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent
  let model = 'Unknown'
  
  // Try to detect device model
  if (/iPhone/.test(ua)) {
    model = 'iPhone'
    if (/iPhone14/.test(ua)) model = 'iPhone 14'
    else if (/iPhone13/.test(ua)) model = 'iPhone 13'
    else if (/iPhone12/.test(ua)) model = 'iPhone 12'
  } else if (/iPad/.test(ua)) {
    model = 'iPad'
  } else if (/Android/.test(ua)) {
    const match = ua.match(/Android.*?; ([^;]+)/)
    model = match ? match[1] : 'Android Device'
  }
  
  return {
    model,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    pixelRatio: window.devicePixelRatio,
    userAgent: ua,
  }
}

// ============================================
// MAIN DIAGNOSTIC TOOL COMPONENT
// ============================================

export default function CarouselSwipeDiagnostic() {
  // Setup state
  const [screen, setScreen] = useState<'setup' | 'calibration' | 'test' | 'complete'>('setup')
  const [setupData, setSetupData] = useState<SetupData>({
    name: '',
    handSpan: '',
    doneBefore: false,
    carouselPosition: 'bottom',
  })
  
  // Sensor permissions state
  const [permissionsGranted, setPermissionsGranted] = useState({
    motion: false,
    orientation: false,
  })
  
  // Calibration state
  const [calibrationStep, setCalibrationStep] = useState<'holding' | 'usingHands' | 'thumb' | 'done'>('holding')
  const [calibrationData, setCalibrationData] = useState<CalibrationData>({
    holdingHand: 'right',
    usingHands: 'one',
    thumbRestPosition: { x: 0, y: 0 },
  })
  const [thumbCaptured, setThumbCaptured] = useState(false)
  
  // User comments state
  const [userComments, setUserComments] = useState('')
  
  // Test state
  const [phase, setPhase] = useState<'flicks' | 'interstitial' | 'glides'>('flicks')
  const [gestureData, setGestureData] = useState<GestureData[]>([])
  const [flickCount, setFlickCount] = useState(0)
  const [glideCount, setGlideCount] = useState(0)
  const [activeCarousel, setActiveCarousel] = useState<'1-column' | '2-column'>('1-column')
  const [lastInteraction, setLastInteraction] = useState<number>(Date.now())
  
  const deviceInfo = useRef<DeviceInfo>(getDeviceInfo())
  
  const MIN_GESTURES = 6
  
  // Sensor permission status
  const [sensorStatus, setSensorStatus] = useState<string>('')
  
  // Request sensor permissions
  useEffect(() => {
    // Check if sensors are available (Android/other browsers don't require explicit permission)
    const hasMotionSupport = typeof DeviceMotionEvent !== 'undefined' && !!window.DeviceMotionEvent
    const hasOrientationSupport = typeof DeviceOrientationEvent !== 'undefined' && !!window.DeviceOrientationEvent
    const needsPermission = typeof (DeviceMotionEvent as any)?.requestPermission === 'function'
    
    if (!needsPermission) {
      // Android/Firefox/Chrome - permissions are usually granted by default
      if (hasMotionSupport || hasOrientationSupport) {
        setPermissionsGranted({ motion: hasMotionSupport, orientation: hasOrientationSupport })
        setSensorStatus('Sensors available (no permission required)')
      } else {
        setSensorStatus('Sensors not supported on this device')
      }
    } else {
      // iOS 13+ - requires permission
      setSensorStatus('Tap to enable sensors (iOS)')
    }
  }, [])
  
  const requestSensorPermissions = async () => {
    try {
      let motionGranted = false
      let orientationGranted = false
      
      // iOS 13+ motion
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const motionPermission = await (DeviceMotionEvent as any).requestPermission()
        motionGranted = motionPermission === 'granted'
        setPermissionsGranted(prev => ({ ...prev, motion: motionGranted }))
      } else {
        // Android/Firefox - try to access sensors directly
        // Note: Firefox on Android may have limited sensor support
        if (typeof DeviceMotionEvent !== 'undefined') {
          motionGranted = true
          setPermissionsGranted(prev => ({ ...prev, motion: true }))
        }
      }
      
      // iOS 13+ orientation
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const orientationPermission = await (DeviceOrientationEvent as any).requestPermission()
        orientationGranted = orientationPermission === 'granted'
        setPermissionsGranted(prev => ({ ...prev, orientation: orientationGranted }))
      } else {
        // Android/Firefox
        if (typeof DeviceOrientationEvent !== 'undefined') {
          orientationGranted = true
          setPermissionsGranted(prev => ({ ...prev, orientation: true }))
        }
      }
      
      if (motionGranted || orientationGranted) {
        setSensorStatus('✓ Sensors enabled')
      } else {
        setSensorStatus('Sensors not available (device limitation)')
      }
    } catch (error) {
      console.error('Permission request failed:', error)
      setSensorStatus('Permission denied or not supported')
    }
  }
  
  // Handle gesture completion
  const handleGestureComplete = (carousel: '1-column' | '2-column', partialData: Partial<GestureData>) => {
    const currentPhase = phase === 'flicks' ? 'flick' : 'glide'
    
    const newGesture: GestureData = {
      id: gestureData.length + 1,
      type: currentPhase,
      timestamp: new Date().toISOString(),
      carousel,
      velocity: partialData.velocity || 0,
      distance: partialData.distance || 0,
      duration: partialData.duration || 0,
      peakVelocity: partialData.peakVelocity || 0,
      avgVelocity: partialData.avgVelocity || 0,
      peakAvgRatio: partialData.peakAvgRatio || 0,
      acceleration: partialData.acceleration || 0,
      avgJerk: partialData.avgJerk || 0,
      maxJerk: partialData.maxJerk || 0,
      initialVelocity: partialData.initialVelocity || 0,
      peakAcceleration: partialData.peakAcceleration || 0,
      velocityVariance: partialData.velocityVariance || 0,
      velocityCV: partialData.velocityCV || 0,
      distanceDurationRatio: partialData.distanceDurationRatio || 0,
      straightness: partialData.straightness || 0,
      pauseBeforeRelease: partialData.pauseBeforeRelease || 0,
      yMovement: partialData.yMovement || 0,
      touchPressureAvg: partialData.touchPressureAvg || 0,
      touchPressureMax: partialData.touchPressureMax || 0,
      touchPressureVariance: partialData.touchPressureVariance || 0,
      trajectoryLength: partialData.trajectoryLength || 0,
      pathDirectness: partialData.pathDirectness || 0,
      curvatureScore: partialData.curvatureScore || 0,
      inflectionPoints: partialData.inflectionPoints || 0,
      deviceMotionX: partialData.deviceMotionX || 0,
      deviceMotionY: partialData.deviceMotionY || 0,
      deviceMotionZ: partialData.deviceMotionZ || 0,
      deviceMotionVariance: partialData.deviceMotionVariance || 0,
      isRetry: partialData.isRetry || false,
      timeSinceLastGesture: partialData.timeSinceLastGesture || 0,
      isOutlier: false, // Will be calculated after all gestures are collected
      outlierReasons: '',
    }
    
    const updatedGestures = [...gestureData, newGesture]
    
    // Flag outliers after we have enough data
    if (updatedGestures.length >= 4) {
      const velocities = updatedGestures.map(g => g.velocity)
      const distances = updatedGestures.map(g => g.distance)
      const straightnesses = updatedGestures.map(g => g.straightness)
      
      const flaggedGestures = updatedGestures.map(gesture => {
        const isVelocityOutlier = detectOutlier(gesture.velocity, velocities)
        const isDistanceOutlier = detectOutlier(gesture.distance, distances)
        const isStraightnessOutlier = detectOutlier(gesture.straightness, straightnesses)
        
        return {
          ...gesture,
          isOutlier: isVelocityOutlier || isDistanceOutlier || isStraightnessOutlier,
          outlierReasons: [
            isVelocityOutlier ? 'velocity' : null,
            isDistanceOutlier ? 'distance' : null,
            isStraightnessOutlier ? 'straightness' : null,
          ].filter(Boolean).join(', ') || 'none'
        }
      })
      
      setGestureData(flaggedGestures)
    } else {
      setGestureData(updatedGestures)
    }
    
    setActiveCarousel(carousel)
    setLastInteraction(Date.now())
    
    if (currentPhase === 'flick') {
      setFlickCount(prev => prev + 1)
    } else {
      setGlideCount(prev => prev + 1)
    }
  }
  
  // Download CSV
  const downloadCSV = () => {
    const timestamp = new Date()
    const dateStr = `${String(timestamp.getDate()).padStart(2, '0')}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getFullYear()).slice(-2)}_${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}`
    const filename = `${setupData.name || 'Anonymous'}_CarouselSwipeDiagnostic_${dateStr}.csv`
    
    // Build CSV header
    const headers = [
      'ID', 'Type', 'Timestamp', 'Carousel', 
      // Basic metrics
      'Velocity', 'Distance', 'Duration', 'Peak Velocity', 'Avg Velocity', 'Peak/Avg Ratio',
      'Acceleration', 'Avg Jerk', 'Max Jerk', 'Initial Velocity', 'Peak Acceleration',
      'Velocity Variance', 'Velocity CV', 'Distance/Duration Ratio', 'Straightness %',
      'Pause Before Release', 'Y Movement',
      // Advanced metrics
      'Touch Pressure Avg', 'Touch Pressure Max', 'Touch Pressure Variance',
      'Trajectory Length', 'Path Directness', 'Curvature Score', 'Inflection Points',
      'Device Motion X', 'Device Motion Y', 'Device Motion Z', 'Device Motion Variance',
      'Is Retry', 'Time Since Last Gesture',
      // Outlier detection
      'Is Outlier', 'Outlier Reasons',
    ]
    
    // Add metadata rows
    const metadataRows = [
      ['Test Metadata'],
      ['Name', setupData.name],
      ['Hand Span (cm)', setupData.handSpan || 'Not provided'],
      ['Done Before', setupData.doneBefore ? 'Yes' : 'No'],
      ['Carousel Position', setupData.carouselPosition],
      ['Holding Hand', calibrationData.holdingHand],
      ['Using Hands', calibrationData.usingHands],
      ['Thumb Rest X', calibrationData.thumbRestPosition.x.toFixed(2)],
      ['Thumb Rest Y', calibrationData.thumbRestPosition.y.toFixed(2)],
      ['Device Model', deviceInfo.current.model],
      ['Screen Width', deviceInfo.current.screenWidth],
      ['Screen Height', deviceInfo.current.screenHeight],
      ['Pixel Ratio', deviceInfo.current.pixelRatio],
      [''],
      ['User Comments'],
      [userComments || 'No comments provided'],
      [''],
      headers,
    ]
    
    // Build data rows
    const dataRows = gestureData.map(d => [
      d.id,
      d.type,
      d.timestamp,
      d.carousel,
      d.velocity.toFixed(2),
      d.distance.toFixed(2),
      d.duration.toFixed(0),
      d.peakVelocity.toFixed(2),
      d.avgVelocity.toFixed(2),
      d.peakAvgRatio.toFixed(2),
      d.acceleration.toFixed(2),
      d.avgJerk.toFixed(2),
      d.maxJerk.toFixed(2),
      d.initialVelocity.toFixed(2),
      d.peakAcceleration.toFixed(2),
      d.velocityVariance.toFixed(2),
      d.velocityCV.toFixed(2),
      d.distanceDurationRatio.toFixed(2),
      d.straightness.toFixed(2),
      d.pauseBeforeRelease.toFixed(2),
      d.yMovement.toFixed(2),
      d.touchPressureAvg.toFixed(4),
      d.touchPressureMax.toFixed(4),
      d.touchPressureVariance.toFixed(4),
      d.trajectoryLength.toFixed(2),
      d.pathDirectness.toFixed(4),
      d.curvatureScore.toFixed(4),
      d.inflectionPoints,
      d.deviceMotionX.toFixed(4),
      d.deviceMotionY.toFixed(4),
      d.deviceMotionZ.toFixed(4),
      d.deviceMotionVariance.toFixed(4),
      d.isRetry ? 'Yes' : 'No',
      d.timeSinceLastGesture.toFixed(0),
      d.isOutlier ? 'Yes' : 'No',
      d.outlierReasons,
    ])
    
    const allRows = [...metadataRows, ...dataRows]
    const csvContent = allRows.map(row => row.join(',')).join('\n')
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }
  
  // Font stack similar to Futura
  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif'
  
  // ============================================
  // SETUP SCREEN
  // ============================================
  
  if (screen === 'setup') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily,
      }}>
        <div style={{
          maxWidth: '400px',
          padding: '32px',
        }}>
          <h1 style={{ fontSize: '28px', marginBottom: '32px', fontWeight: 600 }}>
            Carousel Swipe Diagnostic
          </h1>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Name
              </label>
              <input
                type="text"
                value={setupData.name}
                onChange={(e) => setSetupData({ ...setupData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: '1px solid #E5E5E5',
                  fontSize: '16px',
                  fontFamily,
                }}
                placeholder="Your name"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Hand Span (optional, in cm)
              </label>
              <input
                type="text"
                value={setupData.handSpan}
                onChange={(e) => setSetupData({ ...setupData, handSpan: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '16px',
                  border: '1px solid #E5E5E5',
                  fontSize: '16px',
                  fontFamily,
                }}
                placeholder="Distance from thumb to pinky"
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Have you done this test before?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSetupData({ ...setupData, doneBefore: false })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1px solid #E5E5E5',
                    background: !setupData.doneBefore ? '#000' : '#fff',
                    color: !setupData.doneBefore ? '#fff' : '#000',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  No
                </button>
                <button
                  onClick={() => setSetupData({ ...setupData, doneBefore: true })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1px solid #E5E5E5',
                    background: setupData.doneBefore ? '#000' : '#fff',
                    color: setupData.doneBefore ? '#fff' : '#000',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
                Carousel Position
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSetupData({ ...setupData, carouselPosition: 'top' })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1px solid #E5E5E5',
                    background: setupData.carouselPosition === 'top' ? '#000' : '#fff',
                    color: setupData.carouselPosition === 'top' ? '#fff' : '#000',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Top
                </button>
                <button
                  onClick={() => setSetupData({ ...setupData, carouselPosition: 'bottom' })}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1px solid #E5E5E5',
                    background: setupData.carouselPosition === 'bottom' ? '#000' : '#fff',
                    color: setupData.carouselPosition === 'bottom' ? '#fff' : '#000',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Bottom
                </button>
              </div>
            </div>
            
            <div style={{ marginTop: '16px', padding: '16px', background: '#F9F9F9', borderRadius: '16px' }}>
              <p style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>
                Sensor Access (Optional)
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                Allow access to motion sensors for better data quality
              </p>
              <button
                onClick={requestSensorPermissions}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '16px',
                  border: '1px solid #E5E5E5',
                  background: permissionsGranted.motion || permissionsGranted.orientation ? '#4CAF50' : '#fff',
                  color: permissionsGranted.motion || permissionsGranted.orientation ? '#fff' : '#000',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily,
                  marginBottom: '8px',
                }}
              >
                {permissionsGranted.motion || permissionsGranted.orientation ? '✓ Sensors Enabled' : 'Enable Sensors'}
              </button>
              {sensorStatus && (
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px', textAlign: 'center' }}>
                  {sensorStatus}
                </p>
              )}
            </div>
            
            <button
              onClick={() => setScreen('calibration')}
              disabled={!setupData.name}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: setupData.name ? '#000' : '#E5E5E5',
                color: setupData.name ? '#fff' : '#999',
                fontSize: '16px',
                fontWeight: 600,
                cursor: setupData.name ? 'pointer' : 'not-allowed',
                marginTop: '16px',
                fontFamily,
              }}
            >
              Start Test
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  // ============================================
  // CALIBRATION SCREEN
  // ============================================
  
  if (screen === 'calibration') {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily,
      }}>
        <div style={{
          maxWidth: '400px',
          padding: '32px',
          textAlign: 'center',
        }}>
          {calibrationStep === 'holding' && (
            <>
              <h2 style={{ fontSize: '24px', marginBottom: '24px', fontWeight: 600 }}>
                Which hand are you holding the phone with?
              </h2>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setCalibrationData({ ...calibrationData, holdingHand: 'left' })
                    setCalibrationStep('usingHands')
                  }}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '16px',
                    border: '1px solid #E5E5E5',
                    background: '#fff',
                    fontSize: '18px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Left
                </button>
                <button
                  onClick={() => {
                    setCalibrationData({ ...calibrationData, holdingHand: 'right' })
                    setCalibrationStep('usingHands')
                  }}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '16px',
                    border: '1px solid #E5E5E5',
                    background: '#fff',
                    fontSize: '18px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Right
                </button>
              </div>
            </>
          )}
          
          {calibrationStep === 'usingHands' && (
            <>
              <h2 style={{ fontSize: '24px', marginBottom: '24px', fontWeight: 600 }}>
                Are you using one hand or two hands?
              </h2>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setCalibrationData({ ...calibrationData, usingHands: 'one' })
                    setCalibrationStep('thumb')
                  }}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '16px',
                    border: '1px solid #E5E5E5',
                    background: '#fff',
                    fontSize: '18px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  One
                </button>
                <button
                  onClick={() => {
                    setCalibrationData({ ...calibrationData, usingHands: 'two' })
                    setCalibrationStep('thumb')
                  }}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '16px',
                    border: '1px solid #E5E5E5',
                    background: '#fff',
                    fontSize: '18px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily,
                  }}
                >
                  Two
                </button>
              </div>
            </>
          )}
          
          {calibrationStep === 'thumb' && !thumbCaptured && (
            <div
              onTouchStart={(e) => {
                const touch = e.touches[0]
                setCalibrationData({
                  ...calibrationData,
                  thumbRestPosition: { x: touch.clientX, y: touch.clientY },
                })
                setThumbCaptured(true)
              }}
              onClick={(e) => {
                setCalibrationData({
                  ...calibrationData,
                  thumbRestPosition: { x: e.clientX, y: e.clientY },
                })
                setThumbCaptured(true)
              }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.98)',
                zIndex: 1000,
                padding: '32px',
                textAlign: 'center',
              }}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '16px', fontWeight: 600, color: '#000' }}>
                Hold your phone naturally
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '48px', maxWidth: '400px' }}>
                Hover your thumb over the screen where it naturally lands, then press down anywhere.
              </p>
              <div style={{
                fontSize: '32px',
                color: '#999',
                fontWeight: 600,
              }}>
                TAP ANYWHERE
              </div>
            </div>
          )}
          
          {calibrationStep === 'thumb' && thumbCaptured && (
            <>
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: '#4CAF50',
                margin: '0 auto 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
              }}>
                ✓
              </div>
              <h2 style={{ fontSize: '24px', marginBottom: '16px', fontWeight: 600 }}>
                Position Captured!
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '32px' }}>
                Thumb rest: ({calibrationData.thumbRestPosition.x.toFixed(0)}, {calibrationData.thumbRestPosition.y.toFixed(0)})
              </p>
              <button
                onClick={() => setScreen('test')}
                style={{
                  padding: '16px 48px',
                  borderRadius: '16px',
                  border: 'none',
                  background: '#000',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily,
                }}
              >
                Begin Test
              </button>
            </>
          )}
        </div>
      </div>
    )
  }
  
  // ============================================
  // TEST SCREEN
  // ============================================
  
  if (screen === 'test') {
    const carouselsAtBottom = setupData.carouselPosition === 'bottom'
    const showNextButton = phase === 'flicks' && flickCount >= MIN_GESTURES
    const showDownloadButton = phase === 'glides' && glideCount >= MIN_GESTURES
    
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily,
        overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top, 24px)',
        paddingBottom: 'env(safe-area-inset-bottom, 24px)',
      }}>
        {/* Instructions / Status area */}
        <div style={{
          padding: '24px 16px',
          paddingTop: 'max(24px, env(safe-area-inset-top, 0px) + 24px)',
          order: carouselsAtBottom ? 0 : 2,
          flexShrink: 0,
        }}>
          {phase === 'flicks' && (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
                Perform single-card flicks
              </h2>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Swipe to move one card at a time. Try both carousels!
              </p>
              {flickCount > 0 && (
                <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                  Flicks: {flickCount} {flickCount >= MIN_GESTURES && '✓ Minimum reached'}
                </p>
              )}
            </>
          )}
          
          {phase === 'interstitial' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
                Great! Now try gliding
              </h2>
              <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
                Swipe fast to skip multiple cards at once
              </p>
              <button
                onClick={() => setPhase('glides')}
                style={{
                  padding: '12px 32px',
                  borderRadius: '16px',
                  border: 'none',
                  background: '#000',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily,
                }}
              >
                Continue
              </button>
            </div>
          )}
          
          {phase === 'glides' && (
            <>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
                Perform multi-card glides
              </h2>
              <p style={{ fontSize: '14px', color: '#666' }}>
                Swipe fast to skip multiple cards. Try both carousels!
              </p>
              {glideCount > 0 && (
                <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
                  Glides: {glideCount} {glideCount >= MIN_GESTURES && '✓ Minimum reached'}
                </p>
              )}
            </>
          )}
        </div>
        
        {/* Download section - fixed position to not push carousels */}
        {showDownloadButton && (
          <div style={{
            position: 'fixed',
            bottom: 'max(24px, env(safe-area-inset-bottom, 0px) + 24px)',
            left: '16px',
            right: '16px',
            background: '#fff',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid #E5E5E5',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
            maxWidth: '400px',
            margin: '0 auto',
          }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              Comments (optional)
            </label>
            <textarea
              value={userComments}
              onChange={(e) => setUserComments(e.target.value)}
              placeholder="Any feedback about the test? (e.g., 'animations felt slow', 'cards looked nice')"
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '12px',
                borderRadius: '16px',
                border: '1px solid #E5E5E5',
                fontSize: '14px',
                fontFamily,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={downloadCSV}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '12px 24px',
                borderRadius: '16px',
                border: 'none',
                background: '#4CAF50',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily,
              }}
            >
              Download CSV
            </button>
          </div>
        )}
        
        {/* Carousels area */}
        <div style={{
          flex: 1,
          padding: '16px',
          paddingBottom: showDownloadButton ? '200px' : 'max(16px, env(safe-area-inset-bottom, 0px) + 16px)', // Add space for fixed download section and safe area
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          order: carouselsAtBottom ? 1 : 0,
          justifyContent: carouselsAtBottom ? 'flex-end' : 'flex-start',
          overflowY: 'auto',
        }}>
          <MiniCarousel
            columns={1}
            onGestureComplete={(data) => handleGestureComplete('1-column', data)}
            isActive={phase !== 'interstitial'}
            hasMotionPermission={permissionsGranted.motion}
          />
          <MiniCarousel
            columns={2}
            onGestureComplete={(data) => handleGestureComplete('2-column', data)}
            isActive={phase !== 'interstitial'}
            hasMotionPermission={permissionsGranted.motion}
          />
        </div>
        
        {/* Next button */}
        {showNextButton && !showDownloadButton && (
          <div style={{
            position: 'fixed',
            bottom: 'max(24px, env(safe-area-inset-bottom, 0px) + 24px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
          }}>
            <button
              onClick={() => setPhase('interstitial')}
              style={{
                padding: '12px 32px',
                borderRadius: '16px',
                border: 'none',
                background: '#000',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontFamily,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    )
  }
  
  return null
}