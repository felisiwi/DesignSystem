# Carousel Swipe Diagnostic Tool – Future Features Specification

**Version:** 1.0  
**Date:** November 4, 2025  
**Status:** Planning & Implementation Roadmap

---

## Priority Matrix

| Feature | Priority | Complexity | Impact | Est. Time |
|---------|----------|------------|--------|-----------|
| GitHub Auto-Upload | 🔴 HIGH | Medium | High | 4-6 hours |
| Real-Time Feedback | 🟡 MEDIUM | Medium | High | 6-8 hours |
| Adaptive Thresholds | 🟡 MEDIUM | Low | Medium | 2-3 hours |
| Session Comparison | 🟡 MEDIUM | Medium | Medium | 4-6 hours |
| Ambient Light | 🟢 LOW | Low | Low | 1-2 hours |
| Content Context | 🟢 LOW | Medium | Medium | 4-6 hours |
| Haptic Testing | 🟢 LOW | Low | Low | 2-3 hours |
| Eye Tracking | 🟢 LOW | High | Low | 8-12 hours |

---

## 🔴 HIGH PRIORITY FEATURES

### Feature 1: GitHub Auto-Upload

**Status:** Ready for implementation  
**Priority:** CRITICAL  
**Target Release:** v2.1

#### Overview
Automatically upload CSV data directly to GitHub repository after test completion, eliminating manual file management and providing seamless data collection workflow.

#### User Flow

**Setup Phase (One-Time Configuration):**
1. In setup screen, add optional section:
   ```
   ┌─────────────────────────────────────┐
   │ GitHub Integration (Optional)       │
   │                                     │
   │ Personal Access Token:              │
   │ [ghp_xxxxxxxxxxxxxxxxxxxx]         │
   │                                     │
   │ Repository:                         │
   │ [username/repo-name]                │
   │                                     │
   │ ☐ Remember for next time           │
   └─────────────────────────────────────┘
   ```

2. If fields filled, validate token and repo access
3. Show success/error message
4. Store in localStorage if "Remember" checked

**Test Completion:**
1. After minimum glides completed, show both options:
   ```
   ┌─────────────────────────────────────┐
   │ [Download CSV]  [Upload to GitHub] │
   └─────────────────────────────────────┘
   ```

2. If GitHub configured:
   - Upload button enabled
   - Click uploads immediately
   - Show progress: "Uploading... ✓ Uploaded!"
   
3. If not configured:
   - Upload button disabled with tooltip: "Configure GitHub in Settings"

#### Technical Implementation

**GitHub API Endpoint:**
```
PUT /repos/{owner}/{repo}/contents/{path}
```

**Implementation:**
```typescript
interface GitHubConfig {
  token: string
  owner: string
  repo: string
  rememberToken: boolean
}

async function uploadToGitHub(
  csvContent: string,
  filename: string,
  config: GitHubConfig
): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    const path = `Data/swipe_diagnostics/${filename}`
    const encodedContent = btoa(csvContent)
    
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${config.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: `Add diagnostic data: ${filename}`,
          content: encodedContent,
          branch: 'main', // or make configurable
        }),
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Upload failed')
    }
    
    const data = await response.json()
    
    return {
      success: true,
      message: 'Successfully uploaded to GitHub',
      url: data.content.html_url,
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Unknown error occurred',
    }
  }
}
```

**Token Storage (Secure):**
```typescript
// Store in localStorage (base64 encoded for minimal security)
function storeGitHubConfig(config: GitHubConfig) {
  if (config.rememberToken) {
    const encoded = btoa(JSON.stringify({
      token: config.token,
      owner: config.owner,
      repo: config.repo,
    }))
    localStorage.setItem('carousel_diagnostic_github', encoded)
  }
}

function loadGitHubConfig(): GitHubConfig | null {
  const stored = localStorage.getItem('carousel_diagnostic_github')
  if (!stored) return null
  
  try {
    return JSON.parse(atob(stored))
  } catch {
    return null
  }
}
```

**Token Validation:**
```typescript
async function validateGitHubToken(
  token: string,
  owner: string,
  repo: string
): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Authorization': `token ${token}`,
        },
      }
    )
    
    if (response.status === 200) {
      return { valid: true, message: 'Token and repository valid' }
    } else if (response.status === 404) {
      return { valid: false, message: 'Repository not found or no access' }
    } else if (response.status === 401) {
      return { valid: false, message: 'Invalid token' }
    } else {
      return { valid: false, message: 'Unknown error' }
    }
  } catch (error) {
    return { valid: false, message: 'Network error' }
  }
}
```

#### Security Considerations

**Token Safety:**
- ⚠️ Personal Access Token stored in localStorage (client-side only)
- ⚠️ Token visible in network requests (HTTPS mitigates)
- ✅ Token never sent to any server except GitHub
- ✅ User has full control (can clear localStorage)
- ✅ Minimal scope required: `repo` permission only

