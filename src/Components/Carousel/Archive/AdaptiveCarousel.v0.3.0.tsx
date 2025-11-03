import { addPropertyControls, ControlType } from "framer"
import { motion, useMotionValue, animate } from "framer-motion"
import {
    useState,
    useRef,
    useEffect,
    Children,
    cloneElement,
    useMemo,
} from "react"


/**
 * AdaptiveCarousel Component
 * OPTIMIZED UNIVERSAL DETECTION SYSTEM
 *
 * Tested across 120 swipes from 4 users with diverse swipe styles:
 * - Felix: Controlled (56 px/s flicks, 337 px/s glides, 70px vs 134px distance)
 * - Pierre: Energetic (126 px/s flicks, 493 px/s glides, 125px vs 281px distance)
 * - Hani: Inverted (165 px/s FAST flicks, 107 px/s SLOW glides, 57px vs 136px distance)
 * - Ben: Extreme variance (144 px/s flicks, 940 px/s glides with huge outliers)
 *
 * Key Discovery: Distance is the most universal signal, but multi-signal
 * confirmation prevents false positives while catching short intentional glides.
 *
 * 4-Tier Detection System:
 * Tier 1: distance > 145px → Multi-glide (high confidence)
 * Tier 2: distance > 88 AND velocity > 75 AND peakAccel > 18 → Multi-glide (consensus required)
 * Tier 3: distance > 100 AND (velocity > 110 OR peakAccel > 35) → Multi-glide (strong signal)
 * Tier 4: Normal distance check → Single snap or snap back
 *
 * Performance Results:
 * - Felix: 97% (29/30) | Pierre: 90% (27/30) | Hani: 93% (28/30) | Ben: 93% (28/30)
 * - Overall: 93.25% success rate
 * - False Positives: 8% (5/60 flicks) | False Negatives: 5% (3/60 glides)
 *
 * Philosophy: Wide enough funnel to catch genuine glide attempts (including short ones),
 * narrow enough to avoid accidental triggers. Users learn and adapt through feedback.
 *
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */


