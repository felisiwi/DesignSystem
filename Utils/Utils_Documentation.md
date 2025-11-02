# Carousel Utilities Documentation

This document provides detailed information about the utility functions used in the AdaptiveCarousel component.

## gestureDetection.ts

Contains gesture detection constants and the main gesture recognition algorithm.

### Constants

```tsx
export const GESTURE_CONSTANTS = {
  GLIDE_DISTANCE_HIGH_CONFIDENCE: 145,
  GLIDE_DISTANCE_MEDIUM: 88,
  GLIDE_VELOCITY_MEDIUM: 75,
  GLIDE_ACCELERATION_MEDIUM: 18,
  GLIDE_DISTANCE_ENERGETIC: 100,
  GLIDE_VELOCITY_HIGH: 110,
  GLIDE_ACCELERATION_HIGH: 35,
} as const
```

### Types

```tsx
interface GestureDetectionResult {
  targetIndex: number    // Calculated target index
  isMultiSkip: boolean  // Whether to use multi-card animation
}
```

### Functions

#### `detectGesture()`

Main gesture detection function that analyzes drag parameters and determines navigation behavior.

```tsx
detectGesture(
  distance: number,              // Drag distance in pixels
  velocity: number,              // Drag velocity
  peakAcceleration: number,      // Peak acceleration during drag
  currentIndex: number,          // Current carousel index
  dragDirection: number,         // -1 for left, 1 for right
  actualVelocityScaler: number,  // Velocity scaling factor
  itemWidth: number,             // Width of individual items
  snapThreshold: number          // Threshold percentage for single card snap
): GestureDetectionResult
```

**Algorithm Overview:**

1. **Tier 1 - High Confidence**: Long distance swipes (>145px) → Multi-card glide
2. **Tier 2 - Medium Confidence**: Medium distance + velocity + acceleration → Multi-card glide  
3. **Tier 3 - Energetic**: Medium distance + high velocity OR acceleration → Multi-card glide
4. **Tier 4 - Default**: All other cases → Single card snap or snap back

**Usage:**
```tsx
import { detectGesture } from '../Utils/gestureDetection'

const { targetIndex, isMultiSkip } = detectGesture(
  dragDistance,
  dragVelocity,
  peakAcceleration,
  currentIndex,
  dragDirection,
  velocityScaler,
  itemWidth,
  snapThreshold
)
```

## animationConfig.ts

Manages animation configuration and provides animation settings based on gesture type.

### Types

```tsx
interface AnimationConfig {
  flickStiffness: number    // Spring stiffness for single card movements
  flickDamping: number      // Spring damping for single card movements
  glideStiffness: number    // Spring stiffness for multi-card glides
  glideDamping: number      // Spring damping for multi-card glides
}
```

### Functions

#### `getAnimationSettings()`

Returns appropriate animation settings based on gesture type.

```tsx
getAnimationSettings(
  isMultiSkip: boolean,     // Whether this is a multi-card gesture
  config: AnimationConfig   // Animation configuration object
): { stiffness: number, damping: number }
```

**Usage:**
```tsx
import { getAnimationSettings } from '../Utils/animationConfig'

const config = {
  flickStiffness: 500,
  flickDamping: 55,
  glideStiffness: 120,
  glideDamping: 25
}

const { stiffness, damping } = getAnimationSettings(true, config)
// Returns: { stiffness: 120, damping: 25 } (glide settings)
```

#### `getFinalSnapSettings()`

Returns settings for the final snap animation in two-step animations.

```tsx
getFinalSnapSettings(): { stiffness: number, damping: number, velocity: number }
```

**Returns:**
- `stiffness: 1000` - High stiffness for precise positioning
- `damping: 80` - High damping to prevent overshoot
- `velocity: 0` - No initial velocity for final snap

**Usage:**
```tsx
import { getFinalSnapSettings } from '../Utils/animationConfig'

const finalSettings = getFinalSnapSettings()
// Returns: { stiffness: 1000, damping: 80, velocity: 0 }
```

## layoutCalculations.ts

Handles all layout and positioning calculations for the carousel.

### Types

```tsx
interface LayoutParams {
  containerWidth: number      // Total container width
  columns: number            // Number of columns
  gap: number               // Gap between items
  horizontalPadding: number  // Horizontal padding
  peakAmount: number        // Peek amount for next item
}
```

### Functions

#### `calculateItemWidth()`

Calculates the width of individual carousel items based on container dimensions and layout parameters.

```tsx
calculateItemWidth(params: LayoutParams): number
```

**Calculation Logic:**
1. Calculate available space: `containerWidth - (horizontalPadding * 2)`
2. Subtract gap space: `availableSpace - ((columns - 1) * gap)`
3. Subtract peak amount: `remainingSpace - peakAmount`
4. Divide by columns: `finalSpace / columns`

**Usage:**
```tsx
import { calculateItemWidth } from '../Utils/layoutCalculations'

const itemWidth = calculateItemWidth({
  containerWidth: 800,
  columns: 2,
  gap: 12,
  horizontalPadding: 16,
  peakAmount: 20
})
// Returns calculated width per item
```

#### `calculateDragConstraints()`

Calculates the drag boundaries for the carousel content.

```tsx
calculateDragConstraints(
  itemWidth: number,
  totalItems: number,
  columns: number,
  gap: number,
  horizontalPadding: number,
  containerWidth: number,
  peakAmount: number
): { left: number, right: number }
```

