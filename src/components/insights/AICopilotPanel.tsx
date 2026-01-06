import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { 
  Send, 
  Terminal,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Target,
  TrendingUp,
  Users,
  Lightbulb,
  X,
  AlertCircle,
  BarChart2,
  Cpu,
  Maximize2,
  Minimize2,
  Crosshair,
  Image as ImageIcon
} from 'lucide-react'
import { useAI } from '../../contexts/AIContext'
import ElementPickerOverlay from './ElementPickerOverlay'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  screenshots?: { dataUrl: string; elementInfo: string }[]
}

interface QuickPrompt {
  id: string
  label: string
  icon: typeof BarChart3
  prompt: string
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'best-industry',
    label: 'Best industry',
    icon: Target,
    prompt: 'Based on the current campaign data, what is the best industry to target and why?',
  },
  {
    id: 'top-performer',
    label: 'Top performers',
    icon: Users,
    prompt: 'Who has booked the most meetings? Give me the profile of the top performing leads.',
  },
  {
    id: 'double-down',
    label: 'Double down',
    icon: TrendingUp,
    prompt: 'Which campaigns are performing best and should we double down on?',
  },
  {
    id: 'top-graphs',
    label: 'Key metrics',
    icon: BarChart3,
    prompt: 'What are the top 4 graphs I should look at to understand campaign effectiveness?',
  },
  {
    id: 'recommendations',
    label: 'Recommendations',
    icon: Lightbulb,
    prompt: 'Based on all the data, what are your top recommendations for improving campaign performance?',
  },
]

// Animated typing cursor
function TypingCursor() {
  return (
    <motion.span
      className="inline-block w-2 h-4 bg-white/80 ml-1"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 1, repeat: Infinity, repeatType: 'loop', times: [0, 0.5, 1] }}
    />
  )
}

