import { useId, useState } from 'react'
import { serializeBytesToFormat } from '../converter-block/format-bytes'
import { portRegistryKey } from '../graph/edge-types'
import { attachPaletteDragData } from '../input-blocks/palette-drag'
import PortHandle from '../port-handle'
import { CHACHA_QUARTER_PRESETS, type ChaChaQuarterPreset } from './chacha20-ietf'

interface Props {
    draggableToCanvas?: boolean
    block?: any
    onBlockPatch?: (patch: any) => void
    evaluation?: any
}

function sectionClassNames(draggableToCanvas: boolean, isCanvas: boolean) {
    return [
        'input-block',
        isCanvas ? 'input-block--canvas-op' : '',
        draggableToCanvas ? 'input-block--palette-draggable' : '',
    ]
        .filter(Boolean)
        .join(' ')
}

function ChaChaIetfInitBlock({ draggableToCanvas = false, block, onBlockPatch, evaluation }: Readonly<Props>) {
    const id = useId()
    const titleId = `${id}-chacha-init`
    const isCanvas = Boolean(block)
    const [paletteCtr, setPaletteCtr] = useState(1)
    const ctr = isCanvas ? (block.chachaBlockCounter ?? 1) >>> 0 : paletteCtr >>> 0
    const setCtr = (v: number) => {
        const n = Number.isFinite(v) ? v >>> 0 : 0
        if (isCanvas) {
            onBlockPatch?.({ chachaBlockCounter: n })
        } else {
            setPaletteCtr(n)
        }
    }

    const outKey = isCanvas ? portRegistryKey(block.id, 'out') : ''
    const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined
    const hexOut = outBytes ? serializeBytesToFormat('hex', outBytes) : ''

    return (
        <section
            className={sectionClassNames(draggableToCanvas, isCanvas)}
            aria-labelledby={titleId}
            draggable={draggableToCanvas}
            onDragStart={draggableToCanvas ? (e) => attachPaletteDragData(e, 'chachaIetfInit') : undefined}
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            {(isCanvas || draggableToCanvas) ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive notch-ports-row--spread">
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="in:key" kind="input" {...(isCanvas ? { interactive: true } : {})} />
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="in:nonce" kind="input" {...(isCanvas ? { interactive: true } : {})} />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>
                ChaCha-IETF Init
            </h3>
            <p className="input-block-hint">RFC 8439 initial 512-bit state (64 bytes LE): constants, key, counter, nonce.</p>
            <label className="converter-block-label" htmlFor={`${id}-ctr`}>
                Block counter (uint32)
            </label>
            <input
                id={`${id}-ctr`}
                className="input-block-field"
                type="number"
                min={0}
                value={ctr}
                onChange={(e) => setCtr(Number(e.target.value))}
            />
            {isCanvas ? (
                <>
                    <label className="converter-block-label" htmlFor={`${id}-out`}>State (hex)</label>
                    <textarea id={`${id}-out`} className="input-block-field input-block-field--mono" readOnly rows={2} value={hexOut} spellCheck={false} />
                </>
            ) : null}
            {(isCanvas || draggableToCanvas) ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="out" kind="output" {...(isCanvas ? { interactive: true } : {})} />
                </div>
            ) : null}
        </section>
    )
}

function ChaChaIetfQuarterRoundBlock({ draggableToCanvas = false, block, onBlockPatch, evaluation }: Readonly<Props>) {
    const id = useId()
    const titleId = `${id}-chacha-qr`
    const isCanvas = Boolean(block)
    const [palettePreset, setPalettePreset] = useState<ChaChaQuarterPreset>('col0')
    const preset = isCanvas ? ((block.chachaQuarterPreset ?? 'col0') as ChaChaQuarterPreset) : palettePreset

    const setPreset = (next: ChaChaQuarterPreset) => {
        if (isCanvas) {
            onBlockPatch?.({ chachaQuarterPreset: next })
        } else {
            setPalettePreset(next)
        }
    }

    const outKey = isCanvas ? portRegistryKey(block.id, 'out') : ''
    const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined
    const hexOut = outBytes ? serializeBytesToFormat('hex', outBytes) : ''

    return (
        <section
            className={sectionClassNames(draggableToCanvas, isCanvas)}
            aria-labelledby={titleId}
            draggable={draggableToCanvas}
            onDragStart={draggableToCanvas ? (e) => attachPaletteDragData(e, 'chachaIetfQuarterRound') : undefined}
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            {(isCanvas || draggableToCanvas) ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive">
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="in" kind="input" {...(isCanvas ? { interactive: true } : {})} />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>
                ChaCha QuarterRound
            </h3>
            <p className="input-block-hint">One ARX quarter-round on selected column or diagonal indices.</p>
            <label className="converter-block-label" htmlFor={`${id}-preset`}>Preset</label>
            <select
                id={`${id}-preset`}
                className="input-block-field"
                value={preset}
                onChange={(e) => setPreset(e.target.value as ChaChaQuarterPreset)}
            >
                {CHACHA_QUARTER_PRESETS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                ))}
            </select>
            {isCanvas ? (
                <>
                    <label className="converter-block-label" htmlFor={`${id}-out`}>State (hex)</label>
                    <textarea id={`${id}-out`} className="input-block-field input-block-field--mono" readOnly rows={2} value={hexOut} spellCheck={false} />
                </>
            ) : null}
            {(isCanvas || draggableToCanvas) ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="out" kind="output" {...(isCanvas ? { interactive: true } : {})} />
                </div>
            ) : null}
        </section>
    )
}

