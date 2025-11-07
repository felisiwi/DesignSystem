# Carousel Swipe Diagnostic Tool – Documentation

**Version:** 2.0  
**Date:** November 4, 2025  
**Purpose:** Advanced gesture data collection tool with biomechanical and behavioral tracking

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Installation](#installation)
4. [User Flow](#user-flow)
5. [Data Captured](#data-captured)
6. [CSV Output Format](#csv-output-format)
7. [Technical Implementation](#technical-implementation)
8. [Future Features](#future-features)
9. [Usage Tips](#usage-tips)

---

## Overview

The Carousel Swipe Diagnostic Tool v2.0 is a comprehensive gesture analysis system designed to capture detailed biomechanical, behavioral, and device data during carousel interactions. It goes beyond simple metrics to provide deep insights into user intent, gesture quality, and physical ergonomics.

### Key Improvements Over v1.0

**v1.0 captured:**
- Basic gesture metrics (velocity, distance, duration)
- Acceleration and jerk
- Y movement and straightness

**v2.0 adds:**
- ✅ Full trajectory path data (60fps position tracking)
- ✅ Touch pressure/force metrics
- ✅ Device motion (gyroscope data)
- ✅ Biomechanical calibration (thumb rest position)
- ✅ Retry detection
- ✅ Intent confirmation (via test structure)
- ✅ Carousel position impact testing (top vs bottom)
- ✅ Visual carousel interfaces (1-column and 2-column)

---

## Features

### 1. **Setup Screen**
- Collect user name
- Optional hand span measurement (for biomechanical analysis)
- Test experience tracking (first time vs returning user)
- Carousel position selection (top vs bottom)

### 2. **Calibration Process**
- Holding hand detection (left/right)
- Dominant hand identification
- Natural thumb rest position capture
- Visual confirmation of captured position

### 3. **Dual Carousel Testing**
- Live 1-column carousel (350px tall)
- Live 2-column carousel (350px tall)
- Real-time gesture detection
- Visual feedback (arrow buttons, numbered cards)

### 4. **Phased Test Structure**
Provides ground truth for intent:
- **Phase 1: Flicks** (minimum 6 gestures)
  - User instructed to perform single-card flicks
  - Tracks which carousel was used
  - Can continue past minimum
  
- **Phase 2: Glides** (minimum 6 gestures)
  - User instructed to perform multi-card glides
  - Same tracking as flicks
  - Can go back to practice more flicks

### 5. **Advanced Metrics Capture**

#### **Full Trajectory Tracking**
- Position (X/Y) captured every frame during drag
- Velocity (X/Y) at each frame
- Calculates:
  - Total path length
  - Path directness (end-to-end distance / total path)
  - Curvature score (angular changes)
  - Inflection points (direction reversals)

#### **Touch Pressure**
- Average pressure throughout gesture
- Maximum pressure point
- Pressure variance
- Works on iOS (3D Touch) and Android (pressure estimation)

#### **Device Motion**
- Gyroscope/accelerometer data
- Delta from rest position
- X/Y/Z axis motion
- Motion variance (grip stability indicator)

#### **Retry Detection**
- Automatically detects gestures within 2 seconds of previous
- Tracks time since last gesture
- Boolean flag for retry attempts
- Useful for identifying frustration patterns

### 6. **CSV Export**
- Automatic filename generation: `[Name]_CarouselSwipeDiagnostic_[DDMMYY_HHMM].csv`
- Includes all metadata (user info, device info, calibration data)
- Comprehensive gesture data with 30+ metrics per swipe
- Download button appears after minimum glides completed

---

## Installation

### For React Projects:

```bash
# Install dependencies
npm install react framer-motion

# Copy component
cp CarouselSwipeDiagnostic.tsx src/components/
```

### For Framer:

1. Open Framer project
2. Create new Code File
3. Name it `CarouselSwipeDiagnostic`
4. Copy entire component code
5. Add to canvas

### Usage:

```tsx
import CarouselSwipeDiagnostic from './CarouselSwipeDiagnostic'

function App() {
  return <CarouselSwipeDiagnostic />
}
```

---

## User Flow

### 1. Setup Screen
- Enter name (required)
- Enter hand span in cm (optional)
- Select "Have you done this before?" (Yes/No)
- Select carousel position (Top/Bottom)
- Click "Start Test"

### 2. Calibration Screen

**Step 1: Holding Hand**
- "Which hand are you holding the phone with?"
- Options: Left / Right

**Step 2: Dominant Hand**
- "Which is your dominant hand?"
- Options: Left / Right

**Step 3: Thumb Rest**
- "Hold your phone naturally and hover your thumb over the screen, then press down"
- Tap anywhere on the capture area
- Position captured with visual confirmation (✓)
- Click "Begin Test"

### 3. Test Screen - Flicks Phase

**Layout:**
```
┌─────────────────────────────────────┐
│  [Instructions: Perform flicks]    │  ← If carousels at bottom
│  Flicks: 3 ✓ Minimum reached       │
├─────────────────────────────────────┤
│                                     │
│  [1-Column Carousel - 350px]       │
│  [  1  2  3  4  5  6  7  8  9  10 ]│
│  [← →]                             │
│                                     │
│  [2-Column Carousel - 350px]       │
│  [ 1 2 ] [ 3 4 ] [ 5 6 ]...       │
│  [← →]                             │
│                                     │
│              [Next ↓]              │  ← Appears after 6 flicks
└─────────────────────────────────────┘
```

**User Actions:**
- Swipe on either carousel to perform flicks
- Try to move one card at a time
- Minimum 6 flicks required
- Can continue flicking as much as desired
- Click "Next" when ready

### 4. Interstitial Screen

**Layout:**
```
┌─────────────────────────────────────┐
│                                     │
│    Great! Now try gliding           │
│                                     │
│    Swipe fast to skip multiple     │
│    cards at once                    │
│                                     │
│         [Continue]                  │
│                                     │
└─────────────────────────────────────┘
```

### 5. Test Screen - Glides Phase

**Layout:** Same as flicks phase, but:
- Instructions: "Perform multi-card glides"
- Counter: "Glides: 4 ✓ Minimum reached"
- "Download CSV" button appears after 6 glides
- Can go back to flicks if desired (via browser back or continue swiping)

### 6. Download

- Click "Download CSV"
- File automatically downloads with timestamp
- Can continue gathering more data if desired

---

## Data Captured

### Metadata (Per Test Session)

| Field | Description | Example |
|-------|-------------|---------|
| Name | User's name | "Felix" |
| Hand Span | Thumb-to-pinky distance in cm | "19" or "" |
| Done Before | Has user done test before | Yes/No |
| Carousel Position | Where carousels placed | top/bottom |
| Holding Hand | Hand holding phone | left/right |
| Dominant Hand | Dominant hand | left/right |
| Thumb Rest X | Calibrated X position | 187.50 |
| Thumb Rest Y | Calibrated Y position | 645.25 |
| Device Model | Phone/tablet model | "iPhone 15" |
| Screen Width | Screen width in pixels | 390 |
| Screen Height | Screen height in pixels | 844 |
| Pixel Ratio | Device pixel ratio | 3 |

### Per-Gesture Data (30+ Metrics)

#### **Basic Identification**
| Metric | Description | Unit |
|--------|-------------|------|
| ID | Sequential gesture number | # |
| Type | flick or glide (based on phase) | category |
| Timestamp | ISO 8601 timestamp | datetime |
| Carousel | Which carousel used | 1-column/2-column |

#### **Standard Gesture Metrics**
| Metric | Description | Unit |
|--------|-------------|------|
| Velocity | Final velocity magnitude | px/s |
| Distance | Horizontal distance traveled | px |
| Duration | Time from start to release | ms |
| Peak Velocity | Maximum velocity during gesture | px/s |
| Avg Velocity | Average velocity | px/s |
| Peak/Avg Ratio | Velocity consistency indicator | ratio |
| Acceleration | Average acceleration | px/s² |
| Avg Jerk | Average rate of accel change | px/s³ |
| Max Jerk | Peak jerk value | px/s³ |
| Initial Velocity | Starting velocity | px/s |
| Peak Acceleration | Maximum acceleration | px/s² |
| Velocity Variance | Velocity variability | px²/s² |
| Velocity CV | Coefficient of variation | ratio |
| Distance/Duration Ratio | Efficiency metric | px/ms |
| Straightness % | Path straightness | % |
| Pause Before Release | Hesitation time | ms |
| Y Movement | Vertical drift | px |

#### **NEW: Advanced Trajectory Metrics**
| Metric | Description | Unit |
|--------|-------------|------|
| Touch Pressure Avg | Average pressure during gesture | 0-1 |
| Touch Pressure Max | Peak pressure | 0-1 |
| Touch Pressure Variance | Pressure variability | variance |
| Trajectory Length | Total path length traveled | px |
| Path Directness | Straight-line / total path | 0-1 |
| Curvature Score | Path curviness | radians |
| Inflection Points | Direction changes | count |

#### **NEW: Device Motion Metrics**
| Metric | Description | Unit |
|--------|-------------|------|
| Device Motion X | Max X-axis motion | m/s² |
| Device Motion Y | Max Y-axis motion | m/s² |
| Device Motion Z | Max Z-axis motion | m/s² |
| Device Motion Variance | Grip stability | variance |

#### **NEW: Behavioral Metrics**
| Metric | Description | Unit |
|--------|-------------|------|
| Is Retry | Gesture <2s after previous | Yes/No |
| Time Since Last Gesture | Time between gestures | ms |

---

## CSV Output Format

### Structure

```
Test Metadata
Name,Felix
Hand Span (cm),19
Done Before,No
Carousel Position,bottom
Holding Hand,right
Dominant Hand,right
Thumb Rest X,187.50
Thumb Rest Y,645.25
Device Model,Google Pixel 9 Pro XL
Screen Width,1344
Screen Height,2992
Pixel Ratio,2.625

ID,Type,Timestamp,Carousel,Velocity,Distance,Duration,...
1,flick,2025-11-04T14:23:15.234Z,1-column,56.23,70.45,48,...
2,flick,2025-11-04T14:23:18.567Z,2-column,82.11,65.23,52,...
...
```

### Example Row (Abbreviated)

```csv
1,flick,2025-11-04T14:23:15.234Z,1-column,56.23,70.45,48,54.12,28.34,1.91,2.15,1.2,1.8,8.5,28.7,3.2,0.42,1.47,95.3,1.8,18.2,0.23,0.45,0.08,125.3,0.89,0.12,2,0.03,0.02,0.01,0.002,No,3245
```

---

## Technical Implementation

### Architecture

**Component Structure:**
```
CarouselSwipeDiagnostic (Main)
├── Setup Screen
├── Calibration Screen
│   ├── Holding Hand Step
│   ├── Dominant Hand Step
│   └── Thumb Rest Capture
├── Test Screen
│   ├── Instructions Area
│   ├── MiniCarousel (1-column)
│   └── MiniCarousel (2-column)
└── CSV Export Function
```

### MiniCarousel Component

Embedded lightweight carousel implementation with:
- Framer Motion drag handlers
- Real-time trajectory tracking
- Device motion listeners
- Touch pressure capture
- Gesture detection (4-tier system)
- Spring animations

**Key Features:**
- 10 numbered cards per carousel
- Standard carousel styling (#F2F2F2 cards, 8px gap, 16px padding, 16px radius)
- Arrow buttons for navigation
- Drag-based gesture input
- Fixed 350px height

### Data Capture Pipeline

```
User Drags
    ↓
handleDragStart() → Initialize tracking arrays
    ↓
handleDrag() → Capture every frame:
    - Position (X/Y)
    - Velocity (X/Y)
    - Touch pressure
    - Device motion
    ↓
handleDragEnd() → Calculate metrics:
    - Standard metrics (velocity, distance, etc.)
    - Advanced metrics (trajectory, curvature, etc.)
    - Device metrics (motion, pressure)
    - Behavioral (retry detection)
    ↓
onGestureComplete() → Store data
    ↓
Add to gestureData array
```

### Gesture Detection Logic

Uses same 4-tier system as production carousel:

```typescript
Tier 1: distance > 170px → Glide (high confidence)
Tier 2: distance > 140 AND velocity > 120 AND accel > 30 → Glide
Tier 3: distance > 155 AND (velocity > 180 OR accel > 50) → Glide
Tier 4: Default flick logic (distance > 10% of item width)
```

**Note:** Detection doesn't affect data capture - it only drives animation. The CSV records the gesture as flick/glide based on which PHASE the user is in, providing ground truth for analysis.

### Device API Usage

**Touch Pressure:**
```typescript
if ('touches' in event && event.touches.length > 0) {
  const touch = event.touches[0]
  const pressure = touch.force || touch.webkitForce || 0
  touchPressures.current.push(pressure)
}
```

**Device Motion:**
```typescript
window.addEventListener('devicemotion', (event) => {
  if (event.accelerationIncludingGravity) {
    deviceMotionData.current.push({
      x: event.accelerationIncludingGravity.x || 0,
      y: event.accelerationIncludingGravity.y || 0,
      z: event.accelerationIncludingGravity.z || 0,
    })
  }
})
```

**Device Detection:**
```typescript
// User agent parsing for device model
const ua = navigator.userAgent
// Screen dimensions
window.screen.width / window.screen.height
// Pixel ratio
window.devicePixelRatio
```

---

## Future Features

### 🔴 HIGH PRIORITY

#### 1. **GitHub Auto-Upload**
**Status:** Documentation complete, implementation pending  
**Complexity:** Medium  
**Requirements:**
- GitHub Personal Access Token integration
- Repository specification (owner/repo)
- Automatic commit with timestamp
- File pushed to `/Data/carousel_diagnostics/raw_data/` directory (for carousel-specific tests) or `/Data/swipe_diagnostics/raw_data/` (for general swipe tests)

**Implementation Approach:**
```typescript
// User would input in setup:
- GitHub token (securely stored)
- Repository path

// After test:
async function uploadToGitHub(csvContent: string, filename: string) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/Data/carousel_diagnostics/raw_data/${filename}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Add diagnostic data: ${filename}`,
        content: btoa(csvContent), // Base64 encode
      }),
    }
  )
}
```

**Benefits:**
- Seamless data collection workflow
- No manual file management
- Automatic versioning via Git
- Centralized data repository

---

### 🟡 MEDIUM PRIORITY

#### 2. **Real-Time Gesture Quality Feedback**
**Status:** Concept defined  
**Implementation:** Add visual feedback during drag

**Features:**
- Color-coded glow around carousel based on gesture quality:
  - 🟢 Green: "Clear flick detected"
  - 🔵 Blue: "Clear glide detected"
  - 🟡 Yellow: "Ambiguous - swipe harder or slower"
  - 🔴 Red: "Too crooked - try going straighter"

**Benefits:**
- Trains users to produce cleaner gestures
- Immediate feedback improves data quality
- Could increase accuracy from 93% to 98%+

#### 3. **Adaptive Thresholds**
**Status:** Algorithm designed  
**Implementation:** After 10 gestures, adjust detection thresholds per user

**Logic:**
```typescript
// Calculate user's velocity "gear shift" point
const userMaxVelocity = Math.max(...userGestures.map(g => g.velocity))
const flickGlideThreshold = userMaxVelocity * 0.6 // 60% of max

// Normalize all future gestures
const normalizedVelocity = velocity / userMaxVelocity
```

**Benefits:**
- Accounts for different user styles (Felix's 56px/s vs Max's 230px/s)
- Could increase per-user accuracy to 95%+

#### 4. **Session Comparison View**
**Status:** UI mockup needed  
**Implementation:** Show improvement across multiple test sessions

**Features:**
- "You've improved accuracy by 15% since last test"
- Graph showing Y Movement reduction over time
- Personal "swipe signature" visualization

---

### 🟢 LOWER PRIORITY

#### 5. **Ambient Light Tracking**
**Status:** API identified  
**Implementation:** Use `DeviceLightEvent` (where supported)

```typescript
window.addEventListener('devicelight', (event) => {
  const lux = event.value // Light intensity in lux
})
```

**Hypothesis:** Bright sunlight → less screen visibility → less precise gestures

#### 6. **Carousel Content Context**
**Status:** Design needed  
**Implementation:** Test with images vs blank cards

**Variables to test:**
- Faces in images (people engage differently)
- Text density
- Color contrast
- Animation/motion in cards

#### 7. **Audio/Haptic Feedback Testing**
**Status:** Experiment design needed  
**Implementation:** A/B test with haptic feedback on/off

**Questions:**
- Does haptic feedback improve gesture quality?
- Does delayed feedback cause users to swipe harder?
- Optimal timing for feedback (start, middle, end of gesture)?

#### 8. **Eye Tracking** (Experimental)
**Status:** Feasibility study needed  
**Implementation:** Use front camera + WebGazer.js library

**Hypothesis:** Looking at carousel = intentional gesture. Looking elsewhere = accidental.

**Privacy Note:** Would require explicit user consent and on-device processing only.

---

## Usage Tips

### For Researchers

**Getting Quality Data:**
1. **Test in batches:** Have users complete full test (6 flicks + 6 glides minimum)
2. **Encourage exploration:** Tell users to experiment after minimums reached
3. **Vary conditions:** Test with carousels at top AND bottom
4. **Capture context:** Note environmental factors (lighting, user mood, time of day)

**Data Analysis:**
1. **Start with phase labels:** Since test structure provides ground truth, analyze accuracy of gesture detection
2. **Look for patterns:** Group users by swipe signature (high variance vs controlled)
3. **Cross-reference:** Compare trajectory metrics with straightness % to validate
4. **Device differences:** Segment by device model and screen size

### For Developers

**Customizing the Tool:**

**Adjust minimum gesture count:**
```typescript
const MIN_GESTURES = 10 // Change from 6 to 10
```

**Change carousel heights:**
```typescript
<div style={{ height: '400px' }}> // Change from 350px
```

**Modify detection thresholds:**
```typescript
const GLIDE_DISTANCE_HIGH_CONFIDENCE = 200 // Adjust sensitivity
```

**Add custom metrics:**
```typescript
// In handleDragEnd:
const myCustomMetric = calculateMyMetric(trajectoryData.current)

// Add to GestureData interface and CSV export
```

### For Test Participants

**Tips for Best Results:**
1. Hold phone naturally - don't force a position
2. During flicks: Try to move one card at a time
3. During glides: Swipe quickly to jump multiple cards
4. Try both carousels - they behave differently
5. Don't worry about "mistakes" - all data is valuable!

**What to Expect:**
- Test takes 3-5 minutes
- Setup + calibration: ~1 minute
- Flicks phase: ~1 minute
- Glides phase: ~1 minute
- You can continue as long as you want past minimums

---

## Changelog

### v2.0 (November 4, 2025)
- ✅ Added full trajectory path tracking
- ✅ Added touch pressure metrics
- ✅ Added device motion tracking
- ✅ Added biomechanical calibration
- ✅ Added retry detection
- ✅ Added carousel position testing
- ✅ Added visual carousel interfaces
- ✅ Structured test for intent confirmation
- ✅ Enhanced CSV export with all new metrics

### v1.0 (October 24, 2025)
- Initial release
- Basic gesture metrics
- Acceleration and jerk
- CSV export

---

## Support & Contact

**GitHub Repository:** [Your repo URL]  
**Issues:** [Your repo URL]/issues  
**Documentation:** This file

**For questions or feature requests, please open an issue on GitHub.**

---

**Last Updated:** November 4, 2025  
**Maintained By:** Design System Development Team  
**License:** [Your license]