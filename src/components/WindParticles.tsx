import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  LineSegments,
} from 'three'
import type { SailForces } from '../sail/forces'
import { flowColor } from '../sail/forces'
import { sampleWindFlow } from '../sail/model'
import type { ControlKey, SailShape } from '../sail/types'

/** Fewer, longer streamlines — curved trails, not short needle spray. */
const STREAMS = 18
const SEGMENTS = 28
const BASE_SPEED = 2.4

type Seed = { x: number; y: number; z: number; age: number; lane: number }

type WindParticlesProps = {
  shape: SailShape
  windAngle: number
  windSpeed: number
  forces: SailForces
  activeControl: ControlKey | null
}

/**
 * Smooth curved wind streamlines that bend with sampleWindFlow around the sail.
 */
export function WindParticles({
  shape,
  windAngle,
  windSpeed,
  forces,
  activeControl,
}: WindParticlesProps) {
  const lineRef = useRef<LineSegments>(null)
  const seeds = useRef<Seed[]>([])
  const trails = useRef<[number, number, number][][]>([])
  const windAngleRef = useRef(windAngle / 100)
  const windSpeedRef = useRef(windSpeed / 100)

  const windHighlight =
    activeControl === 'windAngle' || activeControl === 'windSpeed'

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(STREAMS * (SEGMENTS - 1) * 2 * 3)
    g.setAttribute('position', new BufferAttribute(pos, 3))
    return g
  }, [])

  const positionsRef = useRef(
    geometry.getAttribute('position').array as Float32Array,
  )

  useEffect(() => {
    positionsRef.current = geometry.getAttribute('position').array as Float32Array
    return () => geometry.dispose()
  }, [geometry])

  useEffect(() => {
    if (seeds.current.length > 0) return
    const w0 = windAngle / 100
    seeds.current = Array.from({ length: STREAMS }, (_, i) => {
      const p = respawn(w0, i + 17)
      return { ...p, age: hash(i + 3) * 0.8, lane: i }
    })
    trails.current = seeds.current.map((s) =>
      Array.from({ length: SEGMENTS }, () => [s.x, s.y, s.z] as [number, number, number]),
    )
  }, [windAngle])

  useFrame((_, dt) => {
    if (seeds.current.length === 0) return

    const a = 1 - Math.exp(-3.5 * Math.min(dt, 0.05))
    windAngleRef.current += (windAngle / 100 - windAngleRef.current) * a
    windSpeedRef.current += (windSpeed / 100 - windSpeedRef.current) * a
    const wind01 = windAngleRef.current
    const speed01 = windSpeedRef.current

    const flowBoost =
      forces.flow === 'stalled' ? 0.82 : forces.flow === 'marginal' ? 0.95 : 1.08
    // Sub-step integration for smoother curvature around the sail.
    const subSteps = 2
    const step =
      (Math.min(dt, 0.05) / subSteps) * BASE_SPEED * (0.4 + speed01 * 1.35) * flowBoost

    const positions = positionsRef.current
    let pi = 0

    for (let r = 0; r < STREAMS; r++) {
      const s = seeds.current[r]!
      for (let sub = 0; sub < subSteps; sub++) {
        advanceSeed(s, shape, wind01, step, dt / subSteps, r)
      }

      const trail = trails.current[r]!
      for (let k = SEGMENTS - 1; k > 0; k--) trail[k] = trail[k - 1]!
      trail[0] = [s.x, s.y, s.z]

      // Drop the oldest third of segments so trails taper visually.
      const liveFrom = Math.floor(SEGMENTS * 0.22)
      for (let k = 0; k < SEGMENTS - 1; k++) {
        const use = k < SEGMENTS - 1 - liveFrom
        const pa = trail[k]!
        const pb = use ? trail[k + 1]! : trail[k]!
        positions[pi++] = pa[0]
        positions[pi++] = pa[1]
        positions[pi++] = pa[2]
        positions[pi++] = pb[0]
        positions[pi++] = pb[1]
        positions[pi++] = pb[2]
      }
    }

    ;(geometry.getAttribute('position') as BufferAttribute).needsUpdate = true

    const mat = lineRef.current?.material as LineBasicMaterial | undefined
    if (mat) {
      const base = windHighlight ? '#e8d9a8' : flowColor(forces.flow, forces.intensity)
      mat.color.set(base)
      mat.opacity = (windHighlight ? 0.72 : 0.42) + speed01 * 0.22
    }
  })

  const initialColor = useMemo(
    () => new Color(windHighlight ? '#e8d9a8' : '#8ebfd4'),
    [windHighlight],
  )

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={initialColor}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </lineSegments>
  )
}

function advanceSeed(
  s: Seed,
  shape: SailShape,
  wind01: number,
  step: number,
  dt: number,
  salt: number,
) {
  const flow = sampleWindFlow(s, shape, wind01)
  // Tiny smooth meander — not jagged rain jitter.
  const meander = Math.sin(s.age * 2.1 + salt * 0.4) * 0.03
  s.x += flow.x * step + flow.z * meander * step
  s.y += flow.y * step * 0.08 + Math.sin(s.age * 1.3 + salt) * 0.01 * step
  s.z += flow.z * step - flow.x * meander * step
  s.age += dt * (0.18 + step * 0.05)

  const out =
    s.x > 5.2 ||
    s.x < -4.2 ||
    s.z > 4.2 ||
    s.z < -5.2 ||
    s.y < 0.55 ||
    s.y > shape.mastHeight + 0.55 ||
    s.age > 2.4

  if (out) {
    const p = respawn(wind01, salt * 13 + s.age * 7 + s.lane)
    s.x = p.x
    s.y = p.y
    s.z = p.z
    s.age = 0
  }
}

function respawn(wind01: number, salt: number) {
  const apparentDeg = 35 + wind01 * 55
  const apparent = (apparentDeg * Math.PI) / 180
  // Spawn in a few layered lanes upwind so ribbons read as sheets of air.
  const lane = hash(salt) * 3.2 - 1.6
  const height = 0.9 + hash(salt + 1) * 2.7
  const dist = 3.1 + hash(salt + 2) * 1.4
  return {
    x: -Math.sin(apparent) * dist + Math.cos(apparent) * lane * 0.55,
    y: height,
    z: Math.cos(apparent) * dist + Math.sin(apparent) * lane * 0.55,
  }
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