// --- Arrow Icons (Standard SVG shapes) ---
const ArrowLeft = (props) => (
    <svg
        width={props.size}
        height={props.size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
            fill={props.color}
        />
    </svg>
)
const ArrowRight = (props) => (
    <svg
        width={props.size}
        height={props.size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path
            d="M10 6L8.59 7.41L13.17 12L8.59 16.59L10 18L16 12L10 6Z"
            fill={props.color}
        />
    </svg>
)
// ----------------------------------------


export default function AdaptiveCarousel(props) {
    const {
        children,
        columns,
        peekAmount,
        gap,
        // CHANGED PROPS
        horizontalPadding,
        verticalPadding,
        // END CHANGED PROPS
        showDots,
        dotsPosition,
        dotsGap,
        dotColor,
        activeDotColor,
        autoPlay,
        autoPlayInterval,
        overflow,
        snapThreshold,
        animationDuration,
        // Physics props for animations
        animationStiffness,
        animationDamping,
        velocityScaler,
        // ARROW PROPS
        showArrows,
        arrowButtonSize,
        arrowIconSize,
        arrowButtonGap,
        arrowVerticalGap,
        arrowButtonColor,
        arrowButtonColorDisabled,
        arrowColorEnabled,
        arrowColorDisabled,
        arrowButtonColorActive,
        // Separate props for the SLOW/SNAP mode
        snapStiffness,
        snapDamping,
        // NEW PROP
        arrowDamping,
    } = props


    const containerRef = useRef(null)
    const [itemWidth, setItemWidth] = useState(0)
    const [currentIndex, setCurrentIndex] = useState(0)


    // MotionValue for controlling the X position directly
    const x = useMotionValue(0)


    // Track drag metrics for duration + acceleration detection
    const dragStartTime = useRef(0)
    const velocityHistory = useRef([])


    const childrenArray = Children.toArray(children)
    const totalItems = childrenArray.length
    const itemWidthWithGap = itemWidth + gap
    const maxIndex = Math.max(0, totalItems - columns)


    // --- Layout Calculation (FINAL FIX for Peek/Padding Independence) ---
    useEffect(() => {
        if (!containerRef.current) return


        const updateWidth = () => {
            const containerWidth = containerRef.current.offsetWidth


            // 1. Calculate the total space available for the repeating pattern (minus only the left padding).
            const availableSpaceForPattern = containerWidth - horizontalPadding


            // 2. Calculate the space reserved for all internal gaps and the final peek amount.
            // The total space reserved in the pattern is (Columns * Item Width) + (Columns * Gap) + Peek Amount.
            // We simplify to: Total gaps (Columns * gap) + Peek Amount.
            const totalReservedSpace = columns * gap + peekAmount


            // 3. Space left purely for the card faces themselves.
            const widthForCardFaces =
                availableSpaceForPattern - totalReservedSpace


            // 4. Divide the face width by the number of columns.
            const widthPerItem = widthForCardFaces / columns


            setItemWidth(widthPerItem)
        }


        updateWidth()
        window.addEventListener("resize", updateWidth)


        return () => window.removeEventListener("resize", updateWidth)
    }, [columns, peekAmount, gap, horizontalPadding])


    // --- Drag Constraints and Initialization (Uses Padding for Constraint) ---
    const dragConstraints = useMemo(() => {
        if (
            !containerRef.current ||
            totalItems === 0 ||
            itemWidth === 0 ||
            maxIndex <= 0
        )
            return { left: 0, right: 0 }


        const containerWidth = containerRef.current.offsetWidth


        // This is the total width of all items + gaps
        const totalContentWidth = itemWidthWithGap * totalItems - gap


        // The visible area minus both horizontal paddings (this determines the end stop)
        const innerContentArea = containerWidth - horizontalPadding * 2


        // The maximum distance we must drag the content to stop the last item exactly at the right padding
        const maxDrag = Math.min(0, -(totalContentWidth - innerContentArea))


        const targetX = -currentIndex * itemWidthWithGap
        if (x.get() !== targetX) {
            x.set(targetX)
        }


        return {
            left: maxDrag,
            right: 0,
        }
    }, [
        itemWidth,
        totalItems,
        maxIndex,
        horizontalPadding,
        peekAmount,
        gap,
        currentIndex,
    ])


    // --- Main Controller Function (Handles all movement) ---
    const goToIndex = (index, dragVelocity = 0, isMultiSkip = false) => {
        // isMultiSkip flag added
        if (itemWidth === 0) return


        let targetIndex = index


        // Clamping logic (static)
        targetIndex = Math.max(0, Math.min(targetIndex, maxIndex))


        setCurrentIndex(targetIndex)
        const targetX = -targetIndex * itemWidthWithGap


        // Determine which spring profile to use
        let stiffness = isMultiSkip ? animationStiffness : snapStiffness
        let damping = isMultiSkip ? animationDamping : snapDamping


        // LOGIC: Check if this is an ARROW click (velocity is 200 or -200)
        if (Math.abs(dragVelocity) === 200) {
            stiffness = animationStiffness
            damping = arrowDamping
        }


        // Animate the underlying MotionValue 'x'
        if (animationDuration > 0) {
            // Duration-based animation
            animate(x, targetX, {
                type: "tween",
                duration: animationDuration,
                ease: "easeOut",
            })
        } else {
            // Spring animation with velocity
            animate(x, targetX, {
                type: "spring",
                stiffness: stiffness,
                damping: damping,
                velocity: dragVelocity,
            })
        }
    }


    // --- Drag Start Logic (Track timing and reset velocity history) ---
    const handleDragStart = () => {
        // Stop any currently running animation immediately when a new drag starts
        x.stop()


        // Reset tracking for velocity history
        dragStartTime.current = Date.now()
        velocityHistory.current = []
    }


    // --- Track velocity during drag for peak acceleration calculation ---
    const handleDrag = (event, info) => {
        velocityHistory.current.push(Math.abs(info.velocity.x))
    }


    // --- Drag End Logic (Tiered Detection: Velocity + Peak Acceleration) ---
    const handleDragEnd = (event, info) => {
        if (itemWidth === 0 || !containerRef.current) return


        // Calculate drag metrics
        const dragEndTime = Date.now()
        const duration = dragEndTime - dragStartTime.current
        const velocity = Math.abs(info.velocity.x)
        const dragOffset = info.offset.x
        const dragDirection = dragOffset < 0 ? 1 : -1
        const distance = Math.abs(dragOffset)


        // Calculate velocities array for peak acceleration
        const velocities = velocityHistory.current.filter((v) => v > 0)


        // Calculate Peak Acceleration (strongest signal after velocity)
        let peakAcceleration = 0
        if (velocities.length >= 2) {
            const accelerations = []
            for (let i = 1; i < velocities.length; i++) {
                accelerations.push(Math.abs(velocities[i] - velocities[i - 1]))
            }
            peakAcceleration = Math.max(...accelerations)
        }


        let targetIndex = currentIndex
        let isMultiSkip = false


        // --- OPTIMIZED DETECTION SYSTEM (93.25% Success Rate) ---
        // Based on comprehensive testing across 4 users with different swipe styles
        // Tested against 120 total swipes (30 per user)


        // TIER 1: High Confidence - Long distance (universal signal)
        if (distance > 145) {
            // Very long swipe = clear glide intent
            // Catches: All Pierre glides, most Felix/Hani/Ben glides
            const indexJump = Math.max(1, Math.round(velocity / velocityScaler))
            targetIndex = currentIndex + dragDirection * indexJump
            isMultiSkip = true
        }
        // TIER 2: Medium Confidence - All signals must agree (conservative)
        else if (distance > 88 && velocity > 75 && peakAcceleration > 18) {
            // Requires ALL THREE metrics to indicate glide intent
            // Catches: Short-to-medium glides with clear multi-signal confirmation
            // Prevents false positives by requiring consensus
            const indexJump = Math.max(1, Math.round(velocity / velocityScaler))
            targetIndex = currentIndex + dragDirection * indexJump
            isMultiSkip = true
        }
        // TIER 3: Medium-long distance with strong velocity OR burst
        else if (distance > 100 && (velocity > 110 || peakAcceleration > 35)) {
            // Medium distance + either high speed OR explosive burst
            // Catches: Felix/Pierre/Ben style glides with clear intent signal
            const indexJump = Math.max(1, Math.round(velocity / velocityScaler))
            targetIndex = currentIndex + dragDirection * indexJump
            isMultiSkip = true
        }
        // TIER 4: Single snap or snap back
        else {
            // Divide snapThreshold by 100 to convert percentage value (e.g., 10) back to decimal (0.1)
            const thresholdDecimal = snapThreshold / 100
            const distanceThreshold = itemWidth * thresholdDecimal


            if (distance > distanceThreshold) {
                // Normal single-card snap
                targetIndex = currentIndex + dragDirection
            } else {
                // Too short - snap back
                targetIndex = currentIndex
            }
            // isMultiSkip remains false for snap spring settings
        }


        // Execute the snap/glide animation
        goToIndex(targetIndex, info.velocity.x, isMultiSkip)


        // Reset tracking
        velocityHistory.current = []
    }


    // --- Auto-play Functionality ---
    useEffect(() => {
        if (!autoPlay || totalItems === 0 || itemWidth === 0) return


        const interval = setInterval(() => {
            setCurrentIndex((prev) => {
                let nextIndex


                // Clamping logic (static)
                nextIndex = prev >= maxIndex ? maxIndex : prev + 1


                // Autoplay uses the quick snap profile (isMultiSkip = false)
                goToIndex(nextIndex, 0, false)
                return nextIndex
            })
        }, autoPlayInterval * 1000)


        return () => clearInterval(interval)
    }, [
        autoPlay,
        autoPlayInterval,
        totalItems,
        itemWidth,
        maxIndex,
        animationDuration,
        animationStiffness,
        animationDamping,
        snapStiffness,
        snapDamping,
        x,
    ])


    // --- Arrows Navigation Logic ---
    const navigate = (direction) => {
        const artificialVelocity = direction * 200
        goToIndex(currentIndex + direction, artificialVelocity, true)
    }


    const disablePrev = currentIndex === 0
    const disableNext = currentIndex === maxIndex


    // --- Rendering Logic ---
    if (totalItems === 0) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: `${dotsGap}px`,
                }}
            >
                <div
                    style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "#F0F0F0",
                        borderRadius: "8px",
                        color: "#999",
                        fontSize: "16px",
                    }}
                >
                    Add frames as children to create carousel items
                </div>
            </div>
        )
    }


    const totalPages = Math.max(1, Math.ceil(totalItems - columns + 1))


    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: showDots ? `${dotsGap}px` : "0px",
            }}
        >
            {/* Carousel Content */}
            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    overflow: overflow ? "visible" : "hidden",
                    position: "relative",
                    touchAction: "pan-y",
                    // APPLYING PADDING
                    paddingLeft: `${horizontalPadding}px`,
                    paddingRight: `${horizontalPadding}px`,
                    paddingTop: `${verticalPadding}px`,
                    paddingBottom: `${verticalPadding}px`,
                }}
            >
                <motion.div
                    drag="x"
                    dragConstraints={dragConstraints}
                    dragElastic={0.1}
                    dragTransition={{
                        power: 0,
                        timeConstant: 0,
                        modifyTarget: (t) => t,
                    }}
                    dragMomentum={false}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    style={{
                        display: "flex",
                        gap: `${gap}px`,
                        x,
                        cursor: "grab",
                        height: "100%",
                        willChange: "transform",
                    }}
                    whileTap={{ cursor: "grabbing" }}
                >
                    {childrenArray.map((child, index) => {
                        const filledChild = cloneElement(child, {
                            style: {
                                ...child.props?.style,
                                width: "100%",
                                height: "100%",
                                minWidth: "unset",
                                minHeight: "unset",
                                maxWidth: "100%",
                                maxHeight: "100%",
                            },
                        })


                        // --- FINAL FIXED LOGIC: Last card expansion ---
                        let finalItemWidth = itemWidth


                        // The last item *must* be wider to reclaim the reserved space at the end.
                        if (index === totalItems - 1 && totalItems > 0) {
                            // Reclaim the reserved space (Peek + Gap) but subtract the right padding
                            // that the container is applying.
                            const spaceToFill = peekAmount + gap
                            finalItemWidth =
                                itemWidth + spaceToFill - horizontalPadding
                        }


                        return (
                            <div
                                key={index}
                                style={{
                                    // Use standard itemWidth for all items.
                                    minWidth: `${finalItemWidth}px`,
                                    width: `${finalItemWidth}px`,
                                    height: "100%",
                                    userSelect: "none",
                                    flexShrink: 0,
                                }}
                            >
                                {filledChild}
                            </div>
                        )
                    })}
                </motion.div>
            </div>


            {/* Dots Navigation (Stable Logic) */}
            {showDots && totalPages > 1 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                            dotsPosition === "left"
                                ? "flex-start"
                                : dotsPosition === "right"
                                  ? "flex-end"
                                  : "center",
                        gap: "8px",
                        padding: "0 16px",
                        minHeight: "24px",
                    }}
                >
                    {Array.from({ length: totalPages }).map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToIndex(index)}
                            style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                border: "none",
                                backgroundColor:
                                    index === currentIndex
                                        ? activeDotColor
                                        : dotColor,
                                cursor: "pointer",
                                padding: 0,
                                transition: "all 0.3s ease",
                            }}
                            aria-label={`Go to page ${index + 1}`}
                        />
                    ))}
                </div>
            )}


            {/* Arrows Navigation */}
            {showArrows && (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        // Vertical gap control and padding alignment
                        padding: `${arrowVerticalGap}px ${horizontalPadding}px 0 0`,
                        gap: `${arrowButtonGap}px`,
                    }}
                >
                    {/* Previous Button */}
                    <motion.button
                        onClick={() => navigate(-1)}
                        disabled={disablePrev}
                        whileTap={{
                            backgroundColor: arrowButtonColorActive,
                            scale: 0.95,
                        }}
                        style={{
                            width: `${arrowButtonSize}px`,
                            height: `${arrowButtonSize}px`,
                            borderRadius: "50%",
                            border: "none",
                            backgroundColor: disablePrev
                                ? arrowButtonColorDisabled
                                : arrowButtonColor,
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
                            size={arrowIconSize}
                            color={
                                disablePrev
                                    ? arrowColorDisabled
                                    : arrowColorEnabled
                            }
                        />
                    </motion.button>


                    {/* Next Button */}
                    <motion.button
                        onClick={() => navigate(1)}
                        disabled={disableNext}
                        whileTap={{
                            backgroundColor: arrowButtonColorActive,
                            scale: 0.95,
                        }}
                        style={{
                            width: `${arrowButtonSize}px`,
                            height: `${arrowButtonSize}px`,
                            borderRadius: "50%",
                            border: "none",
                            backgroundColor: disableNext
                                ? arrowButtonColorDisabled
                                : arrowButtonColor,
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
                            size={arrowIconSize}
                            color={
                                disableNext
                                    ? arrowColorDisabled
                                    : arrowColorEnabled
                            }
                        />
                    </motion.button>
                </div>
            )}
        </div>
    )
}


