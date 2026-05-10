export type PortKind = 'input' | 'output'
export type DataFormat = 'binary' | 'ascii' | 'hex' | 'decimal'

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
    fcInputFormat?: DataFormat
    fcOutputFormat?: DataFormat
    permuteMode?: 'bytes' | 'bits'
    permutePreset?: 'custom' | 'identity' | 'reverse' | 'desIp' | 'desFp'
    permuteOrder?: string
    opDisplayMode?: 'auto' | 'manual'
    opDisplayFormat?: DataFormat
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
