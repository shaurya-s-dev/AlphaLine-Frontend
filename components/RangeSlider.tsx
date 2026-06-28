'use client'
import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface RangeSliderProps {
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
  color?: string
  showValue?: boolean
  formatValue?: (v: number) => string
}

export function RangeSlider({
  min, max, step, value, onChange,
  color = '#6366F1',
  formatValue = (v) => String(v)
}: RangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const getValueFromPosition = useCallback((clientX: number) => {
    const track = trackRef.current
    if (!track) return value
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, 
      (clientX - rect.left) / rect.width
    ))
    const rawValue = min + ratio * (max - min)
    const stepped = Math.round(rawValue / step) * step
    return Math.max(min, Math.min(max, 
      parseFloat(stepped.toFixed(10))
    ))
  }, [min, max, step, value])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsDragging(true)
    onChange(getValueFromPosition(e.clientX))
  }, [getValueFromPosition, onChange])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    onChange(getValueFromPosition(e.clientX))
  }, [isDragging, getValueFromPosition, onChange])

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const percent = ((value - min) / (max - min)) * 100

  return (
    <div style={{ padding: '8px 0', userSelect: 'none' }}>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'relative',
          height: 4,
          borderRadius: 2,
          background: '#1C1F28',
          cursor: 'pointer',
        }}
      >
        {/* Filled track */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${percent}%`,
          borderRadius: 2,
          background: color,
          transition: isDragging ? 'none' : 'width 50ms',
        }} />

        {/* Thumb */}
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${percent}%`,
            transform: 'translate(-50%, -50%)',
            width: isDragging ? 18 : 14,
            height: isDragging ? 18 : 14,
            borderRadius: '50%',
            background: '#E2E8F0',
            border: `2px solid ${color}`,
            boxShadow: isDragging 
              ? `0 0 0 4px ${color}25` 
              : 'none',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: 'width 100ms, height 100ms, box-shadow 100ms',
          }}
          whileHover={{
            scale: 1.2,
            boxShadow: `0 0 0 4px ${color}25`,
          }}
        />
      </div>
    </div>
  )
}
