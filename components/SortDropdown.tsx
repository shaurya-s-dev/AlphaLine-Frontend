'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

const options = [
  { value: 'confidence_desc', label: 'Confidence ↓' },
  { value: 'confidence_asc', label: 'Confidence ↑' },
  { value: 'recent', label: 'Recent first' },
  { value: 'market', label: 'By market' },
]

export function SortDropdown({ 
  value, 
  onChange 
}: { 
  value: string
  onChange: (v: string) => void 
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value) || options[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ borderColor: '#374151' }}
        whileTap={{ scale: 0.97 }}
        style={{
          display: 'flex', alignItems: 'center',
          gap: 6, background: '#1C1F28',
          border: '1px solid #1E2230',
          borderRadius: 6, height: 32,
          padding: '0 10px',
          fontFamily: 'var(--font-inter)',
          fontSize: 12, color: '#6B7280',
          cursor: 'pointer',
          transition: 'border-color 150ms',
          whiteSpace: 'nowrap'
        }}
      >
        {selected.label}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={12} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 400,
              duration: 0.15
            }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              background: '#111318',
              border: '1px solid #1E2230',
              borderRadius: 8,
              overflow: 'hidden',
              zIndex: 50,
              minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {options.map((opt, i) => (
              <motion.button
                key={opt.value}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '9px 14px',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'var(--font-inter)',
                  fontSize: 13,
                  color: opt.value === value 
                    ? '#E2E8F0' : '#6B7280',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: i < options.length - 1 
                    ? '1px solid #1E2230' : 'none',
                }}
                whileHover={{ 
                  backgroundColor: '#1C1F28',
                  color: '#E2E8F0'
                }}
              >
                {opt.label}
                {opt.value === value && (
                  <Check size={12} color="#6366F1" />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
