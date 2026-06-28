'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'

export function DisclaimerBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(
      'alphaline_disclaimer_seen'
    )
    if (!seen) setVisible(true)
  }, [])

  const dismiss = () => {
    localStorage.setItem(
      'alphaline_disclaimer_seen', 
      '1'
    )
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 300 
          }}
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(560px, calc(100vw - 40px))',
            background: '#111318',
            border: '1px solid #F59E0B33',
            borderRadius: 8,
            padding: '12px 16px',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <AlertTriangle 
            size={16} 
            style={{ 
              color: '#F59E0B', 
              flexShrink: 0,
              marginTop: 1 
            }} 
          />
          <div style={{ flex: 1 }}>
            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 12,
              color: '#E2E8F0',
              marginBottom: 2,
              fontWeight: 500,
            }}>
              Not financial advice
            </p>
            <p style={{
              fontFamily: 'var(--font-inter)',
              fontSize: 11,
              color: '#6B7280',
              lineHeight: 1.5,
            }}>
              Alphaline provides AI-generated signals 
              for educational and research purposes only.
              This is not SEBI-registered investment advice.
              Always consult a qualified financial advisor
              before making any investment decisions.
            </p>
          </div>
          <button
            onClick={dismiss}
            style={{
              background: 'none',
              border: 'none',
              color: '#374151',
              cursor: 'pointer',
              padding: 2,
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
