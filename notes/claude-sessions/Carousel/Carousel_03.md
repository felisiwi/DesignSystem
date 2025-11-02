# Carousel Gesture Detection Session - November 2, 2025

## Session Overview
Deep dive into gesture detection issues, animation physics, and optimization of flick/glide detection for a multi-column carousel component.

---

## 1. Initial Problem: L→R Glide Detection Failures

### Symptoms
- L→R (backward) swipes causing "jaggy motion" and "bounce back"
- Only moving 1 card instead of gliding multiple cards
- Issue worse in 2-column mode
- R→L (forward) swipes working fine

### Root Cause: Velocity Direction Bug
```javascript
// BUGGY CODE:
goToIndex(targetIndex, info.velocity.x * dragDirection, isMultiSkip)

// Problem: When going L→R (backward):
// - info.velocity.x = +500 (rightward)
// - dragDirection = -1 (backward in carousel)
// - Passed velocity = +500 * -1 = -500 (WRONG DIRECTION!)
// - Animation moves RIGHT but gets LEFT-ward velocity
// - They fight each other = jaggy/slow/bounce
```

### Solution: Calculate Velocity Based on X-Axis Movement
```javascript
// FIX: Calculate velocity direction from actual X-axis movement
const targetX = -targetIndex * itemWidthWithGap
const currentX = x.get()
const xMovementDirection = targetX > currentX ? 1 : -1

// Velocity always aids animation direction
const correctedVelocity = Math.abs(info.velocity.x) * xMovementDirection

goToIndex(targetIndex, correctedVelocity, isMultiSkip)
```

**Connection to P1 Fix:** The original P1 fix addressed "charge up" bounce (changing direction mid-drag). The multiplication by `dragDirection` was attempting direction correction but created the L→R bug. New fix handles both issues cleanly.

---

## 2. Weighted Scoring System Evolution

### Current System (Before Changes)
```javascript
// Weighted scoring for glide detection
let glideScore = 0
if (duration > 50) glideScore += 2
if (velocity < 1500) glideScore += 1
if (distance > 150) glideScore += 2
if (peakAcceleration < 500) glideScore += 1

if (glideScore < 5) {
  isMultiSkip = false // Treat as flick
}
```

**Problem:** Thresholds too strict based on user testing data.

### Initial Adjustment Proposal
```javascript
// Raised thresholds to capture more glides
if (duration > 50) glideScore += 2
if (velocity < 2500) glideScore += 1      // Raised from 1500
if (distance > 150) glideScore += 2
if (peakAcceleration < 800) glideScore += 1  // Raised from 500

// Lower requirement from 3 to 2
if (glideScore < 2) { isMultiSkip = false }
```

**Rejected:** Too permissive - would create false positives for flicks.

### Final Adopted System
```javascript
// SAFETY RAIL: Catch extreme flicks first
if (peakAcceleration > 600 && distance < 170) {
  isMultiSkip = false
  // Force flick
  return
}

// WEIGHTED SCORING
let glideScore = 0
if (duration > 50) glideScore += 2        // Duration most important
if (velocity < 1800) glideScore += 1      // Balanced
if (distance > 160) glideScore += 2       // Distance most important
if (peakAcceleration < 600) glideScore += 1

// Require 5/6 points (83% agreement)
if (glideScore < 5) {
  isMultiSkip = false
}
```

**Key Principles:**
- Safety rail catches extreme cases before scoring
- Weighted system emphasizes duration and distance
- High score requirement (5/6) prevents false positives

---

## 3. Animation Physics Deep Dive

### Two-Step Animation Analysis

**Current Implementation:**
```javascript
if (isMultiSkip) {
  // Step 1: Soft glide
  await animate(x, targetX, {
    stiffness: 120,
    damping: 25,
    velocity: velocity,
  })
  
  // Step 2: Aggressive snap
  await animate(x, targetX, {
    stiffness: 1000,
    damping: 80,
    velocity: 0,
  })
}
```

**Physics Simulation Results:**
- Step 1 settles within **0.6 pixels** of target
- Step 2 has **no meaningful correction to do**
- User cannot perceive any "snap" because Step 1 is already accurate
- Damping=25 is perfectly tuned - lower values create overshoot, higher values feel sluggish

### Why Lower Damping Feels Sluggish (Counterintuitive)
1. Lower damping → more overshoot in Step 1
2. Step 2 has to correct more distance
3. Animation spends time "fighting itself"
4. Result: feels slower despite less friction

