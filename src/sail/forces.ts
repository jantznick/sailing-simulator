import { boomAngleRad, boomDirection } from './model'
import { windSpeedKnots, type SailControls, type SailShape } from './types'

export type FlowQuality = 'attached' | 'marginal' | 'stalled'

export type SailForces = {
  /** Apparent wind angle off the bow (degrees) */
  twaDeg: number
  /** Approximate true wind speed (knots) */
  windKnots: number
  /** Angle between wind and boom/chord (degrees) */
  aoaDeg: number
  /** Ideal AoA for current draft (degrees) */
  idealAoaDeg: number
  /** Relative forward drive 0–1 */
  drive: number
  /** Relative heeling force 0–1 */
  heeling: number
  /** Relative drag 0–1 */
  drag: number
  flow: FlowQuality
  /** Visual roll toward leeward/starboard (degrees, signed + = starboard) */
  heelDeg: number
  /** Relative boatspeed 0–1 */
  speed: number
  /** Sail loading / pressure intensity 0–1 (for coloring) */
  intensity: number
}

/** True wind angle from close-hauled (~35°) to beam reach (~90°). */
export function trueWindAngleDeg(windAngle01: number): number {
  return 35 + clamp(windAngle01, 0, 1) * 55
}

/**
 * Educational force model from parametric sail shape + wind.
 * Lift/drag from AoA/shape; dynamic pressure scales ~ windSpeed².
 *
 * Important: keep smooth gradients across overtrimmed/stalled AoA so coaching
 * and dial previews can always “see” ease vs tighten differences.
 */