**Calculation Logic:**
1. Calculate total content width: `(itemWidth + gap) * totalItems - gap`
2. Calculate inner content area: `containerWidth - (horizontalPadding * 2)`
3. Calculate maximum drag: `-(totalContentWidth - innerContentArea + peakAmount)`
4. Return constraints: `{ left: maxDrag, right: 0 }`

**Usage:**
```tsx
import { calculateDragConstraints } from '../Utils/layoutCalculations'

const constraints = calculateDragConstraints(
  itemWidth,
  totalItems,
  columns,
  gap,
  horizontalPadding,
  containerWidth,
  peakAmount
)
// Returns: { left: -400, right: 0 } (example values)
```

#### `calculateFinalItemWidth()`

Calculates the final width for individual items, accounting for peek functionality.

```tsx
calculateFinalItemWidth(
  index: number,              // Item index
  totalItems: number,         // Total number of items
  itemWidth: number,          // Base item width
  peakAmount: number,         // Peek amount
  gap: number,               // Gap between items
  horizontalPadding: number   // Horizontal padding
): number
```

**Logic:**
- For the last item with peek enabled: `itemWidth + peakAmount + gap - horizontalPadding`
- For all other items: `itemWidth`

**Usage:**
```tsx
import { calculateFinalItemWidth } from '../Utils/layoutCalculations'

const finalWidth = calculateFinalItemWidth(
  2,        // index
  5,        // totalItems
  200,      // itemWidth
  20,       // peakAmount
  12,       // gap
  16        // horizontalPadding
)
// Returns adjusted width for the item
```

## iconUtils.ts

Provides icon size calculation utilities for arrow buttons.

### Functions

#### `getIconSize()`

Maps button sizes to appropriate icon sizes.

```tsx
getIconSize(buttonSize: number): number
```

**Size Mapping:**
- `24px` button → `16px` icon
- `32px` button → `24px` icon  
- `48px` button → `32px` icon
- `56px` button → `40px` icon
- Default → `24px` icon

**Usage:**
```tsx
import { getIconSize } from '../Utils/iconUtils'

const iconSize = getIconSize(32) // Returns 24
const iconSize = getIconSize(48) // Returns 32
```

## Utility Composition

### Common Patterns

#### Combining Layout Calculations

```tsx
import { 
  calculateItemWidth, 
  calculateDragConstraints, 
  calculateFinalItemWidth 
} from '../Utils/layoutCalculations'

const setupLayout = (containerWidth, columns, gap, horizontalPadding, peakAmount, totalItems) => {
  const itemWidth = calculateItemWidth({
    containerWidth,
    columns,
    gap,
    horizontalPadding,
    peakAmount
  })
  
  const dragConstraints = calculateDragConstraints(
    itemWidth, totalItems, columns, gap, horizontalPadding, containerWidth, peakAmount
  )
  
  return { itemWidth, dragConstraints }
}
```

#### Gesture and Animation Integration

```tsx
import { detectGesture } from '../Utils/gestureDetection'
import { getAnimationSettings } from '../Utils/animationConfig'

const handleGesture = (dragInfo, currentIndex, config) => {
  const gesture = detectGesture(/* ... */)
  const animationSettings = getAnimationSettings(gesture.isMultiSkip, config)
  
  return {
    targetIndex: gesture.targetIndex,
    animationSettings
  }
}
```

## Testing Utilities

### Mock Functions

```tsx
// Mock gesture detection for testing
export const mockDetectGesture = (result: GestureDetectionResult) => {
  return jest.fn().mockReturnValue(result)
}

// Mock layout calculations
export const mockCalculateItemWidth = (width: number) => {
  return jest.fn().mockReturnValue(width)
}
```

### Test Helpers

```tsx
// Create test layout parameters
export const createTestLayoutParams = (overrides = {}) => ({
  containerWidth: 800,
  columns: 2,
  gap: 12,
  horizontalPadding: 16,
  peakAmount: 20,
  ...overrides
})

// Create test animation config
export const createTestAnimationConfig = (overrides = {}) => ({
  flickStiffness: 500,
  flickDamping: 55,
  glideStiffness: 120,
  glideDamping: 25,
  ...overrides
})
```

## Performance Considerations

### Optimization Strategies

1. **Memoization**: Cache expensive calculations
2. **Early returns**: Exit early for edge cases
3. **Minimal calculations**: Only calculate what's needed
4. **Type safety**: Use TypeScript for compile-time optimization

### Memory Management

- **Pure functions**: No side effects, easier to optimize
- **Immutable data**: Prevents accidental mutations
- **Small function scope**: Limited variable lifetime

## Error Handling

### Common Edge Cases

1. **Zero dimensions**: Handle zero width/height gracefully
2. **Invalid parameters**: Validate input parameters
3. **Division by zero**: Check for zero values before division
4. **Negative values**: Ensure non-negative results where appropriate

### Error Boundaries

```tsx
// Wrap utility functions with error handling
export const safeCalculateItemWidth = (params: LayoutParams): number => {
  try {
    if (params.containerWidth <= 0 || params.columns <= 0) {
      return 0
    }
    return calculateItemWidth(params)
  } catch (error) {
    console.error('Error calculating item width:', error)
    return 0
  }
}
```

## Migration and Versioning

### Breaking Changes

- **v1.1.0**: Extracted utilities from main component
- **Future versions**: Maintain backward compatibility

### Deprecation Warnings

```tsx
// Mark deprecated functions
/** @deprecated Use calculateItemWidth instead */
export const oldCalculateWidth = () => { /* ... */ }
```

## License

This utility library is part of your portfolio project. All rights reserved.
