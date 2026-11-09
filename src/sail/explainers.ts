import type { ControlKey } from './types'

export type ControlMeta = {
  label: string
  /** Plain-language subtitle under the sailor term */
  plain: string
  minLabel: string
  maxLabel: string
  blurb: string
  tip: string
}

export const CONTROL_META: Record<ControlKey, ControlMeta> = {
  mainsheet: {
    label: 'Mainsheet',
    plain: 'The rope that pulls the boom in or lets it out',
    minLabel: 'Ease',
    maxLabel: 'Tight',
    blurb:
      'Think of this as the main “in/out” rope for the boom. Ease it and the boom swings wider (sail opens). Tighten it and the boom comes in toward the middle of the boat.',
    tip: 'The rope from the deck up to the boom. Ease = boom out, more open sail. Tight = boom in, sail closer to center.',
  },
  traveler: {
    label: 'Traveler',
    plain: 'Slides the boom left/right across the back of the boat',
    minLabel: 'Leeward',
    maxLabel: 'Windward',
    blurb:
      'A little car on a track at the back of the boat. Slide it to move where the mainsheet attaches side-to-side — so you can aim the boom without fully easing or tightening the sheet.',
    tip: 'Track + sliding car across the aft deck. Moves the boom left/right without dumping the mainsheet.',
  },
  boomVang: {
    label: 'Boom vang',
    plain: 'Pulls the boom down so the sail’s back edge stays tighter',
    minLabel: 'Ease',
    maxLabel: 'Tight',
    blurb:
      'A strut/rope from near the mast down to the boom. Pulling it down keeps the boom from lifting, which flattens the lower sail and reduces “twist” (the top opening more than the bottom).',
    tip: 'Pulls the boom down. Tight = flatter lower sail and less twist at the top.',
  },
  toppingLift: {
    label: 'Topping lift',
    plain: 'Holds the boom up (opposite of the vang)',
    minLabel: 'Ease',
    maxLabel: 'Tight',
    blurb:
      'A line from the top of the mast down to the end of the boom. It lifts the boom. Under sail it works against the vang — more lift means a more open back edge and more twist.',
    tip: 'Line from masthead to boom tip. Raises the boom and opens the sail’s back edge.',
  },
  outhaul: {
    label: 'Outhaul',
    plain: 'Stretches the bottom of the sail along the boom',
    minLabel: 'Ease',
    maxLabel: 'Tight',
    blurb:
      'Pulls the sail’s bottom corner out along the boom. Tight = flatter “belly” down low. Ease = deeper belly (more curve) in the lower sail.',
    tip: 'Foot tension along the boom. Tight flattens the lower sail; ease makes a deeper belly.',
  },
  halyard: {
    label: 'Halyard',
    plain: 'The rope that hoists the sail and tightens its front edge',
    minLabel: 'Ease',
    maxLabel: 'Tight',
    blurb:
      'Raises the sail and tensions the front edge (the luff, next to the mast). Tight = smoother, flatter sail with the belly farther forward. Ease = wrinkles near the mast and a deeper overall shape.',
    tip: 'Hoists/tensions the front edge of the sail. Tight = flatter; ease = scallops and deeper shape.',
  },
  windAngle: {
    label: 'True wind angle',
    plain: 'Which way the wind is coming from relative to the boat',
    minLabel: 'Close-hauled',
    maxLabel: 'Beam reach',
    blurb:
      'Close-hauled means sailing more toward the wind; beam reach means the wind is more from the side. Change this to see how the same sail trim behaves on different points of sail.',
    tip: 'Angle between the boat’s nose and the wind — from “nearly into the wind” to “wind from the side.”',
  },
  windSpeed: {
    label: 'Wind speed',
    plain: 'How hard the wind is blowing (calm → fresh breeze)',
    minLabel: 'Calm',
    maxLabel: '~25 kn',
    blurb:
      'Stronger wind means more push and more tip — forces grow roughly with speed squared. Watch streamlines speed up and the boat heel more as you turn this up.',
    tip: '0 ≈ calm, 100 ≈ a fresh breeze (~25 knots). Higher wind = more drive and heel.',
  },
}

