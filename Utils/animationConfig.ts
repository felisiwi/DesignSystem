export interface AnimationConfig {
  flickStiffness: number
  flickDamping: number
  glideStiffness: number
  glideDamping: number
}

export const getAnimationSettings = (
  isMultiSkip: boolean,
  config: AnimationConfig
) => {
  return {
    stiffness: isMultiSkip ? config.glideStiffness : config.flickStiffness,
    damping: isMultiSkip ? config.glideDamping : config.flickDamping,
  }
}

export const getFinalSnapSettings = () => ({
  stiffness: 1000,
  damping: 80,
  velocity: 0,
})
