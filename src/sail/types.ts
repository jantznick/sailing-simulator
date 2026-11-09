/** Control dials: 0–100. Most are ease→tight; traveler is leeward→windward. */
export type SailControls = {
  mainsheet: number
  traveler: number
  boomVang: number
  toppingLift: number
  outhaul: number
  halyard: number
  /** 0 = close-hauled, 100 = beam reach */
  windAngle: number
  /** 0 = calm, 100 ≈ fresh breeze (~25 kn) */
  windSpeed: number
}

export type ControlKey = keyof SailControls

export type SailShape = {
  /** Max camber as fraction of local chord */
  draftDepth: number
  /** Chord fraction from luff where max draft sits (lower = forward) */
  draftPosition: number
  /** Degrees of twist at the head relative to the foot */
  twistDeg: number
  /** Boom angle off boat centerline (degrees, positive = eased out) */
  boomAngleDeg: number
  /** Boom height above deck (meters) */
  boomElevation: number
  mastHeight: number
  boomLength: number
  /** Extra luff scallop when halyard is eased (0–1) */
  luffScallop: number
}

/** Defaults aim for attached flow (boom near TWA − ideal AoA), not oversheeted stall. */
export const DEFAULT_CONTROLS: SailControls = {
  mainsheet: 38,
  traveler: 48,
  boomVang: 55,
  toppingLift: 18,
  outhaul: 62,
  halyard: 78,
  windAngle: 28,
  windSpeed: 48,
}

export const SAIL_SEGMENTS_U = 18
export const SAIL_SEGMENTS_V = 24

/** Map 0–100 windSpeed dial → approximate knots (0–25). */
export function windSpeedKnots(windSpeed: number): number {
  return (Math.max(0, Math.min(100, windSpeed)) / 100) * 25
}
