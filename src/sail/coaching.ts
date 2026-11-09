import { CONTROL_META } from './explainers'
import {
  deriveForces,
  speedLabel,
  type FlowQuality,
  type SailForces,
} from './forces'
import { deriveShape } from './model'
import type { ControlKey, SailControls } from './types'

export type GoalKind = 'lessHeel' | 'faster' | 'slower'

export const GOAL_META: Record<GoalKind, { label: string; plain: string }> = {
  lessHeel: {
    label: 'Less heel',
    plain: 'Tip the boat less',
  },
  faster: {
    label: 'Faster',
    plain: 'More forward push',
  },
  slower: {
    label: 'Slower / depower',
    plain: 'Bleed power safely',
  },
}

export type AdviceSuggestion = {
  id: string
  kind: 'single' | 'combo' | 'wind'
  patch: Partial<SailControls>
  headline: string
  detail: string
  tradeoff: string
  score: number
}

export type DialPrediction = {
  title: string
  plain: string
  easeLabel: string
  easeSummary: string
  tightLabel: string
  tightSummary: string
  note: string | null
}

const TRIM_KEYS: ControlKey[] = [
  'mainsheet',
  'traveler',
  'boomVang',
  'toppingLift',
  'outhaul',
  'halyard',
]

/** Wider steps so oversheeted / stalled boats can find an unstall move. */
const DELTAS = [12, -12, 22, -22, 34, -34] as const

function clamp01to100(n: number): number {
  return Math.max(0, Math.min(100, n))
}

function evalControls(controls: SailControls): SailForces {
  return deriveForces(deriveShape(controls), controls)
}

function flowRank(flow: FlowQuality): number {
  if (flow === 'attached') return 2
  if (flow === 'marginal') return 1
  return 0
}

function metricDeltaWord(
  before: number,
  after: number,
  upWord: string,
  downWord: string,
  eps = 0.025,
): string {
  const d = after - before
  if (d > eps) return upWord
  if (d < -eps) return downWord
  return 'little change'
}

function flowDeltaWord(before: FlowQuality, after: FlowQuality): string {
  const d = flowRank(after) - flowRank(before)
  if (d > 0) return 'cleaner flow'
  if (d < 0) return 'messier flow'
  return 'similar flow'
}

function summarizeDelta(before: SailForces, after: SailForces): string {
  const parts = [
    metricDeltaWord(before.speed, after.speed, 'faster', 'slower', 0.02),
    metricDeltaWord(before.heeling, after.heeling, 'more heel', 'less heel', 0.02),
    metricDeltaWord(before.drive, after.drive, 'more drive', 'less drive', 0.025),
    flowDeltaWord(before.flow, after.flow),
  ].filter((p) => p !== 'little change' && p !== 'similar flow')

  if (parts.length === 0) return 'little change overall'
  return parts.join(' · ')
}

function directionDelta(key: ControlKey): { ease: number; tight: number } {
  // Larger sample for sheet/traveler so predictions escape deep stall.
  if (key === 'mainsheet' || key === 'traveler') return { ease: -28, tight: 28 }
  if (key === 'windAngle' || key === 'windSpeed') return { ease: -20, tight: 20 }
  return { ease: -22, tight: 22 }
}

/**
 * Live predicted outcomes for the selected dial: sample ease vs tighten
 * (or leeward/windward) and recompute forces.
 */
export function predictDialOutcomes(
  key: ControlKey,
  controls: SailControls,
): DialPrediction {
  const meta = CONTROL_META[key]
  const before = evalControls(controls)
  const { ease, tight } = directionDelta(key)

  const easeVal = clamp01to100(controls[key] + ease)
  const tightVal = clamp01to100(controls[key] + tight)
  const easeForces = evalControls({ ...controls, [key]: easeVal })
  const tightForces = evalControls({ ...controls, [key]: tightVal })

  const easeMoved = Math.abs(easeVal - controls[key]) >= 3
  const tightMoved = Math.abs(tightVal - controls[key]) >= 3

  let note: string | null = null
  if (before.flow === 'stalled') {
    note = `Right now: stalled / ${speedLabel(before.speed).toLowerCase()}. Aim the sail so flow reattaches.`
  } else if (before.flow === 'marginal') {
    note = `Right now: marginal flow / ${speedLabel(before.speed).toLowerCase()}.`
  } else {
    note = `Right now: ${speedLabel(before.speed).toLowerCase()}, heel ${Math.abs(before.heelDeg).toFixed(0)}°.`
  }

  return {
    title: meta.label,
    plain: meta.plain,
    easeLabel: meta.minLabel,
    easeSummary: easeMoved
      ? summarizeDelta(before, easeForces)
      : 'Already at this end of the dial',
    tightLabel: meta.maxLabel,
    tightSummary: tightMoved
      ? summarizeDelta(before, tightForces)
      : 'Already at this end of the dial',
    note,
  }
}

