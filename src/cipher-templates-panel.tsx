import { CIPHER_TEMPLATE_META, buildCipherTemplateGraph, type CipherTemplateId } from './cipher-template-builders'
import { serializeFlowchartToBase64 } from './graph/flowchart-io'

interface Props {
    onImportFlowchart: (base64: string, options?: { anchorToViewport?: boolean }) => void
    onToast: (message: string, kind: 'success' | 'error') => void
}

function CipherTemplatesPanel({ onImportFlowchart, onToast }: Readonly<Props>) {
    const loadTemplate = (templateId: CipherTemplateId, title: string) => {
        try {
            const { placedBlocks, edges } = buildCipherTemplateGraph(templateId)
            const base64 = serializeFlowchartToBase64(placedBlocks, edges)
            onImportFlowchart(base64, { anchorToViewport: true })
            onToast(`${title} template loaded.`, 'success')
        } catch (error) {
            onToast(
                error instanceof Error ? error.message : `Could not load ${title} template.`,
                'error'
            )
        }
    }

    return (
        <div className="flowchart-io">
            <p className="flowchart-io-text">
                Load cipher flowcharts built from this app’s blocks (ChaCha20-IETF from Stream, Permute for DES IP/FP,
                SubBytes after AES AddRoundKey). Loading replaces the current canvas.
            </p>
            <div className="cipher-templates-list">
                {CIPHER_TEMPLATE_META.map((template) => (
                    <section key={template.id} className="cipher-template-card">
                        <h3 className="cipher-template-card__title">{template.title}</h3>
                        <p className="cipher-template-card__description">{template.description}</p>
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
        </div>
    )
}

export default CipherTemplatesPanel
