import {
    CIPHER_TEMPLATE_CATEGORY_ORDER,
    CIPHER_TEMPLATE_META,
    buildCipherTemplateGraph,
    type CipherTemplateCategory,
    type CipherTemplateId,
    type CipherTemplateMeta,
} from './cipher-template-builders'
import { serializeFlowchartToBase64 } from './graph/flowchart-io'

interface Props {
    onImportFlowchart: (base64: string, options?: { anchorToViewport?: boolean }) => void
    onToast: (message: string, kind: 'success' | 'error') => void
}

function groupTemplatesByCategory(): Array<{ category: CipherTemplateCategory; templates: CipherTemplateMeta[] }> {
    const buckets: Record<CipherTemplateCategory, CipherTemplateMeta[]> = {
        Asymmetric: [],
        Stream: [],
        Block: [],
    }
    for (const template of CIPHER_TEMPLATE_META) {
        buckets[template.category].push(template)
    }
    return CIPHER_TEMPLATE_CATEGORY_ORDER.map((category) => ({
        category,
        templates: buckets[category],
    })).filter((group) => group.templates.length > 0)
}

function CipherTemplatesPanel({ onImportFlowchart, onToast }: Readonly<Props>) {
    const templateGroups = groupTemplatesByCategory()

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
                {templateGroups.map((group) => (
                    <section key={group.category} className="cipher-templates-group" aria-label={group.category}>
                        <h3 className="cipher-templates-group__title">{group.category}</h3>
                        <div className="cipher-templates-group__cards">
                            {group.templates.map((template) => (
                                <section key={template.id} className="cipher-template-card">
                                    <h4 className="cipher-template-card__title">{template.title}</h4>
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
                    </section>
                ))}
            </div>
        </div>
    )
}

export default CipherTemplatesPanel