function actionPhrase(key: ControlKey, from: number, to: number): string {
  const meta = CONTROL_META[key]
  const delta = Math.round(Math.abs(to - from))
  if (key === 'traveler') {
    const dir = to < from ? 'leeward' : 'windward'
    return `Slide the traveler ${dir} (~${delta})`
  }
  if (key === 'windAngle') {
    const dir = to < from ? 'more toward the wind' : 'more to a reach'
    return `Turn wind angle ${dir} (~${delta})`
  }
  if (key === 'windSpeed') {
    const dir = to < from ? 'lighter' : 'stronger'
    return `Set wind ${dir} (~${delta})`
  }
  const verb = to < from ? 'Ease' : 'Tighten'
  return `${verb} the ${meta.label.toLowerCase()} (~${delta})`
}

type Candidate = {
  patch: Partial<SailControls>
  keys: ControlKey[]
  before: SailForces
  after: SailForces
}

function buildSingleCandidates(
  controls: SailControls,
  before: SailForces,
  keys: ControlKey[],
): Candidate[] {
  const out: Candidate[] = []
  for (const key of keys) {
    for (const d of DELTAS) {
      const nextVal = clamp01to100(controls[key] + d)
      if (Math.abs(nextVal - controls[key]) < 5) continue
      const next = { ...controls, [key]: nextVal }
      out.push({
        patch: { [key]: nextVal },
        keys: [key],
        before,
        after: evalControls(next),
      })
    }
  }
  return out
}

function scoreCandidate(goal: GoalKind, c: Candidate): number {
  const dHeel = c.before.heeling - c.after.heeling
  const dSpeed = c.after.speed - c.before.speed
  const dDrive = c.after.drive - c.before.drive
  const dAoaErr =
    Math.abs(c.before.aoaDeg - c.before.idealAoaDeg) -
    Math.abs(c.after.aoaDeg - c.after.idealAoaDeg)
  const dFlow = flowRank(c.after.flow) - flowRank(c.before.flow)

  switch (goal) {
    case 'lessHeel':
      return (
        dHeel * 2.6 +
        Math.min(dSpeed, 0.08) * 0.7 -
        Math.max(-dSpeed, 0) * 0.55 +
        dFlow * 0.12 +
        dAoaErr * 0.01
      )
    case 'faster':
      // Unstall / cleaner AoA counts even before speed fully recovers.
      return (
        dSpeed * 2.8 +
        dDrive * 0.9 +
        dFlow * 0.45 +
        dAoaErr * 0.035 -
        Math.max(c.after.heeling - c.before.heeling, 0) * 0.45
      )
    case 'slower':
      return (
        -dSpeed * 2.3 -
        dDrive * 0.65 +
        Math.max(dHeel, 0) * 1.0 +
        (c.after.flow !== 'stalled' && c.before.flow === 'stalled' ? 0.05 : 0)
      )
  }
}

function tradeoffCopy(goal: GoalKind, before: SailForces, after: SailForces): string {
  const heelPct = Math.round((after.heeling - before.heeling) * 100)
  const speedBefore = speedLabel(before.speed).toLowerCase()
  const speedAfter = speedLabel(after.speed).toLowerCase()
  const speedChanged = speedBefore !== speedAfter

  if (goal === 'lessHeel') {
    if (speedChanged && after.speed < before.speed - 0.03) {
      return `Tradeoff: speed may drop (${speedBefore} → ${speedAfter}).`
    }
    if (after.speed > before.speed + 0.03) {
      return `Bonus: often ${speedAfter} as flow cleans up.`
    }
    return 'Tradeoff: speed stays in a similar range.'
  }
  if (goal === 'faster') {
    if (heelPct > 4) return `Tradeoff: you may tip a bit more (~${heelPct} heel force).`
    if (heelPct < -3) return 'Nice: often heels a little less while speeding up.'
    if (before.flow !== 'attached' && after.flow === 'attached') {
      return 'Helps reattach flow — the main unlock when you’re stalled.'
    }
    return 'Tradeoff: heel stays roughly similar.'
  }
  if (heelPct < -3) return 'Also tips less — a clean depower.'
  if (heelPct > 2) return 'Note: heel may not drop; you’re mainly bleeding speed.'
  return 'Tradeoff: less forward push; tip changes little.'
}

function describePatch(
  controls: SailControls,
  patch: Partial<SailControls>,
  goal: GoalKind,
  after: SailForces,
  before: SailForces,
): { headline: string; detail: string } {
  const keys = (Object.keys(patch) as ControlKey[]).filter((k) => patch[k] !== undefined)
  const phrases = keys.map((k) => actionPhrase(k, controls[k], patch[k]!))

  const speedBit = `${speedLabel(before.speed)} → ${speedLabel(after.speed)}`
  const heelBit = `${Math.abs(before.heelDeg).toFixed(0)}° → ${Math.abs(after.heelDeg).toFixed(0)}° heel`
  const flowBit =
    before.flow === after.flow
      ? `flow stays ${after.flow}`
      : `flow ${before.flow} → ${after.flow}`

  let effect: string
  if (goal === 'lessHeel') {
    effect = `Less tip (${heelBit}). ${speedBit}.`
  } else if (goal === 'faster') {
    effect = `Toward ${speedLabel(after.speed).toLowerCase()} (${flowBit}).`
  } else {
    effect = `Depower toward ${speedLabel(after.speed).toLowerCase()}.`
  }

  if (keys.length === 1) {
    return { headline: phrases[0]!, detail: effect }
  }
  return {
    headline: `${phrases[0]} + ${phrases[1]!.replace(/^./, (ch) => ch.toLowerCase())}`,
    detail: `Best combo: ${effect}`,
  }
}

