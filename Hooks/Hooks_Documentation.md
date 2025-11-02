# Carousel Hooks Documentation

This document provides detailed information about the custom hooks used in the AdaptiveCarousel component.

## useCarouselDimensions

Manages container width, item width calculations, and responsive behavior.

### Parameters

```tsx
useCarouselDimensions(
  columns: number,
  gap: number,
  horizontalPadding: number,
  peakAmount: number
)
```

### Returns

```tsx
{
  itemWidth: number,        // Calculated width per item
  containerWidth: number,   // Current container width
  containerRef: RefObject<HTMLDivElement> // Ref to container element
}
```

### Features

- **Responsive width calculation**: Automatically recalculates item widths on container resize
- **Window resize listener**: Debounced resize handling for performance
- **Peek amount consideration**: Accounts for peek functionality in width calculations
- **Multi-column support**: Handles different column configurations

### Usage

```tsx
const { itemWidth, containerWidth, containerRef } = useCarouselDimensions(
  2,    // columns
  12,   // gap
  16,   // horizontalPadding
  20    // peakAmount
)
```

## useCarouselNavigation

Handles navigation logic, animation management, and state updates.

### Parameters

```tsx
useCarouselNavigation(
  itemWidth: number,
  gap: number,
  maxIndex: number,
  animationConfig: AnimationConfig
)
```

### Returns

```tsx
{
  currentIndex: number,                    // Current active index
  x: MotionValue<number>,                 // Framer Motion value for position
  goToIndex: (index: number, velocity?: number, isMultiSkip?: boolean) => Promise<void>,
  navigate: (direction: number) => void
}
```

### Features

- **Two-step animation**: Soft glide followed by precise snap for multi-card movements
- **Animation queuing**: Prevents conflicts by stopping previous animations
- **Velocity-based animations**: Uses gesture velocity for natural feel
- **Boundary enforcement**: Ensures navigation stays within valid range

### Animation Types

1. **Single-step (flick)**: Direct animation for single card movements
2. **Two-step (glide)**: Soft glide + aggressive snap for multi-card movements

### Usage

```tsx
const animationConfig = {
  flickStiffness: 500,
  flickDamping: 55,
  glideStiffness: 120,
  glideDamping: 25
}

const { currentIndex, x, goToIndex, navigate } = useCarouselNavigation(
  itemWidth,
  gap,
  maxIndex,
  animationConfig
)

// Navigate to specific index
await goToIndex(3, 200, true) // index, velocity, isMultiSkip

// Navigate by direction
navigate(1)  // Next
navigate(-1) // Previous
```

## useCarouselGestures

Manages drag gestures, velocity tracking, and gesture detection.

### Parameters

```tsx
useCarouselGestures(
  currentIndex: number,
  itemWidth: number,
  snapThreshold: number,
  actualVelocityScaler: number,
  goToIndex: (index: number, velocity: number, isMultiSkip: boolean) => void
)
```

### Returns

```tsx
{
  handleDragStart: () => void,
  handleDrag: (event: any, info: PanInfo) => void,
  handleDragEnd: (event: any, info: PanInfo) => void
}
```

### Features

- **Velocity tracking**: Maintains history of velocity values during drag
- **Peak acceleration calculation**: Detects gesture intensity
- **Multi-tier gesture detection**: 4-tier system for accurate gesture recognition
- **Automatic gesture classification**: Determines single vs multi-card movement

### Gesture Detection Tiers

1. **High Confidence**: Distance > 145px → Multi-card glide
2. **Medium Confidence**: Distance > 88px + velocity > 75 + acceleration > 18 → Multi-card glide
3. **Energetic**: Distance > 100px + (velocity > 110 OR acceleration > 35) → Multi-card glide
4. **Default**: All other cases → Single card snap

### Usage

```tsx
const { handleDragStart, handleDrag, handleDragEnd } = useCarouselGestures(
  currentIndex,
  itemWidth,
  10,    // snapThreshold
  400,   // actualVelocityScaler
  goToIndex
)

// Use with Framer Motion
<motion.div
  onDragStart={handleDragStart}
  onDrag={handleDrag}
  onDragEnd={handleDragEnd}
>
  {content}
</motion.div>
```

## useCarouselKeyboard

Handles keyboard navigation and accessibility features.

### Parameters

```tsx
useCarouselKeyboard(
  currentIndex: number,
  maxIndex: number,
  goToIndex: (index: number) => void,
  navigate: (direction: number) => void
)
```

### Returns