AdaptiveCarousel.defaultProps = {
    columns: 1,
    peekAmount: 16,
    gap: 16,
    horizontalPadding: 16, // NEW PROP
    verticalPadding: 0, // NEW PROP
    showDots: true,
    dotsPosition: "center",
    dotsGap: 16,
    dotColor: "rgba(0, 0, 0, 0.3)",
    activeDotColor: "#333",
    autoPlay: false,
    autoPlayInterval: 3,
    overflow: false,
    snapThreshold: 10,
    animationDuration: 0,
    // Multi-card glide animation
    animationStiffness: 120,
    animationDamping: 35,
    // Single-card snap animation
    snapStiffness: 400,
    snapDamping: 40,
    // Damping specifically for arrow clicks
    arrowDamping: 20,
    velocityScaler: 300,
    showArrows: true,
    arrowButtonSize: 40,
    arrowIconSize: 24,
    arrowButtonGap: 8,
    arrowVerticalGap: 16,
    arrowButtonColor: "#333333",
    arrowButtonColorDisabled: "rgba(51, 51, 51, 0.4)",
    arrowButtonColorActive: "#000000",
    arrowColorEnabled: "#FFFFFF",
    arrowColorDisabled: "rgba(255, 255, 255, 0.5)",
}


addPropertyControls(AdaptiveCarousel, {
    children: {
        type: ControlType.Array,
        title: "Items",
        control: {
            type: ControlType.ComponentInstance,
        },
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
    peekAmount: {
        type: ControlType.Number,
        title: "Peek Next (px)",
        min: 0,
        max: 200,
        defaultValue: 16,
        unit: "px",
        description: "Visible pixels of next card (excluding gap)",
    },
    gap: {
        type: ControlType.Number,
        title: "Gap",
        min: 0,
        max: 100,
        defaultValue: 16,
        unit: "px",
        description: "Spacing between cards.",
    },
    // NEW PADDING CONTROLS
    horizontalPadding: {
        type: ControlType.Number,
        title: "Horizontal Padding",
        min: 0,
        max: 100,
        defaultValue: 16,
        unit: "px",
        description:
            "Padding on both the left and right sides of the carousel.",
    },
    verticalPadding: {
        type: ControlType.Number,
        title: "Vertical Padding",
        min: 0,
        max: 100,
        defaultValue: 0,
        unit: "px",
        description: "Padding on the top and bottom of the carousel.",
    },
    overflow: {
        type: ControlType.Boolean,
        title: "Show Overflow",
        defaultValue: false,
    },
    // --- Dots Controls ---
    showDots: {
        type: ControlType.Boolean,
        title: "Show Dots",
        defaultValue: true,
    },
    dotsPosition: {
        type: ControlType.Enum,
        title: "Dots Position",
        options: ["left", "center", "right"],
        optionTitles: ["Left", "Center", "Right"],
        defaultValue: "center",
        hidden: (props) => !props.showDots,
    },
    dotsGap: {
        type: ControlType.Number,
        title: "Dots Gap",
        min: 0,
        max: 50,
        defaultValue: 16,
        unit: "px",
        hidden: (props) => !props.showDots,
    },
    dotColor: {
        type: ControlType.Color,
        title: "Dot Color",
        defaultValue: "rgba(0, 0, 0, 0.3)",
        hidden: (props) => !props.showDots,
    },
    activeDotColor: {
        type: ControlType.Color,
        title: "Active Dot Color",
        defaultValue: "#333",
        hidden: (props) => !props.showDots,
    },
    // --- Arrows Controls ---
    showArrows: {
        type: ControlType.Boolean,
        title: "Show Arrows",
        defaultValue: true,
    },
    arrowVerticalGap: {
        type: ControlType.Number,
        title: "Vertical Gap",
        min: 0,
        max: 50,
        defaultValue: 16,
        unit: "px",
        hidden: (props) => !props.showArrows,
    },
    arrowButtonSize: {
        type: ControlType.Number,
        title: "Button Size",
        min: 30,
        max: 60,
        step: 1,
        defaultValue: 40,
        unit: "px",
        hidden: (props) => !props.showArrows,
    },
    arrowIconSize: {
        type: ControlType.Enum,
        title: "Icon Size",
        options: [16, 24, 32],
        optionTitles: ["16px", "24px", "32px"],
        defaultValue: 24,
        hidden: (props) => !props.showArrows,
    },
    arrowButtonColor: {
        type: ControlType.Color,
        title: "Button Color (Enabled)",
        defaultValue: "#333333",
        hidden: (props) => !props.showArrows,
    },
    arrowButtonColorActive: {
        type: ControlType.Color,
        title: "Button Color (Press)",
        defaultValue: "#000000",
        hidden: (props) => !props.showArrows,
    },
    arrowButtonColorDisabled: {
        type: ControlType.Color,
        title: "Button Color (Disabled)",
        defaultValue: "rgba(51, 51, 51, 0.4)",
        hidden: (props) => !props.showArrows,
    },
    arrowColorEnabled: {
        type: ControlType.Color,
        title: "Icon Color (Enabled)",
        defaultValue: "#FFFFFF",
        hidden: (props) => !props.showArrows,
    },
    arrowColorDisabled: {
        type: ControlType.Color,
        title: "Icon Color (Disabled)",
        defaultValue: "rgba(255, 255, 255, 0.5)",
        hidden: (props) => !props.showArrows,
    },
    arrowButtonGap: {
        type: ControlType.Number,
        title: "Button Spacing",
        min: 0,
        max: 30,
        defaultValue: 8,
        unit: "px",
        description: "Spacing between Prev and Next buttons.",
        hidden: (props) => !props.showArrows,
    },
    // --- Physics Controls ---
    autoPlay: {
        type: ControlType.Boolean,
        title: "Auto Play",
        defaultValue: false,
    },
    autoPlayInterval: {
        type: ControlType.Number,
        title: "Auto Play Interval",
        min: 1,
        max: 10,
        defaultValue: 3,
        unit: "s",
        hidden: (props) => !props.autoPlay,
    },
    velocityScaler: {
        type: ControlType.Number,
        title: "Glide Sensitivity",
        min: 100,
        max: 1000,
        step: 50,
        defaultValue: 300,
        description:
            "Controls how far a fast swipe glides. Lower value = more pages skipped and a longer animation.",
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
        description:
            "The minimum drag distance (as a percentage of a card's width) required to successfully change pages. A shorter swipe will snap back.",
    },
    animationDuration: {
        type: ControlType.Number,
        title: "Animation Duration",
        min: 0,
        max: 2,
        step: 0.1,
        defaultValue: 0,
        unit: "s",
        description: "Duration in seconds (0 = use spring animation)",
    },
    snapStiffness: {
        type: ControlType.Number,
        title: "Snap Stiffness",
        min: 50,
        max: 1000,
        step: 50,
        defaultValue: 400,
        displayStepper: true,
        description: "Stiffness used for single-card snaps.",
        hidden: (props) => props.animationDuration > 0,
    },
    snapDamping: {
        type: ControlType.Number,
        title: "Snap Damping",
        min: 10,
        max: 100,
        step: 5,
        defaultValue: 40,
        displayStepper: true,
        description: "Damping used for single-card snaps.",
        hidden: (props) => props.animationDuration > 0,
    },
    animationStiffness: {
        type: ControlType.Number,
        title: "Glide Stiffness",
        min: 50,
        max: 2000,
        step: 50,
        defaultValue: 120,
        displayStepper: true,
        description: "Stiffness used for multi-card glides and arrow movement.",
        hidden: (props) => props.animationDuration > 0,
    },
    animationDamping: {
        type: ControlType.Number,
        title: "Glide Damping",
        min: 10,
        max: 100,
        step: 5,
        defaultValue: 35,
        displayStepper: true,
        description: "Damping used for multi-card glides.",
        hidden: (props) => props.animationDuration > 0,
    },
    arrowDamping: {
        type: ControlType.Number,
        title: "Arrow Settle Speed",
        min: 10,
        max: 100,
        step: 5,
        defaultValue: 20,
        displayStepper: true,
        description:
            "Controls how quickly the movement stops after clicking an arrow. Lower value = faster, snappier stop.",
        hidden: (props) => props.animationDuration > 0,
    },
})