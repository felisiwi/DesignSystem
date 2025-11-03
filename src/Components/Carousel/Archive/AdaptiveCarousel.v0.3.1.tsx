import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, useMotionValue, animate, PanInfo } from 'framer-motion'
import { addPropertyControls, ControlType } from 'framer'

interface CursorCarouselProps {
  children: React.ReactNode
  columns?: number
  gap?: number
  horizontalPadding?: number
  peakAmount?: number
  arrowsEnabled?: boolean
  dotsEnabled?: boolean
  // Gesture detection props
  snapThreshold?: number
  velocityScaler?: number
  // Animation props
  flickStiffness?: number
  flickDamping?: number
  glideStiffness?: number
  glideDamping?: number
  // Velocity scaler percentage (1-100% maps to 200-1200)
  velocityScalerPercentage?: number
  // Arrow styling props
  arrowButtonSize?: number
  arrowColor?: string
  arrowPressedColor?: string
  arrowDisabledColor?: string
  arrowIconColor?: string
  arrowIconDisabledColor?: string
  // Vertical padding
  verticalPadding?: number
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
  verticalPadding = 0,
        dotSize = 8,
  dotGap = 8,
  dotColor = '#000000',
  dotInactiveColor = '#F2F2F2'
}: CursorCarouselProps) {
  // Basic state
    const [currentIndex, setCurrentIndex] = useState(0)
    const [itemWidth, setItemWidth] = useState(0)
    const [containerWidth, setContainerWidth] = useState(0)
  
  // Refs
    const containerRef = useRef<HTMLDivElement>(null)
    const x = useMotionValue(0)
    const velocityHistory = useRef<number[]>([])
  const dragStartTime = useRef<number>(0)
  const isAnimating = useRef(false)
  
  // Basic children handling
  const childrenArray = React.Children.toArray(children)
  const totalItems = childrenArray.length

  // Gesture detection constants (original values for better flick sensitivity)
  const GLIDE_DISTANCE_HIGH_CONFIDENCE = 145
  const GLIDE_DISTANCE_MEDIUM = 88
  const GLIDE_VELOCITY_MEDIUM = 75
  const GLIDE_ACCELERATION_MEDIUM = 18
  const GLIDE_DISTANCE_ENERGETIC = 100
  const GLIDE_VELOCITY_HIGH = 110
  const GLIDE_ACCELERATION_HIGH = 35

  // Layout calculations
  const finalItemWidth = itemWidth || 179 // Force 179px if still 0
  const itemWidthWithGap = finalItemWidth + gap
  const maxIndex = Math.max(0, totalItems - columns)

  // Drag constraints
  const dragConstraints = useMemo(() => {
    if (!containerRef.current || totalItems === 0 || finalItemWidth === 0 || maxIndex <= 0) {
      return { left: 0, right: 0 }
    }

    const totalContentWidth = itemWidthWithGap * totalItems - gap
    const innerContentArea = containerWidth - horizontalPadding * 2
    const maxDrag = Math.min(0, -(totalContentWidth - innerContentArea + (peakAmount || 0)))

    return {
      left: maxDrag,
      right: 0,
    }
  }, [itemWidth, totalItems, maxIndex, horizontalPadding, containerWidth, gap, peakAmount])

  // Update container width
  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth
        console.log('Container width detected:', width)
        setContainerWidth(width)
      }
    }
    
    // Try immediately
    updateWidth()
    
    // Try again after a short delay
    const timeoutId = setTimeout(updateWidth, 100)
    
    // Try on resize
    window.addEventListener('resize', updateWidth)
    
    // Try on intersection observer (when component becomes visible)
    const observer = new IntersectionObserver(() => {
      updateWidth()
    })
    
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateWidth)
      observer.disconnect()
    }
  }, [])

  // Calculate item width
  useEffect(() => {
    if (!containerRef.current) return

    // Use a fallback width if containerWidth is 0
    const effectiveContainerWidth = containerWidth || 390 // Fallback to 390px
    const availableSpace = effectiveContainerWidth - horizontalPadding * 2
    const widthPerItem = Math.floor(availableSpace / columns)
    
    console.log('Width Debug:', {
      containerWidth,
      effectiveContainerWidth,
      horizontalPadding,
      availableSpace,
      columns,
      widthPerItem
    })

    setItemWidth(widthPerItem)
  }, [columns, gap, horizontalPadding, peakAmount, containerWidth])


  // Unified velocity scaler system
  const actualVelocityScaler = 200 + (velocityScalerPercentage / 100) * 1000

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
      setCurrentIndex(targetIndex)
      const targetX = Math.round(-targetIndex * itemWidthWithGap)

      // Choose animation settings based on gesture type
      const stiffness = isMultiSkip ? glideStiffness : flickStiffness
      const damping = isMultiSkip ? glideDamping : flickDamping

      // Two-Step Animation for precise stops
      if (isMultiSkip) {
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
        // Single-step animation for flicks
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
    }

    const handleDrag = (event: any, info: PanInfo) => {
        velocityHistory.current.push(Math.abs(info.velocity.x))
    }

    const handleDragEnd = (event: any, info: PanInfo) => {
    if (itemWidth === 0) return

        const velocity = Math.abs(info.velocity.x)
    const dragOffset = info.offset.x
    const dragDirection = dragOffset < 0 ? 1 : -1
    const distance = Math.abs(dragOffset)

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

        // TIERED GESTURE DETECTION (93.25% accuracy)
    // Tier 1: High confidence - Long distance
        if (distance > GLIDE_DISTANCE_HIGH_CONFIDENCE) {
      const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
      targetIndex = currentIndex + dragDirection * indexJump
            isMultiSkip = true
        }
    // Tier 2: Medium confidence - All signals must agree
        else if (
            distance > GLIDE_DISTANCE_MEDIUM &&
            velocity > GLIDE_VELOCITY_MEDIUM &&
            peakAcceleration > GLIDE_ACCELERATION_MEDIUM
        ) {
      const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
      targetIndex = currentIndex + dragDirection * indexJump
            isMultiSkip = true
        }
    // Tier 3: Energetic gesture - Strong velocity OR burst
        else if (
            distance > GLIDE_DISTANCE_ENERGETIC &&
      (velocity > GLIDE_VELOCITY_HIGH || peakAcceleration > GLIDE_ACCELERATION_HIGH)
        ) {
      const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
      targetIndex = currentIndex + dragDirection * indexJump
            isMultiSkip = true
        }
    // Tier 4: Default - single card snap or snap back
        else {
      const distanceThreshold = itemWidth * (snapThreshold / 100)
            if (distance > distanceThreshold) {
        targetIndex = currentIndex + dragDirection
            } else {
                targetIndex = currentIndex
            }
        }

    // Execute the animation
        goToIndex(targetIndex, info.velocity.x * dragDirection, isMultiSkip)
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
                ref={containerRef}
                style={{
        width: '100%', 
        height: '100%',
        minHeight: '200px', // Ensure minimum height
        display: 'flex',
        flexDirection: 'column',
        paddingTop: `${verticalPadding}px`,
        paddingBottom: `${verticalPadding}px`,
      }}
    >
      {/* CSS injection for children to fill containers */}
      <style>
        {`
          .carousel-item-content {
            width: 100% !important;
            height: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            min-height: 0 !important;
          }
        `}
      </style>
      
      {/* Carousel content with Framer Motion drag */}
      <div
                role="region"
        aria-label="Carousel navigation"
                aria-live="polite"
        aria-atomic="true"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          touchAction: 'pan-y',
          overscrollBehavior: 'none',
          overscrollBehaviorX: 'none',
          paddingLeft: `${horizontalPadding}px`,
          paddingRight: `${horizontalPadding}px`,
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
            paddingLeft: horizontalPadding,
            paddingRight: horizontalPadding - peakAmount,
            x,
            cursor: 'grab',
            height: '100%',
            willChange: 'transform',
          }}
          whileTap={{ cursor: 'grabbing' }}
        >
          {childrenArray.map((child, index) => {
            return (
              <div
                key={index}
                style={{
                  width: `${finalItemWidth}px !important`,
                  minWidth: `${finalItemWidth}px !important`,
                  maxWidth: `${finalItemWidth}px !important`,
                  height: '100%',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div className="carousel-item-content">
                  {child}
                                </div>
                            </div>
            )
          })}
                </motion.div>
                        </div>

      {/* Navigation arrows */}
      {arrowsEnabled && (
                    <div
                        style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '16px',
            paddingRight: `${horizontalPadding}px`,
            gap: '8px'
                        }}
                    >
                        <button
            onClick={() => navigate(-1)}
            onKeyDown={(e) => handleArrowKeyDown(e, -1)}
            disabled={disablePrev}
            aria-label="Previous card"
            aria-disabled={disablePrev}
                            style={{
              width: `${arrowButtonSize}px`,
              height: `${arrowButtonSize}px`,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: disablePrev ? arrowDisabledColor : arrowColor,
              color: disablePrev ? arrowIconDisabledColor : arrowIconColor,
              cursor: disablePrev ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseDown={(e) => {
              if (currentIndex > 0) {
                e.currentTarget.style.backgroundColor = arrowPressedColor
              }
            }}
            onMouseUp={(e) => {
              if (currentIndex > 0) {
                e.currentTarget.style.backgroundColor = arrowColor
              }
            }}
            onMouseLeave={(e) => {
              if (currentIndex > 0) {
                e.currentTarget.style.backgroundColor = arrowColor
              }
            }}
          >
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
              <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="currentColor"/>
                            </svg>
                        </button>
                        <button
            onClick={() => navigate(1)}
            onKeyDown={(e) => handleArrowKeyDown(e, 1)}
            disabled={disableNext}
            aria-label="Next card"
            aria-disabled={disableNext}
                            style={{
              width: `${arrowButtonSize}px`,
              height: `${arrowButtonSize}px`,
              borderRadius: '50%',
              border: 'none',
              backgroundColor: disableNext ? arrowDisabledColor : arrowColor,
              color: disableNext ? arrowIconDisabledColor : arrowIconColor,
              cursor: disableNext ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseDown={(e) => {
              if (currentIndex < totalItems - 1) {
                e.currentTarget.style.backgroundColor = arrowPressedColor
              }
            }}
            onMouseUp={(e) => {
              if (currentIndex < totalItems - 1) {
                e.currentTarget.style.backgroundColor = arrowColor
              }
            }}
            onMouseLeave={(e) => {
              if (currentIndex < totalItems - 1) {
                e.currentTarget.style.backgroundColor = arrowColor
              }
            }}
          >
            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
              <path d="M10 6L8.59 7.41L13.17 12L8.59 16.59L10 18L16 12L10 6Z" fill="currentColor"/>
                            </svg>
                        </button>
                    </div>
                )}

      {/* Navigation dots */}
      {dotsEnabled && (
                    <div
                        style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: '16px',
            gap: `${dotGap}px`
          }}
        >
          {childrenArray.map((_, index) => (
                            <button
                                key={index}
              onClick={() => goToIndex(index)}
              onKeyDown={(e) => handleDotKeyDown(e, index)}
              aria-label={`Go to card ${index + 1}`}
              aria-selected={index === currentIndex}
                                style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                minWidth: `${dotSize}px`,
                minHeight: `${dotSize}px`,
                maxWidth: `${dotSize}px`,
                maxHeight: `${dotSize}px`,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentIndex ? dotColor : dotInactiveColor,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                flexShrink: 0,
                flexGrow: 0,
                flexBasis: 'auto',
                aspectRatio: '1 / 1',
                boxSizing: 'border-box',
                                    padding: 0,
                margin: 0,
                outline: 'none'
              }}
                            />
                        ))}
                    </div>
                )}
            </div>
  )
}

