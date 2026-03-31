'use client'

import { useRef, useState, useCallback } from 'react'
import { Pencil } from 'lucide-react'

const PENCIL_W = 28

export default function DragToEditField({
  label,
  value: initialValue = '',
  multiline = false,
  type = 'text',
  onSave,
}) {
  const [mode, setMode] = useState('idle')
  const [value, setValue] = useState(initialValue)
  const [committed, setCommitted] = useState(initialValue)
  const [pencilOffset, setPencilOffset] = useState(0)
  const [isSnapping, setIsSnapping] = useState(false)

  // ── Refs for values that must be read synchronously in pointer handlers ──
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const isDraggingRef = useRef(false)   // avoids stale-closure bug
  const pointerStartX = useRef(null)
  const modeAtDragStart = useRef(null)

  // Keep a render-triggering copy of isDragging only for visual effects
  const [isDraggingVisual, setIsDraggingVisual] = useState(false)

  const getFieldWidth = () => containerRef.current?.offsetWidth ?? 300

  // ── Enter edit mode ──────────────────────────────────────────────────────
  const enterEdit = useCallback(() => {
    setIsSnapping(true)
    setMode('editing')
    isDraggingRef.current = false
    setIsDraggingVisual(false)
    setPencilOffset(0)
    pointerStartX.current = null
    setTimeout(() => {
      inputRef.current?.focus()
      setIsSnapping(false)
    }, 350)
  }, [])

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = useCallback((val) => {
    const v = val !== undefined ? val : value
    setCommitted(v)
    setValue(v)
    setMode('idle')
    isDraggingRef.current = false
    setIsDraggingVisual(false)
    setPencilOffset(0)
    setIsSnapping(false)
    pointerStartX.current = null
    onSave?.(v)
  }, [value, onSave])

  // ── Cancel ───────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    setValue(committed)
    setMode('idle')
    isDraggingRef.current = false
    setIsDraggingVisual(false)
    setPencilOffset(0)
    setIsSnapping(false)
    pointerStartX.current = null
  }, [committed])

  // ── Spring back (threshold not met) ──────────────────────────────────────
  const springBack = useCallback(() => {
    isDraggingRef.current = false
    setIsDraggingVisual(false)
    setPencilOffset(0)
    pointerStartX.current = null
  }, [])

  // ── Pointer handlers ─────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    pointerStartX.current = e.clientX
    modeAtDragStart.current = mode          // capture mode synchronously
    isDraggingRef.current = true            // set ref synchronously
    setIsDraggingVisual(true)              // trigger re-render for visuals
    setPencilOffset(0)
  }, [mode])

  const handlePointerMove = useCallback((e) => {
    // Read from ref — guaranteed current even before React re-renders
    if (!isDraggingRef.current || pointerStartX.current === null) return
    const dx = e.clientX - pointerStartX.current
    const maxTravel = getFieldWidth() - PENCIL_W - 8
    if (modeAtDragStart.current === 'idle') {
      setPencilOffset(Math.max(0, Math.min(dx, maxTravel)))
    } else {
      setPencilOffset(Math.min(0, Math.max(dx, -maxTravel)))
    }
  }, []) // no isDragging dependency — uses ref

  const handlePointerUp = useCallback((e) => {
    if (!isDraggingRef.current || pointerStartX.current === null) return
    const dx = e.clientX - pointerStartX.current
    const fieldW = getFieldWidth()
    if (modeAtDragStart.current === 'idle') {
      dx / fieldW >= 0.8 ? enterEdit() : springBack()
    } else {
      -dx / fieldW >= 0.8 ? save() : springBack()
    }
  }, [enterEdit, save, springBack]) // no isDragging dependency — uses ref

  const handlePointerCancel = useCallback(() => springBack(), [springBack])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); save() }
  }, [cancel, save, multiline])

  // ── Derived visuals ──────────────────────────────────────────────────────
  const fieldW = typeof window !== 'undefined' ? getFieldWidth() : 300
  const maxTravel = fieldW - PENCIL_W - 8
  const progress = isDraggingVisual
    ? modeAtDragStart.current === 'idle'
      ? Math.max(0, Math.min(1, pencilOffset / maxTravel))
      : Math.max(0, Math.min(1, -pencilOffset / maxTravel))
    : 0
  const atThreshold = progress >= 0.8

  const fillStyle = isDraggingVisual ? {
    position: 'absolute',
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
    ...(modeAtDragStart.current === 'idle'
      ? { left: 0, width: `${pencilOffset + PENCIL_W / 2}px` }
      : { right: 0, width: `${-pencilOffset + PENCIL_W / 2}px` }
    ),
    background: atThreshold
      ? 'linear-gradient(90deg, rgba(146,96,10,0.14) 0%, rgba(146,96,10,0.05) 100%)'
      : 'linear-gradient(90deg, rgba(146,96,10,0.07) 0%, rgba(146,96,10,0.02) 100%)',
    transition: 'background 0.12s ease',
  } : null

  const pencilStyle = {
    position: 'absolute',
    top: multiline ? '12px' : '50%',
    ...(mode === 'idle' ? { left: '4px' } : { right: '4px' }),
    transform: mode === 'idle'
      ? `translateY(${multiline ? 0 : -50}%) translateX(${pencilOffset}px)`
      : `translateY(${multiline ? 0 : -50}%) translateX(${pencilOffset}px)`,
    width: `${PENCIL_W}px`,
    height: `${PENCIL_W}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isDraggingVisual ? 'grabbing' : 'grab',
    border: 'none',
    borderRadius: '6px',
    background: atThreshold
      ? 'rgba(146,96,10,0.18)'
      : isDraggingVisual
        ? 'rgba(146,96,10,0.10)'
        : mode === 'editing'
          ? 'rgba(146,96,10,0.07)'
          : 'transparent',
    color: isDraggingVisual || mode === 'editing' ? 'var(--accent)' : 'var(--text-muted)',
    transition: isDraggingVisual
      ? 'background 0.12s, color 0.12s'
      : 'background 0.25s, color 0.25s, transform 0.22s cubic-bezier(0.34,1.56,0.64,1)',
    zIndex: 10,
    touchAction: 'none',
    userSelect: 'none',
    flexShrink: 0,
    padding: 0,
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
          borderBottom: `1px solid ${mode === 'editing' ? 'rgba(146,96,10,0.3)' : 'var(--border)'}`,
          background: mode === 'editing' ? 'rgba(146,96,10,0.03)' : 'transparent',
          borderRadius: '4px 4px 0 0',
          overflow: 'hidden',
          transition: isSnapping ? 'none' : 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        {fillStyle && <div style={fillStyle} />}

        {/* Text / input */}
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
              opacity: isDraggingVisual ? 0.5 : 1,
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
            strokeWidth={mode === 'editing' || isDraggingVisual ? 2.5 : 1.75}
            style={{ transition: 'stroke-width 0.2s' }}
          />
        </button>
      </div>
    </div>
  )
}
