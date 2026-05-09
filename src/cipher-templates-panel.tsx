import { useState } from 'react'
import { serializeFlowchartToBase64 } from './graph/flowchart-io'
import type { GraphEdge, PlacedBlockRecord } from './types/graph'

interface Props {
    onImportFlowchart: (base64: string) => void
}

interface CipherTemplate {
    id: string
    title: string
    description: string
    sampleText: string
    sampleKey: string
}

const CIPHER_TEMPLATES: CipherTemplate[] = [
    {
        id: 'rsa',
        title: 'RSA',
        description: 'Starter scaffold for an asymmetric cipher walkthrough with a message and key.',
        sampleText: 'RSA demo',
        sampleKey: 'a1b2c3d4',
    },
    {
        id: 'chacha20',
        title: 'ChaCha20',
        description: 'Stream-cipher sketch with plaintext and a keystream seed placeholder.',
        sampleText: 'ChaCha20 demo',
        sampleKey: '0011223344556677',
    },
    {
        id: 'des',
        title: 'DES',
        description: 'Block-cipher starter with a sample plaintext and 56-bit key placeholder.',
        sampleText: 'DES demo',
        sampleKey: '133457799bbcdff1',
    },
    {
        id: '3des',
        title: '3DES',
        description: 'Triple-DES scaffold with a sample message and multi-key placeholder.',
        sampleText: '3DES demo',
        sampleKey: '0123456789abcdeffedcba9876543210',
    },
    {
        id: 'aes',
        title: 'AES',
        description: 'Block-cipher sketch with sample plaintext and 128-bit key placeholder.',
        sampleText: 'AES demo',
        sampleKey: '2b7e151628aed2a6abf7158809cf4f3c',
    },
]

const TEMPLATE_LAYOUT = {
    message: { x: 120, y: 140 },
    key: { x: 120, y: 300 },
    op: { x: 380, y: 220 },
    output: { x: 640, y: 220 },
}

function buildTemplateFlowchart(template: CipherTemplate) {
    const messageId = crypto.randomUUID()
    const keyId = crypto.randomUUID()
    const opId = crypto.randomUUID()
    const outputId = crypto.randomUUID()

    const placedBlocks: PlacedBlockRecord[] = [
        {
            id: messageId,
            type: 'ascii',
            x: TEMPLATE_LAYOUT.message.x,
            y: TEMPLATE_LAYOUT.message.y,
            text: template.sampleText,
        },
        {
            id: keyId,
            type: 'hex',
            x: TEMPLATE_LAYOUT.key.x,
            y: TEMPLATE_LAYOUT.key.y,
            text: template.sampleKey,
        },
        {
            id: opId,
            type: 'opXor',
            x: TEMPLATE_LAYOUT.op.x,
            y: TEMPLATE_LAYOUT.op.y,
            opDisplayMode: 'auto',
            opDisplayFormat: 'hex',
            opShiftMode: 'logical',
        },
        {
            id: outputId,
            type: 'output',
            x: TEMPLATE_LAYOUT.output.x,
            y: TEMPLATE_LAYOUT.output.y,
        },
    ]

    const edges: GraphEdge[] = [
        {
            id: crypto.randomUUID(),
            from: { blockId: messageId, portKey: 'out' },
            to: { blockId: opId, portKey: 'in:a' },
        },
        {
            id: crypto.randomUUID(),
            from: { blockId: keyId, portKey: 'out' },
            to: { blockId: opId, portKey: 'in:b' },
        },
        {
            id: crypto.randomUUID(),
            from: { blockId: opId, portKey: 'out' },
            to: { blockId: outputId, portKey: 'in' },
        },
    ]

    return serializeFlowchartToBase64(placedBlocks, edges)
}

function CipherTemplatesPanel({ onImportFlowchart }: Readonly<Props>) {
    const [status, setStatus] = useState('')
    const [statusKind, setStatusKind] = useState<'neutral' | 'success' | 'error'>('neutral')

    const loadTemplate = (template: CipherTemplate) => {
        try {
            const base64 = buildTemplateFlowchart(template)
            onImportFlowchart(base64)
            setStatus(`${template.title} template loaded.`)
            setStatusKind('success')
        } catch (error) {
            setStatus(error instanceof Error ? error.message : `Could not load ${template.title} template.`)
            setStatusKind('error')
        }
    }

    return (
        <div className="flowchart-io">
            <p className="flowchart-io-text">
                Load a starter cipher flowchart and swap in real steps as you explore each algorithm. Loading a
                template replaces the current canvas.
            </p>
            <div className="input-blocks">
                {CIPHER_TEMPLATES.map((template) => (
                    <section key={template.id} className="input-block">
                        <h3 className="input-block-title">{template.title}</h3>
                        <p className="input-block-hint">{template.description}</p>
                        <div className="flowchart-io-actions">
                            <button
                                type="button"
                                className="flowchart-io-button"
                                onClick={() => loadTemplate(template)}
                            >
                                Load template
                            </button>
                        </div>
                    </section>
                ))}
            </div>
            {status ? (
                <p className={`flowchart-io-status flowchart-io-status--${statusKind}`}>{status}</p>
            ) : null}
        </div>
    )
}

export default CipherTemplatesPanel