// Property controls
addPropertyControls(AdaptiveCarousel, {
    children: {
        type: ControlType.Array,
    title: 'Children',
    description: 'Content to display in the carousel',
        control: {
      type: ControlType.ComponentInstance
    }
        },
    columns: {
        type: ControlType.Number,
    title: 'Columns',
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 1,
    displayStepper: true
    },
    gap: {
        type: ControlType.Number,
    title: 'Gap',
    description: 'Space between cards in pixels',
    min: 4,
    max: 50,
        step: 4,
        defaultValue: 8,
    displayStepper: true
    },
  horizontalPadding: {
    type: ControlType.Number,
    title: 'Horizontal Padding',
        min: 0,
    max: 100,
        step: 4,
        defaultValue: 16,
    displayStepper: true
    },
  verticalPadding: {
        type: ControlType.Number,
    title: 'Vertical Padding',
        min: 0,
        max: 100,
        step: 4,
        defaultValue: 0,
    displayStepper: true
    },
  peakAmount: {
        type: ControlType.Number,
    title: 'Peak Amount',
    description: 'How much of the next card to show in pixels',
        min: 0,
        max: 100,
        step: 4,
        defaultValue: 16,
    displayStepper: true
  },
  snapThreshold: {
    type: ControlType.Number,
    title: 'Snap Threshold',
    description: 'Percentage of card width to trigger advance',
    min: 5,
    max: 50,
    defaultValue: 10
  },
  velocityScalerPercentage: {
        type: ControlType.Number,
    title: 'Swipe Sensitivity',
    description: 'How sensitive your swipes are (1% = very sensitive, 100% = not sensitive)',
    min: 1,
    max: 100,
    defaultValue: 20
  },
    flickStiffness: {
        type: ControlType.Number,
    title: 'Flick Stiffness',
    description: 'Stiffness for single card movements',
        min: 100,
        max: 1000,
        step: 50,
        defaultValue: 500,
    displayStepper: true
    },
    flickDamping: {
        type: ControlType.Number,
    title: 'Flick Damping',
    description: 'Damping for single card movements',
        min: 10,
        max: 100,
        step: 5,
    defaultValue: 55,
    displayStepper: true
    },
    glideStiffness: {
        type: ControlType.Number,
    title: 'Glide Stiffness',
    description: 'Stiffness for multi-card glides',
        min: 50,
        max: 500,
    step: 25,
        defaultValue: 120,
    displayStepper: true
    },
    glideDamping: {
        type: ControlType.Number,
    title: 'Glide Damping',
    description: 'Damping for multi-card glides',
        min: 10,
        max: 100,
        step: 5,
    defaultValue: 25,
    displayStepper: true
  },
    arrowsEnabled: {
        type: ControlType.Boolean,
    title: 'Arrows',
    defaultValue: true
    },
    arrowButtonSize: {
    type: ControlType.Enum,
    title: 'Arrow Button Size',
    options: [24, 32, 48, 56],
    optionTitles: ['24px', '32px', '48px', '56px'],
        defaultValue: 32,
    hidden: (props) => !props.arrowsEnabled
  },
  arrowColor: {
        type: ControlType.Color,
    title: 'Arrow Color',
    defaultValue: '#F2F2F2',
    hidden: (props) => !props.arrowsEnabled
  },
  arrowPressedColor: {
        type: ControlType.Color,
    title: 'Arrow Pressed Color',
    defaultValue: '#000000',
    hidden: (props) => !props.arrowsEnabled
  },
  arrowDisabledColor: {
        type: ControlType.Color,
    title: 'Arrow Disabled Color',
    defaultValue: 'rgba(0, 0, 0, 0)',
    hidden: (props) => !props.arrowsEnabled
  },
  arrowIconColor: {
        type: ControlType.Color,
    title: 'Arrow Icon Color',
    defaultValue: '#4D4D4D',
    hidden: (props) => !props.arrowsEnabled
  },
  arrowIconDisabledColor: {
        type: ControlType.Color,
    title: 'Arrow Icon Disabled Color',
    defaultValue: '#CCCCCC',
    hidden: (props) => !props.arrowsEnabled
  },
    dotsEnabled: {
        type: ControlType.Boolean,
    title: 'Dots',
    defaultValue: false
    },
    dotSize: {
        type: ControlType.Number,
    title: 'Dot Size',
    description: 'Size of navigation dots in pixels',
        min: 4,
        max: 20,
        step: 2,
        defaultValue: 8,
    displayStepper: true,
    hidden: (props) => !props.dotsEnabled
    },
  dotGap: {
        type: ControlType.Number,
    title: 'Dot Gap',
    description: 'Gap between dots in pixels',
    min: 0,
    max: 50,
        step: 2,
        defaultValue: 8,
    displayStepper: true,
    hidden: (props) => !props.dotsEnabled
    },
  dotColor: {
        type: ControlType.Color,
    title: 'Dot Color',
    description: 'Color of active dots',
    defaultValue: '#000000',
    hidden: (props) => !props.dotsEnabled
  },
  dotInactiveColor: {
        type: ControlType.Color,
    title: 'Dot Inactive Color',
    description: 'Color of inactive dots',
    defaultValue: '#F2F2F2',
    hidden: (props) => !props.dotsEnabled
    },
})