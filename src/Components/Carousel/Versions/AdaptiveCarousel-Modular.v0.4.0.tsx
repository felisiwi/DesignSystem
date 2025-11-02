import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { addPropertyControls, ControlType } from 'framer'

// Hooks
import { useCarouselDimensions } from '../../../Hooks/useCarouselDimensions'
import { useCarouselNavigation } from '../../../Hooks/useCarouselNavigation'
import { useCarouselGestures } from '../../../Hooks/useCarouselGestures'
import { useCarouselKeyboard } from '../../../Hooks/useCarouselKeyboard'

// Utils
import { calculateDragConstraints, calculateFinalItemWidth } from '../../../Utils/layoutCalculations'
import { getIconSize } from '../../../Utils/iconUtils'

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

export default function Adapt({ 
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
  // Basic children handling
  const childrenArray = React.Children.toArray(children)
  const totalItems = childrenArray.length

  // Custom hooks
  const { itemWidth, containerWidth, containerRef } = useCarouselDimensions(
    columns,
    gap,
    horizontalPadding,
    peakAmount
  )

  const animationConfig = {
    flickStiffness,
    flickDamping,
    glideStiffness,
    glideDamping,
  }

  const maxIndex = Math.max(0, totalItems - columns)
  const { currentIndex, x, goToIndex, navigate } = useCarouselNavigation(
    itemWidth,
    gap,
    maxIndex,
    animationConfig
  )

  // Unified velocity scaler system
  const actualVelocityScaler = 200 + (velocityScalerPercentage / 100) * 1000

  const { handleDragStart, handleDrag, handleDragEnd } = useCarouselGestures(
    currentIndex,
    itemWidth,
    snapThreshold,
    actualVelocityScaler,
    goToIndex
  )

  const { handleKeyDown, handleArrowKeyDown, handleDotKeyDown } = useCarouselKeyboard(
    currentIndex,
    maxIndex,
    goToIndex,
    navigate
  )

  // Layout calculations
  const itemWidthWithGap = itemWidth + gap

  // Drag constraints
  const dragConstraints = useMemo(() => {
    return calculateDragConstraints(
      itemWidth,
      totalItems,
      columns,
      gap,
      horizontalPadding,
      containerWidth,
      peakAmount
    )
  }, [itemWidth, totalItems, columns, gap, horizontalPadding, containerWidth, peakAmount])

  const disablePrev = currentIndex === 0
  const disableNext = currentIndex === maxIndex

  // Calculate icon size based on button size
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
            x,
            cursor: 'grab',
            height: '100%',
            willChange: 'transform',
          }}
          whileTap={{ cursor: 'grabbing' }}
        >
          {childrenArray.map((child, index) => {
            const finalItemWidth = calculateFinalItemWidth(
              index,
              totalItems,
              itemWidth,
              peakAmount,
              gap,
              horizontalPadding
            )

            return (
              <div
                key={index}
                style={{
                  minWidth: `${finalItemWidth}px`,
                  width: `${finalItemWidth}px`,
                  height: '100%',
                  userSelect: 'none',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0
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
            onKeyDown={(e) => handleArrowKeyDown(e, -1, disablePrev, disableNext)}
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
            onKeyDown={(e) => handleArrowKeyDown(e, 1, disablePrev, disableNext)}
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
addPropertyControls(Adapt, {
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
