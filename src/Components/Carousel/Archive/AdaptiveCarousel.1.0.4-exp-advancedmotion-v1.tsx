import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  motion,
  useMotionValue,
  animate,
  PanInfo,
  useTransform,
} from "framer-motion";
import { addPropertyControls, ControlType } from "framer";

// ========================================
// GESTURE DETECTION CONSTANTS
// ========================================
const GLIDE_DISTANCE_HIGH_CONFIDENCE = 170;
const GLIDE_DISTANCE_MEDIUM = 140;
const GLIDE_VELOCITY_MEDIUM = 120;
const GLIDE_ACCELERATION_MEDIUM = 30;
const GLIDE_DISTANCE_ENERGETIC = 155;
const GLIDE_VELOCITY_HIGH = 180;
const GLIDE_ACCELERATION_HIGH = 50;
const MIN_GLIDE_DURATION = 80;
const MAX_GLIDE_VELOCITY = 600;

interface AdaptiveCarouselProps {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  horizontalPadding?: number;
  verticalPadding?: number;
  peakAmount?: number;
  arrowsEnabled?: boolean;
  dotsEnabled?: boolean;
  snapThreshold?: number;
  velocityScalerPercentage?: number;
  flickStiffness?: number;
  flickDamping?: number;
  glideStiffness?: number;
  glideDamping?: number;
  // Edge effects
  edgeResistance?: "tight" | "moderate" | "loose";
  edgeScaleEnabled?: boolean;
  edgeScaleAmount?: number;
  // Gap dynamics
  gapDynamicsEnabled?: boolean;
  gapExpansionMax?: number;
  gapCompressionMin?: number;
  // Arrow styling
  arrowButtonSize?: number;
  arrowColor?: string;
  arrowPressedColor?: string;
  arrowDisabledColor?: string;
  arrowIconColor?: string;
  arrowIconDisabledColor?: string;
  // Dots styling
  dotSize?: number;
  dotGap?: number;
  dotColor?: string;
  dotInactiveColor?: string;
}

