import { useRef } from 'react'
import { PanInfo } from 'framer-motion'
import { detectGesture } from '../Utils/gestureDetection'

export const useCarouselGestures = (
  currentIndex: number,
  itemWidth: number,
  snapThreshold: number,
  actualVelocityScaler: number,
  goToIndex: (index: number, velocity: number, isMultiSkip: boolean) => void
) => {
  const velocityHistory = useRef<number[]>([])
  const dragStartTime = useRef<number>(0)

  const handleDragStart = () => {
    dragStartTime.current = Date.now()
    velocityHistory.current = []
  }

  const handleDrag = (event: any, info: PanInfo) => {
    velocityHistory.current.push(Math.abs(info.velocity.x))
  }

  const handleDragEnd = (event: any, info: PanInfo) => {
    if (itemWidth === 0) return

    const velocity = Math.abs(info.velocity.x)
    const dragOffset = info.offset.x
    const dragDirection = dragOffset < 0 ? 1 : -1
    const distance = Math.abs(dragOffset)

    // Calculate peak acceleration
    let peakAcceleration = 0
    if (velocityHistory.current.length >= 2) {
      const accelerations: number[] = []
      for (let i = 1; i < velocityHistory.current.length; i++) {
        accelerations.push(Math.abs(velocityHistory.current[i] - velocityHistory.current[i - 1]))
      }
      peakAcceleration = Math.max(...accelerations)
    }

    const { targetIndex, isMultiSkip } = detectGesture(
      distance,
      velocity,
      peakAcceleration,
      currentIndex,
      dragDirection,
      actualVelocityScaler,
      itemWidth,
      snapThreshold
    )

    // Execute the animation
    goToIndex(targetIndex, info.velocity.x * dragDirection, isMultiSkip)
    velocityHistory.current = []
  }

  return {
    handleDragStart,
    handleDrag,
    handleDragEnd,
  }
}
