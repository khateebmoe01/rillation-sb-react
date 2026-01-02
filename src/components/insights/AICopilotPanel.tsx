import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Sparkles, 
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Target,
  TrendingUp,
  Users,
  Lightbulb
} from 'lucide-react'
import type { FirmographicInsightsData } from '../../hooks/useFirmographicInsights'

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

interface AICopilotPanelProps {
  isOpen: boolean
  onToggle: () => void
  firmographicData?: FirmographicInsightsData | null
  clientName?: string
  // Pre-built question handlers
  onAskQuestion?: (question: string) => Promise<string>
}

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'best-industry',
    label: 'Best industry to target?',
    icon: Target,
    prompt: 'Based on the current campaign data, what is the best industry to target and why?',
  },
  {
    id: 'top-performer',
    label: 'Top performer profile',
    icon: Users,
    prompt: 'Who has booked the most meetings? Give me the profile of the top performing leads.',
  },
  {
    id: 'double-down',
    label: 'Which campaigns to double down on?',
    icon: TrendingUp,
    prompt: 'Which campaigns are performing best and should we double down on?',
  },
  {
    id: 'top-graphs',
    label: 'Top 4 graphs to analyze',
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

// Generate AI response based on firmographic data
function generateAIResponse(question: string, data?: FirmographicInsightsData | null): string {
  if (!data) {
    return "I don't have access to campaign data right now. Please ensure the dashboard has loaded with your firmographic insights to get personalized recommendations."
  }

  const questionLower = question.toLowerCase()

  // Best industry analysis
  if (questionLower.includes('industry') || questionLower.includes('best')) {
    const industryItems = data.industry?.items || []
    if (industryItems.length === 0) {
      return "I don't have enough industry data to make a recommendation. Try running more campaigns to gather data."
    }
    
    const topIndustry = industryItems.reduce((best, current) => {
      const currentRate = current.leadsIn > 0 ? current.booked / current.leadsIn : 0
      const bestRate = best.leadsIn > 0 ? best.booked / best.leadsIn : 0
      return currentRate > bestRate ? current : best
    }, industryItems[0])

    const bookingRate = topIndustry.leadsIn > 0 
      ? ((topIndustry.booked / topIndustry.leadsIn) * 100).toFixed(1) 
      : '0'

    return `**Best Industry: ${topIndustry.value}**

Based on your campaign data, **${topIndustry.value}** shows the highest booking rate at **${bookingRate}%**.

Key metrics:
- Leads: ${topIndustry.leadsIn}
- Positive: ${topIndustry.positive}
- Meetings Booked: ${topIndustry.booked}

**Recommendation:** Consider allocating more budget and leads to this industry. The high conversion rate suggests strong message-market fit.`
  }

  // Top performer profile
  if (questionLower.includes('profile') || questionLower.includes('top performer') || questionLower.includes('most meetings')) {
    const jobTitleItems = data.jobTitle?.items || []
    const revenueItems = data.revenue?.items || []
    const employeeItems = data.employees?.items || []

    if (jobTitleItems.length === 0) {
      return "I need more lead data to build a profile. Ensure job title information is being captured in your campaigns."
    }

    const topJobTitle = jobTitleItems.reduce((best, current) => 
      current.booked > best.booked ? current : best, 
      jobTitleItems[0]
    )

    const topRevenue = revenueItems.length > 0 
      ? revenueItems.reduce((best, current) => current.booked > best.booked ? current : best, revenueItems[0])
      : null

    const topEmployees = employeeItems.length > 0
      ? employeeItems.reduce((best, current) => current.booked > best.booked ? current : best, employeeItems[0])
      : null

    return `**Top Performer Profile**

The leads most likely to book meetings have this profile:

📋 **Job Title:** ${topJobTitle.value} (${topJobTitle.booked} meetings)
${topRevenue ? `💰 **Company Revenue:** ${topRevenue.value} (${topRevenue.booked} meetings)` : ''}
${topEmployees ? `👥 **Company Size:** ${topEmployees.value} employees (${topEmployees.booked} meetings)` : ''}

**Insight:** Focus your targeting on this profile for best results. Consider creating specific messaging that speaks to the pain points of ${topJobTitle.value}s.`
  }

  // Recommendations
  if (questionLower.includes('recommend') || questionLower.includes('improve')) {
    const industryItems = data.industry?.items || []
    const signalItems = data.signals?.items || []

    // Find worst performers to cut
    const worstIndustry = industryItems.length > 1
      ? industryItems.reduce((worst, current) => {
          const currentRate = current.leadsIn > 0 ? current.booked / current.leadsIn : 0
          const worstRate = worst.leadsIn > 0 ? worst.booked / worst.leadsIn : 0
          return currentRate < worstRate ? current : worst
        }, industryItems[0])
      : null

    // Find best signal
    const bestSignal = signalItems.length > 0
      ? signalItems.reduce((best, current) => current.booked > best.booked ? current : best, signalItems[0])
      : null

    return `**Recommendations for Improvement**

Based on your data analysis:

✅ **Double Down:**
${industryItems.slice(0, 2).map(i => `- ${i.value}: ${i.booked} meetings from ${i.leadsIn} leads`).join('\n')}

${worstIndustry ? `❌ **Consider Reducing:**
- ${worstIndustry.value}: Low conversion rate with ${worstIndustry.booked} meetings from ${worstIndustry.leadsIn} leads` : ''}

${bestSignal ? `🎯 **Best Signal to Target:**
- ${bestSignal.value} is driving the most meetings (${bestSignal.booked})` : ''}

**Action Items:**
1. Reallocate budget from low performers to high performers
2. Create specific messaging for top converting industries
3. Increase volume on your best-performing signals`
  }

  // Default response
  return `I'd be happy to help analyze your campaign data. Here's what I can see:

**Available Data Dimensions:**
- Industry: ${data.industry?.items.length || 0} categories
- Revenue: ${data.revenue?.items.length || 0} ranges  
- Employees: ${data.employees?.items.length || 0} size bands
- Job Titles: ${data.jobTitle?.items.length || 0} roles
- Technologies: ${data.technologies?.items.length || 0} tech stacks
- Signals: ${data.signals?.items.length || 0} signals

Ask me specific questions like:
- "What's the best industry to target?"
- "Give me the profile of top performers"
- "What are your recommendations?"
- "Which campaigns should we double down on?"`
}

export default function AICopilotPanel({ 
  isOpen, 
  onToggle, 
  firmographicData,
  clientName 
}: AICopilotPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hey! 👋 I'm your AI co-pilot for ${clientName || 'campaign analysis'}. 

I can help you understand your campaign performance and make data-driven decisions.

**Try asking me:**
- What industry should we focus on?
- Who's our ideal customer profile?
- What's working and what's not?

Or click one of the quick prompts below!`,
        timestamp: new Date(),
      }])
    }
  }, [isOpen, clientName])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate AI thinking delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))

    const response = generateAIResponse(userMessage.content, firmographicData)

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, assistantMessage])
    setIsTyping(false)
  }

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Toggle Button - visible when panel is closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            onClick={onToggle}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center gap-2 px-3 py-4 bg-gradient-to-r from-violet-600 to-violet-500 text-white rounded-r-xl shadow-xl hover:from-violet-500 hover:to-violet-400 transition-all"
          >
            <Sparkles size={18} />
            <ChevronRight size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[360px] bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 z-40 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700/50 bg-gradient-to-r from-violet-900/30 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">AI Co-Pilot</h2>
                  <span className="text-xs text-violet-400">Powered by Claude</span>
                </div>
              </div>
              <button
                onClick={onToggle}
                className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-violet-600 text-white rounded-br-md'
                        : 'bg-slate-800 text-slate-100 rounded-bl-md'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content.split('**').map((part, i) => 
                        i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                      )}
                    </div>
                    <div className="text-[10px] mt-1 opacity-50">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-slate-400"
                >
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-violet-400 rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                  <span className="text-xs">AI is thinking...</span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-3 py-2 border-t border-slate-700/30">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {QUICK_PROMPTS.map((prompt) => (
                  <motion.button
                    key={prompt.id}
                    onClick={() => handleQuickPrompt(prompt.prompt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/70 hover:bg-slate-700/70 rounded-full text-xs text-slate-300 whitespace-nowrap transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <prompt.icon size={12} />
                    {prompt.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700/50 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-3 bg-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <motion.button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping}
                  className="p-3 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send size={18} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

