'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Pencil } from 'lucide-react'

const PENCIL_W = 28 // px width of the pencil button

export default function DragToEditField({
  label,
  value: initialValue = '',
  multiline = false,
  type = 'text',
  onSave,
}) {
  const [mode, setMode] = useState('idle') // 'idle' | 'editing'
  const [value, setValue] = useState(initialValue)
  const [committed, setCommitted] = useState(initialValue)
  const [isDragging, setIsDragging] = useState(false)
  const [pencilOffset, setPencilOffset] = useState(0) // px from resting position
  const [isSnapping, setIsSnapping] = useState(false)

  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const pointerStartX = useRef(null)
  const modeAtDragStart = useRef(null)
  const animFrameRef = useRef(null)

  const getFieldWidth = () => containerRef.current?.offsetWidth ?? 300

  // ── Enter edit mode ────────────────────────────────────────────────────────
  const enterEdit = useCallback(() => {
    setIsSnapping(true)
    setMode('editing')
    setIsDragging(false)
    setPencilOffset(0)
    pointerStartX.current = null
    setTimeout(() => {
      inputRef.current?.focus()
      setIsSnapping(false)
    }, 350)
  }, [])

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = useCallback((val) => {
    const v = val !== undefined ? val : value
    setCommitted(v)
    setValue(v)
    setMode('idle')
    setIsDragging(false)
    setPencilOffset(0)
    setIsSnapping(false)
    pointerStartX.current = null
    onSave?.(v)
  }, [value, onSave])

  // ── Cancel ─────────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    setValue(committed)
    setMode('idle')
    setIsDragging(false)
    setPencilOffset(0)
    setIsSnapping(false)
    pointerStartX.current = null
  }, [committed])

  // ── Spring back (threshold not met) ───────────────────────────────────────
  const springBack = useCallback(() => {
    setIsDragging(false)
    setPencilOffset(0)
    pointerStartX.current = null
  }, [])

  // ── Pointer handlers ───────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerStartX.current = e.clientX
    modeAtDragStart.current = mode
    setIsDragging(true)
    setPencilOffset(0)
  }, [mode])

  const handlePointerMove = useCallback((e) => {
    if (!isDragging || pointerStartX.current === null) return
    const dx = e.clientX - pointerStartX.current
    const fieldW = getFieldWidth()
    const maxTravel = fieldW - PENCIL_W - 8

    if (modeAtDragStart.current === 'idle') {
      // Constrain right-drag only (dx > 0)
      const clamped = Math.max(0, Math.min(dx, maxTravel))
      setPencilOffset(clamped)
    } else {
      // Constrain left-drag only (dx < 0)
      const clamped = Math.min(0, Math.max(dx, -maxTravel))
      setPencilOffset(clamped)
    }
  }, [isDragging])

  const handlePointerUp = useCallback((e) => {
    if (!isDragging || pointerStartX.current === null) return
    const dx = e.clientX - pointerStartX.current
    const fieldW = getFieldWidth()

    if (modeAtDragStart.current === 'idle') {
      if (dx / fieldW >= 0.8) {
        enterEdit()
      } else {
        springBack()
      }
    } else {
      if (-dx / fieldW >= 0.8) {
        save()
      } else {
        springBack()
      }
    }
  }, [isDragging, enterEdit, save, springBack])

  const handlePointerCancel = useCallback(() => springBack(), [springBack])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); save() }
  }, [cancel, save, multiline])

  // ── Derived visual state ───────────────────────────────────────────────────
  const fieldW = typeof window !== 'undefined' ? getFieldWidth() : 300
  const maxTravel = fieldW - PENCIL_W - 8
  const rawProgress = isDragging
    ? modeAtDragStart.current === 'idle'
      ? Math.max(0, Math.min(1, pencilOffset / maxTravel))
      : Math.max(0, Math.min(1, -pencilOffset / maxTravel))
    : 0
  const atThreshold = rawProgress >= 0.8

  // Fill div dimensions
  const fillStyle = isDragging ? {
    position: 'absolute',
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
    ...(modeAtDragStart.current === 'idle'
      ? { left: 0, width: `${pencilOffset + PENCIL_W / 2}px` }
      : { right: 0, width: `${-pencilOffset + PENCIL_W / 2}px` }
    ),
    background: atThreshold
      ? 'linear-gradient(90deg, rgba(200,160,32,0.22) 0%, rgba(200,160,32,0.08) 100%)'
      : 'linear-gradient(90deg, rgba(200,160,32,0.10) 0%, rgba(200,160,32,0.03) 100%)',
    transition: 'background 0.12s ease',
  } : null

  // Pencil button absolute positioning
  const pencilStyle = {
    position: 'absolute',
    top: multiline ? '12px' : '50%',
    transform: mode === 'idle'
      ? `translateY(${multiline ? 0 : -50}%) translateX(${pencilOffset}px)`
      : `translateY(${multiline ? 0 : -50}%) translateX(${pencilOffset}px)`,
    ...(mode === 'idle' ? { left: '4px' } : { right: '4px' }),
    width: `${PENCIL_W}px`,
    height: `${PENCIL_W}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isDragging ? 'grabbing' : 'grab',
    border: 'none',
    borderRadius: '6px',
    background: atThreshold
      ? 'rgba(200,160,32,0.18)'
      : isDragging
        ? 'rgba(200,160,32,0.09)'
        : mode === 'editing'
          ? 'rgba(200,160,32,0.07)'
          : 'transparent',
    color: isDragging || mode === 'editing'
      ? 'var(--accent)'
      : 'var(--text-muted)',
    transition: isDragging
      ? 'background 0.12s, color 0.12s'
      : 'background 0.25s, color 0.25s, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
    zIndex: 10,
    touchAction: 'none',
    userSelect: 'none',
    flexShrink: 0,
  }

  return (
    <div>
      {/* Label */}
      <div style={{
        fontSize: '10px',
        fontFamily: 'var(--font-geist-mono, monospace)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        marginBottom: '5px',
        paddingLeft: mode === 'idle' ? `${PENCIL_W + 8}px` : '4px',
        transition: 'padding-left 0.25s cubic-bezier(0.4,0,0.2,1)',
        userSelect: 'none',
      }}>
        {label}
      </div>

      {/* Field container */}
      <div
        ref={containerRef}
        className={isSnapping ? 'field-snap' : ''}
        style={{
          position: 'relative',
          minHeight: multiline ? '72px' : '38px',
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          borderBottom: `1px solid ${mode === 'editing' ? 'rgba(200,160,32,0.35)' : 'var(--border)'}`,
          background: mode === 'editing' ? 'rgba(200,160,32,0.025)' : 'transparent',
          borderRadius: '4px 4px 0 0',
          overflow: 'hidden',
          transition: isSnapping ? 'none' : 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {/* Sweep fill */}
        {fillStyle && <div style={fillStyle} />}

        {/* Text / input content */}
        <div style={{
          flex: 1,
          paddingLeft: mode === 'idle' ? `${PENCIL_W + 10}px` : '6px',
          paddingRight: mode === 'editing' ? `${PENCIL_W + 10}px` : '6px',
          paddingTop: multiline ? '8px' : '0',
          paddingBottom: multiline ? '8px' : '0',
          minHeight: 'inherit',
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          transition: 'padding 0.22s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {mode === 'idle' ? (
            <span style={{
              fontSize: '15px',
              color: value ? 'var(--text-primary)' : 'var(--text-muted)',
              lineHeight: '1.5',
              userSelect: 'none',
              opacity: isDragging ? 0.6 : 1,
              transition: 'opacity 0.15s',
              whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {value || '—'}
            </span>
          ) : multiline ? (
            <textarea
              ref={inputRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onBlur={() => save()}
              onKeyDown={handleKeyDown}
              rows={3}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                color: 'var(--text-primary)',
                fontSize: '15px',
                lineHeight: '1.6',
                fontFamily: 'inherit',
                padding: 0,
              }}
            />
          ) : (
            <input
              ref={inputRef}
              type={type}
              value={value}
              onChange={e => setValue(e.target.value)}
              onBlur={() => save()}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontFamily: 'inherit',
                padding: 0,
              }}
            />
          )}
        </div>

        {/* Pencil drag handle */}
        <button
          aria-label={mode === 'idle' ? `Edit ${label}` : `Save ${label}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={pencilStyle}
        >
          <Pencil
            size={13}
            strokeWidth={mode === 'editing' || isDragging ? 2.5 : 1.75}
            style={{ transition: 'stroke-width 0.2s' }}
          />
        </button>
      </div>
    </div>
  )
}
