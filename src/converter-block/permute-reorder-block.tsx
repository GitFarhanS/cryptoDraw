import { useId, useMemo, useState } from 'react'
import PortHandle from '../port-handle'
import { portRegistryKey } from '../graph/edge-types'
import { attachPaletteDragData } from '../input-blocks/palette-drag'

interface Props {
    draggableToCanvas?: boolean
    block?: any
    onBlockPatch?: (patch: any) => void
    evaluation?: any
}

const PERMUTE_MODES = ['bytes', 'bits'] as const

function buildPresetOrder(preset: string, size: number) {
    if (size <= 0) {
        return []
    }
    if (preset === 'identity') {
        return Array.from({ length: size }, (_, index) => index)
    }
    if (preset === 'reverse') {
        return Array.from({ length: size }, (_, index) => size - index - 1)
    }
    if (preset === 'desIp' && size === 64) {
        return [
            57, 49, 41, 33, 25, 17, 9, 1,
            59, 51, 43, 35, 27, 19, 11, 3,
            61, 53, 45, 37, 29, 21, 13, 5,
            63, 55, 47, 39, 31, 23, 15, 7,
            56, 48, 40, 32, 24, 16, 8, 0,
            58, 50, 42, 34, 26, 18, 10, 2,
            60, 52, 44, 36, 28, 20, 12, 4,
            62, 54, 46, 38, 30, 22, 14, 6,
        ]
    }
    if (preset === 'desFp' && size === 64) {
        return [
            39, 7, 47, 15, 55, 23, 63, 31,
            38, 6, 46, 14, 54, 22, 62, 30,
            37, 5, 45, 13, 53, 21, 61, 29,
            36, 4, 44, 12, 52, 20, 60, 28,
            35, 3, 43, 11, 51, 19, 59, 27,
            34, 2, 42, 10, 50, 18, 58, 26,
            33, 1, 41, 9, 49, 17, 57, 25,
            32, 0, 40, 8, 48, 16, 56, 24,
        ]
    }
    return []
}

function PermuteReorderBlock({
    draggableToCanvas = false,
    block,
    onBlockPatch,
    evaluation,
}: Readonly<Props>) {
    const id = useId()
    const titleId = `${id}-permute-title`
    const isCanvas = Boolean(block)

    const [paletteState, setPaletteState] = useState({
        mode: 'bytes',
        preset: 'custom',
        order: '0, 1, 2, 3',
    })

    const mode = isCanvas ? (block.permuteMode ?? 'bytes') : paletteState.mode
    const preset = isCanvas ? (block.permutePreset ?? 'custom') : paletteState.preset
    const orderText = isCanvas ? (block.permuteOrder ?? '0, 1, 2, 3') : paletteState.order

    const wiredInKey = isCanvas ? portRegistryKey(block.id, 'in') : ''
    const wiredInBytes = isCanvas ? evaluation?.portBytes?.get(wiredInKey) : undefined
    const wiredInBitLength = isCanvas ? evaluation?.portBitLengths?.get(wiredInKey) : undefined
    const inputSize =
        mode === 'bits'
            ? (wiredInBitLength ?? Math.max(8, (wiredInBytes?.length ?? 0) * 8))
            : (wiredInBytes?.length ?? 4)
    const presetPreview = useMemo(
        () => buildPresetOrder(preset, inputSize).join(', '),
        [preset, inputSize],
    )

    const setMode = (next: string) => {
        if (isCanvas) {
            onBlockPatch?.({ permuteMode: next })
            return
        }
        setPaletteState((state) => ({ ...state, mode: next }))
    }

    const setPreset = (next: string) => {
        if (isCanvas) {
            onBlockPatch?.({ permutePreset: next })
            return
        }
        setPaletteState((state) => ({ ...state, preset: next }))
    }

    const setOrderText = (next: string) => {
        if (isCanvas) {
            onBlockPatch?.({ permuteOrder: next })
            return
        }
        setPaletteState((state) => ({ ...state, order: next }))
    }

    const sectionClass = [
        'input-block',
        isCanvas ? 'input-block--canvas-format' : '',
        draggableToCanvas ? 'input-block--palette-draggable' : '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <section
            className={sectionClass}
            aria-labelledby={titleId}
            draggable={draggableToCanvas}
            onDragStart={
                draggableToCanvas ? (event) => attachPaletteDragData(event, 'permuteReorder') : undefined
            }
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            {(isCanvas || draggableToCanvas) ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive">
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="in"
                        kind="input"
                        {...(isCanvas ? { interactive: true } : {})}
                    />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>
                Permute bytes/bits
            </h3>
            <p className="input-block-hint">
                Reorder by index with custom order or presets (including DES IP/FP for 64-bit mode).
            </p>
            <div className="converter-block-row">
                <div>
                    <label className="converter-block-label" htmlFor={`${id}-mode`}>
                        Unit
                    </label>
                    <select
                        id={`${id}-mode`}
                        className="input-block-field"
                        value={mode}
                        onChange={(event) => setMode(event.target.value)}
                    >
                        {PERMUTE_MODES.map((value) => (
                            <option key={value} value={value}>
                                {value === 'bytes' ? 'Bytes' : 'Bits'}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="converter-block-label" htmlFor={`${id}-preset`}>
                        Preset
                    </label>
                    <select
                        id={`${id}-preset`}
                        className="input-block-field"
                        value={preset}
                        onChange={(event) => setPreset(event.target.value)}
                    >
                        <option value="custom">Custom</option>
                        <option value="identity">Identity</option>
                        <option value="reverse">Reverse</option>
                        <option value="desIp" disabled={mode !== 'bits'}>
                            DES IP (64-bit)
                        </option>
                        <option value="desFp" disabled={mode !== 'bits'}>
                            DES FP (64-bit)
                        </option>
                    </select>
                </div>
            </div>
            <label className="converter-block-label" htmlFor={`${id}-order`}>
                Order (comma-separated zero-based indices)
            </label>
            <textarea
                id={`${id}-order`}
                className="input-block-field input-block-field--mono"
                value={orderText}
                onChange={(event) => setOrderText(event.target.value)}
                rows={3}
                spellCheck={false}
                disabled={preset !== 'custom'}
            />
            {preset !== 'custom' ? (
                <>
                    <label className="converter-block-label" htmlFor={`${id}-order-preview`}>
                        Preset order preview ({inputSize} {mode})
                    </label>
                    <textarea
                        id={`${id}-order-preview`}
                        className="input-block-field input-block-field--mono"
                        value={presetPreview}
                        readOnly
                        rows={2}
                        spellCheck={false}
                    />
                </>
            ) : null}
            {(isCanvas || draggableToCanvas) ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="out"
                        kind="output"
                        {...(isCanvas ? { interactive: true } : {})}
                    />
                </div>
            ) : null}
        </section>
    )
}

export default PermuteReorderBlock