**Best Practices:**
1. **Create dedicated token:**
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - Select scope: `repo` (full control of private repositories)
   - Name: "Carousel Diagnostic Tool"
   - Expiration: 90 days (recommended)

2. **Use dedicated repository:**
   - Create private repo specifically for diagnostic data
   - Don't use main project repository
   - Example: `username/carousel-diagnostics-data`

3. **Inform user:**
   - Show security notice: "Token will be stored locally in your browser"
   - Link to guide on creating GitHub tokens
   - Recommend using dedicated repository

#### UI Mockup

**Setup Screen Addition:**
```
┌─────────────────────────────────────────────────┐
│ Carousel Swipe Diagnostic                      │
│                                                 │
│ Name: [Felix                    ]              │
│                                                 │
│ Hand Span (optional): [19] cm                  │
│                                                 │
│ Have you done this before?                      │
│ [No] [Yes]                                      │
│                                                 │
│ Carousel Position:                              │
│ [Top] [Bottom]                                  │
│                                                 │
│ ─────────────────────────────────────────      │
│                                                 │
│ GitHub Integration (Optional) ⓘ                │
│                                                 │
│ Personal Access Token:                          │
│ [ghp_1234567890abcdef]                         │
│                                                 │
│ Repository (owner/repo):                        │
│ [felix/carousel-data]                          │
│                                                 │
│ ☐ Remember for next time                       │
│                                                 │
│ [Validate Connection]                           │
│                                                 │
│ ─────────────────────────────────────────      │
│                                                 │
│              [Start Test]                       │
└─────────────────────────────────────────────────┘
```

**Test Completion:**
```
┌─────────────────────────────────────────────────┐
│ ✓ Minimum glides completed                     │
│                                                 │
│ [Download CSV]  [Upload to GitHub ✓]          │
│                                                 │
│ After upload:                                   │
│ ✓ Uploaded successfully!                       │
│ View on GitHub: [link]                          │
└─────────────────────────────────────────────────┘
```

#### Error Handling

**Possible Errors:**
1. **Invalid token:**
   - Message: "Token is invalid or expired. Please generate a new one."
   - Action: Link to GitHub token generation page

2. **No repository access:**
   - Message: "Can't access repository. Check name and token permissions."
   - Action: Show validation button again

3. **Network error:**
   - Message: "Upload failed due to network error. File saved locally."
   - Action: Auto-download CSV as fallback

4. **Rate limit:**
   - Message: "GitHub rate limit reached. Try again in a few minutes."
   - Action: Show retry button

#### Testing Checklist

- [ ] Token validation works for valid tokens
- [ ] Token validation catches invalid tokens
- [ ] Upload succeeds to valid repository
- [ ] Upload fails gracefully with clear error messages
- [ ] File appears in correct directory on GitHub
- [ ] Commit message is descriptive
- [ ] localStorage persistence works
- [ ] Clear token button works
- [ ] Works on mobile browsers
- [ ] Works on desktop browsers
- [ ] Rate limit handling works
- [ ] Network error handling works

#### Documentation Needs

1. **User guide:** How to create GitHub Personal Access Token
2. **Security notice:** What data is stored and where
3. **Troubleshooting:** Common errors and solutions
4. **Video tutorial:** Step-by-step setup walkthrough

#### Estimated Timeline

- **Research & Design:** 1 hour (✅ Complete)
- **Implementation:** 3 hours
- **Testing:** 1 hour
- **Documentation:** 1 hour
- **Total:** ~6 hours

---

## 🟡 MEDIUM PRIORITY FEATURES

### Feature 2: Real-Time Gesture Quality Feedback

**Status:** Concept complete, implementation pending  
**Priority:** High impact on data quality  
**Target Release:** v2.2

#### Overview
Provide visual feedback DURING gesture to help users produce cleaner swipes. This "trains" users and could increase accuracy from 93% to 98%+.

#### Visual Design

**Carousel Glow Effect:**
```
During drag:

🟢 GREEN GLOW (Straightness > 90%, velocity stable)
├─────────────────────────────┐
│  Clear flick detected       │
│  [  1  2  3  4  5  6  ]    │
│  ← →                        │
└─────────────────────────────┘

🔵 BLUE GLOW (High velocity, long distance)
├─────────────────────────────┐
│  Clear glide detected       │
│  [  1  2  3  4  5  6  ]    │
│  ← →                        │
└─────────────────────────────┘

🟡 YELLOW GLOW (Ambiguous metrics)
├─────────────────────────────┐
│  Ambiguous - adjust speed   │
│  [  1  2  3  4  5  6  ]    │
│  ← →                        │
└─────────────────────────────┘

🔴 RED GLOW (Straightness < 70%)
├─────────────────────────────┐
│  Too crooked - go straighter│
│  [  1  2  3  4  5  6  ]    │
│  ← →                        │
└─────────────────────────────┘
```

#### Implementation

