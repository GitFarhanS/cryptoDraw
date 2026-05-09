export type PortKind = 'input' | 'output'

export interface GraphEdge {
    id: string
    from: {
        blockId: string
        portKey: string
    }
    to: {
        blockId: string
        portKey: string
    }
}

export interface PlacedBlockRecord {
    id: string
    type: string
    x: number
    y: number
    blockCount?: number
    joinCount?: number
    text?: string
    fcText?: string
    fcInputFormat?: 'binary' | 'ascii' | 'hex' | 'decimal'
    fcOutputFormat?: 'binary' | 'ascii' | 'hex' | 'decimal'
    opDisplayMode?: 'auto' | 'manual'
    opDisplayFormat?: 'binary' | 'ascii' | 'hex' | 'decimal'
    opShiftMode?: 'logical' | 'circular'
}

export interface WireDragState {
    fromBlockId: string
    fromPortKey: string
    fromKind: PortKind
    pointerId: number
    clientX: number
    clientY: number
}