export function deriveForces(shape: SailShape, controls: SailControls): SailForces {
  const wind01 = controls.windAngle / 100
  const windKnots = windSpeedKnots(controls.windSpeed)
  // Dynamic pressure vs a ~12 kn reference; floor so calm isn’t totally dead.
  const q = clamp(Math.pow(Math.max(windKnots, 1.5) / 12, 2), 0.04, 2.2)

  const twaDeg = trueWindAngleDeg(wind01)
  const twa = (twaDeg * Math.PI) / 180

  const windX = Math.sin(twa)
  const windZ = -Math.cos(twa)

  const chord = boomDirection(shape.boomAngleDeg)
  const dot = clamp(windX * chord.x + windZ * chord.z, -1, 1)
  const cross = windX * chord.z - windZ * chord.x
  const aoaDeg = (Math.atan2(cross, dot) * 180) / Math.PI
  const aoaAbs = Math.abs(aoaDeg)

  const idealAoaDeg = 12 + shape.draftDepth * 22
  const aoaError = aoaAbs - idealAoaDeg

  // Soft lift curve — still peaks near ideal AoA, but never goes flat at 0.
  let cl: number
  if (aoaAbs < 2.5) {
    cl = (aoaAbs / 2.5) * 0.35
  } else if (aoaError <= 0) {
    cl = 0.35 + 0.65 * (1 - Math.abs(aoaError) / Math.max(idealAoaDeg, 1))
  } else {
    const stallSoft = Math.exp(-aoaError * aoaError * 0.0065)
    cl = 0.16 + 0.72 * stallSoft
  }

  cl *= 0.78 + shape.draftDepth * 1.05
  cl *= 1 - shape.luffScallop * 0.2

  const twistNeed = shape.boomAngleDeg * 0.35 + wind01 * 12
  const twistErr = Math.abs(shape.twistDeg - twistNeed)
  cl *= 1 - clamp(twistErr / 55, 0, 0.28)

  let cd = 0.1 + shape.draftDepth * 0.32 + (aoaAbs / 90) * 0.48
  if (aoaError > 6) cd += clamp(aoaError / 45, 0, 0.5)
  cd *= 1 + shape.luffScallop * 0.14

  const boom = boomAngleRad(shape.boomAngleDeg)
  // Lift along leeward normal of the boom/chord.
  const liftX = -chord.z * cl
  const liftZ = chord.x * cl
  const dragX = windX * cd
  const dragZ = windZ * cd
  const forceX = (liftX + dragX * 0.28) * q
  const forceZ = (liftZ + dragZ * 0.22) * q

  // Forward drive: geometric forward lift + trim quality bonus (keeps gradients when overtrimmed).
  const trimQuality = clamp(1 - Math.abs(aoaError) / 42, 0.08, 1)
  const geometricDrive = Math.sin(Math.max(boom, 0.08)) * cl * q
  const driveRaw =
    forceZ * 0.55 + geometricDrive * 0.7 + Math.cos(boom) * cl * 0.12 * q * trimQuality
  const drive = clamp(driveRaw * (0.55 + 0.45 * trimQuality), 0, 1.45)

  const heeling = clamp(Math.abs(forceX) * 0.85 + Math.sin(boom) * cl * 0.18 * q, 0, 1.45)

  let flow: FlowQuality = 'attached'
  // Gentler stall labels — oversheeted is still “stalled,” but thresholds leave room to recover.
  if (aoaAbs < 4 || aoaError > 22 || shape.luffScallop > 0.8) flow = 'stalled'
  else if (aoaAbs < 7 || aoaError > 10 || shape.luffScallop > 0.45) flow = 'marginal'
  if (windKnots < 3 && flow === 'attached') flow = 'marginal'

  const driveN = clamp(drive, 0, 1)
  const heelN = clamp(heeling, 0, 1)
  const dragN = clamp((cd * Math.sqrt(q)) / 1.25, 0, 1)

  // Speed keeps a gradient under light drive so stalled→eased always moves the needle.
  const speed = clamp(
    ((driveN * 0.78 + trimQuality * 0.08 * Math.sqrt(q)) / (0.55 + dragN * 0.8)) * 0.85,
    0,
    1,
  )
  const heelDeg = heelN * 18 * (forceX >= 0 ? 1 : -1)
  const intensity = clamp(
    cl * 0.42 * q + heelN * 0.22 + (flow === 'stalled' ? 0.22 : 0),
    0,
    1,
  )

  return {
    twaDeg,
    windKnots,
    aoaDeg: aoaAbs,
    idealAoaDeg,
    drive: driveN,
    heeling: heelN,
    drag: dragN,
    flow,
    heelDeg,
    speed,
    intensity,
  }
}

export function flowLabel(flow: FlowQuality): string {
  switch (flow) {
    case 'attached':
      return 'Attached'
    case 'marginal':
      return 'Marginal'
    case 'stalled':
      return 'Stalled / luffing'
  }
}

export function flowColor(flow: FlowQuality, intensity: number): string {
  if (flow === 'stalled') return intensity > 0.55 ? '#e07058' : '#d4a056'
  if (flow === 'marginal') return '#d4b85a'
  return intensity > 0.55 ? '#4ec4a8' : '#7ec8e3'
}

/** Beginner speed buckets from the 0–1 metric. */
export type SpeedBand =
  | 'notMoving'
  | 'verySlow'
  | 'slow'
  | 'medium'
  | 'fast'
  | 'veryFast'

export function speedBand(speed: number): SpeedBand {
  const s = clamp(speed, 0, 1)
  if (s < 0.05) return 'notMoving'
  if (s < 0.16) return 'verySlow'
  if (s < 0.32) return 'slow'
  if (s < 0.52) return 'medium'
  if (s < 0.72) return 'fast'
  return 'veryFast'
}

export function speedLabel(speed: number): string {
  switch (speedBand(speed)) {
    case 'notMoving':
      return 'Not moving'
    case 'verySlow':
      return 'Very slow'
    case 'slow':
      return 'Slow'
    case 'medium':
      return 'Medium'
    case 'fast':
      return 'Fast'
    case 'veryFast':
      return 'Very fast'
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
