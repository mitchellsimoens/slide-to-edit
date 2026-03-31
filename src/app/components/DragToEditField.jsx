'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
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
  const [pencilOffset, setPencilOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)

  const containerRef = useRef(null)
  const pencilRef = useRef(null)
  const inputRef = useRef(null)

  // Refs for values that must be read inside stable event-handler closures.
  // React state is async; refs are synchronous — critical for drag logic.
  const modeRef      = useRef('idle')
  const valueRef     = useRef(initialValue)
  const committedRef = useRef(initialValue)
  const onSaveRef    = useRef(onSave)

  // Keep refs in sync with latest props/state
  useEffect(() => { modeRef.current  = mode   }, [mode])
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  // ── All callbacks are intentionally stable (empty or ref-only deps) ───────

  const enterEdit = useCallback(() => {
    setIsSnapping(true)
    setMode('editing')
    modeRef.current = 'editing'
    setIsDragging(false)
    setPencilOffset(0)
    setTimeout(() => {
      inputRef.current?.focus()
      setIsSnapping(false)
    }, 350)
  }, [])

  const save = useCallback(() => {
    const v = valueRef.current
    committedRef.current = v
    setValue(v)
    setMode('idle')
    modeRef.current = 'idle'
    setIsDragging(false)
    setPencilOffset(0)
    setIsSnapping(false)
    onSaveRef.current?.(v)
  }, []) // onSave accessed via ref — no dep needed

  const cancel = useCallback(() => {
    const v = committedRef.current
    setValue(v)
    valueRef.current = v
    setMode('idle')
    modeRef.current = 'idle'
    setIsDragging(false)
    setPencilOffset(0)
    setIsSnapping(false)
  }, [])

  // ── Native DOM drag listeners ─────────────────────────────────────────────
  // We deliberately avoid React synthetic events + setPointerCapture here.
  // React's event delegation can be unreliable in SSR-hydrated Workers
  // deployments (stale closures, hydration timing). Native addEventListener
  // on the pencil element + window-level move/up is always reliable.
  useEffect(() => {
    const pencilEl   = pencilRef.current
    const containerEl = containerRef.current
    if (!pencilEl || !containerEl) return

    let active    = false
    let startX    = 0
    let startMode = 'idle'

    const getW = () => containerEl.offsetWidth || 300

    const onMove = (e) => {
      if (!active) return
      e.preventDefault() // prevent scroll while dragging
      const dx  = e.clientX - startX
      const max = getW() - PENCIL_W - 8
      setPencilOffset(
        startMode === 'idle'
          ? Math.max(0, Math.min(dx, max))
          : Math.min(0, Math.max(dx, -max))
      )
    }

    const detach = () => {
      active = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup',   onUp)
      window.removeEventListener('pointercancel', onCancel)
    }

    const onUp = (e) => {
      if (!active) return
      const dx = e.clientX - startX
      const fw = getW()
      detach()
      setIsDragging(false)
      if (startMode === 'idle') {
        dx / fw >= 0.8 ? enterEdit() : setPencilOffset(0)
      } else {
        -dx / fw >= 0.8 ? save() : setPencilOffset(0)
      }
    }

    const onCancel = () => {
      detach()
      setIsDragging(false)
      setPencilOffset(0)
    }

    const onDown = (e) => {
      e.preventDefault()
      active    = true
      startX    = e.clientX
      startMode = modeRef.current // read current mode synchronously via ref
      setIsDragging(true)
      setPencilOffset(0)
      window.addEventListener('pointermove',   onMove,    { passive: false })
      window.addEventListener('pointerup',     onUp)
      window.addEventListener('pointercancel', onCancel)
    }

    pencilEl.addEventListener('pointerdown', onDown, { passive: false })
    return () => {
      pencilEl.removeEventListener('pointerdown', onDown)
      detach()
    }
  }, [enterEdit, save]) // both stable — this effect runs exactly once on mount

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel() }
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); save() }
  }, [cancel, save, multiline])

  // ── Derived visual state ──────────────────────────────────────────────────
  const containerW = containerRef.current?.offsetWidth || 300
  const maxTravel  = containerW - PENCIL_W - 8
  const progress   = isDragging
    ? Math.max(0, Math.min(1, Math.abs(pencilOffset) / maxTravel))
    : 0
  const atThreshold = progress >= 0.8

  const fillStyle = isDragging ? {
    position: 'absolute',
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
    ...(mode === 'idle'
      ? { left: 0, width: `${pencilOffset + PENCIL_W / 2}px` }
      : { right: 0, width: `${-pencilOffset + PENCIL_W / 2}px` }
    ),
    background: atThreshold
      ? 'linear-gradient(90deg, rgba(146,96,10,0.14) 0%, rgba(146,96,10,0.05) 100%)'
      : 'linear-gradient(90deg, rgba(146,96,10,0.07) 0%, rgba(146,96,10,0.02) 100%)',
  } : null

  const pencilStyle = {
    position: 'absolute',
    top: multiline ? '12px' : '50%',
    ...(mode === 'idle' ? { left: '4px' } : { right: '4px' }),
    transform: `translateY(${multiline ? 0 : -50}%) translateX(${pencilOffset}px)`,
    width: `${PENCIL_W}px`,
    height: `${PENCIL_W}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isDragging ? 'grabbing' : 'grab',
    border: 'none',
    borderRadius: '6px',
    padding: 0,
    background: atThreshold
      ? 'rgba(146,96,10,0.18)'
      : isDragging
        ? 'rgba(146,96,10,0.10)'
        : mode === 'editing'
          ? 'rgba(146,96,10,0.07)'
          : 'transparent',
    color: isDragging || mode === 'editing' ? 'var(--accent)' : 'var(--text-muted)',
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
              opacity: isDragging ? 0.5 : 1,
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
              onChange={e => {
                setValue(e.target.value)
                valueRef.current = e.target.value // keep ref in sync synchronously
              }}
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
              onChange={e => {
                setValue(e.target.value)
                valueRef.current = e.target.value // keep ref in sync synchronously
              }}
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

        {/* Pencil — ref attached for native event listener */}
        <button
          ref={pencilRef}
          aria-label={mode === 'idle' ? `Edit ${label}` : `Save ${label}`}
          style={pencilStyle}
        >
          <Pencil
            size={13}
            strokeWidth={mode === 'editing' || isDragging ? 2.5 : 1.75}
            style={{ transition: 'stroke-width 0.2s', pointerEvents: 'none' }}
          />
        </button>
      </div>
    </div>
  )
}