// Scanning line animation for the header
function ScanLine() {
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{ top: ['0%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  )
}

// Parse markdown-style bold text
function parseMarkdown(content: string) {
  const parts: (string | JSX.Element)[] = []
  const boldRegex = /\*\*(.*?)\*\*/g
  let lastIndex = 0
  let match
  let keyIndex = 0

  while ((match = boldRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    parts.push(<strong key={keyIndex++} className="text-violet-400 font-semibold">{match[1]}</strong>)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts
}

// Message animation variants
const messageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 }
  },
}

// Panel mode type
type PanelMode = 'sidebar' | 'popup'

// Default dimensions
const DEFAULT_SIDEBAR_WIDTH = 620
const MIN_WIDTH = 450
const MAX_WIDTH_RATIO = 0.9

export default function AICopilotPanel() {
  const { 
    askWithContext, 
    isAsking,
    error, 
    clearError,
    chartContext,
    setChartContext,
    pendingQuestion,
    setPendingQuestion,
    isPanelOpen,
    togglePanel,
    screenshots,
    addScreenshot,
    removeScreenshot,
    clearScreenshots,
    isElementPickerActive,
    setElementPickerActive,
    panelWidth: contextPanelWidth,
    setPanelWidth: setContextPanelWidth
  } = useAI()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [panelMode, setPanelMode] = useState<PanelMode>('sidebar')
  const [isResizing, setIsResizing] = useState(false)
  const [isChatFocused, setIsChatFocused] = useState(false)
  
  // Use context panel width and sync changes
  const panelWidth = contextPanelWidth
  const setPanelWidth = setContextPanelWidth
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)
  
  // Animated progress for thinking state
  const progress = useMotionValue(0)
  const progressWidth = useTransform(progress, [0, 100], ['0%', '100%'])

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }

  // Handle resize start
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = panelWidth
  }, [panelWidth])

  // Handle resize move
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = window.innerWidth * MAX_WIDTH_RATIO
      const delta = e.clientX - resizeStartX.current
      const newWidth = Math.min(
        Math.max(resizeStartWidth.current + delta, MIN_WIDTH),
        maxWidth
      )
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Toggle popup mode
  const togglePopupMode = useCallback(() => {
    if (panelMode === 'sidebar') {
      setPanelMode('popup')
      setPanelWidth(Math.min(720, window.innerWidth * 0.6))
    } else {
      setPanelMode('sidebar')
      setPanelWidth(DEFAULT_SIDEBAR_WIDTH)
    }
  }, [panelMode])

  // Handle element picker capture
  const handleElementCapture = useCallback((dataUrl: string, elementInfo: string) => {
    addScreenshot(dataUrl, elementInfo)
  }, [addScreenshot])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle pending question from chart click
  useEffect(() => {
    if (pendingQuestion && isPanelOpen) {
      setInputValue(pendingQuestion)
      setPendingQuestion(null)
      setTimeout(() => {
        textareaRef.current?.focus()
        adjustTextareaHeight()
      }, 100)
    }
  }, [pendingQuestion, isPanelOpen, setPendingQuestion])

  // Animate progress when asking
  useEffect(() => {
    if (isAsking) {
      const controls = animate(progress, 100, {
        duration: 8,
        ease: 'easeOut',
      })
      return () => controls.stop()
    } else {
      progress.set(0)
    }
  }, [isAsking, progress])

  // No welcome message - start with blank chat as requested

  const handleSend = async () => {
    if (!inputValue.trim() || isAsking) return

    // Include screenshots with message
    const currentScreenshots = screenshots.map(s => ({
      dataUrl: s.dataUrl,
      elementInfo: s.elementInfo
    }))

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      screenshots: currentScreenshots.length > 0 ? currentScreenshots : undefined,
    }

    setMessages(prev => [...prev, userMessage])
    const questionToAsk = inputValue.trim()
    setInputValue('')
    clearError()
    
    // Clear screenshots after sending
    if (currentScreenshots.length > 0) {
      clearScreenshots()
    }
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    const response = await askWithContext(questionToAsk)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, assistantMessage])
    
    if (chartContext) {
      setChartContext(null)
    }
  }

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt)
    setTimeout(() => {
      textareaRef.current?.focus()
      adjustTextareaHeight()
    }, 0)
  }

  const clearChartContext = () => {
    setChartContext(null)
    setInputValue('')
  }

  // Handle focus/blur for element picker
  const handleChatFocus = () => {
    setIsChatFocused(true)
  }

  const handleChatBlur = () => {
    // Delay to allow element picker button click
    setTimeout(() => {
      setIsChatFocused(false)
    }, 200)
  }

  // Get current width for layout
  const currentWidth = isPanelOpen ? panelWidth : 0

  return (
    <>
      {/* Element Picker Overlay - Only when panel open AND chat focused */}
      <ElementPickerOverlay
        isActive={isElementPickerActive && isPanelOpen && isChatFocused}
        onCapture={handleElementCapture}
        onCancel={() => setElementPickerActive(false)}
        panelWidth={currentWidth}
      />

      {/* Toggle Button - Sleek minimal design */}
      <AnimatePresence>
        {!isPanelOpen && (
          <motion.button
            initial={{ x: -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={togglePanel}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 px-3 py-4 bg-black border border-white/20 text-white rounded-r-lg hover:bg-white/5 hover:border-white/40 transition-all group"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            >
              <Cpu size={18} className="text-white/70 group-hover:text-white transition-colors" />
            </motion.div>
            <ChevronRight size={14} className="text-white/50 group-hover:text-white transition-colors" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            ref={panelRef}
            data-ai-panel
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className={`fixed left-0 top-0 bottom-0 bg-black/95 backdrop-blur-xl border-r border-white/10 z-40 flex flex-col ${
              panelMode === 'popup' ? 'shadow-2xl' : ''
            }`}
            style={{ width: panelWidth }}
          >
            {/* Resize handle on right edge */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/10 transition-colors z-50"
              onMouseDown={handleResizeStart}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-full" />
            </div>

            {/* Subtle grid pattern background */}
            <div 
              className="absolute inset-0 opacity-[0.02] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }}
            />

            {/* Header */}
            <motion.div 
              className="relative flex items-center justify-between px-5 py-4 border-b border-white/10"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ScanLine />
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/20 flex items-center justify-center"
                  whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.4)' }}
                >
                  <Terminal size={18} className="text-white/80" />
                </motion.div>
                <div>
                  <h2 className="text-sm font-mono font-medium text-white tracking-wide">AI ANALYST</h2>
                  <div className="flex items-center gap-1.5">
                    <motion.div
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">Claude Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Popup/Minimize toggle */}
                <motion.button
                  onClick={togglePopupMode}
                  className="p-2 rounded-lg border border-transparent hover:border-white/20 hover:bg-white/5 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title={panelMode === 'sidebar' ? 'Expand' : 'Minimize'}
                >
                  {panelMode === 'sidebar' ? (
                    <Maximize2 size={16} className="text-white/50" />
                  ) : (
                    <Minimize2 size={16} className="text-white/50" />
                  )}
                </motion.button>
                <motion.button
                  onClick={togglePanel}
                  className="p-2 rounded-lg border border-transparent hover:border-white/20 hover:bg-white/5 transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronLeft size={18} className="text-white/50" />
                </motion.button>
              </div>
            </motion.div>

            {/* Chart Context Indicator */}
            <AnimatePresence>
              {chartContext && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="px-5 py-3 bg-white/5 border-b border-white/10 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart2 size={14} className="text-white/60" />
                      <span className="text-xs font-mono text-white/60">
                        TARGET: <span className="text-white/90">{chartContext.chartTitle}</span>
                      </span>
                    </div>
                    <motion.button 
                      onClick={clearChartContext}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={12} className="text-white/40 hover:text-white" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Screenshot Attachments Indicator */}
            <AnimatePresence>
              {screenshots.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="px-5 py-3 bg-white/5 border-b border-white/10 overflow-hidden"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon size={14} className="text-white/60" />
                    <span className="text-xs font-mono text-white/60">
                      {screenshots.length} screenshot{screenshots.length > 1 ? 's' : ''} attached
                    </span>
                    <button
                      onClick={clearScreenshots}
                      className="ml-auto text-[10px] text-white/40 hover:text-white transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {screenshots.map(screenshot => (
                      <div key={screenshot.id} className="relative group flex-shrink-0">
                        <img
                          src={screenshot.dataUrl}
                          alt={screenshot.elementInfo}
                          className="h-12 w-auto rounded border border-white/20 object-cover"
                        />
              <button
                          onClick={() => removeScreenshot(screenshot.id)}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-black border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                          <X size={10} className="text-white/80" />
              </button>
            </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 py-3 bg-red-500/10 border-b border-red-500/20 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-red-400" />
                      <span className="text-xs font-mono text-red-300">{error}</span>
                    </div>
                    <motion.button 
                      onClick={clearError}
                      className="p-1 rounded hover:bg-red-500/20 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={12} className="text-red-400" />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                      variants={messageVariants}
                      initial="initial"
                      animate="animate"
                      layout
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                        className={`max-w-[90%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                            ? 'bg-violet-600/80 text-white rounded-br-sm'
                            : 'bg-slate-800/90 text-white/90 border border-slate-700/50 rounded-bl-sm'
                        }`}
                      >
                        {/* Show screenshots in message */}
                        {message.screenshots && message.screenshots.length > 0 && (
                          <div className="flex gap-2 mb-2 overflow-x-auto">
                            {message.screenshots.map((screenshot, idx) => (
                              <img
                                key={idx}
                                src={screenshot.dataUrl}
                                alt={screenshot.elementInfo}
                                className="h-16 w-auto rounded border border-white/20 object-cover"
                              />
                            ))}
                          </div>
                        )}
                        <div className={`whitespace-pre-wrap leading-relaxed ${
                          message.role === 'user' ? 'text-base font-medium text-white' : 'text-base font-mono text-white/90'
                        }`}>
                          {parseMarkdown(message.content)}
                    </div>
                        <div className="text-[10px] mt-2 font-mono text-white/40">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}
                </AnimatePresence>
              </div>

              {/* Thinking indicator */}
              <AnimatePresence>
                {isAsking && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Cpu size={14} className="text-white/60" />
                      </motion.div>
                      <span className="text-xs font-mono text-white/60">
                        Processing<TypingCursor />
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-px bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white/40"
                        style={{ width: progressWidth }}
                      />
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <motion.div 
              className="px-4 py-3 border-t border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {QUICK_PROMPTS.map((prompt, index) => (
                  <motion.button
                    key={prompt.id}
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800/80 text-white border border-slate-700/50 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0 hover:bg-slate-700/80 hover:border-slate-600/50 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, type: 'spring', stiffness: 300 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <prompt.icon size={14} className="text-violet-400" />
                    <span>{prompt.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Input */}
            <motion.div 
              className="p-4 border-t border-white/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-end gap-2">
                {/* Element picker button */}
                <motion.button
                  onClick={() => setElementPickerActive(!isElementPickerActive)}
                  className={`p-3 rounded-lg border transition-all flex-shrink-0 ${
                    isElementPickerActive
                      ? 'bg-violet-600 text-white border-violet-500'
                      : 'bg-slate-800/80 text-white/60 border-slate-700/50 hover:bg-slate-700/80 hover:border-slate-600/50'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Capture screen element"
                >
                  <Crosshair size={18} />
                </motion.button>

                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                  value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value)
                      adjustTextareaHeight()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    onFocus={handleChatFocus}
                    onBlur={handleChatBlur}
                    placeholder={
                      isElementPickerActive 
                        ? "Click an element to capture, then ask about it..." 
                        : chartContext 
                          ? "Query this data..." 
                          : "Ask anything..."
                    }
                    className="w-full px-4 py-3 bg-slate-800/80 text-white placeholder-white/40 text-base rounded-lg border border-slate-700/50 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none overflow-hidden min-h-[48px] max-h-[150px] transition-all"
                    disabled={isAsking}
                    rows={1}
                  />
                </div>
                <motion.button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isAsking}
                  className="p-3 bg-violet-600 text-white rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0 hover:bg-violet-500 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={18} />
                </motion.button>
              </div>
              
              {/* Element picker active indicator */}
              <AnimatePresence>
                {isElementPickerActive && isChatFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-2 flex items-center gap-2 text-xs font-mono text-white/60"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <Crosshair size={12} />
                    </motion.div>
                    <span>Element picker active — click any element on screen</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
