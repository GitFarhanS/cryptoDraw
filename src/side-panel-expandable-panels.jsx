import { useId, useState } from 'react'

const PANELS = [
  'Panel 1',
  'Panel 2',
  'Panel 3',
  'Panel 4',
  'Panel 5',
]

function SidePanelExpandablePanels() {
  const baseId = useId()
  const [expandedIndex, setExpandedIndex] = useState(null)

  if (expandedIndex !== null) {
    const title = PANELS[expandedIndex]
    const titleId = `${baseId}-title-${expandedIndex}`

    return (
      <div className="sp-panels sp-panels--expanded">
        <section
          id={`${baseId}-region-${expandedIndex}`}
          className="sp-panel-expanded"
          data-tone={expandedIndex}
          role="region"
          aria-labelledby={titleId}
        >
          <div className="sp-panel-expanded-header">
            <button
              type="button"
              className="sp-panel-expanded-close"
              onClick={() => setExpandedIndex(null)}
              aria-label="Close panel"
            >
              Back
            </button>
            <h2 className="sp-panel-expanded-title" id={titleId}>
              {title}
            </h2>
          </div>
          <div className="sp-panel-expanded-body">
            <p className="sp-panel-expanded-placeholder">Content for {title}.</p>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="sp-panels">
      {PANELS.map((label, index) => (
        <button
          key={label}
          type="button"
          className="sp-panel-row"
          data-tone={index}
          onClick={() => setExpandedIndex(index)}
          aria-expanded={false}
        >
          <span className="sp-panel-row-label">{label}</span>
          <span className="sp-panel-row-chevron" aria-hidden>
            ›
          </span>
        </button>
      ))}
    </div>
  )
}

export default SidePanelExpandablePanels
