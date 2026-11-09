import type { SailControls, SailShape } from './types'

/** Visual-only luff/stall knobs (from sailVisualMotion in forces.ts). */
export type SailVisualMotion = {
  camberScale: number
  flutterAmp: number
  flutterHz: number
  chordBias: number
  badness: number
}

const MAST_HEIGHT = 4.2
const BOOM_LENGTH = 2.4
const DECK_Y = 0.55

/**
 * Boom orientation (shared by sail mesh + boat hardware):
 * - 0° = sheeted on centerline, boom points aft (−Z)
 * - positive = eased to starboard (+X)
 *
 * A boom mesh built along local +X should use rotation Y = boomYawRad(...).
 */
export function boomAngleRad(boomAngleDeg: number): number {
  return (boomAngleDeg * Math.PI) / 180
}

/** Three.js Y-rotation that aims a +X boom along aft-then-ease. */
export function boomYawRad(boomAngleDeg: number): number {
  return Math.PI / 2 - boomAngleRad(boomAngleDeg)
}

/** Unit XZ direction from mast toward clew. */
export function boomDirection(boomAngleDeg: number, twistDeg = 0): { x: number; z: number } {
  const a = boomAngleRad(boomAngleDeg + twistDeg)
  return { x: Math.sin(a), z: -Math.cos(a) }
}

/** Horizontal unit normal on the leeward (starboard) side of the boom. */
export function boomLeewardNormal(dir: { x: number; z: number }): { x: number; z: number } {
  return { x: -dir.z, z: dir.x }
}

/** Map 0–100 control dials → educationally plausible shape parameters. */
export function deriveShape(controls: SailControls): SailShape {
  const sheet = controls.mainsheet / 100
  const traveler = controls.traveler / 100
  const vang = controls.boomVang / 100
  const lift = controls.toppingLift / 100
  const outhaul = controls.outhaul / 100
  const halyard = controls.halyard / 100

  // Ease sheet → boom swings out; traveler windward sheets without dumping.
  const baseBoomAngle = (1 - sheet) * 52
  const travelerOffset = (0.5 - traveler) * 32
  const boomAngleDeg = clamp(baseBoomAngle + travelerOffset, 0, 62)

  const boomElevation =
    DECK_Y + 0.08 + (1 - vang) * 0.28 + lift * 0.42 - vang * 0.1

  const twistDeg = clamp(
    (1 - sheet) * 26 + (1 - vang) * 16 + lift * 14 - sheet * vang * 12,
    0,
    45,
  )

  const draftDepth = clamp(
    0.09 + (1 - outhaul) * 0.2 + (1 - halyard) * 0.12 - vang * 0.04,
    0.04,
    0.42,
  )

  const draftPosition = clamp(0.5 - halyard * 0.2 + (1 - outhaul) * 0.07, 0.26, 0.58)

  const luffScallop = clamp((1 - halyard) * 1.25, 0, 1)

  return {
    draftDepth,
    draftPosition,
    twistDeg,
    boomAngleDeg,
    boomElevation,
    mastHeight: MAST_HEIGHT,
    boomLength: BOOM_LENGTH,
    luffScallop,
  }
}

/**
 * Triangular mainsail grid in (u, v):
 * - v: foot → head along the luff
 * - u: luff → leech at each height (chord shrinks toward the head)
 *
 * Foot (v=0) lies on the boom. Camber offsets leeward of the chord.
 * Pass `out` to reuse a buffer (animation path).
 */