### Recommendation: Simplify to Single-Step
```javascript
const goToIndex = async (index: number, velocity: number = 0, isMultiSkip: boolean = false) => {
  if (itemWidth === 0) return
  if (isAnimating.current) x.stop()
  isAnimating.current = true
  
  try {
    const targetIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(targetIndex)
    const targetX = Math.round(-targetIndex * itemWidthWithGap)
    
    // SINGLE-STEP ANIMATION (Step 2 removed - does nothing)
    await animate(x, targetX, {
      type: "spring",
      stiffness: isMultiSkip ? glideStiffness : flickStiffness,
      damping: isMultiSkip ? glideDamping : flickDamping,
      velocity: velocity,
    })
  } finally {
    isAnimating.current = false
  }
}
```

**Benefits:**
- Simpler code
- Faster execution (no second animation wait)
- Identical visual result
- Easier to tune

### Animation Settings Analysis

**Tested Presets:**
- **115/45** → "directionless, lost, slow"
- **120/25** (current) → Optimal balance
- All variations felt wrong or same as current

**Conclusion:** The 120 stiffness / 25 damping values represent a carefully tuned sweet spot. Exposing these as user controls would likely lead to worse configurations.

**Recommendation:** Hide animation controls from users, or provide tested presets only.

---

## 4. dragElastic Impact Analysis

### Simulation Methodology
Modeled how `dragElastic={0.2}` would affect user gestures:
- Velocity reduced by ~30%
- Distance reduced by ~15%
- Duration increased by ~15%

### Results (dragElastic = 0.2)

| Metric | Without dragElastic | With dragElastic | Change |
|--------|---------------------|------------------|--------|
| **Overall Accuracy** | 78.9% | 72.2% | **-6.7%** ❌ |
| **Flick Detection** | 91.1% | 83.3% | **-7.8%** ❌ |
| **Glide Detection** | 66.7% | 61.1% | **-5.6%** ❌ |

**Net Result:** 12 gestures perform worse (-6.7% overall)

### Sensitivity Analysis

| dragElastic | Overall | Flicks | Glides |
|-------------|---------|--------|--------|
| 0 (baseline) | 78.9% | 91.1% | 66.7% |
| 0.1 | 73.3% | 85.6% | 61.1% |
| 0.15 | 71.7% | 83.3% | 60.0% |
| 0.2 | 72.2% | 83.3% | 61.1% |
| 0.25 | 71.1% | 83.3% | 58.9% |
| 0.3 | 70.0% | 84.4% | 55.6% |

**Conclusion:** Every dragElastic value degrades performance. Current thresholds were calibrated without drag resistance.

### Risks of Adding dragElastic
1. Would break carefully tuned gesture detection
2. Requires re-gathering all diagnostic data
3. Makes glides harder to trigger (lower velocities)
4. Reduces user control feeling
5. Could make 2-column navigation worse

**Recommendation:** **Do not use dragElastic** - use visual feedback (scale, opacity, blur) instead for perceived "weight."

---

## 5. Glide Detection Optimization

### Current Performance (Baseline)
- Overall: 78.9%
- Flicks: 91.1% ✓
- Glides: 66.7% ⚠️

### Problem Analysis

**Why glides fail (30 failed out of 90):**
- **80% of failures** → Distance ≤ 160px
- **90% of failed glides** → Score 4/6 (just 1 point short!)
- Most common pattern: Duration✓, Velocity✓, **Distance✗**, Accel✓

**Example failed glides:**
```
vel=143, dist=138px, dur=105ms → Score 4/6 → BLOCKED ❌
vel=188, dist=154px, dur=72ms  → Score 4/6 → BLOCKED ❌
vel=138, dist=116px, dur=64ms  → Score 4/6 → BLOCKED ❌
```

### Attempted Solutions

#### Option 1: Lower Distance Threshold (130-145px)
```javascript
if (distance > 130) glideScore += 2  // Lowered from 160
```
**Result:** +10% glides, -8.9% flicks → Not acceptable

#### Option 2: Add Distance/Duration Ratio
```javascript
if (dist_dur_ratio > 1.7) glideScore += 1  // New criterion
// Require 5/7 total
```
**Analysis:**
- Flicks median: 1.42
- Failed glides: 1.94
- Passed glides: 2.31 ← Perfect separator!

**Result:** Improves glides but still hurts flicks

