import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AtSign, User, Loader2 } from 'lucide-react'
import { useSlackUsers, SlackUser } from '../../hooks/useSlackUsers'

export interface MentionedUser {
  slack_id: string
  display_name: string
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onMentionsChange: (mentions: MentionedUser[]) => void
  placeholder?: string
  rows?: number
  className?: string
  disabled?: boolean
}

export default function MentionInput({
  value,
  onChange,
  onMentionsChange,
  placeholder = 'Type @ to mention someone...',
  rows = 3,
  className = '',
  disabled = false,
}: MentionInputProps) {
  const { users, loading: usersLoading } = useSlackUsers()
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionFilter, setSuggestionFilter] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Filter users based on what's typed after @
  const filteredUsers = users.filter(user => {
    const filter = suggestionFilter.toLowerCase()
    return (
      user.display_name.toLowerCase().includes(filter) ||
      user.real_name.toLowerCase().includes(filter) ||
      user.name.toLowerCase().includes(filter)
    )
  }).slice(0, 8) // Limit to 8 suggestions

  // Extract mentioned users from text
  const extractMentions = useCallback((text: string): MentionedUser[] => {
    // Match @mention pattern:
    // - @ followed by word characters, spaces, hyphens, apostrophes
    // - Can match 1-4 words (names typically 1-3 words)
    // - Stops at punctuation, multiple spaces, or end of string
    // More flexible: matches @word or @word word word (up to 4 words total)
    const mentionPattern = /@([a-zA-Z][a-zA-Z0-9'\-]*(?:\s+[a-zA-Z][a-zA-Z0-9'\-]*){0,3})(?=\s{2,}|\s+[a-z]|[\s\n.,!?;:]|$)/g
    const mentions: MentionedUser[] = []
    const seenIds = new Set<string>()
    let match

    while ((match = mentionPattern.exec(text)) !== null) {
      const mentionName = match[1].trim()
      if (!mentionName) continue
      
      const mentionNameLower = mentionName.toLowerCase()
      
      // Try to find user by exact match first (case-insensitive)
      let user = users.find(u => {
        const displayName = (u.display_name || '').trim().toLowerCase()
        const realName = (u.real_name || '').trim().toLowerCase()
        const name = (u.name || '').trim().toLowerCase()
        
        return displayName === mentionNameLower || 
               realName === mentionNameLower || 
               name === mentionNameLower
      })
      
      // If no exact match, try matching the first word (for cases like "@Mo" matching "Mo Khateeb")
      if (!user && mentionNameLower.split(/\s+/).length === 1) {
        user = users.find(u => {
          const displayName = (u.display_name || '').trim().toLowerCase()
          const realName = (u.real_name || '').trim().toLowerCase()
          const userName = (u.name || '').trim().toLowerCase()
          
          // Check if the first word matches
          const firstName = displayName.split(/\s+/)[0] || displayName
          const realFirstName = realName.split(/\s+/)[0] || realName
          const userFirstName = userName.split(/\s+/)[0] || userName
          return firstName === mentionNameLower || realFirstName === mentionNameLower || userFirstName === mentionNameLower
        })
      }
      
      if (user && !seenIds.has(user.id)) {
        seenIds.add(user.id)
        mentions.push({
          slack_id: user.id,
          display_name: user.display_name || user.real_name || user.name,
        })
        console.log('Extracted mention:', { 
          mentionName, 
          slack_id: user.id, 
          display_name: user.display_name,
          real_name: user.real_name,
          name: user.name
        })
      } else if (mentionName && !user) {
        console.warn('Could not find Slack user for mention:', mentionName, 
          'Available users:', users.map(u => ({
            id: u.id,
            display_name: u.display_name,
            real_name: u.real_name,
            name: u.name
          })))
      }
    }

    return mentions
  }, [users])

  // Handle text change
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const newCursorPosition = e.target.selectionStart || 0
    
    onChange(newValue)
    setCursorPosition(newCursorPosition)

    // Check if we're typing a mention
    const textBeforeCursor = newValue.substring(0, newCursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      // Check if there's a space or newline between @ and cursor (means mention is complete)
      const hasSpaceAfterAt = /[\s\n]/.test(textAfterAt.slice(-1))
      
      if (!hasSpaceAfterAt && !/[\s\n]/.test(textAfterAt)) {
        // We're in the middle of typing a mention
        setMentionStartIndex(lastAtIndex)
        setSuggestionFilter(textAfterAt)
        setShowSuggestions(true)
        setSelectedIndex(0)
      } else {
        setShowSuggestions(false)
        setMentionStartIndex(null)
      }
    } else {
      setShowSuggestions(false)
      setMentionStartIndex(null)
    }

    // Update mentions
    const mentions = extractMentions(newValue)
    onMentionsChange(mentions)
  }

  // Insert mention at current position
  const insertMention = (user: SlackUser) => {
    if (mentionStartIndex === null || !textareaRef.current) return

    const beforeMention = value.substring(0, mentionStartIndex)
    const afterMention = value.substring(cursorPosition)
    const mentionText = `@${user.display_name || user.real_name || user.name} `
    
    const newValue = beforeMention + mentionText + afterMention
    onChange(newValue)

    // Update mentions
    const mentions = extractMentions(newValue)
    onMentionsChange(mentions)

    // Close suggestions and reset
    setShowSuggestions(false)
    setMentionStartIndex(null)
    setSuggestionFilter('')

    // Focus textarea and set cursor position
    const newCursorPosition = mentionStartIndex + mentionText.length
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }, 0)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || filteredUsers.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredUsers.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredUsers.length) % filteredUsers.length)
        break
      case 'Enter':
        if (showSuggestions && filteredUsers[selectedIndex]) {
          e.preventDefault()
          insertMention(filteredUsers[selectedIndex])
        }
        break
      case 'Tab':
        if (showSuggestions && filteredUsers[selectedIndex]) {
          e.preventDefault()
          insertMention(filteredUsers[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowSuggestions(false)
        break
    }
  }

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (showSuggestions && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, showSuggestions])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-violet-500 resize-none ${className}`}
      />

      {/* Hint for @ mention */}
      {users.length > 0 && !showSuggestions && value.length === 0 && (
        <div className="absolute right-3 top-2 flex items-center gap-1 text-white/30 text-xs pointer-events-none">
          <AtSign size={12} />
          <span>mention</span>
        </div>
      )}

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
          >
            {usersLoading ? (
              <div className="flex items-center justify-center py-4 text-white/60">
                <Loader2 size={16} className="animate-spin mr-2" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-3 py-2 text-white/60 text-sm">
                No users found matching "{suggestionFilter}"
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto">
                {filteredUsers.map((user, index) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-violet-600/30 text-white'
                        : 'text-white/80 hover:bg-slate-700/50'
                    }`}
                    onClick={() => insertMention(user)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-white/60" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">
                        {user.display_name || user.real_name}
                      </div>
                      {user.name && user.name !== user.display_name && (
                        <div className="text-xs text-white/50 truncate">
                          @{user.name}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