export function computeSailPositions(
  shape: SailShape,
  segmentsU: number,
  segmentsV: number,
  out?: Float32Array,
  camberScale = 1,
): Float32Array {
  const count = (segmentsU + 1) * (segmentsV + 1)
  const positions = out ?? new Float32Array(count * 3)
  const headY = shape.mastHeight
  const footY = shape.boomElevation
  const sailSpan = headY - footY
  const draftScale = clamp(camberScale, 0.25, 1.15)

  let idx = 0
  for (let j = 0; j <= segmentsV; j++) {
    const v = j / segmentsV
    const y = footY + v * sailSpan
    const chord = shape.boomLength * (1 - v)
    const twistHere = shape.twistDeg * v
    const dir = boomDirection(shape.boomAngleDeg, twistHere)
    const perp = boomLeewardNormal(dir)

    for (let i = 0; i <= segmentsU; i++) {
      const u = i / segmentsU
      const along = u * chord

      const camber =
        camberFraction(u, shape.draftPosition) * shape.draftDepth * chord * draftScale
      const lowerBias = 1 + (1 - v) * 0.45
      const offset = camber * lowerBias

      const scallop =
        shape.luffScallop *
        Math.sin(v * Math.PI * 3.5) *
        Math.exp(-u * 5.5) *
        0.11 *
        (1 - v * 0.45)

      const lateral = offset + scallop
      positions[idx++] = along * dir.x + lateral * perp.x
      positions[idx++] = y
      positions[idx++] = along * dir.z + lateral * perp.z
    }
  }

  return positions
}

/**
 * Educational luff/stall motion on top of the parametric sail.
 * Always call after (or via) a fresh base shape write — does not change force math.
 *
 * Undertrimmed: flutter weighted to the luff (leading edge soft).
 * Oversheeted: larger flop / collapse weighted to the leech.
 */
export function applySailLuffFlutter(
  positions: Float32Array,
  shape: SailShape,
  motion: SailVisualMotion,
  time: number,
  segmentsU: number,
  segmentsV: number,
): void {
  if (motion.flutterAmp < 0.002 && motion.badness <= 0) return

  // When halyard scallop is already visible, ease off extra luff flutter.
  const scallopGuard = 1 - clamp(shape.luffScallop, 0, 1) * 0.62
  const t = time

  for (let j = 0; j <= segmentsV; j++) {
    const v = j / segmentsV
    const twistHere = shape.twistDeg * v
    const dir = boomDirection(shape.boomAngleDeg, twistHere)
    const perp = boomLeewardNormal(dir)
    // Foot stays on the boom; head freer.
    const spanFree = Math.pow(v, 0.65) * (0.35 + 0.65 * Math.sin(v * Math.PI))

    for (let i = 0; i <= segmentsU; i++) {
      const u = i / segmentsU
      const idx = (j * (segmentsU + 1) + i) * 3

      // Chord envelope: bias 0 → luff, 1 → leech.
      const luffW = Math.exp(-u * 3.8) * (0.35 + 0.65 * (1 - u))
      const leechW = Math.pow(u, 1.35) * (0.4 + 0.6 * u)
      const chordW = luffW * (1 - motion.chordBias) + leechW * motion.chordBias
      const luffOnly = Math.exp(-u * 4.2)
      const flutterScale =
        chordW * (0.55 + 0.45 * scallopGuard + 0.45 * (1 - luffOnly * shape.luffScallop))

      const phase =
        t * motion.flutterHz * Math.PI * 2 +
        v * (3.2 + motion.chordBias * 2.4) +
        u * (1.1 + motion.chordBias * 3.5)
      const primary = Math.sin(phase)
      const secondary = Math.sin(phase * 1.73 + v * 2.1)
      const flap = primary * 0.72 + secondary * 0.28

      // Overtrim: slight inward camber collapse pulse on the aft sail.
      const collapse =
        motion.chordBias > 0.55
          ? -motion.badness * 0.045 * Math.pow(u, 1.2) * (0.55 + 0.45 * Math.sin(phase * 0.5))
          : 0
      // Undertrim: soft leading-edge shiver (mostly lateral).
      const shiver =
        motion.chordBias < 0.35
          ? motion.badness * 0.02 * luffW * Math.sin(phase * 2.15 + v * 5.5)
          : 0

      const amp = motion.flutterAmp * flutterScale * spanFree
      const lateral = amp * flap + collapse * shape.boomLength + shiver

      positions[idx]! += lateral * perp.x
      positions[idx + 1]! +=
        amp * 0.12 * secondary * spanFree * (0.3 + motion.chordBias * 0.7)
      positions[idx + 2]! += lateral * perp.z
    }
  }
}

