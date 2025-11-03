import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion'
import { addPropertyControls, ControlType } from 'framer'

// ========================================
// GESTURE DETECTION CONSTANTS (Multi-dimensional Filtering)
// ========================================
const GLIDE_DISTANCE_HIGH_CONFIDENCE = 200  // Much harder to trigger T1
const GLIDE_DISTANCE_MEDIUM = 160           // Requires very long swipe for T2
const GLIDE_VELOCITY_MEDIUM = 120           // Requires truly fast swipe for T2
const GLIDE_ACCELERATION_MEDIUM = 30        // Requires clearer "burst" for T2
const GLIDE_DISTANCE_ENERGETIC = 180        // Stronger distance needed for T3
const GLIDE_VELOCITY_HIGH = 180             // Higher velocity needed for T3
const GLIDE_ACCELERATION_HIGH = 50          // Clearer burst needed for T3

// Multi-dimensional filtering to prevent accidental glides
const MIN_GLIDE_DURATION = 80  // ms - Glides should be longer gestures
const MAX_GLIDE_VELOCITY = 600 // px/s - Very fast gestures are likely flicks

interface AdaptiveCarouselProps {
  children: React.ReactNode
  columns?: number
  gap?: number
  horizontalPadding?: number
  verticalPadding?: number
  peakAmount?: number
  arrowsEnabled?: boolean
  dotsEnabled?: boolean
  // Gesture detection props
  snapThreshold?: number
  velocityScaler?: number
  velocityScalerPercentage?: number
  // Animation props
  flickStiffness?: number
  flickDamping?: number
  glideStiffness?: number
  glideDamping?: number
  // Arrow styling props
  arrowButtonSize?: number
  arrowColor?: string
  arrowPressedColor?: string
  arrowDisabledColor?: string
  arrowIconColor?: string
  arrowIconDisabledColor?: string
  // Dots styling props
  dotSize?: number
  dotGap?: number
  dotColor?: string
  dotInactiveColor?: string
}

