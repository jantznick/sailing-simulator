import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type Mesh,
} from 'three'
import { sailVisualMotion, type SailForces } from '../sail/forces'
import { writeSailVisualPositions } from '../sail/model'
import type { ControlKey, SailShape } from '../sail/types'
import { SAIL_SEGMENTS_U, SAIL_SEGMENTS_V } from '../sail/types'

type SailProps = {
  shape: SailShape
  forces: SailForces
  activeControl: ControlKey | null
}

/**
 * Parametric sail mesh with educational luff/stall flutter.
 * Base shape always comes from deriveShape via computeSailPositions;
 * motion is visual-only (forces/coaching stay on the rigid shape).
 */
export function Sail({ shape, forces, activeControl }: SailProps) {
  const meshRef = useRef<Mesh>(null)
  const shapeRef = useRef(shape)
  const forcesRef = useRef(forces)
  shapeRef.current = shape
  forcesRef.current = forces

  const baseColor = useMemo(() => flowTint(forces), [forces])

  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    const count = (SAIL_SEGMENTS_U + 1) * (SAIL_SEGMENTS_V + 1)
    const positions = new Float32Array(count * 3)
    writeSailVisualPositions(
      positions,
      shape,
      sailVisualMotion(forces),
      0,
      SAIL_SEGMENTS_U,
      SAIL_SEGMENTS_V,
    )
    const colors = buildVertexColors(forces, SAIL_SEGMENTS_U, SAIL_SEGMENTS_V, activeControl)
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.setIndex(Array.from(buildIndices(SAIL_SEGMENTS_U, SAIL_SEGMENTS_V)))
    geo.computeVertexNormals()
    return geo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  useLayoutEffect(() => {
    const col = geometry.getAttribute('color') as BufferAttribute
    const colors = buildVertexColors(forces, SAIL_SEGMENTS_U, SAIL_SEGMENTS_V, activeControl)
    ;(col.array as Float32Array).set(colors)
    col.needsUpdate = true
  }, [geometry, forces, activeControl])

  useFrame(({ clock }) => {
    const pos = geometry.getAttribute('position') as BufferAttribute
    const arr = pos.array as Float32Array
    const motion = sailVisualMotion(forcesRef.current)
    writeSailVisualPositions(
      arr,
      shapeRef.current,
      motion,
      clock.elapsedTime,
      SAIL_SEGMENTS_U,
      SAIL_SEGMENTS_V,
    )
    pos.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={baseColor}
        vertexColors
        side={DoubleSide}
        roughness={0.78}
        metalness={0}
        transparent
        opacity={0.93}
      />
    </mesh>
  )
}

function flowTint(forces: SailForces): string {
  if (forces.flow === 'stalled') {
    return forces.trimMode === 'undertrimmed' ? '#f2d8c8' : '#f0d0c4'
  }
  if (forces.flow === 'marginal') return '#f0e6c8'
  return '#eef3f0'
}

function buildVertexColors(
  forces: SailForces,
  segU: number,
  segV: number,
  active: ControlKey | null,
): Float32Array {
  const count = (segU + 1) * (segV + 1)
  const colors = new Float32Array(count * 3)
  const c = new Color()
  const hot = new Color(
    forces.flow === 'stalled'
      ? forces.trimMode === 'undertrimmed'
        ? '#e08858'
        : '#e07058'
      : forces.flow === 'marginal'
        ? '#d4b85a'
        : '#4ec4a8',
  )
  const cool = new Color('#f2efe6')
  const accent = new Color('#ffe08a')
  const highlightLuff = active === 'halyard'
  const highlightFoot = active === 'outhaul'

  // Emphasize the failing edge slightly in the tint.
  const edgeBias =
    forces.flow === 'attached'
      ? 0.4
      : forces.trimMode === 'undertrimmed'
        ? 0.18
        : forces.trimMode === 'overtrimmed'
          ? 0.72
          : 0.4

  let idx = 0
  for (let j = 0; j <= segV; j++) {
    const v = j / segV
    for (let i = 0; i <= segU; i++) {
      const u = i / segU
      const draftBand = 1 - Math.abs(u - edgeBias) * 1.55
      const spanBand = 0.55 + (1 - v) * 0.45
      const t = clamp(forces.intensity * draftBand * spanBand, 0, 1)
      c.copy(cool).lerp(hot, t * 0.85)

      if (highlightLuff && u < 0.18) {
        c.lerp(accent, 0.75 * (1 - u / 0.18))
      }
      if (highlightFoot && v < 0.12) {
        c.lerp(accent, 0.7 * (1 - v / 0.12))
      }

      colors[idx++] = c.r
      colors[idx++] = c.g
      colors[idx++] = c.b
    }
  }
  return colors
}

function buildIndices(segU: number, segV: number): Uint32Array {
  const indices: number[] = []
  const row = segU + 1
  for (let j = 0; j < segV; j++) {
    for (let i = 0; i < segU; i++) {
      const a = j * row + i
      const b = a + 1
      const c = a + row
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  return new Uint32Array(indices)
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
