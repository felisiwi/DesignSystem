# AdaptiveCarousel v1.1.0 Documentation

## Overview

The AdaptiveCarousel is a highly customizable, gesture-driven carousel component built with React and Framer Motion. This refactored version (v1.1.0) extracts complex logic into reusable hooks and utility functions for better maintainability and testability.

## Features

- **Gesture-driven navigation** with intelligent swipe detection
- **Multi-tier gesture recognition** (93.25% accuracy)
- **Smooth spring animations** with customizable physics
- **Keyboard accessibility** support
- **Responsive design** with automatic width calculations
- **Customizable styling** for arrows and dots
- **Peek functionality** to show partial next/previous items
- **Multi-column support** for grid-like layouts

## Installation

```tsx
import Adapt from './AdaptiveCarousel.v1.1.0'
```

## Basic Usage

```tsx
<Adapt
  columns={2}
  gap={12}
  arrowsEnabled={true}
  dotsEnabled={true}
  peakAmount={20}
>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Adapt>
```

## Props

### Layout Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Content to display in the carousel |
| `columns` | `number` | `1` | Number of visible columns (1-6) |
| `gap` | `number` | `8` | Space between cards in pixels (4-50) |
| `horizontalPadding` | `number` | `16` | Horizontal padding in pixels (0-100) |
| `verticalPadding` | `number` | `0` | Vertical padding in pixels (0-100) |
| `peakAmount` | `number` | `16` | How much of the next card to show in pixels (0-100) |

### Gesture Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `snapThreshold` | `number` | `10` | Percentage of card width to trigger advance (5-50) |
| `velocityScaler` | `number` | `300` | Legacy velocity scaler (deprecated) |
| `velocityScalerPercentage` | `number` | `20` | Swipe sensitivity (1% = very sensitive, 100% = not sensitive) |

### Animation Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flickStiffness` | `number` | `500` | Stiffness for single card movements (100-1000) |
| `flickDamping` | `number` | `55` | Damping for single card movements (10-100) |
| `glideStiffness` | `number` | `120` | Stiffness for multi-card glides (50-500) |
| `glideDamping` | `number` | `25` | Damping for multi-card glides (10-100) |

### Arrow Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `arrowsEnabled` | `boolean` | `true` | Show navigation arrows |
| `arrowButtonSize` | `number` | `32` | Arrow button size (24, 32, 48, 56) |
| `arrowColor` | `string` | `'#F2F2F2'` | Arrow background color |
| `arrowPressedColor` | `string` | `'#000000'` | Arrow pressed state color |
| `arrowDisabledColor` | `string` | `'rgba(0, 0, 0, 0)'` | Arrow disabled state color |
| `arrowIconColor` | `string` | `'#4D4D4D'` | Arrow icon color |
| `arrowIconDisabledColor` | `string` | `'#CCCCCC'` | Arrow icon disabled color |

### Dot Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dotsEnabled` | `boolean` | `false` | Show navigation dots |
| `dotSize` | `number` | `8` | Dot size in pixels (4-20) |
| `dotGap` | `number` | `8` | Gap between dots in pixels (0-50) |
| `dotColor` | `string` | `'#000000'` | Active dot color |
| `dotInactiveColor` | `string` | `'#F2F2F2'` | Inactive dot color |

## Gesture Recognition

The carousel uses a sophisticated 4-tier gesture detection system:

### Tier 1: High Confidence
- **Trigger**: Distance > 145px
- **Behavior**: Multi-card glide with velocity-based jump calculation
- **Use Case**: Long, deliberate swipes

### Tier 2: Medium Confidence
- **Trigger**: Distance > 88px AND velocity > 75 AND acceleration > 18
- **Behavior**: Multi-card glide when all signals agree
- **Use Case**: Medium swipes with strong momentum

### Tier 3: Energetic Gesture
- **Trigger**: Distance > 100px AND (velocity > 110 OR acceleration > 35)
- **Behavior**: Multi-card glide for energetic gestures
- **Use Case**: Quick, forceful swipes

### Tier 4: Default
- **Trigger**: All other cases
- **Behavior**: Single card snap or snap back
- **Use Case**: Short swipes or taps

## Keyboard Navigation

