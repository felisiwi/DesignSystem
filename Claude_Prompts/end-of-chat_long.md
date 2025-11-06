# Session Summary Request

Please create a comprehensive session summary of the chat named [UPDATE TO NAME OF THE MOST RECENT PREVIOUS CHAT] using this template:

---

# [Component]_[SessionNumber]_[DDMMYYYY].md

**Date:** [Auto-fill]
**Focus:** [One-sentence description of main topic]
**Type:** [Feature development / Bug fix / Design consultation / Architecture decision / Performance optimization]
**Component Version:** [Current version in Git repo - check COMPONENTS.md]
**Session Duration:** [Optional: time spent]

---

## 🎯 Session Objective

**Primary Goal:** [What user wanted to achieve]

**Context from Previous Sessions:**

- [Key relevant context from earlier work]
- [Known constraints or decisions that informed this session]
- [Related issues or features]

**This Session Builds On:**

- [Specific features/systems from previous versions]
- [Earlier decisions that this extends]

---

## 📋 Context Loaded

List all documentation and context files referenced during this session:

1. **[Document Name]** - [What was extracted and why it was needed]
2. **Session history** - [Which previous sessions were referenced and why]
3. **Data sources** - [Any CSV, test results, or empirical data used in decisions]
4. **Current state** - [Version numbers from COMPONENTS.md, known issues acknowledged]

**Why This Context Mattered:**
[1-2 sentences explaining how the loaded context informed this session's decisions]

---

## 💡 Key Decisions Made

[For each major decision, use this structure:]

### Decision X: [Decision Title]

**Problem:** [What issue this addresses]

**Options Considered:**

1. [Option A] - Pros: X, Y | Cons: Z
2. [Option B] - Pros: X, Y | Cons: Z
3. [Selected Option C] - Pros: X, Y | Cons: Z

**Decision:** [What was chosen and why]

**Implementation Approach:**

```[language]
[Key code snippet if applicable]
```

**Rationale:** [Why this is the best approach given constraints]

**Trade-offs Accepted:** [What was sacrificed for this gain]

---

## 🔧 Technical Implementation Details

[For each major feature/change discussed:]

### [Feature Name]

**Concept:** [Brief description]

**Implementation:**

```[language]
[Code snippet with inline comments explaining key parts]
```

**Effect:** [User-facing impact]

**Performance Impact:** [Estimated cost - frame time, memory, network]

**Accessibility Considerations:** [How this affects a11y, prefers-reduced-motion, screen readers]

**Browser Compatibility:** [Any concerns or requirements]

---

## 🚨 Important Warnings & Gotchas

**Things that DON'T work (for AI context):**

- ❌ [Approach that was rejected] - Reason: [Why it fails]
- ❌ [Another failed approach] - Reason: [Why it fails]

**Performance Concerns:**

- ⚠️ [Feature X] may impact [metric] on [device type]
- ⚠️ [Approach Y] requires testing on [scenario]

**Known Limitations:**

- [What this solution doesn't handle]
- [Edge cases to be aware of]

---

## 📊 Testing & Validation

**Testing data collected this session:**

- [Quantitative data if any - metrics, benchmarks, user test results]
- [Or "None - conceptual/design session"]

**How to verify these solutions work:**

- [ ] [Test case 1]
- [ ] [Test case 2]
- [ ] [Performance benchmark: target X, acceptable range Y-Z]

**User testing needed:**

- [What scenarios to test]
- [Expected user behavior]
- [Success criteria]

---

## 🔄 Implementation Checklist: MASTER Doc Updates

**After implementing in Git, update Carousel_MASTER.md:**

**Section X ([Section Name]):**

- [ ] [Specific content to add]
- [ ] [What needs updating]

**New sections to create:**

- [ ] [Section title] → [Purpose and content outline]

**Deprecated/Superseded information:**

- [ ] [What old information is now invalid and should be marked deprecated]

**Git Implementation Status: ⏳ Not yet implemented**
**Target Version:** [e.g., v1.0.5]

---

## 💡 Solutions Developed (This Session)

**Concepts designed and ready for implementation:**

- [Solution/feature 1] - [Brief description]
- [Solution/feature 2] - [Brief description]

**Git Status:** ⏳ Designed, awaiting implementation
**Implementation Complexity:** [Low / Medium / High]
**Estimated Implementation Time:** [If discussed]

---

## 🔮 Concepts Requiring Development

**Ideas discussed that need more work before implementation:**

- [Concept 1] - **Why it needs work:** [Missing piece / Needs testing / Unclear approach]
- [Concept 2] - **Why it needs work:** [Reason]

**Next Session Should Address:**

- [Specific question to answer]
- [Technical investigation needed]

---

## 🔗 Related Resources & Cross-References

**Previous sessions referenced:**

- [Session_XX.md] - [What was pulled from it and how it informed this session]

**External resources used:**

- [URL or paper] - [Key takeaway applied here]

**Related sections in MASTER:**

- [Section X] - [How it relates]

**Data sources:**

- [Dataset name/location] - [What it showed]

---

## ✅ Deliverables from This Session

- ✅ [Concrete deliverable 1 - e.g., "Visual enhancement strategy with 5 specific effects"]
- ✅ [Concrete deliverable 2 - e.g., "Preset system architecture"]
- 🔲 [Deliverable pending work - e.g., "Performance benchmarks - awaiting device testing"]

---

## 🎯 Next Steps

**Immediate actions (Next session or within 1 week):**

1. [Action item 1] - [Why/when]
2. [Action item 2] - [Why/when]

**Future exploration (When time permits):**

- [Topic to investigate]
- [Alternative approach to consider]

**Technical debt created (Acknowledge for future cleanup):**

- [Shortcut taken that needs proper solution later]
- [Complexity added that may need refactoring]

---

## 🏷️ Session Metadata

**Tags:** [tech-stack], [feature-area], [decision-type]
**Related Components:** [Other components affected or referenced]
**Git Status:** ⏳ Design session - implementation pending
**Session Status:** ✅ Complete / ⏸️ Paused / 🔄 Continued next session

**Key Innovation:** [One sentence: what's novel about this session's work]

**Impact Level:** [Low / Medium / High] - [One sentence why]

---

**End of [Component]\_[SessionNumber] Session Summary**