**Real-time calculation during drag:**
```typescript
const handleDrag = (event, info) => {
  // Capture trajectory (existing)
  trajectoryData.current.push(...)
  
  // Calculate real-time metrics
  const currentDistance = Math.abs(info.offset.x)
  const currentVelocity = Math.abs(info.velocity.x)
  const currentStraightness = calculateStraightness(info.offset.x, info.offset.y, currentDistance)
  const velocityVariance = calculateVariance(velocityHistory.current)
  
  // Determine feedback color
  let feedbackColor = 'transparent'
  let feedbackMessage = ''
  
  if (currentStraightness > 90 && velocityVariance < 100) {
    feedbackColor = 'rgba(76, 175, 80, 0.3)' // Green
    feedbackMessage = 'Clear flick detected'
  } else if (currentVelocity > 180 && currentDistance > 150) {
    feedbackColor = 'rgba(33, 150, 243, 0.3)' // Blue
    feedbackMessage = 'Clear glide detected'
  } else if (currentStraightness < 70) {
    feedbackColor = 'rgba(244, 67, 54, 0.3)' // Red
    feedbackMessage = 'Too crooked - go straighter'
  } else if (currentDistance > 50) {
    feedbackColor = 'rgba(255, 193, 7, 0.3)' // Yellow
    feedbackMessage = 'Ambiguous - adjust speed'
  }
  
  // Update UI state
  setFeedbackColor(feedbackColor)
  setFeedbackMessage(feedbackMessage)
}
```

**CSS for glow:**
```typescript
style={{
  boxShadow: `0 0 40px ${feedbackColor}`,
  border: `3px solid ${feedbackColor}`,
  transition: 'box-shadow 0.1s, border 0.1s',
}}
```

#### User Testing Protocol

**A/B Test Design:**
- Group A: With real-time feedback
- Group B: Without feedback (current)
- Measure: Accuracy improvement, user satisfaction, straightness %, retry rate

**Expected Results:**
- 5-10% improvement in straightness %
- 3-5% improvement in overall accuracy
- Reduced retry rate
- Higher user confidence

---

### Feature 3: Adaptive Thresholds

**Status:** Algorithm defined  
**Priority:** Personalization  
**Target Release:** v2.3

#### Implementation

After 10 gestures, calculate user-specific thresholds:

```typescript
function calculateAdaptiveThresholds(userGestures: GestureData[]) {
  // Find user's velocity range
  const velocities = userGestures.map(g => g.velocity)
  const userMaxVelocity = Math.max(...velocities)
  const userMinVelocity = Math.min(...velocities)
  
  // Define personal "gear shift" point
  const flickGlideThreshold = userMinVelocity + (userMaxVelocity - userMinVelocity) * 0.6
  
  // Adjust distance thresholds based on swipe style
  const avgDistance = velocities.reduce((a, b) => a + b, 0) / velocities.length
  const distanceMultiplier = avgDistance / 100 // Normalize to 100px baseline
  
  return {
    GLIDE_VELOCITY_THRESHOLD: flickGlideThreshold,
    GLIDE_DISTANCE_HIGH: 170 * distanceMultiplier,
    GLIDE_DISTANCE_MEDIUM: 140 * distanceMultiplier,
    GLIDE_DISTANCE_ENERGETIC: 155 * distanceMultiplier,
  }
}
```

---

### Feature 4: Session Comparison View

**Status:** UI design needed  
**Priority:** User engagement  
**Target Release:** v2.4

#### Features

**Post-Test Summary Screen:**
```
┌─────────────────────────────────────────────────┐
│ Test Complete! 🎉                              │
│                                                 │
│ Session Summary:                                │
│ ─────────────────                               │
│ Total Gestures: 24                              │
│ Flicks: 12 | Glides: 12                        │
│ Average Straightness: 87.3%                     │
│ Retry Rate: 8.3%                                │
│                                                 │
│ Compared to Your Last Test:                     │
│ ─────────────────────────────                   │
│ Straightness: 87.3% ↑ 15% (was 72%)           │
│ Y Movement: 18px ↓ 28% (was 25px)             │
│ Retry Rate: 8.3% ↓ 50% (was 16.7%)            │
│                                                 │
│ [View Detailed Comparison] [Download CSV]      │
└─────────────────────────────────────────────────┘
```

---

## 🟢 LOWER PRIORITY FEATURES

### Feature 5: Ambient Light Tracking
### Feature 6: Carousel Content Context Testing
### Feature 7: Haptic Feedback A/B Testing
### Feature 8: Eye Tracking (Experimental)

*(Detailed specifications available on request)*

---

## Implementation Priority

### Recommended Order:
1. **GitHub Auto-Upload** (v2.1) - Critical for workflow
2. **Real-Time Feedback** (v2.2) - High impact on data quality
3. **Adaptive Thresholds** (v2.3) - Easy win, personalization
4. **Session Comparison** (v2.4) - User engagement
5. Lower priority features as needed

---

**Last Updated:** November 4, 2025  
**Next Review:** After v2.1 release