export default function AdaptiveCarousel({
  children,
  columns = 1,
  gap = 8,
  horizontalPadding = 16,
  verticalPadding = 0,
  peakAmount = 16,
  arrowsEnabled = true,
  dotsEnabled = false,
  snapThreshold = 10,
  velocityScalerPercentage = 20,
  flickStiffness = 500,
  flickDamping = 55,
  glideStiffness = 120,
  glideDamping = 25,
  edgeResistance = "loose",
  edgeScaleEnabled = true,
  edgeScaleAmount = 0.98,
  gapDynamicsEnabled = false,
  gapExpansionMax = 1.6,
  gapCompressionMin = 0.6,
  arrowButtonSize = 32,
  arrowColor = "#F2F2F2",
  arrowPressedColor = "#000000",
  arrowDisabledColor = "rgba(0, 0, 0, 0)",
  arrowIconColor = "#4D4D4D",
  arrowIconDisabledColor = "#CCCCCC",
  dotSize = 8,
  dotGap = 8,
  dotColor = "#000000",
  dotInactiveColor = "#F2F2F2",
}: AdaptiveCarouselProps) {
  // Basic state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemWidth, setItemWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [directionLock, setDirectionLock] = useState<
    "horizontal" | "vertical" | null
  >(null);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const velocityHistory = useRef<number[]>([]);
  const dragStartTime = useRef<number>(0);
  const isAnimating = useRef(false);
  const lastVelocity = useRef(0);
  const dragVelocity = useMotionValue(0);

  // Gap dynamics state - using motion values for natural spring animations
  const gapMotionValues = useRef<ReturnType<typeof useMotionValue<number>>[]>(
    []
  );
  const gapAnimations = useRef<any[]>([]);

  // Basic children handling
  const childrenArray = React.Children.toArray(children);
  const totalItems = childrenArray.length;

  // Layout calculations
  const itemWidthWithGap = itemWidth + gap;
  const maxIndex = Math.max(0, totalItems - columns);

  // Velocity scaler
  const baseScaler = 400 + (velocityScalerPercentage / 100) * 600;
  const actualVelocityScaler = columns > 1 ? baseScaler * 0.65 : baseScaler;

  // Edge resistance config
  const edgeConfig = useMemo(() => {
    switch (edgeResistance) {
      case "tight":
        return { maxPull: 40, resistance: 0.15 };
      case "moderate":
        return { maxPull: 70, resistance: 0.25 };
      case "loose":
        return { maxPull: 120, resistance: 0.35 };
      default:
        return { maxPull: 120, resistance: 0.35 };
    }
  }, [edgeResistance]);

  // Create motion values pool upfront (enough for typical use)
  const gapMotionValuesPool = useMemo(() => {
    return Array.from({ length: 50 }, () => useMotionValue<number>(1.0));
  }, []);

  // Initialize gap motion values
  useEffect(() => {
    const maxGaps = Math.max(0, totalItems - 1);

    // Clean up old animations
    gapAnimations.current.forEach((anim) => {
      if (anim) anim.stop();
    });
    gapAnimations.current = [];

    // Use motion values from pool
    gapMotionValues.current = [];
    if (gapMotionValuesPool.length > 0) {
      for (let i = 0; i < maxGaps; i++) {
        const mv =
          i < gapMotionValuesPool.length
            ? gapMotionValuesPool[i]
            : gapMotionValuesPool[gapMotionValuesPool.length - 1];

        if (mv) {
          gapMotionValues.current.push(mv);
          mv.set(1.0);
        }
      }
    }
  }, [totalItems, gapMotionValuesPool]);

  // Update container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Calculate item width
  useEffect(() => {
    if (!containerRef.current || containerWidth === 0) return;

    const availableSpace = containerWidth - horizontalPadding * 2;
    const totalGaps = (columns - 1) * gap;
    const widthForCardFaces = availableSpace - totalGaps;
    const widthPerItem = widthForCardFaces / columns;

    setItemWidth(widthPerItem);
  }, [columns, gap, horizontalPadding, containerWidth]);

  // Drag constraints
  const dragConstraints = useMemo(() => {
    if (
      !containerRef.current ||
      totalItems === 0 ||
      itemWidth === 0 ||
      maxIndex <= 0
    ) {
      return { left: 0, right: 0 };
    }

    const totalContentWidth = itemWidthWithGap * totalItems - gap;
    const innerContentArea = containerWidth - horizontalPadding * 2;
    const maxDrag = Math.min(
      0,
      -(totalContentWidth - innerContentArea + peakAmount)
    );

    return {
      left: maxDrag,
      right: 0,
    };
  }, [
    itemWidth,
    totalItems,
    maxIndex,
    horizontalPadding,
    containerWidth,
    gap,
    peakAmount,
  ]);

  // Edge scale transform
  const edgeScale =
    edgeScaleEnabled && dragConstraints
      ? useTransform(x, (xValue) => {
          const atStart = currentIndex === 0 && xValue > 0;
          const atEnd =
            currentIndex === maxIndex &&
            dragConstraints.left !== undefined &&
            xValue < dragConstraints.left;

          if (atStart) {
            const pullAmount = xValue;
            const pullRatio = Math.min(pullAmount / edgeConfig.maxPull, 1);
            return 1 - (1 - edgeScaleAmount) * pullRatio;
          } else if (atEnd) {
            const pullAmount = Math.abs(xValue - dragConstraints.left);
            const pullRatio = Math.min(pullAmount / edgeConfig.maxPull, 1);
            return 1 - (1 - edgeScaleAmount) * pullRatio;
          }
          return 1;
        })
      : 1;

  // Navigation function
  const goToIndex = async (
    index: number,
    velocity: number = 0,
    isMultiSkip: boolean = false
  ) => {
    if (itemWidth === 0) return;

    if (isAnimating.current) {
      x.stop();
    }

    isAnimating.current = true;

    try {
      const targetIndex = Math.max(0, Math.min(index, maxIndex));
      const targetX = Math.round(-targetIndex * itemWidthWithGap);

      const cardsMoved = Math.abs(targetIndex - currentIndex);
      const useGlideAnimation = isMultiSkip && cardsMoved > 1;

      setCurrentIndex(targetIndex);

      const stiffness = useGlideAnimation ? glideStiffness : flickStiffness;
      const damping = useGlideAnimation ? glideDamping : flickDamping;

      if (useGlideAnimation && columns > 1) {
        const multiColumnStiffness = Math.min(
          Math.max(glideStiffness * 1.25, 120),
          200
        );
        const multiColumnDamping = Math.min(
          Math.max(glideDamping * 1.8, 40),
          80
        );

        await animate(x, targetX, {
          type: "spring",
          stiffness: multiColumnStiffness,
          damping: multiColumnDamping,
          velocity: velocity,
        });
      } else if (useGlideAnimation) {
        await animate(x, targetX, {
          type: "spring",
          stiffness: stiffness,
          damping: damping,
          velocity: velocity,
        });

        await animate(x, targetX, {
          type: "spring",
          stiffness: 1000,
          damping: 80,
          velocity: 0,
        });
      } else {
        await animate(x, targetX, {
          type: "spring",
          stiffness: stiffness,
          damping: damping,
          velocity: velocity,
        });
      }
    } finally {
      isAnimating.current = false;
    }
  };

  // Drag handlers
  const handleDragStart = () => {
    x.stop();
    isAnimating.current = false;
    dragStartTime.current = Date.now();
    velocityHistory.current = [];
    lastVelocity.current = 0;
    setDirectionLock(null);
    setIsDragging(true);

    // Cancel any ongoing gap animations
    gapAnimations.current.forEach((anim) => {
      if (anim) anim.stop();
    });
  };

  const handleDrag = (event: any, info: PanInfo) => {
    // Update velocity for gap dynamics
    dragVelocity.set(info.velocity.x);
    lastVelocity.current = info.velocity.x;

    // Gap dynamics with spring-based lag for natural feel
    if (gapDynamicsEnabled && Math.abs(info.velocity.x) > 50) {
      const dragDirection = info.velocity.x < 0 ? -1 : 1; // negative = dragging left
      const velocityMagnitude = Math.abs(info.velocity.x);
      const velocityFactor = Math.min(velocityMagnitude / 1000, 1); // Cap at 1

      // Calculate which card is under thumb
      const targetX = -currentIndex * itemWidthWithGap;
      const dragOffset = x.get() - targetX;
      const thumbCardIndex =
        currentIndex - Math.round(dragOffset / itemWidthWithGap);

      // Update gap multipliers with distance-based delay and stiffness
      childrenArray.forEach((_, index) => {
        if (index >= childrenArray.length - 1) return; // No gap after last card
        if (
          !gapMotionValues.current ||
          gapMotionValues.current.length <= index ||
          !gapMotionValues.current[index]
        )
          return;

        const distanceFromThumb = Math.abs(index - thumbCardIndex);
        const falloff = Math.max(0, 1 - distanceFromThumb * 0.25);

        // Calculate target gap multiplier
        let targetGap = 1.0;

        // Determine if leading (ahead) or trailing (behind) based on drag direction
        const isLeading =
          (dragDirection < 0 && index < thumbCardIndex) ||
          (dragDirection > 0 && index >= thumbCardIndex);
        const isTrailing =
          (dragDirection < 0 && index >= thumbCardIndex) ||
          (dragDirection > 0 && index < thumbCardIndex);

        if (isLeading) {
          // Leading side - compress
          const compressionAmount =
            1 - (1 - gapCompressionMin) * velocityFactor * falloff;
          targetGap = compressionAmount;
        } else if (isTrailing) {
          // Trailing side - expand
          const expansionAmount =
            1 + (gapExpansionMax - 1) * velocityFactor * falloff;
          targetGap = expansionAmount;
        }

        // Gaps immediately adjacent to thumb (distance 0 or 1): instant response
        // Distance 0 = gap right after thumb card, distance 1 = gap right before thumb card
        if (distanceFromThumb <= 1) {
          gapMotionValues.current[index].set(targetGap);
        } else {
          // Cancel existing animation for this gap
          if (gapAnimations.current[index]) {
            gapAnimations.current[index].stop();
          }

          // Distance-based delay and stiffness
          // Delay: 0ms for thumb card, 50ms per card distance (max 200ms)
          const delay = Math.min(distanceFromThumb * 50, 200);

          // Stiffness: high for thumb card, decreases with distance
          // Formula: 500 / (1 + distance) - gives ~500 for thumb, ~250 for 1 away, ~167 for 2 away, etc.
          const baseStiffness = 500;
          const stiffness = baseStiffness / (1 + distanceFromThumb * 0.8);

          // Get current value from motion value
          const currentValue = gapMotionValues.current[index].get();

          // Animate toward target with spring physics
          gapAnimations.current[index] = animate(
            gapMotionValues.current[index],
            targetGap,
            {
              type: "spring",
              stiffness: Math.max(stiffness, 50), // Minimum stiffness to prevent too slow
              damping: 25,
              from: currentValue,
              delay: delay / 1000, // Convert ms to seconds
            }
          );

          // Subscription already set up in useEffect, no need to add here
        }
      });
    } else if (gapDynamicsEnabled && Math.abs(info.velocity.x) <= 50) {
      // When velocity drops, stop all gap animations and let them cushion back
      // This is handled by cushionGapsBack() in handleDragEnd
    }

    // Direction lock
    if (directionLock === null) {
      const totalDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);

      if (totalDistance < 3) {
        velocityHistory.current.push(Math.abs(info.velocity.x));
        return;
      }

      const angle = Math.abs(
        (Math.atan2(info.offset.y, info.offset.x) * 180) / Math.PI
      );

      if (angle < 30) {
        setDirectionLock("horizontal");
      } else if (angle > 60) {
        setDirectionLock("vertical");
      } else if (totalDistance > 25) {
        const horizontalRatio = Math.abs(info.offset.x) / totalDistance;
        setDirectionLock(horizontalRatio > 0.5 ? "horizontal" : "vertical");
      }
    }

    if (directionLock === "horizontal" && event.cancelable) {
      event.preventDefault();
    }

    velocityHistory.current.push(Math.abs(info.velocity.x));
  };

  // Cushion gaps back when drag stops
  const cushionGapsBack = () => {
    childrenArray.forEach((_, index) => {
      if (index >= childrenArray.length - 1) return;
      if (
        !gapMotionValues.current ||
        gapMotionValues.current.length <= index ||
        !gapMotionValues.current[index]
      )
        return;

      // Cancel existing animation
      if (gapAnimations.current[index]) {
        gapAnimations.current[index].stop();
      }

      // Get current value from motion value
      const currentValue = gapMotionValues.current[index].get();

      // Animate back to 1.0 with spring
      gapAnimations.current[index] = animate(
        gapMotionValues.current[index],
        1.0,
        {
          type: "spring",
          stiffness: 200,
          damping: 20,
          from: currentValue,
        }
      );

      // Subscription already set up in useEffect, no need to add here
    });
  };

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);

    // Cushion gaps back
    if (gapDynamicsEnabled) {
      cushionGapsBack();
    }

    if (itemWidth === 0) return;

    const velocity = Math.abs(info.velocity.x);
    const dragOffset = info.offset.x;
    const dragDirection = dragOffset < 0 ? 1 : -1;
    const distance = Math.abs(dragOffset);
    const duration = Date.now() - dragStartTime.current;

    // Edge bounce-back handling
    const atStart = currentIndex === 0 && dragOffset > 0;
    const atEnd = currentIndex === maxIndex && dragOffset < 0;

    if (atStart || atEnd) {
      // Bounce back to edge with spring
      const targetX = -currentIndex * itemWidthWithGap;
      animate(x, targetX, {
        type: "spring",
        stiffness: 250,
        damping: 25,
        velocity: -info.velocity.x * 0.3, // Slight bounce
      });
      velocityHistory.current = [];
      return;
    }

    let peakAcceleration = 0;
    if (velocityHistory.current.length >= 2) {
      const accelerations: number[] = [];
      for (let i = 1; i < velocityHistory.current.length; i++) {
        accelerations.push(
          Math.abs(velocityHistory.current[i] - velocityHistory.current[i - 1])
        );
      }
      peakAcceleration = Math.max(...accelerations);
    }

    let targetIndex = currentIndex;
    let isMultiSkip = false;

    if (peakAcceleration > 600 && distance < 175) {
      isMultiSkip = false;
      const distanceThreshold = itemWidth * (snapThreshold / 100);
      if (distance > distanceThreshold) {
        targetIndex = currentIndex + dragDirection;
      } else {
        targetIndex = currentIndex;
      }
    } else {
      let glideScore = 0;
      if (duration > 40) glideScore += 2;
      if (velocity < 2000) glideScore += 1;
      if (distance > 140) glideScore += 2;
      if (peakAcceleration < 600) glideScore += 1;

      if (glideScore < 4) {
        isMultiSkip = false;
        const distanceThreshold = itemWidth * (snapThreshold / 100);
        if (distance > distanceThreshold) {
          targetIndex = currentIndex + dragDirection;
        } else {
          targetIndex = currentIndex;
        }
      } else {
        isMultiSkip = true;
        if (distance > GLIDE_DISTANCE_HIGH_CONFIDENCE) {
          const indexJump = Math.max(
            1,
            Math.round(velocity / actualVelocityScaler)
          );
          targetIndex = currentIndex + dragDirection * indexJump;
        } else if (
          distance > GLIDE_DISTANCE_MEDIUM &&
          velocity > GLIDE_VELOCITY_MEDIUM &&
          peakAcceleration > GLIDE_ACCELERATION_MEDIUM
        ) {
          const indexJump = Math.max(
            1,
            Math.round(velocity / actualVelocityScaler)
          );
          targetIndex = currentIndex + dragDirection * indexJump;
        } else if (
          distance > GLIDE_DISTANCE_ENERGETIC &&
          (velocity > GLIDE_VELOCITY_HIGH ||
            peakAcceleration > GLIDE_ACCELERATION_HIGH)
        ) {
          const indexJump = Math.max(
            1,
            Math.round(velocity / actualVelocityScaler)
          );
          targetIndex = currentIndex + dragDirection * indexJump;
        } else {
          const distanceThreshold = itemWidth * (snapThreshold / 100);
          if (distance > distanceThreshold) {
            targetIndex = currentIndex + dragDirection;
          } else {
            targetIndex = currentIndex;
          }
        }
      }
    }

    const targetX = -targetIndex * itemWidthWithGap;
    const currentX = x.get();
    const xMovementDirection = targetX > currentX ? 1 : -1;
    const correctedVelocity = Math.abs(info.velocity.x) * xMovementDirection;

    goToIndex(targetIndex, correctedVelocity, isMultiSkip);
    velocityHistory.current = [];
  };

  // Navigation functions
  const navigate = (direction: number) => {
    const artificialVelocity = direction * 200;
    goToIndex(currentIndex + direction, artificialVelocity, true);
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        if (currentIndex > 0) navigate(-1);
        break;
      case "ArrowRight":
        event.preventDefault();
        if (currentIndex < maxIndex) navigate(1);
        break;
      case "Home":
        event.preventDefault();
        goToIndex(0);
        break;
      case "End":
        event.preventDefault();
        goToIndex(maxIndex);
        break;
    }
  };

  const handleArrowKeyDown = (
    event: React.KeyboardEvent,
    direction: number
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (direction === -1 && !disablePrev) navigate(-1);
      else if (direction === 1 && !disableNext) navigate(1);
    }
  };

  const handleDotKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      goToIndex(index);
    }
  };

  const disablePrev = currentIndex === 0;
  const disableNext = currentIndex === maxIndex;

  const getIconSize = (buttonSize: number) => {
    switch (buttonSize) {
      case 24:
        return 16;
      case 32:
        return 24;
      case 48:
        return 32;
      case 56:
        return 40;
      default:
        return 24;
    }
  };

  const iconSize = getIconSize(arrowButtonSize);

  // Arrow Icons
  const ArrowLeft = (props: { size: number; color: string }) => (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none">
      <path
        d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
        fill={props.color}
      />
    </svg>
  );

  const ArrowRight = (props: { size: number; color: string }) => (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none">
      <path
        d="M10 6L8.59 7.41L13.17 12L8.59 16.59L10 18L16 12L10 6Z"
        fill={props.color}
      />
    </svg>
  );

  // Edge cases
  if (totalItems === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "200px",
          color: "#666",
          fontSize: "16px",
        }}
      >
        No content to display
      </div>
    );
  }

  if (totalItems === 1) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        ref={containerRef}
        role="region"
        aria-label={`Carousel showing card ${currentIndex + 1} of ${
          maxIndex + 1
        }`}
        aria-live="polite"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          touchAction: "auto",
          overscrollBehavior: "none",
          height: "100%",
          minHeight: "200px",
          paddingLeft: `${horizontalPadding}px`,
          paddingRight: `${horizontalPadding}px`,
          paddingTop: `${verticalPadding}px`,
          paddingBottom: `${verticalPadding}px`,
          outline: "none",
        }}
      >
        <motion.div
          drag="x"
          dragConstraints={dragConstraints}
          dragElastic={edgeConfig.resistance}
          dragMomentum={true}
          dragTransition={{
            power: 0.2,
            timeConstant: 200,
            modifyTarget: (t) => t,
          }}
          dragPropagation={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{
            display: "flex",
            x,
            scale: edgeScale,
            cursor: "grab",
            minHeight: 0,
            willChange: "transform",
          }}
          whileTap={{ cursor: "grabbing" }}
        >
          {childrenArray.map((child, index) => {
            const finalItemWidth = itemWidth;

            // Use motion value for gap if available
            const gapMultiplier =
              gapDynamicsEnabled &&
              index < childrenArray.length - 1 &&
              gapMotionValues.current &&
              gapMotionValues.current.length > index &&
              gapMotionValues.current[index]
                ? gapMotionValues.current[index].get()
                : 1.0;

            const dynamicGap =
              gapDynamicsEnabled && index < childrenArray.length - 1
                ? gap * gapMultiplier
                : index < childrenArray.length - 1
                ? gap
                : 0;

            return (
              <motion.div
                key={index}
                style={{
                  width: `${finalItemWidth}px`,
                  minWidth: `${finalItemWidth}px`,
                  maxWidth: `${finalItemWidth}px`,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  marginRight: dynamicGap,
                }}
              >
                {React.cloneElement(
                  child as React.ReactElement<{ style?: React.CSSProperties }>,
                  {
                    style: {
                      ...(
                        child as React.ReactElement<{
                          style?: React.CSSProperties;
                        }>
                      ).props?.style,
                      width: "100%",
                      minWidth: "unset",
                      maxWidth: "100%",
                    },
                  }
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {arrowsEnabled && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: `16px ${horizontalPadding}px 0 0`,
            gap: "8px",
          }}
        >
          <motion.button
            onClick={() => navigate(-1)}
            disabled={disablePrev}
            onKeyDown={(e) => handleArrowKeyDown(e, -1)}
            whileTap={{ backgroundColor: arrowPressedColor, scale: 0.95 }}
            style={{
              width: `${arrowButtonSize}px`,
              height: `${arrowButtonSize}px`,
              borderRadius: "50%",
              border: "none",
              backgroundColor: disablePrev ? arrowDisabledColor : arrowColor,
              cursor: disablePrev ? "not-allowed" : "pointer",
              padding: 0,
              opacity: disablePrev ? 0.7 : 1,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Previous slide"
          >
            <ArrowLeft
              size={iconSize}
              color={disablePrev ? arrowIconDisabledColor : arrowIconColor}
            />
          </motion.button>

          <motion.button
            onClick={() => navigate(1)}
            disabled={disableNext}
            onKeyDown={(e) => handleArrowKeyDown(e, 1)}
            whileTap={{ backgroundColor: arrowPressedColor, scale: 0.95 }}
            style={{
              width: `${arrowButtonSize}px`,
              height: `${arrowButtonSize}px`,
              borderRadius: "50%",
              border: "none",
              backgroundColor: disableNext ? arrowDisabledColor : arrowColor,
              cursor: disableNext ? "not-allowed" : "pointer",
              padding: 0,
              opacity: disableNext ? 0.7 : 1,
              transition: "opacity 0.2s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Next slide"
          >
            <ArrowRight
              size={iconSize}
              color={disableNext ? arrowIconDisabledColor : arrowIconColor}
            />
          </motion.button>
        </div>
      )}

      {dotsEnabled && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: `${dotGap}px`,
            padding: "16px",
            minHeight: "24px",
          }}
        >
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => goToIndex(idx)}
              onKeyDown={(e) => handleDotKeyDown(e, idx)}
              style={{
                width: `${dotSize}px`,
                height: `${dotSize}px`,
                borderRadius: "50%",
                border: "none",
                backgroundColor:
                  idx === currentIndex ? dotColor : dotInactiveColor,
                cursor: "pointer",
                padding: 0,
                transition: "all 0.3s ease",
              }}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

addPropertyControls(AdaptiveCarousel, {
  children: {
    type: ControlType.Array,
    title: "Items",
    control: { type: ControlType.ComponentInstance },
  },
  columns: {
    type: ControlType.Number,
    title: "Columns",
    min: 1,
    max: 6,
    step: 1,
    defaultValue: 1,
    displayStepper: true,
  },
  gap: {
    type: ControlType.Number,
    title: "Gap",
    min: 4,
    max: 50,
    defaultValue: 8,
    unit: "px",
  },
  horizontalPadding: {
    type: ControlType.Number,
    title: "Horizontal Padding",
    min: 0,
    max: 100,
    defaultValue: 16,
    unit: "px",
  },
  verticalPadding: {
    type: ControlType.Number,
    title: "Vertical Padding",
    min: 0,
    max: 100,
    defaultValue: 0,
    unit: "px",
  },
  peakAmount: {
    type: ControlType.Number,
    title: "Peek Next (px)",
    min: 0,
    max: 100,
    defaultValue: 16,
    unit: "px",
  },
  arrowsEnabled: {
    type: ControlType.Boolean,
    title: "Show Arrows",
    defaultValue: true,
  },
  dotsEnabled: {
    type: ControlType.Boolean,
    title: "Show Dots",
    defaultValue: false,
  },
  snapThreshold: {
    type: ControlType.Number,
    title: "Swipe Activation Distance",
    min: 5,
    max: 50,
    step: 5,
    defaultValue: 10,
    displayStepper: true,
    unit: "%",
  },
  velocityScalerPercentage: {
    type: ControlType.Number,
    title: "Swipe Sensitivity",
    min: 1,
    max: 100,
    step: 1,
    defaultValue: 20,
    displayStepper: true,
    unit: "%",
  },
  flickStiffness: {
    type: ControlType.Number,
    title: "Flick Stiffness",
    min: 100,
    max: 1000,
    step: 50,
    defaultValue: 500,
    displayStepper: true,
  },
  flickDamping: {
    type: ControlType.Number,
    title: "Flick Damping",
    min: 10,
    max: 100,
    step: 5,
    defaultValue: 55,
    displayStepper: true,
  },
  glideStiffness: {
    type: ControlType.Number,
    title: "Glide Stiffness",
    min: 50,
    max: 500,
    step: 10,
    defaultValue: 120,
    displayStepper: true,
  },
  glideDamping: {
    type: ControlType.Number,
    title: "Glide Damping",
    min: 10,
    max: 100,
    step: 5,
    defaultValue: 25,
    displayStepper: true,
  },
  // EDGE EFFECTS
  edgeResistance: {
    type: ControlType.Enum,
    title: "✨ Edge Resistance",
    options: ["tight", "moderate", "loose"],
    optionTitles: ["Tight (40px)", "Moderate (70px)", "Loose (120px)"],
    defaultValue: "loose",
    description: "How much you can pull at carousel edges",
  },
  edgeScaleEnabled: {
    type: ControlType.Boolean,
    title: "Edge Scale Effect",
    defaultValue: true,
    description: "Cards scale down slightly when pulling at edges",
  },
  edgeScaleAmount: {
    type: ControlType.Number,
    title: "Edge Scale Amount",
    min: 0.9,
    max: 1.0,
    step: 0.01,
    defaultValue: 0.98,
    hidden: (props) => !props.edgeScaleEnabled,
  },
  // GAP DYNAMICS
  gapDynamicsEnabled: {
    type: ControlType.Boolean,
    title: "✨ Gap Dynamics",
    defaultValue: false,
    description: "Gaps compress/expand during drag, cushion back when you stop",
  },
  gapExpansionMax: {
    type: ControlType.Number,
    title: "Max Gap Expansion",
    min: 1.2,
    max: 2.5,
    step: 0.1,
    defaultValue: 1.6,
    hidden: (props) => !props.gapDynamicsEnabled,
    description: "How much trailing gaps expand (1.6 = 60% larger)",
  },
  gapCompressionMin: {
    type: ControlType.Number,
    title: "Min Gap Compression",
    min: 0.3,
    max: 0.9,
    step: 0.1,
    defaultValue: 0.6,
    hidden: (props) => !props.gapDynamicsEnabled,
    description: "How much leading gaps compress (0.6 = 40% smaller)",
  },
  // ARROW STYLING
  arrowButtonSize: {
    type: ControlType.Enum,
    title: "Arrow Button Size",
    options: [24, 32, 48, 56],
    optionTitles: ["24px", "32px", "48px", "56px"],
    defaultValue: 32,
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowColor: {
    type: ControlType.Color,
    title: "Arrow Background Color",
    defaultValue: "#F2F2F2",
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowPressedColor: {
    type: ControlType.Color,
    title: "Arrow Pressed Color",
    defaultValue: "#000000",
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowDisabledColor: {
    type: ControlType.Color,
    title: "Arrow Disabled Color",
    defaultValue: "rgba(0, 0, 0, 0)",
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowIconColor: {
    type: ControlType.Color,
    title: "Arrow Icon Color",
    defaultValue: "#4D4D4D",
    hidden: (props) => !props.arrowsEnabled,
  },
  arrowIconDisabledColor: {
    type: ControlType.Color,
    title: "Arrow Icon Disabled Color",
    defaultValue: "#CCCCCC",
    hidden: (props) => !props.arrowsEnabled,
  },
  // DOT STYLING
  dotSize: {
    type: ControlType.Number,
    title: "Dot Size",
    min: 4,
    max: 20,
    step: 2,
    defaultValue: 8,
    unit: "px",
    hidden: (props) => !props.dotsEnabled,
  },
  dotGap: {
    type: ControlType.Number,
    title: "Dot Gap",
    min: 0,
    max: 50,
    step: 2,
    defaultValue: 8,
    unit: "px",
    hidden: (props) => !props.dotsEnabled,
  },
  dotColor: {
    type: ControlType.Color,
    title: "Active Dot Color",
    defaultValue: "#000000",
    hidden: (props) => !props.dotsEnabled,
  },
  dotInactiveColor: {
    type: ControlType.Color,
    title: "Inactive Dot Color",
    defaultValue: "#F2F2F2",
    hidden: (props) => !props.dotsEnabled,
  },
});