export default function AdaptiveCarousel({
  children,
  columns = 1,
  gap = 8,
  horizontalPadding = 16,
  verticalPadding = 0,
  peakAmount = 16,
  arrowsEnabled = true,
  dotsEnabled = false,
  snapThreshold = 10,
  velocityScaler = 300,
  velocityScalerPercentage = 20,
  flickStiffness = 500,
  flickDamping = 55,
  glideStiffness = 120,
  glideDamping = 25,
  arrowButtonSize = 32,
  arrowColor = '#F2F2F2',
  arrowPressedColor = '#000000',
  arrowDisabledColor = 'rgba(0, 0, 0, 0)',
  arrowIconColor = '#4D4D4D',
  arrowIconDisabledColor = '#CCCCCC',
  dotSize = 8,
  dotGap = 8,
  dotColor = '#000000',
  dotInactiveColor = '#F2F2F2'
}: AdaptiveCarouselProps) {
  // Basic state
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemWidth, setItemWidth] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const [directionLock, setDirectionLock] = useState<'horizontal' | 'vertical' | null>(null)
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const velocityHistory = useRef<number[]>([])
  const dragStartTime = useRef<number>(0)
  const isAnimating = useRef(false)
  
  // Screen-width based threshold refs
  const thresholdHighConfidence = useRef(195)
  const thresholdMedium = useRef(156)
  const thresholdEnergetic = useRef(176)
  const thresholdExtremeFlick = useRef(175)
  const thresholdScoring = useRef(160)
  
  // Basic children handling
  const childrenArray = React.Children.toArray(children)
  const totalItems = childrenArray.length

  // Layout calculations
  const itemWidthWithGap = itemWidth + gap
  const maxIndex = Math.max(0, totalItems - columns)

  // Unified velocity scaler system (Less sensitive)
  const actualVelocityScaler = 400 + (velocityScalerPercentage / 100) * 600

  // Update container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        setContainerWidth(width)
      }
    }
    
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Calculate item width (peakAmount handled by overflow/positioning, as in v0.1.1)
  useEffect(() => {
    if (!containerRef.current || containerWidth === 0) return

    const availableSpace = containerWidth - horizontalPadding * 2
    const totalGaps = (columns - 1) * gap
    const widthForCardFaces = availableSpace - totalGaps  // No peakAmount subtraction
    const widthPerItem = widthForCardFaces / columns

    setItemWidth(widthPerItem)
  }, [columns, gap, horizontalPadding, containerWidth])

  // Update gesture thresholds when containerWidth changes
  useEffect(() => {
    if (containerWidth > 0) {
      // Screen-width relative thresholds
      thresholdHighConfidence.current = containerWidth * 0.50  // 50% of screen
      thresholdMedium.current = containerWidth * 0.40          // 40% of screen
      thresholdEnergetic.current = containerWidth * 0.45       // 45% of screen
      thresholdExtremeFlick.current = containerWidth * 0.45    // 45% of screen
      thresholdScoring.current = containerWidth * 0.41         // 41% of screen
    }
  }, [containerWidth])

  // Drag constraints
  const dragConstraints = useMemo(() => {
    if (!containerRef.current || totalItems === 0 || itemWidth === 0 || maxIndex <= 0) {
      return { left: 0, right: 0 }
    }

    const totalContentWidth = itemWidthWithGap * totalItems - gap
    const innerContentArea = containerWidth - horizontalPadding * 2
    const maxDrag = Math.min(0, -(totalContentWidth - innerContentArea + peakAmount))

    return {
      left: maxDrag,
      right: 0,
    }
  }, [itemWidth, totalItems, maxIndex, horizontalPadding, containerWidth, gap, peakAmount])

  // Navigation function with queue management
  const goToIndex = async (index: number, velocity: number = 0, isMultiSkip: boolean = false) => {
    if (itemWidth === 0) return

    // If already animating, stop current animation and proceed immediately
    if (isAnimating.current) {
      x.stop()
    }

    isAnimating.current = true

    try {
      const targetIndex = Math.max(0, Math.min(index, maxIndex))
      const targetX = Math.round(-targetIndex * itemWidthWithGap)

      // FIX: If classified as glide but only moving 1 card, use flick animation
      const cardsMoved = Math.abs(targetIndex - currentIndex)
      const useGlideAnimation = isMultiSkip && cardsMoved > 1
      
      setCurrentIndex(targetIndex)
      
      // Choose animation settings based on actual movement distance
      const stiffness = useGlideAnimation ? glideStiffness : flickStiffness
      const damping = useGlideAnimation ? glideDamping : flickDamping

      // DIFFERENT ANIMATION STRATEGY BASED ON COLUMNS
      if (useGlideAnimation && columns > 1) {
        // Single-step animation for multi-column (prevents overshoot)
        const multiColumnStiffness = Math.min(Math.max(glideStiffness * 1.25, 120), 200)
        const multiColumnDamping = Math.min(Math.max(glideDamping * 1.8, 40), 80)
        
        await animate(x, targetX, {
          type: "spring",
          stiffness: multiColumnStiffness,
          damping: multiColumnDamping,
          velocity: velocity,
        })
      } else if (useGlideAnimation) {
        // Two-step animation for single-column (maintains smoothness)
        // Step 1: Soft glide for momentum and feel
        await animate(x, targetX, {
          type: "spring",
          stiffness: stiffness,
          damping: damping,
          velocity: velocity,
        })
        
        // Step 2: Aggressive final snap for precision
        await animate(x, targetX, {
          type: "spring",
          stiffness: 1000,
          damping: 80,
          velocity: 0,
        })
      } else {
        // Standard flick animation
        await animate(x, targetX, {
          type: "spring",
          stiffness: stiffness,
          damping: damping,
          velocity: velocity,
        })
      }
    } finally {
      isAnimating.current = false
    }
  }

  // Drag handlers
  const handleDragStart = () => {
    x.stop()
    isAnimating.current = false  // Clear animation flag to allow immediate drag
    dragStartTime.current = Date.now()
    velocityHistory.current = []
    setDirectionLock(null)  // Reset direction lock at start of each drag
  }

  const handleDrag = (event: any, info: PanInfo) => {
    // Determine direction lock based on angle (Pure Angle-Based approach)
    if (directionLock === null) {
      const angle = Math.abs(Math.atan2(info.offset.y, info.offset.x) * 180 / Math.PI)
      
      if (angle < 30) {
        // Mostly horizontal (< 30°) → lock to carousel
        setDirectionLock('horizontal')
      } else if (angle > 60) {
        // Mostly vertical (> 60°) → allow page scroll
        setDirectionLock('vertical')
      }
      // 30-60° = diagonal, no lock yet (wait for clearer direction)
    }
    
    // Block page scroll only if locked horizontal
    if (directionLock === 'horizontal' && event.cancelable) {
      event.preventDefault()
    }
    
    velocityHistory.current.push(Math.abs(info.velocity.x))
  }

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (itemWidth === 0) return

    const velocity = Math.abs(info.velocity.x)
    const dragOffset = info.offset.x
    const dragDirection = dragOffset < 0 ? 1 : -1
    const distance = Math.abs(dragOffset)
    const duration = Date.now() - dragStartTime.current

    // Calculate peak acceleration
    let peakAcceleration = 0
    if (velocityHistory.current.length >= 2) {
      const accelerations: number[] = []
      for (let i = 1; i < velocityHistory.current.length; i++) {
        accelerations.push(Math.abs(velocityHistory.current[i] - velocityHistory.current[i - 1]))
      }
      peakAcceleration = Math.max(...accelerations)
    }

    let targetIndex = currentIndex
    let isMultiSkip = false

    // SAFETY RAIL: Catch extreme-acceleration flicks
    if (peakAcceleration > 600 && distance < thresholdExtremeFlick.current) {
      isMultiSkip = false
      const distanceThreshold = itemWidth * (snapThreshold / 100)
      if (distance > distanceThreshold) {
        targetIndex = currentIndex + dragDirection
      } else {
        targetIndex = currentIndex
      }
    } else {
      // WEIGHTED SCORING
      let glideScore = 0
      if (duration > 40) glideScore += 2          // Lowered from 50ms
      if (velocity < 2000) glideScore += 1        // Raised from 1800
      if (distance > thresholdScoring.current) glideScore += 2  // Uses ref
      if (peakAcceleration < 600) glideScore += 1

      if (glideScore < 4) {                       // Lowered from 5
        isMultiSkip = false
        const distanceThreshold = itemWidth * (snapThreshold / 100)
        if (distance > distanceThreshold) {
          targetIndex = currentIndex + dragDirection
        } else {
          targetIndex = currentIndex
        }
      } else {
        // Tier detection for glides (now using screen-width relative thresholds)
        isMultiSkip = true
        if (distance > thresholdHighConfidence.current) {
          const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
          targetIndex = currentIndex + dragDirection * indexJump
        } else if (
          distance > thresholdMedium.current &&
          velocity > GLIDE_VELOCITY_MEDIUM &&
          peakAcceleration > GLIDE_ACCELERATION_MEDIUM
        ) {
          const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
          targetIndex = currentIndex + dragDirection * indexJump
        } else if (
          distance > thresholdEnergetic.current &&
          (velocity > GLIDE_VELOCITY_HIGH || peakAcceleration > GLIDE_ACCELERATION_HIGH)
        ) {
          const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
          targetIndex = currentIndex + dragDirection * indexJump
        } else {
          const distanceThreshold = itemWidth * (snapThreshold / 100)
          if (distance > distanceThreshold) {
            targetIndex = currentIndex + dragDirection
          } else {
            targetIndex = currentIndex
          }
        }
      }
    }

    // FIX: Calculate velocity direction based on actual X-axis movement
    const targetX = -targetIndex * itemWidthWithGap
    const currentX = x.get()
    const xMovementDirection = targetX > currentX ? 1 : -1
    const correctedVelocity = Math.abs(info.velocity.x) * xMovementDirection

    goToIndex(targetIndex, correctedVelocity, isMultiSkip)
    velocityHistory.current = []
  }

  // Navigation functions
  const navigate = (direction: number) => {
    const artificialVelocity = direction * 200
    goToIndex(currentIndex + direction, artificialVelocity, true)
  }
  
  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        if (currentIndex > 0) {
          navigate(-1)
        }
        break
      case 'ArrowRight':
        event.preventDefault()
        if (currentIndex < maxIndex) {
          navigate(1)
        }
        break
      case 'Home':
        event.preventDefault()
        goToIndex(0)
        break
      case 'End':
        event.preventDefault()
        goToIndex(maxIndex)
        break
    }
  }

  // Arrow button keyboard handlers
  const handleArrowKeyDown = (event: React.KeyboardEvent, direction: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (direction === -1 && !disablePrev) {
        navigate(-1)
      } else if (direction === 1 && !disableNext) {
        navigate(1)
      }
    }
  }

  // Dot keyboard handlers
  const handleDotKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      goToIndex(index)
    }
  }

  const disablePrev = currentIndex === 0
  const disableNext = currentIndex === maxIndex

  // Calculate icon size based on button size
  const getIconSize = (buttonSize: number) => {
    switch (buttonSize) {
      case 24: return 16
      case 32: return 24
      case 48: return 32
      case 56: return 40
      default: return 24
    }
  }

  const iconSize = getIconSize(arrowButtonSize)

  // Arrow Icons
  const ArrowLeft = (props: { size: number; color: string }) => (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
        fill={props.color}
      />
    </svg>
  )

  const ArrowRight = (props: { size: number; color: string }) => (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 6L8.59 7.41L13.17 12L8.59 16.59L10 18L16 12L10 6Z"
        fill={props.color}
      />
    </svg>
  )

  // Edge cases
  if (totalItems === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '200px',
        color: '#666',
        fontSize: '16px'
      }}>
        No content to display
      </div>
    )
  }

  if (totalItems === 1) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100%' 
      }}>
        {children}
      </div>
    )
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%", 
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Carousel Content */}
      <div
        ref={containerRef}
        role="region"
        aria-label={`Carousel showing card ${currentIndex + 1} of ${maxIndex + 1}`}
        aria-live="polite"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          touchAction: 'auto',  // Changed from 'pan-x pinch-zoom' to allow directional lock
          overscrollBehavior: 'none',
          overscrollBehaviorX: 'none',
          height: '100%',
          minHeight: '200px',
          // APPLYING PADDING (like working version)
          paddingLeft: `${horizontalPadding}px`,
          paddingRight: `${horizontalPadding}px`,
          paddingTop: `${verticalPadding}px`,
          paddingBottom: `${verticalPadding}px`,
          outline: 'none'
        }}
      >
        <motion.div
          drag="x"
          dragConstraints={dragConstraints}
          dragElastic={0}
          dragMomentum={true}
          dragTransition={{
            power: 0.2,
            timeConstant: 200,
            modifyTarget: (t) => t
          }}
          dragPropagation={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            gap: `${gap}px`,
            x,
            cursor: 'grab',
            minHeight: 0,  // Allows flex child to shrink below content size if needed
            willChange: 'transform',
          }}
          whileTap={{ cursor: 'grabbing' }}
        >
          {childrenArray.map((child, index) => {
            // All cards use the same width (peakAmount handled by overflow/positioning)
            const finalItemWidth = itemWidth

            return (
              <div
                key={index}
                style={{
                  width: `${finalItemWidth}px`,
                  minWidth: `${finalItemWidth}px`,
                  maxWidth: `${finalItemWidth}px`,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {React.cloneElement(child as React.ReactElement<{ style?: React.CSSProperties }>, {
                  style: {
                    ...(child as React.ReactElement<{ style?: React.CSSProperties }>).props?.style,
                    // ONLY force width constraints, NOT height
                    width: '100%',
                    minWidth: 'unset',
                    maxWidth: '100%',
                    // NO height, minHeight, or maxHeight forcing
                  }
                })}
              </div>
            )
          })}
        </motion.div>
      </div>

      {/* Arrow Navigation */}
      {arrowsEnabled && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: `16px ${horizontalPadding}px 0 0`,
            gap: '8px',
          }}
        >
          {/* Previous Button */}
          <motion.button
            onClick={() => navigate(-1)}
            disabled={disablePrev}
            onKeyDown={(e) => handleArrowKeyDown(e, -1)}
            whileTap={{
              backgroundColor: arrowPressedColor,
              scale: 0.95,
            }}
            style={{
              width: `${arrowButtonSize}px`,
              height: `${arrowButtonSize}px`,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: disablePrev ? arrowDisabledColor : arrowColor,
              cursor: disablePrev ? 'not-allowed' : 'pointer',
              padding: 0,
              opacity: disablePrev ? 0.7 : 1,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Previous slide"
          >
            <ArrowLeft
              size={iconSize}
              color={disablePrev ? arrowIconDisabledColor : arrowIconColor}
            />
          </motion.button>

          {/* Next Button */}
          <motion.button
            onClick={() => navigate(1)}
            disabled={disableNext}
            onKeyDown={(e) => handleArrowKeyDown(e, 1)}
            whileTap={{
              backgroundColor: arrowPressedColor,
              scale: 0.95,
            }}
            style={{
              width: `${arrowButtonSize}px`,
              height: `${arrowButtonSize}px`,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: disableNext ? arrowDisabledColor : arrowColor,
              cursor: disableNext ? 'not-allowed' : 'pointer',
              padding: 0,
              opacity: disableNext ? 0.7 : 1,
              transition: 'opacity 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Next slide"
          >
            <ArrowRight
              size={iconSize}
              color={disableNext ? arrowIconDisabledColor : arrowIconColor}
            />
          </motion.button>
        </div>
      )}

      {/* Dots Navigation */}
      {dotsEnabled && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: `${dotGap}px`,
            padding: '16px',
            minHeight: '24px',
          }}
        >
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              onKeyDown={(e) => handleDotKeyDown(e, index)}
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentIndex ? dotColor : dotInactiveColor,
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.3s ease',
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

addPropertyControls(AdaptiveCarousel, {
  children: {
    type: ControlType.Array,
    title: "Items",
    control: {
      type: ControlType.ComponentInstance,
    },
  },
  columns: {
    type: ControlType.Number,
    title: "Columns",
    min: 1,
    max: 6,
    step: 1,
    defaultValue: 1,
    displayStepper: true,
  },
  gap: {
    type: ControlType.Number,
    title: "Gap",
    min: 4,
    max: 50,
    defaultValue: 8,
    unit: "px",
    description: "Spacing between cards.",
  },
  horizontalPadding: {
    type: ControlType.Number,
    title: "Horizontal Padding",
    min: 0,
    max: 100,
    defaultValue: 16,
    unit: "px",
    description: "Padding on both the left and right sides of the carousel.",
  },
  verticalPadding: {
    type: ControlType.Number,
    title: "Vertical Padding",
    min: 0,
    max: 100,
    defaultValue: 0,
    unit: "px",
    description: "Padding on the top and bottom of the carousel.",
  },
  peakAmount: {
    type: ControlType.Number,
    title: "Peek Next (px)",
    min: 0,
    max: 100,
    defaultValue: 16,
    unit: "px",
    description: "Visible pixels of next card (excluding gap)",
  },
  arrowsEnabled: {
    type: ControlType.Boolean,
    title: "Show Arrows",
    defaultValue: true,
  },
  dotsEnabled: {
    type: ControlType.Boolean,
    title: "Show Dots",
    defaultValue: false,
  },
  snapThreshold: {
    type: ControlType.Number,
    title: "Swipe Activation Distance",
    min: 5,
    max: 50,
    step: 5,
    defaultValue: 10,
    displayStepper: true,
    unit: "%",
    description: "The minimum drag distance (as a percentage of a card's width) required to successfully change pages. A shorter swipe will snap back.",
  },
  velocityScalerPercentage: {
    type: ControlType.Number,
    title: "Swipe Sensitivity",
    min: 1,
    max: 100,
    step: 1,
    defaultValue: 20,
    displayStepper: true,
    unit: "%",
    description: "Controls how far a fast swipe glides. Lower value = more pages skipped and a longer animation.",
  },
  flickStiffness: {
    type: ControlType.Number,
    title: "Flick Stiffness",
    min: 100,
    max: 1000,
    step: 50,
    defaultValue: 500,
    displayStepper: true,
    description: "Stiffness used for single-card snaps.",
  },
  flickDamping: {
    type: ControlType.Number,
    title: "Flick Damping",
    min: 10,
    max: 100,
    step: 5,
    defaultValue: 55,
    displayStepper: true,
    description: "Damping used for single-card snaps.",
  },
  glideStiffness: {
    type: ControlType.Number,
    title: "Glide Stiffness",
    min: 50,
    max: 500,
    step: 10,
    defaultValue: 120,
    displayStepper: true,
    description: "Stiffness used for multi-card glides.",
  },
  glideDamping: {
    type: ControlType.Number,
    title: "Glide Damping",
    min: 10,
    max: 100,
    step: 5,
    defaultValue: 25,
    displayStepper: true,
    description: "Damping used for multi-card glides.",
  },
  arrowButtonSize: {
    type: ControlType.Enum,
    title: "Arrow Button Size",
    options: [24, 32, 48, 56],
    optionTitles: ["24px", "32px", "48px", "56px"],
    defaultValue: 32,
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowColor: {
    type: ControlType.Color,
    title: "Arrow Background Color",
    defaultValue: "#F2F2F2",
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowPressedColor: {
    type: ControlType.Color,
    title: "Arrow Pressed Color",
    defaultValue: "#000000",
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowDisabledColor: {
    type: ControlType.Color,
    title: "Arrow Disabled Color",
    defaultValue: "rgba(0, 0, 0, 0)",
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowIconColor: {
    type: ControlType.Color,
    title: "Arrow Icon Color",
    defaultValue: "#4D4D4D",
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowIconDisabledColor: {
    type: ControlType.Color,
    title: "Arrow Icon Disabled Color",
    defaultValue: "#CCCCCC",
    hidden: (props) => !props.arrowsEnabled,
  },
  dotSize: {
    type: ControlType.Number,
    title: "Dot Size",
    min: 4,
    max: 20,
    step: 2,
    defaultValue: 8,
    unit: "px",
    hidden: (props) => !props.dotsEnabled,
  },
  dotGap: {
    type: ControlType.Number,
    title: "Dot Gap",
    min: 0,
    max: 50,
    step: 2,
    defaultValue: 8,
    unit: "px",
    hidden: (props) => !props.dotsEnabled,
  },
  dotColor: {
    type: ControlType.Color,
    title: "Active Dot Color",
    defaultValue: "#000000",
    hidden: (props) => !props.dotsEnabled,
  },
  dotInactiveColor: {
    type: ControlType.Color,
    title: "Inactive Dot Color",
    defaultValue: "#F2F2F2",
    hidden: (props) => !props.dotsEnabled,
  },
})