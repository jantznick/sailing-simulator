import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_CONTROLS, type ControlKey, type SailControls } from '../sail/types'

export type SmoothedControlsApi = {
  /** Where dials are headed (Apply / committed targets). */
  target: SailControls
  /** Display + physics values easing toward target. */
  smoothed: SailControls
  /** Slider / direct edit — snaps this key immediately, then tracks target. */
  setControl: (key: ControlKey, value: number) => void
  /** Goal Apply — only updates targets; smoothed catches up over ~0.8–1s. */
  applyPatch: (patch: Partial<SailControls>) => void
  /** Replace all targets (optional snap). */
  setControls: (next: SailControls, opts?: { immediate?: boolean }) => void
}

/**
 * Exponentially ease all sail controls toward targets.
 * - Dragging: setControl snaps that key so the UI feels immediate.
 * - Apply: applyPatch only moves targets; RAF lerp updates shape/forces/dials.
 */
export function useSmoothedControls(
  initial: SailControls = DEFAULT_CONTROLS,
  /** Higher = snappier. ~3.2 settles most Apply moves in ~0.8–1.1s. */
  rate = 3.2,
): SmoothedControlsApi {
  const [target, setTarget] = useState(initial)
  const [smoothed, setSmoothed] = useState(initial)
  const smoothRef = useRef(initial)
  const targetRef = useRef(initial)

  useEffect(() => {
    targetRef.current = target
  }, [target])

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = targetRef.current
      const s = smoothRef.current
      const base = 1 - Math.exp(-rate * dt)
      const next = { ...s }
      let maxDelta = 0

      ;(Object.keys(t) as ControlKey[]).forEach((key) => {
        // Wind eases a touch slower; trim dials share the Apply-friendly rate.
        const slowWind = key === 'windAngle' || key === 'windSpeed'
        const alpha = slowWind ? base * 0.85 : base
        const v = s[key] + (t[key] - s[key]) * alpha
        next[key] = v
        maxDelta = Math.max(maxDelta, Math.abs(t[key] - v))
      })

      smoothRef.current = next
      if (maxDelta > 0.04) {
        setSmoothed(next)
      } else if (maxDelta > 0.0005) {
        smoothRef.current = t
        setSmoothed(t)
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [rate])

  const setControl = useCallback((key: ControlKey, value: number) => {
    setTarget((prev) => {
      const next = { ...prev, [key]: value }
      targetRef.current = next
      return next
    })
    // Take over mid-tween: snap this key so dragging never fights the lerp.
    smoothRef.current = { ...smoothRef.current, [key]: value }
    setSmoothed(smoothRef.current)
  }, [])

  const applyPatch = useCallback((patch: Partial<SailControls>) => {
    setTarget((prev) => {
      const next = { ...prev, ...patch }
      targetRef.current = next
      return next
    })
    // Do not snap — RAF eases smoothed (and thus sail/forces) toward targets.
  }, [])

  const setControls = useCallback((next: SailControls, opts?: { immediate?: boolean }) => {
    targetRef.current = next
    setTarget(next)
    if (opts?.immediate !== false) {
      smoothRef.current = next
      setSmoothed(next)
    }
  }, [])

  return { target, smoothed, setControl, applyPatch, setControls }
}
