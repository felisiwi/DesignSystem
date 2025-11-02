export interface LayoutParams {
  containerWidth: number
  columns: number
  gap: number
  horizontalPadding: number
  peakAmount: number
}

export const calculateItemWidth = (params: LayoutParams): number => {
  const { containerWidth, columns, gap, horizontalPadding, peakAmount } = params
  
  const availableSpace = containerWidth - horizontalPadding * 2
  const totalGapSpace = (columns - 1) * gap
  const widthForCardFaces = availableSpace - totalGapSpace - peakAmount
  return widthForCardFaces / columns
}

export const calculateDragConstraints = (
  itemWidth: number,
  totalItems: number,
  columns: number,
  gap: number,
  horizontalPadding: number,
  containerWidth: number,
  peakAmount: number
) => {
  if (totalItems === 0 || itemWidth === 0) {
    return { left: 0, right: 0 }
  }

  const maxIndex = Math.max(0, totalItems - columns)
  if (maxIndex <= 0) {
    return { left: 0, right: 0 }
  }

  const itemWidthWithGap = itemWidth + gap
  const totalContentWidth = itemWidthWithGap * totalItems - gap
  const innerContentArea = containerWidth - horizontalPadding * 2
  const maxDrag = Math.min(0, -(totalContentWidth - innerContentArea + peakAmount))

  return {
    left: maxDrag,
    right: 0,
  }
}

export const calculateFinalItemWidth = (
  index: number,
  totalItems: number,
  itemWidth: number,
  peakAmount: number,
  gap: number,
  horizontalPadding: number
): number => {
  if (index === totalItems - 1 && totalItems > 0 && peakAmount > 0) {
    const spaceToFill = peakAmount + gap
    return itemWidth + spaceToFill - horizontalPadding
  }
  return itemWidth
}
