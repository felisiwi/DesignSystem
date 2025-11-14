import * as React from "react"
import type { Override } from "framer"

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function useViewportWidth() {
    const [vw, setVw] = React.useState<number>(
        typeof window !== "undefined" ? window.innerWidth : 1920
    )
    React.useEffect(() => {
        const onResize = () => setVw(window.innerWidth)
        window.addEventListener("resize", onResize)
        return () => window.removeEventListener("resize", onResize)
    }, [])
    return vw
}

/**
 * Portrait carousel (Desktop + Desktop L)
 * – Max width: 730 → 1170 as viewport 1200 → 1920
 * – Gap: 16 → 24 over same range
 * – 4 cards below 1920, 5 cards at/above 1920
 */
export function PortraitCarousel(): Override {
    const vw = useViewportWidth()

    const MIN_VW = 1200
    const MAX_VW = 1920
    const MIN_MAXWIDTH = 730
    const MAX_MAXWIDTH = 1170
    const MIN_GAP = 16
    const MAX_GAP = 24

    // outside desktop range: no override
    if (vw < MIN_VW) return {}

    // smooth interpolation
    const t = clamp01((vw - MIN_VW) / (MAX_VW - MIN_VW))
    const maxWidth = Math.round(lerp(MIN_MAXWIDTH, MAX_MAXWIDTH, t))
    const gap = Math.round(lerp(MIN_GAP, MAX_GAP, t))
    const itemsVisible = vw >= MAX_VW ? 5 : 4

    return {
        style: {
            width: "100%",
            maxWidth: `${maxWidth}px`,
            marginLeft: "auto",
            marginRight: "auto",
        },
        gap,
        itemsVisible,
    }
}
