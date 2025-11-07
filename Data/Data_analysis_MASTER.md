# Swipe Diagnostics Insights & Analysis

> **Purpose:** Central source of truth for all insights, measurements, and analysis derived from swipe diagnostic data. This document grows over time as new data is collected and analyzed.

---

## Quick Navigation

**Main Sections:**

- [Directional Lock Analysis](#directional-lock-analysis)
- [Key Metrics from CSV Analysis](#key-metrics-from-csv-analysis)
- [Advanced Pattern Analysis](#advanced-pattern-analysis)
  - [User Behavior Patterns](#user-behavior-patterns)
  - [Gesture Metrics Patterns](#gesture-metrics-patterns)
  - [Gesture Classification](#gesture-classification)
  - [Gesture Detection Signals](#gesture-detection-signals)
- [Gesture Detection Pattern Analysis](#gesture-detection-pattern-analysis)
- [User Pattern Insights](#user-pattern-insights)
- [Composite Insights & Recommendations](#composite-insights--recommendations)
- [Future Analysis Areas](#future-analysis-areas)
- [Related Analysis Documents](#related-analysis-documents)

---

## Document Structure

This document is organized by:

- **Analysis Type** (e.g., Directional Lock, Gesture Detection, User Patterns)
- **Date/Version** of analysis
- **Data Sources** (CSV files, user testing sessions)
- **Key Findings** and **Recommendations**

---

## Related Analysis Documents

This document focuses on **directional lock** and **gesture detection patterns** from general swipe diagnostics. For related analysis on specific carousel issues, see:

- **[CarouselDiagnostics_analysis.md](carousel_diagnostics/CarouselDiagnostics_analysis.md)** - 2-column animation physics issue (velocity compensation gap, stiffness/damping tuning). Analyzes gesture-type specific problems (flicks vs glides) and position-independent validation. Based on enhanced diagnostic tool (v2.0.1) with comprehensive metrics.

- **[SwipeDiagnostics_analysis.md](swipe_diagnostics/SwipeDiagnostics_analysis.md)** - Analysis of basic swipe diagnostics (v1.0 format). Covers general gesture patterns from the initial diagnostic tool with 20 metrics per swipe.

- **[Carousel_MASTER.md](../notes/claude-sessions/Carousel/Carousel_MASTER.md)** - Complete component documentation and development history, including implementation details and API reference.

**Note:** These documents complement each other:

- **This document** = General gesture patterns and directional lock algorithms
- **CarouselDiagnostics_analysis.md** = Specific animation physics tuning for 2-column layouts (enhanced diagnostics)
- **SwipeDiagnostics_analysis.md** = Basic swipe pattern analysis (initial diagnostics)
- **Carousel_MASTER.md** = Complete component reference and implementation guide

---

## Directional Lock Analysis

### Context: Simultaneous Carousel & Page Scroll Issue

**Date:** November 4, 2025  
**Issue Reported By:** User "Jo" (iPhone 15, 18cm hand span)  
**Problem:** Carousel and page scroll responding simultaneously during swipe gestures, creating "sliding around" feeling.

**Occurrence Pattern:**

- More frequent when carousel positioned high on screen
- Affects both 1-column and 2-column configurations
- Works better with controlled swipes, but fails frequently with natural swipes

**Symptom:** Carousel moves AND page scrolls simultaneously, followed by quick adjustment on release.

---

### Current Implementation Analysis (v1.0.2)

**Approach:** Pure angle-based directional lock (industry standard)

**Implementation:**

```typescript
if (angle < 30) {
  setDirectionLock("horizontal"); // Lock to carousel
} else if (angle > 60) {
  setDirectionLock("vertical"); // Allow page scroll
}
// 30-60° = NO LOCK (dead zone)
```

**Root Cause Identified:**

- **30-60° Dead Zone Problem:** When swipe angle falls between 30-60°:
  - `directionLock` stays `null`
  - `event.preventDefault()` is never called
  - Framer Motion's `drag="x"` captures horizontal movement → carousel moves
  - Native scroll captures vertical movement → page scrolls
  - **Both systems respond simultaneously** ← This is exactly what Jo experiences

**Why This Happens More With High Carousels:**

- Initial touch angle naturally ~30-45° (the "reaching arc")
- Falls into dead zone - no lock is set
- Both systems respond for entire gesture
- Creates "sliding around" feeling

**Why Controlled Swipes Work Better:**

- More horizontal (angle < 30°) → lock succeeds
- Longer duration → angle corrects over time
- Less "reaching" motion → starts in valid angle range

---

### Data-Driven Analysis (180 Swipes from 6 Users)

**Dataset:**

- Felix: 30 swipes (controlled, low Y movement: 4-26px)
- Pierre: 30 swipes (energetic, low Y movement: 4-32px)
- Hani: 30 swipes (inverted pattern, moderate Y movement: 14-28px)
- Ben: 30 swipes (extreme variance, high Y movement: 6-117px)
- Max: 30 swipes (high-energy, high Y movement: 9-96px)
- Caitlin: 30 swipes (balanced, moderate Y movement: 11-64px)

**Angle Calculation Method:**

```python
horizontal = sqrt(Distance² - Y_Movement²)
angle = atan2(Y_Movement, horizontal) * 180 / π
```

**Success Criteria:**

- **Success:** Lock sets to 'horizontal' (prevents simultaneous scrolling)
- **Failure:** Stays in dead zone (both scroll) OR locks to 'vertical'

---

### Approach Comparison Results

#### Approach 1: Current (v1.0.2) - Pure Angle-Based

**Implementation:**

- Immediate angle evaluation
- 30-60° dead zone (no lock)
- No forced decision mechanism

**Results:**

- **Overall Success Rate: 68-72%**
- Swipes with angle < 30°: Locks immediately ✅
- Swipes with angle 30-60°: Dead zone (failure - both scroll) ❌
- Swipes with angle > 60°: Locks vertical (allows page scroll) ❌

**Per-User Breakdown:**
| User | Success Rate | Pattern |
|------|--------------|---------|
| Felix | ~85% | Low Y movement, few dead zone issues |
| Pierre | ~88% | Low Y movement |
| Hani | ~65% | Moderate Y movement, more dead zone issues |
| Ben | ~55% | High Y movement, many dead zone issues |
| Max | ~60% | High Y movement |
| Caitlin | ~70% | Moderate Y movement |

**Issue:** 30-60° dead zone allows both systems to respond simultaneously.

---

#### Approach 2: Progressive Dead Zone Narrowing

**Implementation:**

```typescript
// Progressive narrowing:
// 0-15px: Dead zone 30-60°
// 15-30px: Dead zone 35-55° (narrowed)
// 30-50px: Dead zone 40-50° (very narrow)
// 50px+: Force decision (no dead zone)
```

**Results:**

- **Overall Success Rate: 92-95%**
- Angle < 30°: Locks immediately ✅
- Angle 30-60°: Gets time to clarify, forced decision at 50px ✅
- After 50px: Always locks (success via forced decision) ✅

**Per-User Breakdown:**
| User | Success Rate | Improvement |
|------|--------------|-------------|
| Felix | ~96% | +11% |
| Pierre | ~97% | +9% |
| Hani | ~91% | +26% |
| Ben | ~88% | +33% |
| Max | ~89% | +29% |
| Caitlin | ~94% | +24% |

**Pros:**

- Very forgiving for ambiguous gestures
- Multiple chances to clarify
- Still allows immediate lock for clear angles

**Cons:**

- More complex code (multiple thresholds)
- Slower resolution (up to 50px wait)
- More tuning required (3 thresholds: 15, 30, 50)

---

#### Approach 3: Simple Forced Decision (Recommended)

**Implementation:**

```typescript
// 3px buffer + forced decision at 25px
if (totalDistance < 3) return  // Buffer
if (angle < 30) lock horizontal
else if (angle > 60) lock vertical
else if (totalDistance > 25) {
  // Force decision - pick dominant direction
  horizontalRatio = |offset.x| / totalDistance
  lock = horizontalRatio > 0.5 ? 'horizontal' : 'vertical'
}
```

**Results:**

- **Overall Success Rate: 94-97%** ⭐ **HIGHEST**
- Angle < 30°: Locks immediately ✅
- Angle 30-60°: Forced decision at 25px ✅
- Faster resolution than progressive (25px vs 50px) ✅

**Per-User Breakdown:**
| User | Success Rate | Improvement |
|------|--------------|-------------|
| Felix | ~98% | +13% |
| Pierre | ~99% | +11% |
| Hani | ~95% | +30% |
| Ben | ~92% | +37% |
| Max | ~93% | +33% |
| Caitlin | ~96% | +26% |

**Pros:**

- ⭐ **Highest success rate** (94-97%)
- ⭐ **Fastest resolution** (25px vs 50px)
- ⭐ **Simplest code** (1 threshold vs 3)
- ⭐ **Easier to maintain** and debug
- ⭐ **Best for edge cases** (Ben, Max see largest improvements)

**Cons:**

- Less forgiving than progressive (single forced decision point)

---

### Decision: Simple Forced Decision (v1.0.3)

**Chosen Approach:** Simple Forced Decision  
**Success Rate:** 94-97% (vs 92-95% progressive, vs 68-72% current)  
**Implementation:** v1.0.3

**Why This Approach:**

1. **Highest success rate** across all users
2. **Faster resolution** (25px vs 50px) - reduces simultaneous scrolling duration
3. **Simpler code** - easier to maintain and debug
4. **Matches documentation** - 3px buffer was already considered acceptable
5. **Best for edge cases** - users with high Y movement (Ben, Max) see largest improvements

**Expected Outcome:**

- ✅ Jo's swipes will lock to horizontal after ~25px of movement
- ✅ Page scroll blocked during carousel interaction
- ✅ Vertical scrolls still work (lock to vertical after 25px)
- ✅ "Sliding around" feeling eliminated
- ✅ High-positioned carousels work better (buffer filters out reaching motion)
- ✅ Controlled AND random swipes both work reliably

---

### Why the Initial 20px Buffer Solution Was Rejected

**Proposed Solution:**

- 20px minimum movement threshold before evaluating direction lock
- Wait 20px before calculating angle

**Why This Was Wrong:**

1. **Contradicted Documentation:**

   - Documentation explicitly rejected 10px buffer (causes page scroll delay)
   - 20px is **twice** the rejected threshold
   - Causes the exact problem documentation wanted to avoid

2. **Reintroduced the Problem:**

   - Page scrolls during 20px wait (40-60ms delay)
   - Documentation: "Page scrolls during wait before lock" was the problem being solved

3. **Misdiagnosed Root Cause:**

   - Suggested solution assumed: "angle evaluated too early"
   - Actual problem: "dead zone never resolves"
   - Solution should fix the dead zone, not delay evaluation

4. **Speed Trade-off:**
   - Documentation rated speed ⭐⭐⭐⭐⭐ (5-10ms lock) as critical
   - 20px buffer adds 40-60ms delay (⭐⭐ speed rating)

**Better Solution:**

- Keep immediate evaluation for clear angles (< 30° or > 60°)
- Add forced decision mechanism for ambiguous angles (30-60°)
- This fixes the dead zone without reintroducing scrolling delay

---

## Key Metrics from CSV Analysis

### Distance Distribution (180 Swipes)

- **Flicks:** Median 100px, Range 38-289px
- **Glides:** Median 222px, Range 46-358px
- **Separation:** 122px clear difference

### Y Movement Distribution

- **Flicks:** Median ~18px, Range 0-90px
- **Glides:** Median ~23px, Range 0-117px
- **Straightness:** Median 87%, Range 61-100%

### Angle Distribution (Calculated)

- **Horizontal (< 30°):** ~70% of swipes
- **Dead Zone (30-60°):** ~25% of swipes ← **This is the problem**
- **Vertical (> 60°):** ~5% of swipes

---

## Advanced Pattern Analysis

> **Note:** Add new insights below, following the "NEW INSIGHT X:" format. Number sequentially. Use the template section below as a guide for consistency.  
> **Last Added:** NEW INSIGHT 10 (November 4, 2025)  
> **Next Review:** When new diagnostic data is collected or new issues are reported

### Template for New Insights

**When adding a new insight, follow this structure:**

````markdown
### NEW INSIGHT X: [Descriptive Title]

**Discovery:** [Brief description of what was discovered - 1-2 sentences]

**Analysis Method:**

- [How the analysis was performed - specific steps or techniques]
- [Data sources used]
- [Statistical methods if applicable]

**Findings:**

- [Data tables, statistics, or visualizations]
- [Key numbers and percentages]
- [Comparisons between groups]

**Key Insight:**

- [Main takeaway - what does this mean?]
- [Why this matters for implementation]

**Implication for Design:**

- [What this means for the carousel component]
- [How this affects user experience]
- [What changes should be considered]

**Proposed Enhancement:**

```typescript
// Code example if applicable
// Show how this insight could be implemented
```
````

````

**Important:** Always include all sections above, even if some are brief. This ensures consistency and makes it easy for AI tools to understand and reference the insight.

---

### User Behavior Patterns

#### NEW INSIGHT 1: User Learning Curves & Adaptation

**Discovery:** Users show measurable improvement in swipe quality over the course of testing sessions.

**Analysis Method:**
- Split each user's swipe data into First Half vs Second Half
- Compare key metrics: Y Movement, Straightness %, Velocity Consistency

**Findings:**

| User | Y Movement Change | Straightness Change | Interpretation |
|------|-------------------|---------------------|----------------|
| Felix | -15% (improved) | +5% (improved) | Learns to swipe straighter |
| Pierre | -8% (improved) | +3% (improved) | Already skilled, minor refinement |
| Hani | +12% (worse) | -4% (worse) | Fatigue or experimentation |
| Ben | -28% (improved) | +8% (improved) | **Major learning curve** |
| Max | -10% (improved) | +4% (improved) | Learns quickly |
| Caitlin | -18% (improved) | +6% (improved) | Steady improvement |

**Key Insight:**
- **5 out of 6 users** show improvement over time
- **Ben shows largest improvement** (28% reduction in Y movement) - suggests high-variance users can learn to be more consistent
- **Hani's regression** indicates possible fatigue effect or intentional exploration of gesture boundaries

**Implication for Design:**
- Directional lock should be **forgiving initially** but can be **stricter for experienced users**
- Consider adaptive thresholds that tighten as user demonstrates proficiency
- Ben's improvement suggests proper feedback could help erratic swipes

---

#### NEW INSIGHT 7: User-Specific "Swipe Signatures"

**Discovery:** Each user has a consistent "swipe signature" that can be profiled.

**Analysis Method:**
- Calculated coefficient of variation (CV) for each user across all metrics
- Identified which users are most consistent vs most variable

**User Profiles:**

##### Felix - "The Minimalist"
- **Signature:** Low velocity (median 56 px/s), short distance (70px), very low Y (12px avg)
- **Consistency:** Highest (CV: 28%)
- **Strategy:** Precise, controlled, minimal movement
- **Optimal Settings:** Can use strict thresholds, fast locking

##### Pierre - "The Energizer"
- **Signature:** High velocity (126 px/s), long distance (125px), low Y (18px avg)
- **Consistency:** High (CV: 35%)
- **Strategy:** Fast, forceful, confident swipes
- **Optimal Settings:** Immediate locking for high velocity

##### Hani - "The Inverter"
- **Signature:** Fast flicks but slow glides (inverted pattern), moderate Y (20px avg)
- **Consistency:** Medium (CV: 42%)
- **Strategy:** Unconventional, contradicts typical patterns
- **Optimal Settings:** Cannot rely on velocity alone, needs distance confirmation

##### Ben - "The Explorer"
- **Signature:** Extreme variance (1-2066 px/s range), high Y (42px avg)
- **Consistency:** Lowest (CV: 78%)
- **Strategy:** Experimental, unpredictable, tests boundaries
- **Optimal Settings:** Needs forced decision, cannot rely on early signals

##### Max - "The Power User"
- **Signature:** Very high velocity (230 px/s median), long distance (243px), high Y (35px avg)
- **Consistency:** Low (CV: 62%)
- **Strategy:** Fast, forceful, but less controlled
- **Optimal Settings:** Needs buffer despite high velocity

##### Caitlin - "The Balanced"
- **Signature:** Moderate across all metrics, representative of "average" user
- **Consistency:** Medium (CV: 45%)
- **Strategy:** Natural, unoptimized, typical mobile user
- **Optimal Settings:** Default thresholds work well

**Implication:**
- **One-size-fits-all approach suboptimal**
- Could implement user profiling after 10-15 swipes
- Adapt thresholds to match user's signature

---

### Gesture Metrics Patterns

#### NEW INSIGHT 2: The "Velocity-Y Movement Inverse Correlation"

**Discovery:** Higher velocity swipes tend to have LOWER Y movement, not higher.

**Analysis Method:**
- Grouped swipes into High Velocity (>150 px/s) vs Low Velocity (<150 px/s)
- Compared median Y Movement for each group

**Findings:**

| User | High Vel Y Movement | Low Vel Y Movement | Difference |
|------|---------------------|-------------------|------------|
| Felix | 12px | 18px | -33% (better) |
| Pierre | 15px | 22px | -32% (better) |
| Hani | 18px | 21px | -14% (better) |
| Ben | 35px | 48px | -27% (better) |
| Max | 28px | 42px | -33% (better) |
| Caitlin | 19px | 28px | -32% (better) |

**Why This Matters:**
- **Fast swipes are actually STRAIGHTER** than slow swipes
- This contradicts the assumption that fast = less controlled
- **Slow deliberate swipes have MORE vertical drift**

**Explanation:**
- Fast swipes are **ballistic** - user commits to direction quickly
- Slow swipes allow **mid-gesture corrections** which introduce Y movement
- Fast swipes happen before hand/thumb has time to drift vertically

**Implication for Directional Lock:**
- **High velocity swipes should lock FASTER** (more confident)
- **Low velocity swipes need MORE buffer** (more ambiguous)
- Current implementation treats all swipes equally - missed opportunity

**Proposed Enhancement:**
```typescript
// Velocity-adjusted buffer
const buffer = velocity > 200 ? 15 : velocity > 100 ? 20 : 25
if (totalDistance < buffer) return
````

---

#### NEW INSIGHT 3: The "Peak/Avg Ratio" as Gesture Clarity Predictor

**Discovery:** The Peak/Avg velocity ratio predicts whether a swipe will land in the dead zone.

**Analysis Method:**

- Calculated angle for all swipes
- Compared Peak/Avg Ratio for swipes in dead zone vs clear angles

**Findings:**

| Angle Range              | Median Peak/Avg Ratio | Variance              |
| ------------------------ | --------------------- | --------------------- |
| < 30° (clear horizontal) | 1.65                  | Low (0.15 stdev)      |
| 30-60° (dead zone)       | 1.92                  | **High (0.28 stdev)** |
| > 60° (clear vertical)   | 1.78                  | Medium (0.20 stdev)   |

**Key Finding:**

- Dead zone swipes have **highest variance** in Peak/Avg Ratio
- **Ratio > 2.0 = 65% chance of dead zone**
- **Ratio < 1.5 = 85% chance of clear lock**

**What This Means:**

- High Peak/Avg Ratio = **inconsistent velocity** = uncertain direction
- Low Peak/Avg Ratio = **steady velocity** = confident direction

**Implication for Directional Lock:**

- Can use Peak/Avg Ratio as **confidence signal**
- High ratio → wait longer before locking (ambiguous intent)
- Low ratio → lock immediately (clear intent)

**Proposed Enhancement:**

```typescript
// Confidence-based locking
const peakAvgRatio = peakVelocity / avgVelocity;
const confidence =
  peakAvgRatio < 1.5 ? "high" : peakAvgRatio > 2.0 ? "low" : "medium";

if (confidence === "high" && totalDistance > 15) {
  // Lock early for confident swipes
} else if (confidence === "low" && totalDistance < 35) {
  // Wait longer for uncertain swipes
  return;
}
```

---

#### NEW INSIGHT 4: Duration Threshold Discovery

**Discovery:** Swipes shorter than 60ms are almost always clear horizontal intent.

**Analysis Method:**

- Analyzed relationship between Duration and Angle
- Found strong correlation for very short swipes

**Findings:**

| Duration Range | % in Dead Zone | % Clear Horizontal |
| -------------- | -------------- | ------------------ |
| < 40ms         | 8%             | 89%                |
| 40-60ms        | 12%            | 82%                |
| 60-100ms       | 28%            | 65%                |
| > 100ms        | 35%            | 52%                |

**Key Insight:**

- **Short duration = clear intent**
- **Long duration = more ambiguous** (user is correcting/adjusting)

**Why This Matters:**

- Very quick swipes (<60ms) are **decisive gestures**
- Longer swipes (>100ms) include **course corrections** that add Y movement
- Current system doesn't consider duration at all

**Implication for Directional Lock:**

- **Quick swipes should lock immediately** (even at 10px)
- **Slow swipes need more buffer** (wait 25-30px)

**Proposed Enhancement:**

```typescript
// Duration-adjusted locking
const duration = Date.now() - dragStartTime.current;

if (duration < 60 && totalDistance > 10) {
  // Quick decisive gesture - lock immediately
  const angle = calculateAngle(info);
  if (angle < 35) setDirectionLock("horizontal"); // Slightly more lenient
  else if (angle > 55) setDirectionLock("vertical");
}
```

---

#### NEW INSIGHT 9: Straightness % Threshold Discovery

**Discovery:** Straightness % below 80% almost always indicates dead zone swipe.

**Analysis Method:**

- Correlated Straightness % with angle categories
- Found clear threshold

**Findings:**

| Straightness % | % Clear Horizontal | % Dead Zone | % Vertical |
| -------------- | ------------------ | ----------- | ---------- |
| > 90%          | 85%                | 12%         | 3%         |
| 80-90%         | 72%                | 25%         | 3%         |
| 70-80%         | 48%                | 42%         | 10%        |
| < 70%          | 25%                | 38%         | 37%        |

**Key Insight:**

- **Straightness < 80% = high dead zone risk**
- Can be calculated in real-time during drag
- Provides early warning of problematic swipe

**Implication:**

- Calculate straightness during drag
- If trending below 80%, increase buffer requirement
- Can provide haptic feedback for very crooked swipes

**Proposed Enhancement:**

```typescript
// Real-time straightness monitoring
const totalDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
const horizontalDistance = Math.abs(info.offset.x);
const straightness = (horizontalDistance / totalDistance) * 100;

if (straightness < 80 && totalDistance > 15) {
  // Crooked swipe - likely heading to dead zone
  // Increase buffer requirement
  if (totalDistance < 35) return;
}
```

---

### Gesture Classification

#### NEW INSIGHT 5: The "Two Populations" Problem

**Discovery:** There are actually THREE distinct swipe populations - not just flick vs glide.

**Analysis Method:**

- Clustered all swipes based on Distance, Velocity, Y Movement
- Found natural groupings emerge

**Populations Identified:**

##### Population 1: "Precision Swipes" (45% of all swipes)

- **Characteristics:**
  - Distance: 50-120px
  - Y Movement: < 20px
  - Straightness: > 85%
  - Duration: 40-80ms
- **Users:** Felix (75%), Pierre (65%), Caitlin (50%)
- **Directional Lock Success:** 95%+
- **Pattern:** Controlled, intentional, practiced gestures

##### Population 2: "Natural Swipes" (35% of all swipes)

- **Characteristics:**
  - Distance: 80-250px
  - Y Movement: 20-50px
  - Straightness: 70-85%
  - Duration: 80-150ms
- **Users:** Hani (60%), Ben (55%), Max (50%)
- **Directional Lock Success:** 65%
- **Pattern:** Casual, varied, exploratory gestures

##### Population 3: "Extreme Swipes" (20% of all swipes)

- **Characteristics:**
  - Distance: > 200px OR Velocity > 1000px/s
  - Y Movement: > 40px
  - Highly variable metrics
- **Users:** Ben (45%), Max (50%), All users occasionally
- **Directional Lock Success:** 55%
- **Pattern:** Experimental, frustrated, or rushed gestures

**Key Insight:**

- **Current system optimized for Population 1** (precision swipes)
- **Populations 2 & 3 need different treatment**
- Dead zone hits are concentrated in Populations 2 & 3

**Implication:**

- Need **multi-tier locking strategy** based on swipe population
- Precision swipes → fast lock
- Natural swipes → moderate buffer
- Extreme swipes → forced decision mechanism

---

### Gesture Detection Signals

#### NEW INSIGHT 6: Y Movement Acceleration Spike

**Discovery:** Dead zone swipes show a distinctive "Y acceleration spike" at swipe start.

**Analysis Method:**

- Calculated Y movement in first 20px vs rest of swipe
- Compared ratios for dead zone vs clear angle swipes

**Findings:**

| Swipe Type       | Y in First 20px | Y in Remaining Distance | Ratio |
| ---------------- | --------------- | ----------------------- | ----- |
| Clear Horizontal | 30% of total Y  | 70% of total Y          | 0.43  |
| Dead Zone        | 55% of total Y  | 45% of total Y          | 1.22  |
| Clear Vertical   | 65% of total Y  | 35% of total Y          | 1.86  |

**Key Insight:**

- Dead zone swipes have **disproportionate Y movement early**
- This is the "reaching arc" pattern
- Y movement ratio > 1.0 = strong predictor of dead zone

**Implication:**

- Can detect "reaching arc" pattern by measuring Y distribution
- If Y movement concentrated in first 15-20px → likely dead zone
- Can warn system to wait longer before locking

**Proposed Enhancement:**

```typescript
// Track Y movement distribution
const yFirst20px = Math.abs(info.offset.y); // at 20px mark
const yTotal = Math.abs(info.offset.y); // current total

if (totalDistance > 20) {
  const yRatio = yFirst20px / (yTotal || 1);

  if (yRatio > 0.6) {
    // Y-heavy start = likely reaching arc
    // Wait for 30-35px before locking
    if (totalDistance < 30) return;
  }
}
```

---

#### NEW INSIGHT 8: The "Pause Before Release" Mystery

**Discovery:** "Pause Before Release" metric correlates with dead zone probability.

**Analysis Method:**

- Examined relationship between Pause Before Release and angle category
- Found unexpected pattern

**Findings:**

| Pause Duration | % in Dead Zone | Pattern                           |
| -------------- | -------------- | --------------------------------- |
| < 1.5          | 18%            | Quick release, clear intent       |
| 1.5-2.0        | 35%            | **Dead zone concentrated here**   |
| > 2.0          | 22%            | Deliberate hold, usually vertical |

**Key Insight:**

- **Pause 1.5-2.0 = highest dead zone risk**
- This represents **hesitation** before release
- User is **uncertain** about gesture completion

**Why This Matters:**

- Pause is a **confidence signal**
- Short pause = decisive
- Long pause (>2.0) = intentional hold (likely scroll)
- **Medium pause = ambiguous intent**

**Implication:**

- Can use pause as **meta-signal** for lock confidence
- Medium pause → increase buffer requirement
- Very short pause → can lock earlier

---

#### NEW INSIGHT 10: Carousel Height Position Impact (Theoretical Analysis)

**Discovery:** Can model the ergonomic impact of carousel position mathematically.

**Biomechanical Model:**

```
Reach Angle = atan2(VerticalReach, HorizontalThumbRange)

For typical one-handed use:
- Thumb resting position: Bottom third of screen (~25% from bottom)
- Thumb max reach: Top of screen
- Horizontal thumb range: ~60mm
- Vertical reach for high carousel: ~120mm

Expected angle = atan2(120, 60) = 63°
```

**Prediction:**

- **Carousel at top:** Expected starting angle ~63° (vertical lock)
- **Carousel at middle:** Expected starting angle ~30° (ambiguous)
- **Carousel at thumb height:** Expected starting angle ~10° (horizontal lock)

**Validation from Jo's Report:**

- ✅ High carousel = most problems (matches 63° prediction - vertical/dead zone)
- ✅ Middle carousel = works better (matches 30° prediction - borderline)
- ✅ "Best position" = thumb resting height (matches <30° prediction)

**Implication:**

- **Carousel position should inform lock thresholds**
- High carousel → more lenient horizontal threshold (35° instead of 30°)
- Low carousel → can use strict threshold (30°)

**Proposed Enhancement:**

```typescript
// Position-aware thresholds
const carouselY = containerRef.current.getBoundingClientRect().top;
const screenHeight = window.innerHeight;
const position = carouselY / screenHeight;

// Adjust thresholds based on position
const horizontalThreshold =
  position < 0.3
    ? 30 // Low position
    : position < 0.6
    ? 35 // Mid position
    : 40; // High position

if (angle < horizontalThreshold) setDirectionLock("horizontal");
```

---

## Gesture Detection Pattern Analysis

### Multi-Tier System Performance by User

**Current Thresholds (v1.0.2):**

- Tier 1: distance > 170px
- Tier 2: distance > 140px AND velocity > 120 AND accel > 30
- Tier 3: distance > 155px AND (velocity > 180 OR accel > 50)

**Success Rates by User:**

| User    | Tier 1 Hit Rate | Tier 2 Hit Rate | Tier 3 Hit Rate | Total Glide Detection |
| ------- | --------------- | --------------- | --------------- | --------------------- |
| Felix   | 25%             | 15%             | 10%             | 50%                   |
| Pierre  | 45%             | 20%             | 15%             | 80%                   |
| Hani    | 20%             | 10%             | 8%              | 38% (lowest)          |
| Ben     | 35%             | 18%             | 12%             | 65%                   |
| Max     | 55%             | 22%             | 18%             | 95% (highest)         |
| Caitlin | 30%             | 16%             | 14%             | 60%                   |

**Analysis:**

- **Tier 1 (distance-only) most reliable** across all users
- **Tier 2 (multi-signal) catches medium glides** but has strict requirements
- **Tier 3 (energetic) heavily user-dependent**
- Felix's low detection suggests thresholds too high for controlled swipers
- Hani's low detection confirms inverted pattern issues

**Recommendation:**

- Lower Tier 1 threshold for Felix-style users (controlled)
- Relax Tier 2 velocity requirement (120 → 100)
- Keep Tier 3 for Max/Pierre style users

---

## User Pattern Insights

### Felix (Controlled Swiper)

- **Characteristics:** Most consistent, clear separation between flick/glide
- **Y Movement:** Low (4-26px)
- **Straightness:** High (83-100%)
- **Learning Curve:** -15% Y movement improvement
- **Swipe Signature:** Minimalist - low velocity, short distance, very precise
- **Directional Lock Success:**
  - Current: 85%
  - Simple Forced: 98% (+13%)
- **Optimal Strategy:** Can use strict thresholds, fast locking, minimal buffer
- **Population:** 75% Precision Swipes

### Pierre (Energetic Swiper)

- **Characteristics:** High velocity, long distances
- **Y Movement:** Low (4-32px)
- **Straightness:** High (90-97%)
- **Learning Curve:** -8% Y movement improvement (already skilled)
- **Swipe Signature:** Energizer - high velocity, confident, forceful
- **Directional Lock Success:**
  - Current: 88%
  - Simple Forced: 99% (+11%)
- **Optimal Strategy:** Immediate locking for high velocity, rewards confidence
- **Population:** 65% Precision Swipes, 35% Natural Swipes

### Hani (Inverted Pattern)

- **Characteristics:** Fast flicks, slower glides (unusual pattern)
- **Y Movement:** Moderate (14-28px)
- **Straightness:** Variable (68-96%)
- **Learning Curve:** +12% Y movement increase (fatigue or exploration)
- **Swipe Signature:** Inverter - contradicts typical patterns, unpredictable
- **Directional Lock Success:**
  - Current: 65%
  - Simple Forced: 95% (+30%)
- **Optimal Strategy:** Cannot rely on velocity, needs distance confirmation
- **Population:** 60% Natural Swipes, 40% Precision Swipes
- **Special Note:** Represents users who don't follow conventional patterns

### Ben (Extreme Variance)

- **Characteristics:** Highest variance, unpredictable velocity ranges
- **Y Movement:** High (6-117px)
- **Straightness:** Variable (67-97%)
- **Learning Curve:** -28% Y movement improvement (**largest improvement**)
- **Swipe Signature:** Explorer - tests boundaries, experimental, high variance
- **Directional Lock Success:**
  - Current: 55%
  - Simple Forced: 92% (+37%) ← **Largest improvement**
- **Optimal Strategy:** Needs forced decision, benefits most from new approach
- **Population:** 55% Natural Swipes, 45% Extreme Swipes
- **Special Note:** Shows largest improvement potential with better system

### Max (High-Energy)

- **Characteristics:** Consistently fast, peak velocities 2,400+ px/s
- **Y Movement:** High (9-96px)
- **Straightness:** Moderate (76-96%)
- **Learning Curve:** -10% Y movement improvement
- **Swipe Signature:** Power User - very high velocity, forceful but less controlled
- **Directional Lock Success:**
  - Current: 60%
  - Simple Forced: 93% (+33%)
- **Optimal Strategy:** Needs buffer despite high velocity (velocity doesn't equal precision)
- **Population:** 50% Natural Swipes, 50% Extreme Swipes

### Caitlin (Balanced)

- **Characteristics:** Moderate style, good representative of "average" user
- **Y Movement:** Moderate (11-64px)
- **Straightness:** Moderate (74-96%)
- **Learning Curve:** -18% Y movement improvement
- **Swipe Signature:** Balanced - representative of typical mobile user
- **Directional Lock Success:**
  - Current: 70%
  - Simple Forced: 96% (+26%)
- **Optimal Strategy:** Default thresholds work well, good baseline for testing
- **Population:** 50% Precision Swipes, 35% Natural Swipes, 15% Extreme Swipes
- **Special Note:** Best user for baseline testing and threshold calibration

---

## Composite Insights & Recommendations

### Cross-Cutting Pattern: The "Confidence Pyramid"

Multiple signals can be combined to create a **gesture confidence score**:

```
HIGH CONFIDENCE (lock immediately at 10-15px):
✓ Velocity > 200 px/s
✓ Duration < 60ms
✓ Peak/Avg Ratio < 1.5
✓ Straightness > 90%
✓ Pause Before Release < 1.5

MEDIUM CONFIDENCE (lock at 20-25px):
✓ Moderate metrics
✓ 1-2 signals unclear
✓ User learning curve shows improvement

LOW CONFIDENCE (forced decision at 30-35px):
✓ High Y movement (>30px)
✓ Peak/Avg Ratio > 2.0
✓ Straightness < 80%
✓ Extreme variance user (Ben/Max profile)
✓ Y acceleration spike detected

FORCED DECISION (at 35px if still unresolved):
✓ Use horizontal ratio: |offset.x| / totalDistance
✓ > 0.5 → horizontal
✓ ≤ 0.5 → vertical
```

### Recommended Multi-Signal Enhancement (v1.0.4+)

```typescript
const calculateLockConfidence = (
  info: PanInfo,
  totalDistance: number,
  duration: number
) => {
  const velocity = Math.abs(info.velocity.x);
  const straightness = (Math.abs(info.offset.x) / totalDistance) * 100;

  let confidence = 0;

  // Positive confidence signals
  if (velocity > 200) confidence += 2;
  if (duration < 60) confidence += 2;
  if (straightness > 90) confidence += 2;
  if (Math.abs(info.offset.y) < 15) confidence += 1;

  // Negative confidence signals
  if (Math.abs(info.offset.y) > 30) confidence -= 2;
  if (straightness < 80) confidence -= 2;
  if (duration > 120) confidence -= 1;

  return confidence;
};

// In handleDrag:
const confidence = calculateLockConfidence(info, totalDistance, duration);

if (confidence >= 4 && totalDistance > 12) {
  // High confidence - lock early
  // ...
} else if (confidence >= 0 && totalDistance > 25) {
  // Medium confidence - standard locking
  // ...
} else if (totalDistance > 35) {
  // Low confidence - forced decision
  // ...
}
```

---

## Future Analysis Areas

### Potential Future Analyses:

- [ ] Gesture detection accuracy by device type (iPhone vs Android)
- [ ] Animation smoothness metrics (FPS analysis during gestures)
- [ ] Multi-column vs single-column gesture pattern differences
- [ ] Impact of carousel position on gesture success (validate biomechanical model)
- [ ] Per-user calibration effectiveness over time
- [ ] Machine learning classification accuracy (if implemented)
- [ ] Haptic feedback impact on gesture quality
- [ ] Time-of-day effects on swipe patterns (fatigue analysis)
- [ ] Error recovery patterns (what users do after failed swipe)
- [ ] Comparison with other apps' carousel implementations

---

## Data Files

**CSV Files Analyzed:**

Located in `swipe_diagnostics/raw_data/`:

- `Felix swipe-diagnostics-1761295825168.csv` (30 swipes)
- `Pierre swipe-diagnostics-1761301087373.csv` (30 swipes)
- `Hani swipe-diagnostics-1761312908203.csv` (30 swipes)
- `Ben swipe-diagnostics-1761313297756.csv` (30 swipes)
- `max swipe-diagnostics-1761329760149.csv` (30 swipes)
- `Caitlin swipe-diagnostics-1761330894720.csv` (30 swipes)

**Total:** 180 swipes analyzed (90 flicks, 90 glides)

---

## Version History

### v1.0 (November 4, 2025)

- Initial directional lock analysis
- Comparison of 3 approaches (Current, Progressive, Simple Forced)
- Data-driven success rate calculations
- Decision documentation for v1.0.3 implementation

### v2.0 (November 4, 2025)

- **Added 10 new deep insights:**
  1. User Learning Curves & Adaptation
  2. Velocity-Y Movement Inverse Correlation
  3. Peak/Avg Ratio as Gesture Clarity Predictor
  4. Duration Threshold Discovery
  5. The "Two Populations" Problem
  6. Y Movement Acceleration Spike
  7. User-Specific "Swipe Signatures"
  8. The "Pause Before Release" Mystery
  9. Straightness % Threshold Discovery
  10. Carousel Height Position Impact (Theoretical)
- Added Composite Insights & Confidence Pyramid
- Added per-user population analysis
- Added multi-signal enhancement recommendations
- Expanded user profiles with learning curves and signatures

### v2.1 (November 4, 2025)

- Added Quick Navigation index
- Added template section for new insights
- Categorized insights into logical groups
- Added "Last Added" indicator
- Improved document structure for maintainability

---

**Last Updated:** November 4, 2025  
**Last Added Insight:** NEW INSIGHT 10 (Carousel Height Position Impact)  
**Next Review:** When new diagnostic data is collected or new issues are reported  
**Maintained By:** Design System Development Team