```tsx
{
  handleKeyDown: (event: React.KeyboardEvent) => void,
  handleArrowKeyDown: (event: React.KeyboardEvent, direction: number, disablePrev: boolean, disableNext: boolean) => void,
  handleDotKeyDown: (event: React.KeyboardEvent, index: number) => void
}
```

### Features

- **Arrow key navigation**: Left/Right arrows for previous/next
- **Home/End support**: Jump to first/last item
- **Button accessibility**: Enter/Space activation for arrows and dots
- **Boundary awareness**: Prevents navigation beyond valid range
- **Event prevention**: Stops default browser behavior

### Supported Keys

| Key | Action | Handler |
|-----|--------|---------|
| `←` | Previous item | `handleKeyDown` |
| `→` | Next item | `handleKeyDown` |
| `Home` | First item | `handleKeyDown` |
| `End` | Last item | `handleKeyDown` |
| `Enter` | Activate focused element | `handleArrowKeyDown` / `handleDotKeyDown` |
| `Space` | Activate focused element | `handleArrowKeyDown` / `handleDotKeyDown` |

### Usage

```tsx
const { handleKeyDown, handleArrowKeyDown, handleDotKeyDown } = useCarouselKeyboard(
  currentIndex,
  maxIndex,
  goToIndex,
  navigate
)

// Main carousel container
<div onKeyDown={handleKeyDown} tabIndex={0}>
  {content}
</div>

// Arrow buttons
<button onKeyDown={(e) => handleArrowKeyDown(e, -1, disablePrev, disableNext)}>
  Previous
</button>

// Dot buttons
<button onKeyDown={(e) => handleDotKeyDown(e, index)}>
  {index + 1}
</button>
```

## Hook Dependencies

### Internal Dependencies

- `useCarouselDimensions` → `useCarouselNavigation` (provides itemWidth)
- `useCarouselNavigation` → `useCarouselGestures` (provides goToIndex)
- `useCarouselNavigation` → `useCarouselKeyboard` (provides goToIndex, navigate)

### External Dependencies

- **React**: `useState`, `useEffect`, `useRef`, `useCallback`
- **Framer Motion**: `useMotionValue`, `animate`, `PanInfo`

## Performance Considerations

### Optimization Strategies

1. **Memoized callbacks**: `useCallback` for event handlers
2. **Ref-based state**: Using refs for values that don't need re-renders
3. **Debounced resize**: Window resize listener with cleanup
4. **Animation queuing**: Prevents conflicting animations

### Memory Management

- **Event listener cleanup**: Proper removal of resize listeners
- **Animation cleanup**: Stopping animations on unmount
- **Ref cleanup**: Clearing refs when no longer needed

## Testing

### Unit Testing Hooks

```tsx
import { renderHook, act } from '@testing-library/react-hooks'
import { useCarouselDimensions } from './useCarouselDimensions'

test('should calculate item width correctly', () => {
  const { result } = renderHook(() => 
    useCarouselDimensions(2, 12, 16, 20)
  )
  
  // Test width calculation logic
  expect(result.current.itemWidth).toBeGreaterThan(0)
})
```

### Integration Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import Adapt from './AdaptiveCarousel.v1.1.0'

test('should navigate with keyboard', () => {
  render(<Adapt>{content}</Adapt>)
  
  const carousel = screen.getByRole('region')
  fireEvent.keyDown(carousel, { key: 'ArrowRight' })
  
  // Assert navigation occurred
})
```

## Common Patterns

### Custom Hook Composition

```tsx
// Create a custom hook that combines multiple carousel hooks
const useAdvancedCarousel = (props) => {
  const dimensions = useCarouselDimensions(/* ... */)
  const navigation = useCarouselNavigation(/* ... */)
  const gestures = useCarouselGestures(/* ... */)
  const keyboard = useCarouselKeyboard(/* ... */)
  
  return {
    ...dimensions,
    ...navigation,
    ...gestures,
    ...keyboard
  }
}
```

### Hook Customization

```tsx
// Extend existing hooks with additional functionality
const useCarouselWithAnalytics = (baseProps) => {
  const carousel = useCarouselNavigation(/* ... */)
  
  const goToIndexWithAnalytics = useCallback(async (index, velocity, isMultiSkip) => {
    // Track navigation event
    analytics.track('carousel_navigation', { index, velocity, isMultiSkip })
    
    // Call original function
    return carousel.goToIndex(index, velocity, isMultiSkip)
  }, [carousel.goToIndex])
  
  return {
    ...carousel,
    goToIndex: goToIndexWithAnalytics
  }
}
```
