import { useLayoutEffect, useRef } from 'react'
import { useCanvasGraph } from './graph/canvas-graph-context'

interface Props {
    blockId: string
    portKey: string
    kind: 'input' | 'output'
    interactive?: boolean
    className?: string
    children?: React.ReactNode
}

function PortHandle({ blockId, portKey, kind, interactive = false, className = '', children }: Props) {
    const ctx = useCanvasGraph()
    const ref = useRef<HTMLButtonElement | null>(null)

    useLayoutEffect(() => {
        if (!ctx?.registerAnchor || !interactive) {
            return undefined
        }
        const el = ref.current
        ctx.registerAnchor(blockId, portKey, el)
        return () => {
            ctx.registerAnchor(blockId, portKey, null)
        }
    }, [blockId, portKey, ctx, interactive])

    const baseClass =
        kind === 'output'
            ? 'notch-port notch-port--bottom port-handle port-handle--output'
            : 'notch-port notch-port--top port-handle port-handle--input'

    if (!interactive) {
        return (
            <span className={`${baseClass} ${className}`.trim()} aria-hidden>
                {children}
            </span>
        )
    }

    return (
        <button
            type="button"
            ref={ref}
            className={`${baseClass} ${className}`.trim()}
            tabIndex={0}
            aria-label={kind === 'output' ? 'Output connection' : 'Input connection'}
            data-port-kind={kind}
            data-block-id={blockId}
            data-port-key={portKey}
            onPointerDown={(event) => {
                if (!ctx?.onPortPointerDown) {
                    return
                }
                event.stopPropagation()
                ctx.onPortPointerDown(event, kind, blockId, portKey)
            }}
        >
            {children}
        </button>
    )
}

export default PortHandle
