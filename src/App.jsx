import { useEffect, useRef, useState } from 'react'
import './App.css'
import MiniMap from './mini-map'
import SidePanel from './side-panel'
import SidePanelExpandablePanels from './side-panel-expandable-panels'

const CANVAS_SIZE = 8000
const MINIMAP_SIZE = 180

function App() {
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [viewport, setViewport] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragStateRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    startScrollX: 0,
    startScrollY: 0,
  })

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        left: window.scrollX,
        top: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewport()
    window.addEventListener('scroll', updateViewport, { passive: true })
    window.addEventListener('resize', updateViewport)

    return () => {
      window.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  const canvasStyle = {
    width: `${CANVAS_SIZE}px`,
    height: `${CANVAS_SIZE}px`,
  }

  const navigateFromMinimap = (targetLeft, targetTop) => {
    const maxScrollLeft = Math.max(0, CANVAS_SIZE - window.innerWidth)
    const maxScrollTop = Math.max(0, CANVAS_SIZE - window.innerHeight)

    window.scrollTo({
      left: Math.min(Math.max(0, targetLeft), maxScrollLeft),
      top: Math.min(Math.max(0, targetTop), maxScrollTop),
    })
  }

  const startDrag = (event) => {
    if (event.button !== 0) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollX: window.scrollX,
      startScrollY: window.scrollY,
    }
    setIsDragging(true)
  }

  const moveDrag = (event) => {
    if (!isDragging || dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    const dx = event.clientX - dragStateRef.current.startX
    const dy = event.clientY - dragStateRef.current.startY

    window.scrollTo({
      left: dragStateRef.current.startScrollX - dx,
      top: dragStateRef.current.startScrollY - dy,
    })
  }

  const endDrag = (event) => {
    if (dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    dragStateRef.current.pointerId = null
    setIsDragging(false)
  }

  return (
    <>
      <div
        className={`grid-canvas ${isDragging ? 'is-dragging' : ''}`}
        style={canvasStyle}
        aria-label="Notebook style square grid"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <MiniMap
        canvasSize={CANVAS_SIZE}
        minimapSize={MINIMAP_SIZE}
        viewport={viewport}
        onNavigate={navigateFromMinimap}
      />
      <SidePanel open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
        <SidePanelExpandablePanels />
      </SidePanel>
    </>
  )
}

export default App
