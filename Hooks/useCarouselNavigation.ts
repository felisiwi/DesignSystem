import { useState, useRef } from 'react'
import { useMotionValue, animate } from 'framer-motion'
import { getAnimationSettings, getFinalSnapSettings, type AnimationConfig } from '../Utils/animationConfig'

export const useCarouselNavigation = (
  itemWidth: number,
  gap: number,
  maxIndex: number,
  animationConfig: AnimationConfig
) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const x = useMotionValue(0)
  const isAnimating = useRef(false)

  const goToIndex = async (index: number, velocity: number = 0, isMultiSkip: boolean = false) => {
    if (itemWidth === 0) return

    // If already animating, stop current animation and proceed immediately
    if (isAnimating.current) {
      x.stop()
    }

    isAnimating.current = true

    try {
      const targetIndex = Math.max(0, Math.min(index, maxIndex))
      setCurrentIndex(targetIndex)
      const itemWidthWithGap = itemWidth + gap
      const targetX = Math.round(-targetIndex * itemWidthWithGap)

      // Choose animation settings based on gesture type
      const { stiffness, damping } = getAnimationSettings(isMultiSkip, animationConfig)

      // Two-Step Animation for precise stops
      if (isMultiSkip) {
        // Step 1: Soft glide for momentum and feel
        await animate(x, targetX, {
          type: "spring",
          stiffness,
          damping,
          velocity,
        })
        
        // Step 2: Aggressive final snap for precision
        const finalSettings = getFinalSnapSettings()
        await animate(x, targetX, {
          type: "spring",
          ...finalSettings,
        })
      } else {
        // Single-step animation for flicks
        await animate(x, targetX, {
          type: "spring",
          stiffness,
          damping,
          velocity,
        })
      }
    } finally {
      isAnimating.current = false
    }
  }

  const navigate = (direction: number) => {
    const artificialVelocity = direction * 200
    goToIndex(currentIndex + direction, artificialVelocity, true)
  }

  return {
    currentIndex,
    x,
    goToIndex,
    navigate,
  }
}
