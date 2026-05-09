export interface Point {
    x: number
    y: number
}

const CURVE_PAD = 72

export function bezierPathD(p1: Point, p2: Point) {
    const dy = Math.max(CURVE_PAD, Math.abs(p2.y - p1.y) * 0.45)
    const c1x = p1.x
    const c1y = p1.y + dy
    const c2x = p2.x
    const c2y = p2.y - dy
    return `M ${p1.x} ${p1.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
}