#### Option 3: Dynamic Distance Threshold
```javascript
if (dist_dur_ratio > 2.0) {
  distance_threshold = 130
} else if (dist_dur_ratio > 1.7) {
  distance_threshold = 145
} else {
  distance_threshold = 160
}
```
**Result:** +5.5% glides, -5.5% flicks → Trade-off persists

#### Option 4: Conditional Scoring (Distance Bands)
```javascript
// Different requirements for different distance bands
if (distance > 160) {
  required_score = 3  // Easy
} else if (distance > 130) {
  required_score = 4  // Strict
} else {
  required_score = 5  // Impossible
}
```
**Result:** +10% glides, -6.7% flicks

### Best Possible Improvement

```javascript
// SAFETY RAIL: Catch extreme flicks first
if (peakAcceleration > 600 && distance < 170) {
  isMultiSkip = false
  return
}

// SCORING with modest distance adjustment
let glideScore = 0
if (duration > 50) glideScore += 2
if (velocity < 1800) glideScore += 1
if (distance > 145) glideScore += 2  // Lowered from 160 to 145
if (peakAcceleration < 600) glideScore += 1

if (glideScore < 5) {
  isMultiSkip = false
}
```

**Results:**
- Overall: 80.0% (+1.1%)
- Flicks: 90.0% (-1.1%)
- Glides: 70.0% (+3.3%)

### The Hard Truth

**Fundamental Reality:** The data has inherent overlap between flicks and glides. Some flicks look like glides, some glides look like flicks.

**Current system (91.1% flicks, 66.7% glides) is already well-optimized for flick priority.**

**Every attempted improvement follows the same pattern:**
- Improve glides → Hurt flicks
- Trade-off unavoidable with current data

**Decision:** Given flicks are most important, either:
1. **Keep current thresholds** (distance > 160) for 91.1% flick accuracy
2. **Use modest adjustment** (distance > 145) for +3.3% glides at cost of -1.1% flicks

---

## 6. Key Metrics & Insights

### Gesture Characteristics

| Metric | Flicks (median) | Failed Glides | Passed Glides |
|--------|-----------------|---------------|---------------|
| **Distance** | 100px | 133px | 243px ⭐ |
| **Duration** | 73ms | 68ms | 98ms |
| **Velocity** | 123 | 116 | 349 |
| **Peak Accel** | 29 | 27 | 71 |
| **Dist/Dur Ratio** | 1.42 | 1.94 | 2.31 ⭐ |

⭐ = Best discriminators

### Success Rates by Configuration

| Configuration | Overall | Flicks | Glides |
|--------------|---------|--------|--------|
| Current (dist>160) | 78.9% | 91.1% | 66.7% |
| Safety + dist>145 | 80.0% | 90.0% | 70.0% |
| Lower to dist>130 | 79.4% | 82.2% | 76.7% |
| Add ratio criterion | 81.1% | 72.2% | 90.0% |

---

## 7. Final Recommendations

### Immediate Actions

1. **Fix Velocity Direction Bug** ✅ Critical
   ```javascript
   const targetX = -targetIndex * itemWidthWithGap
   const currentX = x.get()
   const xMovementDirection = targetX > currentX ? 1 : -1
   const correctedVelocity = Math.abs(info.velocity.x) * xMovementDirection
   goToIndex(targetIndex, correctedVelocity, isMultiSkip)
   ```

2. **Remove Two-Step Animation** ✅ Simplification
   - Step 2 does nothing (corrects <1px)
   - Single-step animation is sufficient
   - Cleaner code, identical result

3. **Do NOT Add dragElastic** ❌ Degradation
   - Loses 6.7% overall accuracy
   - Breaks calibrated thresholds
   - Use visual feedback instead

### Gesture Detection Options

**Option A: Prioritize Flicks (Current)**
- Keep distance > 160
- Maintains 91.1% flick accuracy
- Accept 66.7% glide detection
- **Best for reliability**

**Option B: Balanced Improvement**
- Change distance > 145
- Add safety rail (peak_accel > 600 && distance < 170)
- Gets 90.0% flicks, 70.0% glides
- **Best for overall improvement**

**Option C: Prioritize Glides**
- Change distance > 130
- Gets 82.2% flicks, 76.7% glides
- **Not recommended** - hurts primary use case

### User-Facing Controls

**Hide Raw Animation Parameters:**
```javascript
// In addPropertyControls
glideStiffness: { hidden: true }
glideDamping: { hidden: true }
flickStiffness: { hidden: true }
flickDamping: { hidden: true }
```

