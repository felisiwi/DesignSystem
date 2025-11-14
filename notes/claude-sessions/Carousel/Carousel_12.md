# Carousel_12_14112025.md

**Date:** November 14, 2025
**Focus:** Version control workflow for manual file management and Fitts's Law application to carousel animation
**Type:** Process documentation / Design consultation / Architecture decision
**Component Version:** v1.0.8 (Carousel), v1.0.2 (Diagnostics discussed)
**Session Duration:** ~45 minutes

---

## 🎯 Session Objective

**Primary Goal:** Establish a clear version control strategy for a developer who doesn't use Git, focusing on experimental naming conventions and documentation workflows to maintain clarity when iterating on carousel components.

**Context from Previous Sessions:**

- Session 11 (Nov 10): Identified 2-column animation physics issue where users compensate by swiping 96% harder
- Multiple experimental versions created (1.0.1, 1.0.2, etc.) leading to confusion about lineage
- User self-identifies as "vibe coder" new to programming, doesn't understand Git
- Need for tracking experimental iterations that may be abandoned and reverted

**This Session Builds On:**

- Existing carousel component versioning system (e.g., carousediagnostics.1.0.1.tsx, carousediagnostics.1.0.2.tsx)
- Understanding that version numbers can "jump" when experiments are abandoned
- Recognition that experimental features need clear tracking separate from stable releases

---

## 📋 Context Loaded

List all documentation and context files referenced during this session:

1. **COMPONENTS.md** - Current version tracking (Carousel v1.0.8, Diagnostics v1.0.2)
2. **Session 11** - Referenced for 2-column animation physics context and Fitts's Law mention
3. **Session 10** - Referenced for unresolved issues list
4. **Current file structure** - User's existing naming convention (component.X.Y.Z.tsx)
5. **User workflow patterns** - Manual file versioning, experimental iterations, selective abandonment

**Why This Context Mattered:**
Understanding the user's self-taught "vibe coder" approach and aversion to Git was critical for designing a manual version control system that would work with their intuitive workflow rather than requiring fundamental changes to their development process. The Session 11 context about animation physics provided the concrete example needed to explain Fitts's Law application.

---

## 💡 Key Decisions Made

### Decision 1: Adopt Experimental Naming Convention with Suffixes

**Problem:** When creating experimental versions (e.g., v1.0.3 with new feature), then abandoning and returning to v1.0.2, the next stable version becomes v1.0.3 again, creating confusion about which 1.0.3 is which and whether they're related.

**Options Considered:**

1. Continue numeric versioning only - Pros: Simple, familiar | Cons: Lineage unclear, experimental vs stable indistinguishable
2. Use date stamps (component.2024-11-14.tsx) - Pros: Chronological | Cons: Loses semantic meaning, hard to determine "latest"
3. Branch-like suffixes (exp-featurename-vN) - Pros: Clear experimental marking, shows relationship to base | Cons: Requires learning new naming pattern
4. Git adoption - Pros: Industry standard, powerful | Cons: Steep learning curve, user explicitly doesn't want to learn it

**Decision:** Adopt experimental naming convention using suffixes: `component.X.Y.Z-exp-featurename-vN.tsx`

**Implementation Approach:**

```
Naming Pattern Examples:

Stable releases:
- carousediagnostics.1.0.2.tsx ← Production version
- carousediagnostics.1.0.3.tsx ← Next stable release

Experimental iterations:
- carousediagnostics.1.0.2-exp-faster-v1.tsx ← First experiment based on 1.0.2
- carousediagnostics.1.0.2-exp-faster-v2.tsx ← Second iteration of same experiment
- carousediagnostics.1.0.2-exp-faster-v3.tsx ← Third iteration
- carousediagnostics.1.0.2-exp-3deffects-v1.tsx ← Different experiment, also from 1.0.2

Workflow:
1. Start from stable version (1.0.2)
2. Create experiment (1.0.2-exp-faster-v1)
3. If successful → Becomes next stable (1.0.3)
4. If abandoned → Delete experiment files, stay on 1.0.2
```

**Rationale:** This approach provides Git-like benefits (clear branching, experimentation tracking) without requiring Git knowledge. The suffix pattern is intuitive enough for a "vibe coder" to understand immediately while providing the lineage tracking needed for complex development.

