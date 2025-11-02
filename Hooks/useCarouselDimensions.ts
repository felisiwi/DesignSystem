import { useState, useEffect, useRef } from 'react'
import { calculateItemWidth, type LayoutParams } from '../Utils/layoutCalculations'

export const useCarouselDimensions = (
  columns: number,
  gap: number,
  horizontalPadding: number,
  peakAmount: number
) => {
  const [itemWidth, setItemWidth] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Calculate item width
  useEffect(() => {
    if (!containerRef.current || containerWidth === 0) return

    const layoutParams: LayoutParams = {
      containerWidth,
      columns,
      gap,
      horizontalPadding,
      peakAmount,
    }

    const widthPerItem = calculateItemWidth(layoutParams)
    setItemWidth(widthPerItem)
  }, [columns, gap, horizontalPadding, peakAmount, containerWidth])

  return {
    itemWidth,
    containerWidth,
    containerRef,
  }
}
