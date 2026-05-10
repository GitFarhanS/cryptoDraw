import { useState } from 'react'
import { CIPHER_TEMPLATE_META, buildCipherTemplateGraph, type CipherTemplateId } from './cipher-template-builders'
import { serializeFlowchartToBase64 } from './graph/flowchart-io'

interface Props {
    onImportFlowchart: (base64: string) => void
}

function CipherTemplatesPanel({ onImportFlowchart }: Readonly<Props>) {
    const [status, setStatus] = useState('')
    const [statusKind, setStatusKind] = useState<'neutral' | 'success' | 'error'>('neutral')

    const loadTemplate = (templateId: CipherTemplateId, title: string) => {
        try {
            const { placedBlocks, edges } = buildCipherTemplateGraph(templateId)
            const base64 = serializeFlowchartToBase64(placedBlocks, edges)
            onImportFlowchart(base64)
            setStatus(`${title} template loaded.`)
            setStatusKind('success')
        } catch (error) {
            setStatus(error instanceof Error ? error.message : `Could not load ${title} template.`)
            setStatusKind('error')
        }
    }

    return (
        <div className="flowchart-io">
            <p className="flowchart-io-text">
                Load cipher flowcharts built from this app’s blocks (ChaCha20-IETF from Stream, Permute for DES IP/FP,
                SubBytes after AES AddRoundKey). Loading replaces the current canvas.
            </p>
            <div className="input-blocks">
                {CIPHER_TEMPLATE_META.map((template) => (
                    <section key={template.id} className="input-block">
                        <h3 className="input-block-title">{template.title}</h3>
                        <p className="input-block-hint">{template.description}</p>
                        <div className="flowchart-io-actions">
                            <button
                                type="button"
                                className="flowchart-io-button"
                                onClick={() => loadTemplate(template.id, template.title)}
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
