import {
  APP_TAGLINE,
  CONTROL_META,
  METRIC_TIPS,
  type MetricKey,
} from '../sail/explainers'
import { flowLabel, speedLabel, type SailForces } from '../sail/forces'
import { formatShapeReadout } from '../sail/model'
import type { ControlKey, SailControls, SailShape } from '../sail/types'
import { InfoTip } from './InfoTip'

type Metric = MetricKey

const DIAL_ORDER: ControlKey[] = [
  'mainsheet',
  'traveler',
  'boomVang',
  'toppingLift',
  'outhaul',
  'halyard',
  'windAngle',
  'windSpeed',
]

type ControlPanelProps = {
  controls: SailControls
  shape: SailShape
  forces: SailForces
  active: ControlKey | null
  onChange: (key: ControlKey, value: number) => void
  onFocus: (key: ControlKey) => void
  onOpenLearn: () => void
}

export function ControlPanel({
  controls,
  shape,
  forces,
  active,
  onChange,
  onFocus,
  onOpenLearn,
}: ControlPanelProps) {
  const readout = formatShapeReadout(shape)
  const activeKey = active ?? 'mainsheet'
  const explainer = CONTROL_META[activeKey]
  const flowClass = `flow-pill flow-${forces.flow}`

  return (
    <aside className="control-panel">
      <div className="panel-chrome">
        <header className="panel-header">
          <div className="panel-header-row">
            <p className="brand">Mainsail Lab</p>
            <button type="button" className="learn-btn" onClick={onOpenLearn}>
              How sails work
            </button>
          </div>
          <p className="tagline">{APP_TAGLINE}</p>
        </header>

        <section className="performance" aria-label="Boat response">
          <div className="perf-row">
            <Meter metric="drive" value={forces.drive} />
            <Meter metric="heelForce" value={forces.heeling} tone="warn" />
          </div>
          <div className="perf-stats">
            <Stat metric="speed" value={speedLabel(forces.speed)} />
            <Stat metric="heel" value={`${Math.abs(forces.heelDeg).toFixed(0)}°`} />
            <Stat metric="aoa" value={`${forces.aoaDeg.toFixed(0)}°`} />
            <div className="perf-stat">
              <LabelWithTip metric="flow" />
              <span className={flowClass}>{flowLabel(forces.flow, forces.trimMode)}</span>
            </div>
          </div>
        </section>

        <section className="readouts" aria-label="Live sail shape">
          <Readout metric="draftDepth" value={readout.draftDepth} />
          <Readout metric="draftPosition" value={readout.draftPosition} />
          <Readout metric="twist" value={readout.twist} />
          <Readout metric="boomAngle" value={readout.boomAngle} />
        </section>
      </div>

      <section className="panel-dials" aria-label="Sail controls">
        {DIAL_ORDER.map((key) => {
          const meta = CONTROL_META[key]
          const selected = active === key
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              className={`dial ${selected ? 'is-active' : ''}`}
              aria-pressed={selected}
              aria-label={`${meta.label}. ${meta.plain}`}
              onClick={() => onFocus(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onFocus(key)
                }
              }}
            >
              <div className="dial-top">
                <span className="dial-label-block">
                  <span className="dial-label-row">
                    <span className="dial-label">{meta.label}</span>
                    <InfoTip text={meta.tip} label={meta.label} />
                  </span>
                  <span className="dial-plain">{meta.plain}</span>
                </span>
                <span className="dial-value">{Math.round(controls[key])}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={controls[key]}
                aria-label={meta.label}
                onChange={(e) => onChange(key, Number(e.target.value))}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onFocus(key)
                }}
                onClick={(e) => e.stopPropagation()}
                onFocus={() => onFocus(key)}
              />
              <div className="dial-ends">
                <span>{meta.minLabel}</span>
                <span>{meta.maxLabel}</span>
              </div>
            </div>
          )
        })}
      </section>

      <section className="panel-explainer explainer" aria-live="polite">
        <h2>{explainer.label}</h2>
        <p className="explainer-plain">{explainer.plain}</p>
        <p>{explainer.blurb}</p>
      </section>
    </aside>
  )
}

function LabelWithTip({ metric }: { metric: Metric }) {
  const meta = METRIC_TIPS[metric]
  return (
    <span className="label-with-tip">
      <span className="readout-label">{meta.label}</span>
      <InfoTip text={meta.tip} label={meta.label} />
    </span>
  )
}

function Meter({
  metric,
  value,
  tone = 'ok',
}: {
  metric: 'drive' | 'heelForce'
  value: number
  tone?: 'ok' | 'warn'
}) {
  const pct = Math.round(clamp(value, 0, 1) * 100)
  return (
    <div className="meter">
      <div className="meter-top">
        <LabelWithTip metric={metric} />
        <span className="meter-value">{pct}</span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill meter-fill-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Stat({ metric, value }: { metric: Metric; value: string }) {
  return (
    <div className="perf-stat">
      <LabelWithTip metric={metric} />
      <span className="readout-value">{value}</span>
    </div>
  )
}

function Readout({ metric, value }: { metric: Metric; value: string }) {
  return (
    <div className="readout">
      <LabelWithTip metric={metric} />
      <span className="readout-value">{value}</span>
    </div>
  )
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