function ChaChaRoundPassthroughBlock({
    draggableToCanvas,
    block,
    evaluation,
    dragType,
    title,
    hint,
}: Readonly<Props & { dragType: string; title: string; hint: string }>) {
    const id = useId()
    const titleId = `${id}-${dragType}`
    const isCanvas = Boolean(block)
    const outKey = isCanvas ? portRegistryKey(block.id, 'out') : ''
    const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined
    const hexOut = outBytes ? serializeBytesToFormat('hex', outBytes) : ''

    const paletteDrag = draggableToCanvas ?? false
    return (
        <section
            className={sectionClassNames(paletteDrag, isCanvas)}
            aria-labelledby={titleId}
            draggable={paletteDrag}
            onDragStart={paletteDrag ? (e) => attachPaletteDragData(e, dragType) : undefined}
            title={paletteDrag ? 'Drag onto the grid to place a copy' : undefined}
        >
            {(isCanvas || paletteDrag) ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive">
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="in" kind="input" {...(isCanvas ? { interactive: true } : {})} />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>{title}</h3>
            <p className="input-block-hint">{hint}</p>
            {isCanvas ? (
                <>
                    <label className="converter-block-label" htmlFor={`${id}-out`}>State (hex)</label>
                    <textarea id={`${id}-out`} className="input-block-field input-block-field--mono" readOnly rows={2} value={hexOut} spellCheck={false} />
                </>
            ) : null}
            {(isCanvas || paletteDrag) ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="out" kind="output" {...(isCanvas ? { interactive: true } : {})} />
                </div>
            ) : null}
        </section>
    )
}

function ChaChaIetfFinalizeBlock({ draggableToCanvas = false, block, onBlockPatch, evaluation }: Readonly<Props>) {
    const id = useId()
    const titleId = `${id}-chacha-fin`
    const isCanvas = Boolean(block)
    const [paletteLen, setPaletteLen] = useState(64)
    const outLen = isCanvas ? (block.chachaOutputByteLength ?? 64) : paletteLen

    const setLen = (next: number) => {
        const floored = Math.floor(next)
        const clamped = Number.isFinite(floored) ? Math.min(64, Math.max(1, floored)) : 64
        if (isCanvas) {
            onBlockPatch?.({ chachaOutputByteLength: clamped })
        } else {
            setPaletteLen(clamped)
        }
    }

    const outKey = isCanvas ? portRegistryKey(block.id, 'out') : ''
    const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined
    const hexOut = outBytes ? serializeBytesToFormat('hex', outBytes) : ''

    return (
        <section
            className={sectionClassNames(draggableToCanvas, isCanvas)}
            aria-labelledby={titleId}
            draggable={draggableToCanvas}
            onDragStart={draggableToCanvas ? (e) => attachPaletteDragData(e, 'chachaIetfFinalize') : undefined}
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            {(isCanvas || draggableToCanvas) ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive notch-ports-row--spread">
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="in:state" kind="input" {...(isCanvas ? { interactive: true } : {})} />
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="in:initial" kind="input" {...(isCanvas ? { interactive: true } : {})} />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>
                ChaCha-IETF Finalize
            </h3>
            <p className="input-block-hint">Add initial state word-wise, serialize keystream block; trim prefix length.</p>
            <label className="converter-block-label" htmlFor={`${id}-len`}>Output prefix bytes (1–64)</label>
            <input
                id={`${id}-len`}
                className="input-block-field"
                type="number"
                min={1}
                max={64}
                value={outLen}
                onChange={(e) => setLen(Number(e.target.value))}
            />
            {isCanvas ? (
                <>
                    <label className="converter-block-label" htmlFor={`${id}-out`}>Keystream prefix (hex)</label>
                    <textarea id={`${id}-out`} className="input-block-field input-block-field--mono" readOnly rows={2} value={hexOut} spellCheck={false} />
                </>
            ) : null}
            {(isCanvas || draggableToCanvas) ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle blockId={isCanvas ? block.id : ''} portKey="out" kind="output" {...(isCanvas ? { interactive: true } : {})} />
                </div>
            ) : null}
        </section>
    )
}

function ChaChaIetfColumnRoundBlock(props: Readonly<Props>) {
    return (
        <ChaChaRoundPassthroughBlock
            {...props}
            dragType="chachaIetfColumnRound"
            title="ChaCha Column round"
            hint="Four column quarter-rounds (col0–col3) in one step."
        />
    )
}

function ChaChaIetfDiagonalRoundBlock(props: Readonly<Props>) {
    return (
        <ChaChaRoundPassthroughBlock
            {...props}
            dragType="chachaIetfDiagonalRound"
            title="ChaCha Diagonal round"
            hint="Four diagonal quarter-rounds (diag0–diag3) in one step."
        />
    )
}

export {
    ChaChaIetfColumnRoundBlock,
    ChaChaIetfDiagonalRoundBlock,
    ChaChaIetfFinalizeBlock,
    ChaChaIetfInitBlock,
    ChaChaIetfQuarterRoundBlock,
    ChaChaRoundPassthroughBlock,
}
