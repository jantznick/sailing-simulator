import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type InfoTipProps = {
  text: string
  label: string
}

type Pos = { top: number; left: number }

/** ⓘ control; tooltip portals to document.body so panel overflow can't clip it. */
export function InfoTip({ text, label }: InfoTipProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos>({ top: 0, left: 0 })
  const tipId = useId()
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (!open || !btnRef.current || !popRef.current) return

    const place = () => {
      const btn = btnRef.current
      const pop = popRef.current
      if (!btn || !pop) return

      const br = btn.getBoundingClientRect()
      const pr = pop.getBoundingClientRect()
      const pad = 10
      const gap = 8
      const vw = window.innerWidth
      const vh = window.innerHeight

      // Prefer below the button; flip above if needed.
      let top = br.bottom + gap
      if (top + pr.height > vh - pad) {
        top = br.top - pr.height - gap
      }
      top = Math.max(pad, Math.min(top, vh - pr.height - pad))

      // Center on button, then clamp into the viewport (shift into the panel).
      let left = br.left + br.width / 2 - pr.width / 2
      left = Math.max(pad, Math.min(left, vw - pr.width - pad))

      setPos({ top, left })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, text])

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span className="info-tip">
      <button
        ref={btnRef}
        type="button"
        className="info-tip-btn"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!popRef.current?.contains(e.relatedTarget as Node)) setOpen(false)
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        ⓘ
      </button>
      {open &&
        createPortal(
          <span
            ref={popRef}
            className="info-tip-pop"
            id={tipId}
            role="tooltip"
            style={{ top: pos.top, left: pos.left }}
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  )
}
