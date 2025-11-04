# AdaptiveCarousel v1.0.4 - API Reference

## Table of Contents

1. [Component API](#component-api)
2. [Hooks API](#hooks-api)
3. [Utilities API](#utilities-api)
4. [Types](#types)
5. [Examples](#examples)
6. [Migration Guide](#migration-guide)

## Component API

### AdaptiveCarousel

The main carousel component with full gesture support and customization options.

```tsx
import Adapt from './AdaptiveCarousel.v1.0.4'

<Adapt {...props}>
  {children}
</Adapt>
```

#### Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `React.ReactNode` | - | ✅ | Content to display in the carousel |
| `columns` | `number` | `1` | ❌ | Number of visible columns (1-6) |
| `gap` | `number` | `8` | ❌ | Space between cards in pixels (4-50) |
| `horizontalPadding` | `number` | `16` | ❌ | Horizontal padding in pixels (0-100) |
| `verticalPadding` | `number` | `0` | ❌ | Vertical padding in pixels (0-100) |
| `peakAmount` | `number` | `16` | ❌ | How much of the next card to show in pixels (0-100) |
| `snapThreshold` | `number` | `10` | ❌ | Percentage of card width to trigger advance (5-50) |
| `velocityScaler` | `number` | `300` | ❌ | Legacy velocity scaler (deprecated) |
| `velocityScalerPercentage` | `number` | `20` | ❌ | Swipe sensitivity (1-100) |
| `flickStiffness` | `number` | `500` | ❌ | Stiffness for single card movements (100-1000) |
| `flickDamping` | `number` | `55` | ❌ | Damping for single card movements (10-100) |
| `glideStiffness` | `number` | `120` | ❌ | Stiffness for multi-card glides (50-500) |
| `glideDamping` | `number` | `25` | ❌ | Damping for multi-card glides (10-100) |
| `arrowsEnabled` | `boolean` | `true` | ❌ | Show navigation arrows |
| `arrowButtonSize` | `number` | `32` | ❌ | Arrow button size (24, 32, 48, 56) |
| `arrowColor` | `string` | `'#F2F2F2'` | ❌ | Arrow background color |
| `arrowPressedColor` | `string` | `'#000000'` | ❌ | Arrow pressed state color |
| `arrowDisabledColor` | `string` | `'rgba(0, 0, 0, 0)'` | ❌ | Arrow disabled state color |
| `arrowIconColor` | `string` | `'#4D4D4D'` | ❌ | Arrow icon color |
| `arrowIconDisabledColor` | `string` | `'#CCCCCC'` | ❌ | Arrow icon disabled color |
| `dotsEnabled` | `boolean` | `false` | ❌ | Show navigation dots |
| `dotSize` | `number` | `8` | ❌ | Dot size in pixels (4-20) |
| `dotGap` | `number` | `8` | ❌ | Gap between dots in pixels (0-50) |
| `dotColor` | `string` | `'#000000'` | ❌ | Active dot color |
| `dotInactiveColor` | `string` | `'#F2F2F2'` | ❌ | Inactive dot color |

## Hooks API

### useCarouselDimensions

Manages container and item width calculations.

```tsx
import { useCarouselDimensions } from '../Hooks/useCarouselDimensions'

const { itemWidth, containerWidth, containerRef } = useCarouselDimensions(
  columns: number,
  gap: number,
  horizontalPadding: number,
  peakAmount: number
)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `columns` | `number` | Number of columns |
| `gap` | `number` | Gap between items |
| `horizontalPadding` | `number` | Horizontal padding |
| `peakAmount` | `number` | Peek amount |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `itemWidth` | `number` | Calculated width per item |
| `containerWidth` | `number` | Current container width |
| `containerRef` | `RefObject<HTMLDivElement>` | Ref to container element |

### useCarouselNavigation

Handles navigation logic and animations.

```tsx
import { useCarouselNavigation } from '../Hooks/useCarouselNavigation'

const { currentIndex, x, goToIndex, navigate } = useCarouselNavigation(
  itemWidth: number,
  gap: number,
  maxIndex: number,
  animationConfig: AnimationConfig
)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemWidth` | `number` | Width of individual items |
| `gap` | `number` | Gap between items |
| `maxIndex` | `number` | Maximum valid index |
| `animationConfig` | `AnimationConfig` | Animation configuration |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `currentIndex` | `number` | Current active index |
| `x` | `MotionValue<number>` | Framer Motion position value |
| `goToIndex` | `(index: number, velocity?: number, isMultiSkip?: boolean) => Promise<void>` | Navigate to specific index |
| `navigate` | `(direction: number) => void` | Navigate by direction |

### useCarouselGestures

Manages drag gestures and velocity tracking.

```tsx
import { useCarouselGestures } from '../Hooks/useCarouselGestures'

const { handleDragStart, handleDrag, handleDragEnd } = useCarouselGestures(
  currentIndex: number,
  itemWidth: number,
  snapThreshold: number,
  actualVelocityScaler: number,
  goToIndex: (index: number, velocity: number, isMultiSkip: boolean) => void
)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `currentIndex` | `number` | Current carousel index |
| `itemWidth` | `number` | Width of individual items |
| `snapThreshold` | `number` | Snap threshold percentage |
| `actualVelocityScaler` | `number` | Velocity scaling factor |
| `goToIndex` | `Function` | Navigation function |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `handleDragStart` | `() => void` | Drag start handler |
| `handleDrag` | `(event: any, info: PanInfo) => void` | Drag handler |
| `handleDragEnd` | `(event: any, info: PanInfo) => void` | Drag end handler |

### useCarouselKeyboard

Handles keyboard navigation and accessibility.

```tsx
import { useCarouselKeyboard } from '../Hooks/useCarouselKeyboard'

const { handleKeyDown, handleArrowKeyDown, handleDotKeyDown } = useCarouselKeyboard(
  currentIndex: number,
  maxIndex: number,
  goToIndex: (index: number) => void,
  navigate: (direction: number) => void
)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `currentIndex` | `number` | Current carousel index |
| `maxIndex` | `number` | Maximum valid index |
| `goToIndex` | `Function` | Navigation function |
| `navigate` | `Function` | Direction navigation function |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `handleKeyDown` | `(event: React.KeyboardEvent) => void` | Main keyboard handler |
| `handleArrowKeyDown` | `(event: React.KeyboardEvent, direction: number, disablePrev: boolean, disableNext: boolean) => void` | Arrow button handler |
| `handleDotKeyDown` | `(event: React.KeyboardEvent, index: number) => void` | Dot button handler |

## Utilities API

### Gesture Detection

```tsx
import { detectGesture, GESTURE_CONSTANTS } from '../Utils/gestureDetection'

// Constants
GESTURE_CONSTANTS.GLIDE_DISTANCE_HIGH_CONFIDENCE // 145
GESTURE_CONSTANTS.GLIDE_DISTANCE_MEDIUM // 88
// ... other constants

// Main function
const result = detectGesture(
  distance: number,
  velocity: number,
  peakAcceleration: number,
  currentIndex: number,
  dragDirection: number,
  actualVelocityScaler: number,
  itemWidth: number,
  snapThreshold: number
): GestureDetectionResult
```

### Animation Configuration

```tsx
import { getAnimationSettings, getFinalSnapSettings } from '../Utils/animationConfig'

// Get animation settings
const settings = getAnimationSettings(
  isMultiSkip: boolean,
  config: AnimationConfig
): { stiffness: number, damping: number }

// Get final snap settings
const finalSettings = getFinalSnapSettings(): { stiffness: number, damping: number, velocity: number }
```

### Layout Calculations

```tsx
import { 
  calculateItemWidth, 
  calculateDragConstraints, 
  calculateFinalItemWidth 
} from '../Utils/layoutCalculations'

// Calculate item width
const itemWidth = calculateItemWidth(params: LayoutParams): number

// Calculate drag constraints
const constraints = calculateDragConstraints(
  itemWidth: number,
  totalItems: number,
  columns: number,
  gap: number,
  horizontalPadding: number,
  containerWidth: number,
  peakAmount: number
): { left: number, right: number }

// Calculate final item width
const finalWidth = calculateFinalItemWidth(
  index: number,
  totalItems: number,
  itemWidth: number,
  peakAmount: number,
  gap: number,
  horizontalPadding: number
): number
```

### Icon Utilities

```tsx
import { getIconSize } from '../Utils/iconUtils'

const iconSize = getIconSize(buttonSize: number): number
```

## Types

### Core Types

```tsx
interface CursorCarouselProps {
  children: React.ReactNode
  columns?: number
  gap?: number
  horizontalPadding?: number
  peakAmount?: number
  arrowsEnabled?: boolean
  dotsEnabled?: boolean
  snapThreshold?: number
  velocityScaler?: number
  flickStiffness?: number
  flickDamping?: number
  glideStiffness?: number
  glideDamping?: number
  velocityScalerPercentage?: number
  arrowButtonSize?: number
  arrowColor?: string
  arrowPressedColor?: string
  arrowDisabledColor?: string
  arrowIconColor?: string
  arrowIconDisabledColor?: string
  verticalPadding?: number
  dotSize?: number
  dotGap?: number
  dotColor?: string
  dotInactiveColor?: string
}

interface AnimationConfig {
  flickStiffness: number
  flickDamping: number
  glideStiffness: number
  glideDamping: number
}

interface GestureDetectionResult {
  targetIndex: number
  isMultiSkip: boolean
}

interface LayoutParams {
  containerWidth: number
  columns: number
  gap: number
  horizontalPadding: number
  peakAmount: number
}
```

## Examples

### Basic Usage

```tsx
import Adapt from './AdaptiveCarousel.v1.0.4'

function MyCarousel() {
  return (
    <Adapt>
      <div>Slide 1</div>
      <div>Slide 2</div>
      <div>Slide 3</div>
    </Adapt>
  )
}
```

### Advanced Configuration

```tsx
import Adapt from './AdaptiveCarousel.v1.0.4'

function AdvancedCarousel() {
  return (
    <Adapt
      columns={2}
      gap={16}
      peakAmount={24}
      arrowsEnabled={true}
      dotsEnabled={true}
      velocityScalerPercentage={10}
      flickStiffness={600}
      flickDamping={45}
      arrowColor="#007AFF"
      arrowIconColor="#FFFFFF"
      dotColor="#007AFF"
      dotInactiveColor="#E5E5EA"
    >
      {items.map(item => (
        <Card key={item.id} {...item} />
      ))}
    </Adapt>
  )
}
```

### Custom Hook Usage

```tsx
import { useCarouselDimensions, useCarouselNavigation } from '../Hooks'

function CustomCarousel() {
  const { itemWidth, containerRef } = useCarouselDimensions(2, 12, 16, 20)
  const { currentIndex, navigate } = useCarouselNavigation(
    itemWidth, 12, 5, { flickStiffness: 500, flickDamping: 55, glideStiffness: 120, glideDamping: 25 }
  )
  
  return (
    <div ref={containerRef}>
      <button onClick={() => navigate(-1)}>Previous</button>
      <span>Current: {currentIndex}</span>
      <button onClick={() => navigate(1)}>Next</button>
    </div>
  )
}
```

### Utility Usage

```tsx
import { detectGesture, calculateItemWidth } from '../Utils'

// Gesture detection
const gesture = detectGesture(150, 200, 25, 2, 1, 400, 200, 10)
console.log(gesture) // { targetIndex: 3, isMultiSkip: true }

// Layout calculation
const width = calculateItemWidth({
  containerWidth: 800,
  columns: 2,
  gap: 12,
  horizontalPadding: 16,
  peakAmount: 20
})
console.log(width) // 366
```

## Migration Guide

### From v1.0.4 to v1.0.4

The refactored version is a drop-in replacement with no breaking changes:

```tsx
// Before (v1.0.4)
import Adapt from './AdaptiveCarousel.v1.0.4'

// After (v1.0.4)
import Adapt from './AdaptiveCarousel.v1.0.4'

// No other changes required!
```

### New Features Available

1. **Modular Hooks**: Use individual hooks for custom implementations
2. **Utility Functions**: Access low-level functions for advanced use cases
3. **Better TypeScript Support**: Improved type definitions
4. **Enhanced Testing**: Easier to unit test individual pieces

### Performance Improvements

- **Reduced Bundle Size**: Tree-shaking friendly exports
- **Better Memory Management**: Proper cleanup of event listeners
- **Optimized Re-renders**: Memoized calculations and callbacks

## Browser Support

- **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 60+
- **Touch Support**: Full gesture support on touch devices
- **Keyboard Support**: Full accessibility support

## License

This API is part of your portfolio project. All rights reserved.
