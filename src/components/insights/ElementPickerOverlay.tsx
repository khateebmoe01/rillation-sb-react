import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crosshair, Camera, X } from 'lucide-react'
// html2canvas is dynamically imported when needed (reduces initial bundle)

interface ElementPickerOverlayProps {
  isActive: boolean
  onCapture: (screenshot: string, elementInfo: string) => void
  onCancel: () => void
  panelWidth: number
}

interface HoverInfo {
  element: HTMLElement
  rect: DOMRect
  tagName: string
  className: string
  id: string
  textContent: string
}

export default function ElementPickerOverlay({ 
  isActive, 
  onCapture, 
  onCancel,
  panelWidth 
}: ElementPickerOverlayProps) {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Get element info for display
  const getElementInfo = useCallback((element: HTMLElement): HoverInfo => {
    const rect = element.getBoundingClientRect()
    const tagName = element.tagName.toLowerCase()
    const className = element.className && typeof element.className === 'string' 
      ? element.className.split(' ').slice(0, 3).join(' ') 
      : ''
    const id = element.id || ''
    
    // Get meaningful text content
    let textContent = ''
    const directText = element.childNodes[0]?.textContent?.trim() || ''
    if (directText && directText.length < 50) {
      textContent = directText
    } else {
      // Try to find a heading or label
      const heading = element.querySelector('h1, h2, h3, h4, h5, h6, label, span, p')
      if (heading) {
        textContent = heading.textContent?.trim().slice(0, 50) || ''
      }
    }
    
    // Check for data attributes that might give context
    const dataTestId = element.getAttribute('data-testid') || ''
    const ariaLabel = element.getAttribute('aria-label') || ''
    
    return {
      element,
      rect,
      tagName,
      className,
      id: id || dataTestId || ariaLabel,
      textContent
    }
  }, [])

  // Handle mouse move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isCapturing) return
    
    // Ignore elements inside the AI panel
    const target = e.target as HTMLElement
    if (target.closest('[data-ai-panel]') || target === overlayRef.current) {
      setHoverInfo(null)
      return
    }
    
    // Find the most relevant element (not too small, not too big)
    let element = target
    const viewportArea = window.innerWidth * window.innerHeight
    
    // Walk up to find a reasonable container if element is too small
    while (element && element !== document.body) {
      const rect = element.getBoundingClientRect()
      const area = rect.width * rect.height
      
      // Skip if too small (less than 1% of viewport) or too large (more than 80%)
      if (area < viewportArea * 0.01 && element.parentElement) {
        element = element.parentElement
        continue
      }
      
      if (area > viewportArea * 0.8) {
        break
      }
      
      break
    }
    
    if (element && element !== document.body) {
      setHoverInfo(getElementInfo(element))
    }
  }, [getElementInfo, isCapturing])

  // Handle click to capture
  const handleClick = useCallback(async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!hoverInfo || isCapturing) return
    
    setIsCapturing(true)
    
    try {
      // Temporarily hide the overlay for screenshot
      if (overlayRef.current) {
        overlayRef.current.style.display = 'none'
      }
      
      // Capture the element - dynamic import for code splitting
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(hoverInfo.element)
      
      const screenshot = canvas.toDataURL('image/png')
      
      // Build element info string
      const info = [
        hoverInfo.tagName,
        hoverInfo.id && `#${hoverInfo.id}`,
        hoverInfo.textContent && `"${hoverInfo.textContent.slice(0, 30)}..."`,
      ].filter(Boolean).join(' ')
      
      onCapture(screenshot, info || 'UI Element')
    } catch (error) {
      console.error('Failed to capture element:', error)
    } finally {
      // Restore overlay
      if (overlayRef.current) {
        overlayRef.current.style.display = 'block'
      }
      setIsCapturing(false)
    }
  }, [hoverInfo, isCapturing, onCapture])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    
    if (isActive) {
      document.addEventListener('keydown', handleKeyDown)
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive, onCancel])

  // Add/remove event listeners
  useEffect(() => {
    if (isActive) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('click', handleClick, true)
      
      // Change cursor
      document.body.style.cursor = 'crosshair'
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick, true)
      document.body.style.cursor = ''
    }
  }, [isActive, handleMouseMove, handleClick])

  if (!isActive) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-30 pointer-events-none"
        style={{ left: panelWidth }}
      >
        {/* Highlight overlay */}
        {hoverInfo && (
          <>
            {/* Element highlight border */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute border-2 border-white bg-white/10 rounded pointer-events-none"
              style={{
                left: hoverInfo.rect.left - panelWidth,
                top: hoverInfo.rect.top,
                width: hoverInfo.rect.width,
                height: hoverInfo.rect.height,
              }}
            >
              {/* Corner indicators */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white" />
            </motion.div>

            {/* Element info tooltip */}
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute px-3 py-2 bg-black/95 border border-white/20 rounded-lg shadow-xl pointer-events-none"
              style={{
                left: Math.min(
                  hoverInfo.rect.left - panelWidth,
                  window.innerWidth - panelWidth - 250
                ),
                top: Math.max(hoverInfo.rect.top - 50, 10),
              }}
            >
              <div className="flex items-center gap-2 text-xs font-mono">
                <Camera size={12} className="text-white/90" />
                <span className="text-white/80">
                  {hoverInfo.tagName}
                  {hoverInfo.id && <span className="text-white/80"> #{hoverInfo.id.slice(0, 20)}</span>}
                </span>
              </div>
              {hoverInfo.textContent && (
                <div className="text-[10px] text-white/80 mt-1 truncate max-w-[200px]">
                  "{hoverInfo.textContent}"
                </div>
              )}
              <div className="text-[10px] text-white/80 mt-1">
                Click to capture • ESC to cancel
              </div>
            </motion.div>
          </>
        )}

        {/* Capturing indicator */}
        {isCapturing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-white/10 flex items-center justify-center"
          >
            <div className="px-4 py-2 bg-black border border-white/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-mono text-white">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Camera size={16} />
                </motion.div>
                Capturing...
              </div>
            </div>
          </motion.div>
        )}

        {/* Instructions banner */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/95 border border-white/20 rounded-lg shadow-xl pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <Crosshair size={16} className="text-white/80" />
            <span className="text-sm font-mono text-white/90">
              Select an element to capture
            </span>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={14} className="text-white/90" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

