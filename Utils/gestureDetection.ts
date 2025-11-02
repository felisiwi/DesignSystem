export const GESTURE_CONSTANTS = {
  GLIDE_DISTANCE_HIGH_CONFIDENCE: 145,
  GLIDE_DISTANCE_MEDIUM: 88,
  GLIDE_VELOCITY_MEDIUM: 75,
  GLIDE_ACCELERATION_MEDIUM: 18,
  GLIDE_DISTANCE_ENERGETIC: 100,
  GLIDE_VELOCITY_HIGH: 110,
  GLIDE_ACCELERATION_HIGH: 35,
} as const

export interface GestureDetectionResult {
  targetIndex: number
  isMultiSkip: boolean
}

export const detectGesture = (
  distance: number,
  velocity: number,
  peakAcceleration: number,
  currentIndex: number,
  dragDirection: number,
  actualVelocityScaler: number,
  itemWidth: number,
  snapThreshold: number
): GestureDetectionResult => {
  const {
    GLIDE_DISTANCE_HIGH_CONFIDENCE,
    GLIDE_DISTANCE_MEDIUM,
    GLIDE_VELOCITY_MEDIUM,
    GLIDE_ACCELERATION_MEDIUM,
    GLIDE_DISTANCE_ENERGETIC,
    GLIDE_VELOCITY_HIGH,
    GLIDE_ACCELERATION_HIGH,
  } = GESTURE_CONSTANTS

  let targetIndex = currentIndex
  let isMultiSkip = false

  // Tier 1: High confidence - Long distance
  if (distance > GLIDE_DISTANCE_HIGH_CONFIDENCE) {
    const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
    targetIndex = currentIndex + dragDirection * indexJump
    isMultiSkip = true
  }
  // Tier 2: Medium confidence - All signals must agree
  else if (
    distance > GLIDE_DISTANCE_MEDIUM &&
    velocity > GLIDE_VELOCITY_MEDIUM &&
    peakAcceleration > GLIDE_ACCELERATION_MEDIUM
  ) {
    const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
    targetIndex = currentIndex + dragDirection * indexJump
    isMultiSkip = true
  }
  // Tier 3: Energetic gesture - Strong velocity OR burst
  else if (
    distance > GLIDE_DISTANCE_ENERGETIC &&
    (velocity > GLIDE_VELOCITY_HIGH || peakAcceleration > GLIDE_ACCELERATION_HIGH)
  ) {
    const indexJump = Math.max(1, Math.round(velocity / actualVelocityScaler))
    targetIndex = currentIndex + dragDirection * indexJump
    isMultiSkip = true
  }
  // Tier 4: Default - single card snap or snap back
  else {
    const distanceThreshold = itemWidth * (snapThreshold / 100)
    if (distance > distanceThreshold) {
      targetIndex = currentIndex + dragDirection
    } else {
      targetIndex = currentIndex
    }
  }

  return { targetIndex, isMultiSkip }
}