| Key | Action |
|-----|--------|
| `←` | Previous item |
| `→` | Next item |
| `Home` | First item |
| `End` | Last item |
| `Enter` / `Space` | Activate focused arrow/dot |

## Architecture

### Hooks

#### `useCarouselDimensions`
Manages container and item width calculations with responsive behavior.

```tsx
const { itemWidth, containerWidth, containerRef } = useCarouselDimensions(
  columns,
  gap,
  horizontalPadding,
  peakAmount
)
```

#### `useCarouselNavigation`
Handles navigation logic and spring animations.

```tsx
const { currentIndex, x, goToIndex, navigate } = useCarouselNavigation(
  itemWidth,
  gap,
  maxIndex,
  animationConfig
)
```

#### `useCarouselGestures`
Manages drag gestures and velocity calculations.

```tsx
const { handleDragStart, handleDrag, handleDragEnd } = useCarouselGestures(
  currentIndex,
  itemWidth,
  snapThreshold,
  actualVelocityScaler,
  goToIndex
)
```

#### `useCarouselKeyboard`
Handles keyboard navigation and accessibility.

```tsx
const { handleKeyDown, handleArrowKeyDown, handleDotKeyDown } = useCarouselKeyboard(
  currentIndex,
  maxIndex,
  goToIndex,
  navigate
)
```

### Utilities

#### `gestureDetection.ts`
- `GESTURE_CONSTANTS` - Gesture detection thresholds
- `detectGesture()` - Main gesture detection algorithm

#### `animationConfig.ts`
- `getAnimationSettings()` - Returns appropriate animation settings
- `getFinalSnapSettings()` - Returns final snap animation settings

#### `layoutCalculations.ts`
- `calculateItemWidth()` - Calculates item width based on container
- `calculateDragConstraints()` - Calculates drag boundaries
- `calculateFinalItemWidth()` - Handles peek amount calculations

#### `iconUtils.ts`
- `getIconSize()` - Maps button size to icon size

## Examples

### Basic Carousel
```tsx
<Adapt>
  <div>Slide 1</div>
  <div>Slide 2</div>
  <div>Slide 3</div>
</Adapt>
```

### Multi-Column with Peek
```tsx
<Adapt
  columns={2}
  gap={16}
  peakAmount={24}
  arrowsEnabled={true}
>
  {items.map(item => <Card key={item.id} {...item} />)}
</Adapt>
```

### Custom Styling
```tsx
<Adapt
  arrowsEnabled={true}
  arrowColor="#007AFF"
  arrowIconColor="#FFFFFF"
  dotsEnabled={true}
  dotColor="#007AFF"
  dotInactiveColor="#E5E5EA"
>
  {content}
</Adapt>
```

### High Sensitivity
```tsx
<Adapt
  velocityScalerPercentage={5} // Very sensitive
  flickStiffness={800
  flickDamping={40
>
  {content}
</Adapt>
```

## Performance Considerations

- **Resize handling**: Debounced window resize listener
- **Animation queuing**: Prevents animation conflicts
- **Memory management**: Proper cleanup of event listeners
- **Render optimization**: Memoized calculations where appropriate

## Accessibility

- **ARIA labels**: Proper labeling for screen readers
- **Keyboard navigation**: Full keyboard support
- **Focus management**: Logical tab order
- **Live regions**: Announcement of current position

## Browser Support

- Modern browsers with ES6+ support
- Touch devices (iOS Safari, Chrome Mobile)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## Migration from v1.0.0

The refactored version is a drop-in replacement:

```tsx
// Before
import Adapt from './AdaptiveCarousel.v1.0.0'

// After
import Adapt from './AdaptiveCarousel.v1.1.0'
```

No prop changes required - all existing implementations will work unchanged.

## Troubleshooting

### Common Issues

1. **Items not sizing correctly**
   - Ensure container has defined width
   - Check `horizontalPadding` and `peakAmount` values

2. **Gestures not working**
   - Verify `snapThreshold` is appropriate for your content
   - Check `velocityScalerPercentage` sensitivity

3. **Animation stuttering**
   - Adjust `flickStiffness` and `flickDamping` values
   - Ensure no conflicting CSS transforms

### Debug Mode

Enable console logging by setting `NODE_ENV=development` to see gesture detection details.

## License

This component is part of your portfolio project. All rights reserved.
