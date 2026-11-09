import { useState } from 'react'
import {
  APP_TAGLINE,
  CONTROL_META,
  METRIC_TIPS,
  type MetricKey,
} from '../sail/explainers'
import { flowLabel, speedLabel, type SailForces } from '../sail/forces'
import { formatShapeReadout } from '../sail/model'
import type { ControlKey, SailControls, SailShape } from '../sail/types'
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery'
import { Expandable } from './Expandable'
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
  const isMobile = useMediaQuery(MOBILE_QUERY)
  const readout = formatShapeReadout(shape)
  const activeKey = active ?? 'mainsheet'
  const explainer = CONTROL_META[activeKey]
  const flowClass = `flow-pill flow-${forces.flow}`

  // Mobile starts collapsed to leave room for the scene + dials.
  const [metersOpen, setMetersOpen] = useState(false)
  const [shapeOpen, setShapeOpen] = useState(false)
  const [explainerOpen, setExplainerOpen] = useState(true)

  const drivePct = Math.round(clamp(forces.drive, 0, 1) * 100)
  const heelPct = Math.round(clamp(forces.heeling, 0, 1) * 100)
  const metersSummary = (
    <>
      <span>Drive {drivePct}</span>
      <span className="expandable-summary-sep" aria-hidden="true">
        ·
      </span>
      <span>Heel {heelPct}</span>
      <span className="expandable-summary-sep" aria-hidden="true">
        ·
      </span>
      <span className={flowClass}>{flowLabel(forces.flow, forces.trimMode)}</span>
    </>
  )

  const shapeSummary = (
    <>
      <span>{readout.draftDepth}</span>
      <span className="expandable-summary-sep" aria-hidden="true">
        ·
      </span>
      <span>{readout.twist}</span>
      <span className="expandable-summary-sep" aria-hidden="true">
        ·
      </span>
      <span>{readout.boomAngle}</span>
    </>
  )

  return (
    <aside className="control-panel">
      <div className="panel-chrome">
        <header className="panel-header">
          <div className="panel-header-row">
            <div className="panel-brand-block">
              <p className="brand">Mainsail Lab</p>
              {!isMobile ? <p className="tagline">{APP_TAGLINE}</p> : null}
            </div>
            <button type="button" className="learn-btn" onClick={onOpenLearn}>
              How sails work
            </button>
          </div>
          {isMobile ? <p className="tagline tagline-mobile">{APP_TAGLINE}</p> : null}
        </header>

        {isMobile ? (
          <div className="panel-mobile-sections">
            <Expandable
              title="Boat response"
              summary={metersSummary}
              open={metersOpen}
              onToggle={() => setMetersOpen((v) => !v)}
              className="panel-expandable"
            >
              <PerformanceBlock forces={forces} flowClass={flowClass} />
            </Expandable>

            <Expandable
              title="Sail shape"
              summary={shapeSummary}
              open={shapeOpen}
              onToggle={() => setShapeOpen((v) => !v)}
              className="panel-expandable"
            >
              <ShapeReadouts readout={readout} />
            </Expandable>
          </div>
        ) : (
          <>
            <PerformanceBlock forces={forces} flowClass={flowClass} />
            <ShapeReadouts readout={readout} />
          </>
        )}
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

      {isMobile ? (
        <div aria-live="polite">
          <Expandable
            title={explainer.label}
            summary={explainer.plain}
            open={explainerOpen}
            onToggle={() => setExplainerOpen((v) => !v)}
            className="panel-explainer panel-expandable"
            bodyClassName="explainer-body"
          >
            <p className="explainer-plain">{explainer.plain}</p>
            <p>{explainer.blurb}</p>
          </Expandable>
        </div>
      ) : (
        <section className="panel-explainer explainer" aria-live="polite">
          <h2>{explainer.label}</h2>
          <p className="explainer-plain">{explainer.plain}</p>
          <p>{explainer.blurb}</p>
        </section>
      )}
    </aside>
  )
}

function PerformanceBlock({
  forces,
  flowClass,
}: {
  forces: SailForces
  flowClass: string
}) {
  return (
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
  )
}

function ShapeReadouts({
  readout,
}: {
  readout: ReturnType<typeof formatShapeReadout>
}) {
  return (
    <section className="readouts" aria-label="Live sail shape">
      <Readout metric="draftDepth" value={readout.draftDepth} />
      <Readout metric="draftPosition" value={readout.draftPosition} />
      <Readout metric="twist" value={readout.twist} />
      <Readout metric="boomAngle" value={readout.boomAngle} />
    </section>
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
