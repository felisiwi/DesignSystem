export const getIconSize = (buttonSize: number): number => {
  switch (buttonSize) {
    case 24: return 16
    case 32: return 24
    case 48: return 32
    case 56: return 40
    default: return 24
  }
}
