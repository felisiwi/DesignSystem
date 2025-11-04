# Carousel_08_04112025.md

## Session Overview
**Date:** November 4, 2025  
**Focus:** Two-column glide detection struggles  
**Type:** Bug investigation and context retrieval

---

## Session Context

### Initial Setup
User initiated a test session to verify proper project knowledge loading. Claude systematically searched and loaded:

1. **Session Documentation** ✓
   - Carousel_MASTER.md (1800+ lines)
   - Individual session notes (Sessions 01, 02, 04, 06, 07)
   - Complete version history (v0.1.0 → v1.1.0)

2. **Data Files** ✓
   - CSV swipe diagnostics from 6 users
   - 180 total gestures (90 flicks, 90 glides)
   - Quantitative validation data

3. **Live Component Code** ✓
   - AdaptiveCarousel.1.1.0.tsx (current monolithic, 850+ lines)
   - AdaptiveCarousel-Modular.v0.4.0.tsx (reference)
   - Historical versions

4. **Utility Code & Documentation** ✓
   - Utils Documentation
   - API_Reference.md
   - Hooks_Documentation.md

5. **Project Context** ✓
   - PROJECT_NOTES.md
   - Cursor rules
   - README.md

---

## Primary Issue Identified

### Two-Column Glide Detection Problem

**User Report:**
- Currently working on AdaptiveCarousel.1.1.1
- Experiencing significant difficulty performing glides in two-column mode
- User noted this struggle has been documented in previous Markdown files

**Context:**
- This is a known, recurring issue mentioned across multiple sessions
- The problem specifically affects multi-column layouts
- Two-column mode appears to have unique gesture detection challenges

---

## Historical Context

### Previous Documentation References

**From Session 03 (Carousel_03.md):**
- **Open Question #1:** "Animation Weight Feel" - User wanted 2-column to feel "heavier"
- Note: All physics changes degraded gesture detection
- Recommendation: Visual feedback (scale, blur) instead of physics changes
- Status: Not tested

**From Gesture Detection Analysis:**
- 93.25% overall accuracy achieved through 4-tier detection system
- However, accuracy metrics based on single-column testing
- Multi-column mode may have different gesture characteristics

**Known Challenge:**
- Two-column layouts reduce horizontal swipe distance per card
- Shorter distances make it harder to distinguish flicks from glides
- Users may need to swipe proportionally farther to trigger glides

---

## Technical Considerations

### Why Two-Column Mode Is Harder

1. **Reduced Distance Threshold**
   - In single-column: Full card width = ~300-400px
   - In two-column: Half width = ~150-200px
   - Users cover less distance with same physical motion

2. **Gesture Detection System**
   - Current thresholds:
```typescript
     GLIDE_DISTANCE_HIGH_CONFIDENCE = 145px
     GLIDE_VELOCITY_MEDIUM = 75 px/s
     GLIDE_VELOCITY_HIGH = 110 px/s
```
   - These may not scale proportionally for smaller card widths

3. **Visual Feedback**
   - Two cards visible = ambiguous target
   - Users don't know if they're "dragging enough"
   - Lack of progressive feedback during gesture

---

## Potential Solutions (Not Yet Implemented)

### Option 1: Dynamic Threshold Scaling
- Adjust gesture thresholds based on `columns` prop
- Scale distance thresholds proportionally:
```typescript
  const scaledDistance = BASE_DISTANCE_THRESHOLD / columns
```

### Option 2: Visual Cues During Drag
- Show progress indicator
- Highlight when glide threshold crossed
- Provide haptic/visual feedback

### Option 3: Alternative Gesture Patterns
- Double-tap for glide intent
- Long-press modifier
- Velocity-only detection for multi-column

### Option 4: Per-Layout Calibration
- Allow users to tune thresholds per breakpoint
- Expose `gestureConfig` prop with column-specific overrides

---

## Open Questions

1. **Quantitative Analysis Needed:**
   - What is the actual glide detection rate in two-column mode?
   - Are users overshooting or undershooting thresholds?
   - Is it velocity, distance, or both causing failures?

2. **User Intent:**
   - Should two-column mode prioritize flicks or glides?
   - Is multi-card gliding even the right UX for tight layouts?
   - Would disabling glides and using only flicks be acceptable?

3. **Testing Gap:**
   - Original CSV data (180 gestures) was all single-column
   - No empirical data for two-column gesture behavior
   - Need new test session with two-column layout

---

## Next Steps (Recommended)

### Immediate (Diagnostic)
1. Add console logging to capture:
   - Distance traveled in two-column glide attempts
   - Velocity at drag end
   - Which tier threshold is being hit
2. Collect 20-30 two-column swipe samples
3. Compare against single-column baseline data

### Short-Term (Quick Fix)
1. Temporarily lower glide distance threshold for testing
2. Try: `GLIDE_DISTANCE_HIGH_CONFIDENCE = 100px` (was 145px)
3. Test if this improves two-column glide detection

### Long-Term (Architecture)
1. Implement column-aware gesture scaling
2. Create per-layout threshold configuration system
3. Build visual feedback system (progress bar during drag)
4. Re-validate with comprehensive user testing

---

## Session Outcome

**Status:** Issue identified and contextualized  
**Action Required:** Diagnostic data collection  
**Blocker:** Lack of two-column empirical gesture data  

**Key Insight:** The 93.25% gesture accuracy was achieved with single-column testing. Multi-column layouts represent an untested edge case that may require dedicated calibration.

---

## Files Referenced

- AdaptiveCarousel.1.1.1.tsx (in progress)
- Carousel_MASTER.md (comprehensive reference)
- Carousel_03.md (animation weight investigation)
- CSV swipe diagnostics (Felix, Pierre, Hani, Ben, Max, Caitlin)

---

## Document Metadata

**Session Number:** 08  
**Date:** November 4, 2025  
**Duration:** ~10 minutes  
**Type:** Issue triage  
**Status:** Investigation phase  
**Follow-up Required:** Yes - data collection needed  

---

**End of Summary**