/** Fresh base shape (with camber dump) + procedural flutter into `out`. */
export function writeSailVisualPositions(
  out: Float32Array,
  shape: SailShape,
  motion: SailVisualMotion,
  time: number,
  segmentsU: number,
  segmentsV: number,
): void {
  computeSailPositions(shape, segmentsU, segmentsV, out, motion.camberScale)
  applySailLuffFlutter(out, shape, motion, time, segmentsU, segmentsV)
}

/** Boom tip (clew attachment) in world space. */
export function boomTip(shape: SailShape): [number, number, number] {
  const dir = boomDirection(shape.boomAngleDeg)
  return [dir.x * shape.boomLength, shape.boomElevation, dir.z * shape.boomLength]
}

/** Point along the boom (0 at mast, 1 at clew). */
export function boomPoint(shape: SailShape, t: number): [number, number, number] {
  const dir = boomDirection(shape.boomAngleDeg)
  const len = shape.boomLength * t
  return [dir.x * len, shape.boomElevation, dir.z * len]
}

/**
 * Traveler car X on the aft track.
 * 0 = leeward (starboard +X), 100 = windward (−X) for this port-tack demo.
 */
export function travelerCarX(traveler01: number, trackHalf = 0.55): number {
  return trackHalf * (1 - 2 * clamp(traveler01, 0, 1))
}

/**
 * Simplified flow sample for wind streamlines.
 * Ambient wind from windAngle; bends around sail camber on the leeward face.
 */
export function sampleWindFlow(
  point: { x: number; y: number; z: number },
  shape: SailShape,
  windAngle01: number,
): { x: number; y: number; z: number } {
  const apparentDeg = 35 + windAngle01 * 55
  const apparent = (apparentDeg * Math.PI) / 180
  let vx = Math.sin(apparent)
  let vz = -Math.cos(apparent)

  const dir = boomDirection(shape.boomAngleDeg)
  const sailNx = -dir.z
  const sailNz = dir.x
  const planeDist = point.x * sailNx + point.z * sailNz
  // Along-chord distance from mast (0) toward clew.
  const along = point.x * dir.x + point.z * dir.z

  const nearSail =
    point.y > shape.boomElevation - 0.35 &&
    point.y < shape.mastHeight + 0.35 &&
    along > -0.35 &&
    along < shape.boomLength + 0.9 &&
    Math.abs(planeDist) < 2.1

  if (nearSail) {
    const side = Math.sign(planeDist || 1)
    const influence =
      Math.exp(-planeDist * planeDist * 1.15) *
      (0.55 + shape.draftDepth * 4.2) *
      (1 - clamp(Math.abs(along - shape.boomLength * 0.45) / shape.boomLength, 0, 0.7))
    // Stronger leeward curve so ribbons visibly wrap the sail.
    const curve = influence * (side > 0 ? 2.1 : 0.75)
    vx += -sailNz * curve * side
    vz += sailNx * curve * side

    const spanT =
      (point.y - shape.boomElevation) / Math.max(0.01, shape.mastHeight - shape.boomElevation)
    const twistPush = (shape.twistDeg / 40) * spanT * 0.55
    vx += dir.x * twistPush
    vz += dir.z * twistPush

    // Soft acceleration in the slot / leeward face.
    if (side > 0) {
      vx += dir.x * influence * 0.2
      vz += dir.z * influence * 0.2
    }
  }

  const len = Math.hypot(vx, vz) || 1
  return { x: vx / len, y: 0, z: vz / len }
}

function camberFraction(u: number, draftPos: number): number {
  if (u <= 0 || u >= 1) return 0
  if (u <= draftPos) {
    return Math.sin((u / draftPos) * (Math.PI / 2))
  }
  return Math.sin(((1 - u) / (1 - draftPos)) * (Math.PI / 2))
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function formatShapeReadout(shape: SailShape): {
  draftDepth: string
  draftPosition: string
  twist: string
  boomAngle: string
} {
  return {
    draftDepth: `${Math.round(shape.draftDepth * 100)}% chord`,
    draftPosition: `${Math.round(shape.draftPosition * 100)}% aft of luff`,
    twist: `${shape.twistDeg.toFixed(0)}°`,
    boomAngle: `${shape.boomAngleDeg.toFixed(0)}° off centerline`,
  }
}
