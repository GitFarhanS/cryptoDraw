export type PortKind = 'input' | 'output';
export type DataFormat = 'binary' | 'ascii' | 'hex' | 'decimal';

export interface GraphEdge {
    id: string;
    from: {
        blockId: string;
        portKey: string;
    };
    to: {
        blockId: string;
        portKey: string;
    };
}

export interface PlacedBlockRecord {
    id: string;
    type: string;
    x: number;
    y: number;
    blockCount?: number;
    joinCount?: number;
    text?: string;
    fcText?: string;
    fcInputFormat?: DataFormat;
    fcOutputFormat?: DataFormat;
    permuteMode?: 'bytes' | 'bits';
    permutePreset?: 'custom' | 'identity' | 'reverse' | 'desIp' | 'desFp';
    permuteOrder?: string;
    opDisplayMode?: 'auto' | 'manual';
    opDisplayFormat?: DataFormat;
    opShiftMode?: 'logical' | 'circular';
    /** ChaCha20-IETF (RFC 8439): 32-bit block counter (0 = Poly1305 key block; 1 = first ciphertext block). */
    chachaBlockCounter?: number;
    /** ChaCha20-IETF: emit first N keystream bytes after one block (1–64). */
    chachaOutputByteLength?: number;
    /** Which quarter-round indices to apply (column or diagonal slot). */
    chachaQuarterPreset?:
        | 'col0'
        | 'col1'
        | 'col2'
        | 'col3'
        | 'diag0'
        | 'diag1'
        | 'diag2'
        | 'diag3';
}

export interface WireDragState {
    fromBlockId: string;
    fromPortKey: string;
    fromKind: PortKind;
    pointerId: number;
    clientX: number;
    clientY: number;
}
