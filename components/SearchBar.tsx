'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X } from 'lucide-react'

export function SearchBar({ 
  value, 
  onChange, 
  placeholder = "Search ticker..."
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isExpanded = focused || value.length > 0

  return (
    <motion.div
      animate={{ width: isExpanded ? 200 : 140 }}
      transition={{ 
        type: "spring", 
        damping: 20, 
        stiffness: 300 
      }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        background: '#1C1F28',
        border: `1px solid ${focused ? '#6366F1' : '#1E2230'}`,
        borderRadius: 6,
        height: 32,
        overflow: 'hidden',
        transition: 'border-color 150ms',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      <Search 
        size={12} 
        style={{ 
          position: 'absolute', left: 10,
          color: focused ? '#6366F1' : '#374151',
          flexShrink: 0,
          transition: 'color 150ms'
        }} 
      />
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          paddingLeft: 28,
          paddingRight: value ? 28 : 10,
          width: '100%',
          fontFamily: 'var(--font-inter)',
          fontSize: 12,
          color: '#E2E8F0',
        }}
      />
      <AnimatePresence>
        {value && (
          <motion.button
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
              inputRef.current?.focus()
            }}
            style={{
              position: 'absolute', right: 8,
              background: 'none', border: 'none',
              color: '#374151', cursor: 'pointer',
              display: 'flex', padding: 2,
            }}
          >
            <X size={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
