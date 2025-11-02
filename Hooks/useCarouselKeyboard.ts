import { useCallback } from 'react'

export const useCarouselKeyboard = (
  currentIndex: number,
  maxIndex: number,
  goToIndex: (index: number) => void,
  navigate: (direction: number) => void
) => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        if (currentIndex > 0) {
          navigate(-1)
        }
        break
      case 'ArrowRight':
        event.preventDefault()
        if (currentIndex < maxIndex) {
          navigate(1)
        }
        break
      case 'Home':
        event.preventDefault()
        goToIndex(0)
        break
      case 'End':
        event.preventDefault()
        goToIndex(maxIndex)
        break
    }
  }, [currentIndex, maxIndex, goToIndex, navigate])

  const handleArrowKeyDown = useCallback((event: React.KeyboardEvent, direction: number, disablePrev: boolean, disableNext: boolean) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (direction === -1 && !disablePrev) {
        navigate(-1)
      } else if (direction === 1 && !disableNext) {
        navigate(1)
      }
    }
  }, [navigate])

  const handleDotKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      goToIndex(index)
    }
  }, [goToIndex])

  return {
    handleKeyDown,
    handleArrowKeyDown,
    handleDotKeyDown,
  }
}
