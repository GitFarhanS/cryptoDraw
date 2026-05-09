import { createContext, useContext } from 'react'

export type WireDragState = {
    fromBlockId: string
    fromPortKey: string
    fromKind: 'input' | 'output'
    pointerId: number
    clientX: number
    clientY: number
}

export type CanvasGraphContextValue = {
    registerAnchor: (blockId: string, portKey: string, el: Element | null) => void
    onPortPointerDown: (
        event: React.PointerEvent,
        fromKind: 'input' | 'output',
        fromBlockId: string,
        fromPortKey: string,
    ) => void
    wireDrag: WireDragState | null
    zoom: number
}

export const CanvasGraphContext = createContext<CanvasGraphContextValue | null>(null)

export function useCanvasGraph() {
    return useContext(CanvasGraphContext)
}