**Trade-offs Accepted:** Longer filenames, manual file management overhead, no automatic merging capabilities (but user doesn't need these).

---

### Decision 2: Create EXPERIMENTS_LOG.md for Tracking

**Problem:** Need a way to remember what experiments were tried, why they were abandoned, and what insights were gained, without relying on Git commit history.

**Options Considered:**

1. Comments in code - Pros: Co-located with implementation | Cons: Clutters code, hard to search
2. Separate text file per experiment - Pros: Detailed notes possible | Cons: Too many files, fragmented knowledge
3. Centralized log file - Pros: Single source of truth, searchable | Cons: Requires discipline to maintain
4. No formal tracking - Pros: Zero overhead | Cons: Knowledge loss, repeated mistakes

**Decision:** Create EXPERIMENTS_LOG.md with structured template for logging all experimental work.

**Implementation Approach:**

```markdown
# Experiments Log - Carousel Diagnostics

## Format

Each experiment gets an entry with:

- **Base Version:** Which stable version it branched from
- **Experiment Name:** Short descriptive name
- **Files Created:** List of all experimental version files
- **Goal:** What you were trying to achieve
- **Outcome:** Success/Abandoned/Merged
- **Key Learnings:** What you discovered
- **Merged Into:** If successful, which stable version incorporated it

## Example Entry

### exp-faster (2025-11-10)

- **Base Version:** carousediagnostics.1.0.2
- **Files:**
  - carousediagnostics.1.0.2-exp-faster-v1.tsx
  - carousediagnostics.1.0.2-exp-faster-v2.tsx
  - carousediagnostics.1.0.2-exp-faster-v3.tsx
- **Goal:** Improve animation speed in 2-column mode
- **Outcome:** ✅ Success
- **Merged Into:** carousediagnostics.1.0.3.tsx
- **Key Learnings:**
  - Original stiffness too low (150)
  - Users compensated by swiping 96% harder
  - Optimal stiffness for 2-column is 300
```

**Rationale:** Provides knowledge preservation without requiring Git, creates searchable history, low-friction documentation process that fits "vibe coder" workflow.

**Trade-offs Accepted:** Manual entry required, no automatic generation, depends on user discipline to maintain.

---

### Decision 3: Clarify Experimental Naming ≠ Git Branches

**Problem:** User asked if experimental naming convention was "the same thing as Git branches", showing potential confusion between manual file management and version control systems.

**Options Considered:**

1. Say "yes, basically the same" - Pros: Quick answer | Cons: Technically wrong, creates misconceptions
2. Explain full Git branching concept - Pros: Educationally complete | Cons: Overwhelming, user doesn't want to learn Git
3. Clear distinction with emphasis on differences - Pros: Accurate, respects user's choice | Cons: Might make user feel they're missing out

**Decision:** Explicitly clarify that experimental naming is NOT Git branches, emphasize it's a completely different approach suited to their manual workflow.

**Rationale:** User explicitly stated they don't want to learn Git. Falsely equating manual file naming with Git branches would either: (a) give them false confidence they "understand Git", or (b) make them feel inadequate. Better to validate their manual approach as legitimate and different.

**Trade-offs Accepted:** User may never learn Git (but that's their choice), potential inefficiencies in file management (but acceptable for their scale).

---

## 🔧 Technical Implementation Details

### Experimental Naming Convention System

**Concept:** Manual file naming pattern that provides branching-like capabilities without version control software.

**Implementation:**

```
Pattern: component.{baseVersion}-exp-{featureName}-v{iteration}.tsx

Real Examples:
✅ AdaptiveCarousel.1.0.4-exp-advancedmotion-v1.tsx
✅ AdaptiveCarousel.1.0.4-exp-advancedmotion-v2.tsx
✅ carousediagnostics.1.0.2-exp-syncanimation-v1.tsx

Components Breakdown:
- baseVersion (1.0.4): Which stable release this branches from
- exp: Marker indicating "experimental, not production"
- featureName (advancedmotion): What this experiment tries to achieve
- iteration (v1, v2, v3): Multiple attempts at same experiment

Workflow Integration:
1. Identify stable base (e.g., 1.0.4)
2. Name experiment clearly (e.g., "advancedmotion")
3. Create first iteration (1.0.4-exp-advancedmotion-v1)
4. Test and iterate (v2, v3, etc.)
5. Decision point:
   - Success → Becomes next stable version (1.0.5)
   - Failure → Delete experiment files, log learnings
```

**Effect:** Clear visual distinction between stable releases and experiments, traceable lineage back to base version, supports parallel experimentation (multiple "-exp-" branches from same base).

**Performance Impact:** None - purely organizational, doesn't affect code execution.

**Accessibility Considerations:** N/A - file naming convention.

**Browser Compatibility:** N/A - file naming convention.

---

### EXPERIMENTS_LOG.md Template

**Concept:** Centralized markdown file for documenting all experimental work, outcomes, and learnings.

**Implementation:**

```markdown
# Experiments Log - [Component Name]

---

## Active Experiments

### [experiment-name] (Started: YYYY-MM-DD)

- **Base Version:** [e.g., 1.0.4]
- **Files:**
  - [filename-v1.tsx]
  - [filename-v2.tsx]
- **Goal:** [Brief description]
- **Current Status:** 🔬 In Progress
- **Notes:**
  - [Observation 1]
  - [Observation 2]

---

## Completed Experiments

### [experiment-name] (YYYY-MM-DD)

- **Base Version:** [e.g., 1.0.2]
- **Files:**
  - [All experimental files created]
- **Goal:** [What you were trying to achieve]
- **Outcome:** ✅ Success / ❌ Abandoned / ⚠️ Partial Success
- **Merged Into:** [Stable version, if successful]
- **Key Learnings:**
  - [What worked]
  - [What didn't work]
  - [Unexpected discoveries]
- **Future Considerations:**
  - [Related ideas to explore]

---

## Abandoned Experiments (Learnings Preserved)

[Same structure as Completed, focus on "Why abandoned" and "What we learned"]
```

**Effect:** Creates institutional memory without Git commit history, enables pattern recognition across experiments, prevents repeating failed approaches.

**Performance Impact:** None - documentation only.

**Accessibility Considerations:** N/A - internal documentation.

**Browser Compatibility:** N/A - markdown file.

---

## 🚨 Important Warnings & Gotchas

**Things that DON'T work (for AI context):**

- ❌ Assuming experimental naming = Git branches - Reason: Completely different systems; manual naming lacks Git's merging, conflict resolution, history tracking
- ❌ Using experimental naming without EXPERIMENTS_LOG.md - Reason: Filenames alone don't capture "why" or "what was learned"
- ❌ Skipping the "-exp-" marker - Reason: Can't distinguish experiments from abandoned stable versions
- ❌ Reusing experiment names for different features - Reason: Creates confusion about which "exp-faster" you're referencing

**Performance Concerns:**

- ⚠️ Large number of experiment files may clutter directory - Consider archiving abandoned experiments to `/archive/` subdirectory
- ⚠️ Import statements may need updating when transitioning from experimental to stable versions

**Known Limitations:**

- Manual deletion required for abandoned experiments (no automatic cleanup)
- No merge conflict resolution (user must manually combine changes)
- Relies on user discipline to maintain EXPERIMENTS_LOG.md
- Parallel experiments on same base require careful manual tracking
- No automatic detection of which version is "latest"

---

## 📊 Testing & Validation

**Testing data collected this session:**

- None - workflow and documentation session

**How to verify these solutions work:**

- [ ] Create first experimental version using new naming convention
- [ ] Document experiment in EXPERIMENTS_LOG.md
- [ ] Attempt to recall experiment details 1 week later - should be findable in log
- [ ] Create second experiment from same base, verify both can coexist
- [ ] Successfully merge experimental features into next stable version

**User testing needed:**

- Use experimental naming convention for next 3-5 iterations
- Track whether EXPERIMENTS_LOG.md actually gets maintained in practice
- Identify any pain points or confusing aspects of the workflow
- Validate that future Claude sessions can understand project state from this documentation

---

## 🔄 Implementation Checklist: MASTER Doc Updates

**After implementing in Git, update Carousel_MASTER.md:**

**New Appendix to create:**

- [ ] **Appendix F: Version Control & Experimentation Workflow** → Document experimental naming convention, EXPERIMENTS_LOG.md usage, workflow for vibe coders without Git

**Section 1 (Getting Started):**

- [ ] Add note about experimental versions: "Look for files with `-exp-` suffix to identify work-in-progress features"
- [ ] Reference EXPERIMENTS_LOG.md for understanding abandoned approaches

**Document Metadata:**

- [ ] Update "Contributors" to mention experimental workflow system
- [ ] Add "Version Control" subsection explaining the manual approach

**Deprecated/Superseded information:**

- None - this is additive documentation

**Git Implementation Status: N/A** - Manual workflow by design
**Target Version:** Documentation only (applies to all future versions)

---

## 💡 Solutions Developed (This Session)

**Concepts designed and ready for implementation:**

1. **Experimental naming convention** - Pattern: `component.X.Y.Z-exp-featurename-vN.tsx` for clear distinction between stable releases and experimental iterations while maintaining lineage tracking.

2. **EXPERIMENTS_LOG.md template** - Structured markdown documentation system for tracking experimental work, outcomes, and learnings without Git commit history.

3. **Manual version control workflow** - Complete process for vibe coders: create experiment → iterate (v1, v2, v3) → decide (merge to stable or abandon) → document learnings → archive files.

**Git Status:** N/A - Intentionally designed for non-Git workflow
**Implementation Complexity:** Low - Requires discipline, not technical skill
**Estimated Implementation Time:** Immediate for naming, ongoing for log maintenance

---

## 🔮 Concepts Requiring Development

**Ideas discussed that need more work before implementation:**

- **Automated experiment archival script** - **Why it needs work:** Would need to parse file names, identify abandoned experiments, move to archive folder. User currently doesn't use scripts/automation.

- **Visual experiment tree diagram** - **Why it needs work:** Could show branching structure of experiments from stable versions (like `git log --graph`). Would need tooling to generate from EXPERIMENTS_LOG.md.

- **Experiment success rate tracking** - **Why it needs work:** Statistical analysis of which types of experiments tend to succeed (animation changes vs. detection logic vs. UI enhancements). Needs more data.

**Next Session Should Address:**

- Has the experimental naming convention been adopted? Any friction points?
- Is EXPERIMENTS_LOG.md being maintained? If not, why not?
- Are there patterns in experiment outcomes that suggest process improvements?

---

## 🔗 Related Resources & Cross-References

**Previous sessions referenced:**

- **Carousel_11** (Nov 10, 2025) - 2-column animation physics analysis that revealed 96% velocity compensation. Provided context for understanding why experiments are necessary (discovering problems like overdamped springs requires iterative testing).

- **Carousel_10** (Nov 6, 2025) - Protocol verification session. Established foundation for session documentation that this experimental workflow extends.

**External resources used:**

- **Fitts's Law** (1954) - Paul Fitts' research on target acquisition time. User asked for explanation of this principle mentioned in Session 11.
  - **Key Takeaway:** Movement time to a target increases with distance and decreases with target size: T = a + b × log₂(D/S+1)
  - **Application to Carousel:** Smaller visual targets (2-column cards) require faster, snappier animations to feel responsive compared to larger targets (1-column cards), because users perceive the same animation speed as "slower" when visual feedback is smaller.
  - **Evidence:** Users compensated by swiping 96% harder in 2-column layouts, indicating perception mismatch between intended and actual responsiveness.

**Related sections in MASTER:**

- **Appendix D (Cross-References)** - Session linkage system where this workflow should be documented
- **Section 13 (Known Issues & Future Work)** - Should reference experimental approaches to solving problems
- **Document Metadata** - Should note version control approach for AI assistant context

**Data sources:**

- None - Process documentation session

---

## ✅ Deliverables from This Session

- ✅ **Experimental naming convention specification** - Complete pattern with examples and workflow integration
- ✅ **EXPERIMENTS_LOG.md template** - Structured format for documenting all experimental work
- ✅ **Fitts's Law explanation** - Clear explanation of how psychological principle applies to carousel animation design
- ✅ **Workflow guidance for vibe coders** - Complete process for managing versions without Git
- ✅ **Clarification: Experimental naming ≠ Git branches** - Explicit distinction to prevent confusion

---

## 🎯 Next Steps

**Immediate actions (Next session or within 1 week):**

1. **Create EXPERIMENTS_LOG.md file** - Use provided template, add any existing experiments retroactively if known
2. **Rename current experimental files** (if any) - Apply new naming convention to any non-stable versions
3. **Test workflow with next experiment** - Create first `-exp-` file using the new system and document it
4. **Implement Session 11 animation fix** - Use experimental naming for testing the 2-column stiffness adjustment (e.g., `carousediagnostics.1.0.2-exp-stiffness300-v1.tsx`)

**Future exploration (When time permits):**

- Create archive folder structure for abandoned experiments
- Consider visual diagram of experiment tree (manual or tool-generated)
- Analyze experiment success patterns after 10+ experiments logged
- Explore whether this workflow scales to team collaboration (if user adds collaborators)

**Technical debt created (Acknowledge for future cleanup):**

- **Manual file management overhead** - As project grows, directory clutter may become issue. Future solution: automated archival script.
- **No merge tooling** - Combining features from multiple experiments requires manual code reconciliation. Future solution: learn Git, or accept limitation.
- **Discipline-dependent** - System only works if EXPERIMENTS_LOG.md is maintained. No technical enforcement. Future solution: code review checklist, or accept occasional lapses.

---

## 🏷️ Session Metadata

**Tags:** [version-control], [workflow], [documentation], [vibe-coding], [fitts-law], [experimental-naming]

**Related Components:** All components (Carousel, Diagnostics, ReachMapper) - workflow applies universally

**Git Status:** N/A - This is explicitly a non-Git workflow

**Session Status:** ✅ Complete

**Key Innovation:** Created Git-like experimentation workflow using only file naming conventions and markdown documentation, tailored for developers who avoid traditional version control systems.

**Impact Level:** High - Establishes foundation for all future experimental work. Solves chronic problem of version confusion and lost knowledge from abandoned experiments. Enables confident iteration without fear of losing track of working versions.

---

**End of Carousel_12_14112025 Session Summary**