function pickTop(
  ranked: { c: Candidate; score: number }[],
  controls: SailControls,
  goal: GoalKind,
  limit: number,
): AdviceSuggestion[] {
  const suggestions: AdviceSuggestion[] = []
  const usedKeys = new Set<string>()

  for (const { c, score } of ranked) {
    if (suggestions.length >= limit) break
    const keySig = c.keys.slice().sort().join('+')
    if (usedKeys.has(keySig)) continue
    // Prefer unique primary control
    if (c.keys.length === 1 && usedKeys.has(c.keys[0]!)) continue
    for (const k of c.keys) usedKeys.add(k)
    usedKeys.add(keySig)

    const { headline, detail } = describePatch(controls, c.patch, goal, c.after, c.before)
    suggestions.push({
      id: `${c.keys.join('-')}-${Object.values(c.patch).join('-')}`,
      kind: c.keys.includes('windAngle') || c.keys.includes('windSpeed') ? 'wind' : 'single',
      patch: c.patch,
      headline,
      detail,
      tradeoff: tradeoffCopy(goal, c.before, c.after),
      score,
    })
  }
  return suggestions
}

/**
 * Educational trim coach: sample control deltas, re-run deriveShape + deriveForces,
 * and always return concrete Apply-able moves when any improve the goal.
 */
export function suggestForGoal(goal: GoalKind, controls: SailControls): AdviceSuggestion[] {
  const before = evalControls(controls)
  const trimCandidates = buildSingleCandidates(controls, before, TRIM_KEYS)
  const windCandidates = buildSingleCandidates(controls, before, ['windAngle'])

  const scoredTrim = trimCandidates
    .map((c) => ({ c, score: scoreCandidate(goal, c) }))
    .sort((a, b) => b.score - a.score)

  // Always keep the best few with positive-ish score; allow tiny positive when recovering from stall.
  const minScore = goal === 'faster' && before.flow !== 'attached' ? 0.01 : 0.02
  const positive = scoredTrim.filter(({ score }) => score > minScore)

  const suggestions = pickTop(
    positive.length > 0 ? positive : scoredTrim.slice(0, 3),
    controls,
    goal,
    2,
  )

  // Combo of top two different trim keys when jointly better.
  if (positive.length >= 2) {
    const a = positive[0]!.c
    const b = positive.find((s) => s.c.keys[0] !== a.keys[0])?.c
    if (b) {
      const patch = { ...a.patch, ...b.patch }
      const after = evalControls({ ...controls, ...patch })
      const combo: Candidate = { patch, keys: [...a.keys, ...b.keys], before, after }
      const score = scoreCandidate(goal, combo) + 0.03
      const best = suggestions[0]?.score ?? 0
      if (score >= best * 0.8) {
        const { headline, detail } = describePatch(controls, patch, goal, after, before)
        suggestions.push({
          id: `combo-${combo.keys.join('-')}`,
          kind: 'combo',
          patch,
          headline,
          detail,
          tradeoff: tradeoffCopy(goal, before, after),
          score,
        })
      }
    }
  }

  // If wind angle is a real lever (especially when stalled / overtrimmed), add it.
  const windRanked = windCandidates
    .map((c) => ({ c, score: scoreCandidate(goal, c) }))
    .filter(({ score }) => score > minScore + 0.02)
    .sort((a, b) => b.score - a.score)

  if (windRanked[0] && suggestions.length < 3) {
    const { c, score } = windRanked[0]
    // Prefer mentioning wind when trim alone is weak or boat is stalled.
    if (before.flow !== 'attached' || score > (suggestions[0]?.score ?? 0) * 0.9) {
      const { headline, detail } = describePatch(controls, c.patch, goal, c.after, before)
      suggestions.push({
        id: `wind-${Object.values(c.patch)[0]}`,
        kind: 'wind',
        patch: c.patch,
        headline,
        detail: `${detail} Wind angle can be the real blocker when the sail is aimed wrong.`,
        tradeoff: tradeoffCopy(goal, before, c.after),
        score,
      })
    }
  }

  // Guarantee at least one suggestion: take absolute best trim move even if weak.
  if (suggestions.length === 0 && scoredTrim[0]) {
    const { c, score } = scoredTrim[0]
    const { headline, detail } = describePatch(controls, c.patch, goal, c.after, before)
    suggestions.push({
      id: `fallback-${c.keys[0]}`,
      kind: 'single',
      patch: c.patch,
      headline,
      detail:
        score <= 0
          ? `${detail} Gains look small from here — still the best dial nudge we found.`
          : detail,
      tradeoff: tradeoffCopy(goal, before, c.after),
      score,
    })
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 3)
}