**Optional: Provide Named Presets Instead:**
```javascript
animationStyle: {
  type: ControlType.Enum,
  options: ["smooth", "snappy", "bouncy"],
  defaultValue: "smooth",
}

// Map to tested combinations
// smooth = 120/25
// snappy = 150/30
// bouncy = 100/22
```

---

## 8. Code Implementation Summary

### Complete Recommended Changes

```javascript
// 1. VELOCITY DIRECTION FIX (in handleDragEnd)
const targetX = -targetIndex * itemWidthWithGap
const currentX = x.get()
const xMovementDirection = targetX > currentX ? 1 : -1
const correctedVelocity = Math.abs(info.velocity.x) * xMovementDirection

// 2. SIMPLIFIED ANIMATION (remove Step 2)
const goToIndex = async (index: number, velocity: number = 0, isMultiSkip: boolean = false) => {
  if (itemWidth === 0) return
  if (isAnimating.current) x.stop()
  isAnimating.current = true
  
  try {
    const targetIndex = Math.max(0, Math.min(index, maxIndex))
    setCurrentIndex(targetIndex)
    const targetX = Math.round(-targetIndex * itemWidthWithGap)
    
    await animate(x, targetX, {
      type: "spring",
      stiffness: isMultiSkip ? glideStiffness : flickStiffness,
      damping: isMultiSkip ? glideDamping : flickDamping,
      velocity: velocity,
    })
  } finally {
    isAnimating.current = false
  }
}

// 3. GESTURE DETECTION (Option A - Current)
if (peakAcceleration > 600 && distance < 170) {
  isMultiSkip = false
  // Force flick
  return
}

let glideScore = 0
if (duration > 50) glideScore += 2
if (velocity < 1800) glideScore += 1
if (distance > 160) glideScore += 2
if (peakAcceleration < 600) glideScore += 1

if (glideScore < 5) {
  isMultiSkip = false
} else {
  // Glide detection logic
}

// 3. GESTURE DETECTION (Option B - Balanced)
// Same as above but: if (distance > 145) glideScore += 2
```

---

## 9. Session Learnings

### Physics Insights
- Spring animations with damping=25 are critically damped for this use case
- Two-step corrections are unnecessary when first step is well-tuned
- "Aggressive" corrections can be invisible when starting position is already accurate
- Lower damping can paradoxically feel slower due to overshoot correction

### Data Insights
- 80% of glide detection failures come from distance threshold
- Distance/Duration ratio is an excellent discriminator (1.42 → 1.94 → 2.31)
- There is fundamental overlap between gesture types
- Improving one metric almost always trades off another

### UX Insights
- Flick accuracy is more critical than glide accuracy
- Users adapt to consistent behavior better than "smart" but unpredictable systems
- Exposing low-level physics controls to users is dangerous
- Sometimes "good enough" (78.9% overall) is the right answer

### Development Insights
- Simulate physics before implementing changes
- Quantitative testing beats intuition
- Simple solutions often outperform complex ones
- Accept trade-offs when data demands it

---

## 10. Open Questions

1. **Animation Weight Feel:** User wanted 2-column to feel "heavier" but all physics changes degraded gesture detection. Visual feedback (scale, blur) recommended but not tested.

2. **Glide Detection Ceiling:** Is 70% glide detection (with Option B) acceptable, or should component UX be redesigned to reduce ambiguity between flicks/glides?

3. **Preset Viability:** Would named animation presets provide enough user control while preventing misconfigurations?

---

## Appendix: Test Data Summary

### Diagnostic CSV Files Analyzed
- Ben_swipe-diagnostics-1761313297756.csv
- Caitlin_swipe-diagnostics-1761330894720.csv
- Felix_swipe-diagnostics-1761295825168.csv
- Hani_swipe-diagnostics-1761312908203.csv
- max_swipe-diagnostics-1761329760149.csv
- Pierre_swipe-diagnostics-1761301087373.csv

**Total Gestures:** 180 (90 flicks, 90 glides)

### Key Statistics
- Glide velocity range: 7 - 2521 px/s (mean: 624)
- Glide distance range: 80 - 350 px (median: 243)
- Flick distance range: 50 - 170 px (median: 100)
- Failed glides: 30/90 (33.3%)
- Most failed glides score 4/6 (just 1 point short)

---

**Session Duration:** ~2.5 hours  
**Key Outcome:** Velocity direction bug fix (critical), animation simplification (recommended), gesture detection optimization (trade-offs documented)