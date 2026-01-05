import { useState, useRef, useEffect } from 'react'
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
  Cpu
} from 'lucide-react'
import { useAI } from '../../contexts/AIContext'
import { useFilters } from '../../contexts/FilterContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
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
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'steps(2)' }}
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
    parts.push(<strong key={keyIndex++} className="text-white font-semibold">{match[1]}</strong>)
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
    currentScreen
  } = useAI()
  
  const { selectedClient, datePreset } = useFilters()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
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

  // Add welcome message on first open
  useEffect(() => {
    if (isPanelOpen && messages.length === 0) {
      const clientDisplay = selectedClient || 'all clients'
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `SYSTEM INITIALIZED

Current context loaded:
• **Client:** ${clientDisplay}
• **Date Range:** ${datePreset}
• **Screen:** ${currentScreen}

Ready to analyze your campaign data. Ask me anything or click a chart for specific insights.`,
        timestamp: new Date(),
      }])
    }
  }, [isPanelOpen, selectedClient, datePreset, currentScreen, messages.length])

  const handleSend = async () => {
    if (!inputValue.trim() || isAsking) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const questionToAsk = inputValue.trim()
    setInputValue('')
    clearError()
    
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

  return (
    <>
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
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed left-0 top-0 bottom-0 w-[380px] bg-black/95 backdrop-blur-xl border-r border-white/10 z-40 flex flex-col"
          >
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
              <motion.button
                onClick={togglePanel}
                className="p-2 rounded-lg border border-transparent hover:border-white/20 hover:bg-white/5 transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft size={18} className="text-white/50" />
              </motion.button>
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
                            ? 'bg-white text-black rounded-br-sm'
                            : 'bg-white/5 border border-white/10 text-white/90 rounded-bl-sm'
                        }`}
                      >
                        <div className={`text-sm whitespace-pre-wrap leading-relaxed ${
                          message.role === 'user' ? 'font-medium' : 'font-mono text-[13px]'
                        }`}>
                          {parseMarkdown(message.content)}
                        </div>
                        <div className={`text-[10px] mt-2 font-mono ${
                          message.role === 'user' ? 'text-black/40' : 'text-white/30'
                        }`}>
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
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {QUICK_PROMPTS.map((prompt, index) => (
                  <motion.button
                    key={prompt.id}
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 rounded text-[11px] font-mono text-white/70 hover:text-white whitespace-nowrap transition-all"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <prompt.icon size={11} />
                    {prompt.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Input */}
            <motion.div 
              className="p-4 border-t border-white/10 bg-black/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
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
                    placeholder={chartContext ? "Query this data..." : "Enter query..."}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 text-sm font-mono focus:outline-none focus:border-white/30 resize-none overflow-hidden min-h-[44px] max-h-[150px] transition-colors"
                    disabled={isAsking}
                    rows={1}
                  />
                </div>
                <motion.button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isAsking}
                  className="p-3 bg-white text-black rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.9)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={16} />
                </motion.button>
              </div>
              <div className="text-[9px] font-mono text-white/20 mt-2 text-center uppercase tracking-wider">
                Enter to send • Shift+Enter for new line
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