export type MetricKey =
  | 'drive'
  | 'heelForce'
  | 'speed'
  | 'heel'
  | 'aoa'
  | 'flow'
  | 'draftDepth'
  | 'draftPosition'
  | 'twist'
  | 'boomAngle'

export const METRIC_TIPS: Record<MetricKey, { label: string; tip: string }> = {
  drive: {
    label: 'Drive',
    tip: 'How much the sail is pushing the boat forward (a simple 0–100 teaching gauge — not real horsepower).',
  },
  heelForce: {
    label: 'Heel force',
    tip: 'How hard the wind is trying to tip the boat sideways. High values often mean the sail is over-powered or aimed too sharply into the wind.',
  },
  speed: {
    label: 'Speed',
    tip: 'How fast the boat feels: not moving → very slow → slow → medium → fast → very fast. From drive vs drag — not real knots.',
  },
  heel: {
    label: 'Heel',
    tip: 'How far the boat leans. More lean usually means more sideways force from the sail.',
  },
  aoa: {
    label: 'AoA',
    tip: 'Angle of attack — how “edge-on vs broadside” the sail meets the wind. Too small: sail flaps (luffs). Too big: wind peels off and you stall.',
  },
  flow: {
    label: 'Flow',
    tip: 'Attached = wind follows the sail smoothly (good lift). Marginal = on the edge. Stalled = messy flow, more tip/drag than useful push.',
  },
  draftDepth: {
    label: 'Draft depth',
    tip: 'How deep the sail’s belly (curve) is. Deeper belly → more power, but also more tip and drag.',
  },
  draftPosition: {
    label: 'Draft position',
    tip: 'Where the deepest part of the belly sits — closer to the mast (forward) or farther back. Forward often helps “pointing”; aft can feel powerful but draggy.',
  },
  twist: {
    label: 'Twist',
    tip: 'How much the top of the sail is more open than the bottom. A bit of twist is normal; too much spills power up high.',
  },
  boomAngle: {
    label: 'Boom angle',
    tip: 'How far the boom (and bottom of the sail) sits off the boat’s centerline. Mostly set by mainsheet and traveler.',
  },
}

export type LearnSection = {
  title: string
  paragraphs: string[]
}

export const LEARN_SECTIONS: LearnSection[] = [
  {
    title: 'Sails work like soft wings',
    paragraphs: [
      'Air flowing around a curved sail creates a sideways pull (sailors call it lift). Part of that pull goes forward — that’s what makes the boat go — and part tips the boat.',
      'Angle of attack (AoA) is simply how the sail is aimed into the wind. A little angle = useful push. Pointed too edge-on = the sail flaps. Aimed too broadside = the wind “peels off” (stall) and you get more tip than speed.',
    ],
  },
  {
    title: 'Belly (draft) and twist',
    paragraphs: [
      'Draft is the sail’s belly — how deep the curve is, and where the deepest part sits. A deeper belly grabs more power; a flatter sail is easier to control when it’s windy.',
      'Twist means the top of the sail is more open than the bottom. Wind is usually stronger up high, so a little twist helps the whole sail work evenly instead of stalling at the top.',
    ],
  },
  {
    title: 'What you’re moving with the dials',
    paragraphs: [
      'Mainsheet and traveler aim the boom (and therefore the sail) left/right and in/out. The vang pulls the boom down; the topping lift holds it up. Outhaul stretches the bottom edge; the halyard tightens the front edge by the mast.',
      'Click any control card (or drag its slider) to select it — the matching part glows on the boat, and the bottom blurb explains what it does. Then glance at Drive, Heel, and Flow to see if the trim got better or worse.',
    ],
  },
  {
    title: 'Reading the numbers',
    paragraphs: [
      'Drive / Speed ≈ “are we going forward?” Heel force / Heel ≈ “are we tipping?” Flow tells you if the wind is still hugging the sail or has stalled.',
      'This is a teaching model, not a racing simulator. Experiment: change one dial, watch the sail and streamlines, and see what the gauges do.',
    ],
  },
]

export const APP_TAGLINE =
  'Trim a mainsail with real controls — see shape, wind flow, and boat tip update live.'
