import { useMemo, useState } from 'react'
import {
  GOAL_META,
  suggestForGoal,
  type GoalKind,
} from '../sail/coaching'
import type { SailControls } from '../sail/types'

const GOAL_ORDER: GoalKind[] = ['lessHeel', 'faster', 'slower']

type GoalOverlayProps = {
  controls: SailControls
  onApplyPatch: (patch: Partial<SailControls>) => void
}

/** Goal buttons + advice card overlaid on the 3D view. */
export function GoalOverlay({ controls, onApplyPatch }: GoalOverlayProps) {
  const [goal, setGoal] = useState<GoalKind | null>(null)

  const advice = useMemo(
    () => (goal ? suggestForGoal(goal, controls) : []),
    [goal, controls],
  )

  return (
    <aside className="goal-overlay" aria-label="Trim goals">
      <div className="goal-overlay-head">
        <p className="goal-coach-title">What do you want?</p>
        <p className="goal-coach-plain">Pick a goal for trim ideas</p>
      </div>
      <div className="goal-btn-row" role="group" aria-label="Goals">
        {GOAL_ORDER.map((key) => {
          const meta = GOAL_META[key]
          const selected = goal === key
          return (
            <button
              key={key}
              type="button"
              className={`goal-btn ${selected ? 'is-active' : ''}`}
              aria-pressed={selected}
              title={meta.plain}
              onClick={() => setGoal((prev) => (prev === key ? null : key))}
            >
              <span className="goal-btn-label">{meta.label}</span>
              <span className="goal-btn-plain">{meta.plain}</span>
            </button>
          )
        })}
      </div>

      {goal ? (
        <div className="goal-advice" aria-live="polite">
          <div className="goal-advice-top">
            <p className="goal-advice-title">Try this</p>
            <button type="button" className="goal-dismiss" onClick={() => setGoal(null)}>
              Dismiss
            </button>
          </div>
          <ul className="goal-advice-list">
            {advice.map((item) => (
              <li key={item.id} className="goal-advice-item">
                <div className="goal-advice-copy">
                  <p className="goal-advice-headline">
                    {item.kind === 'combo' ? (
                      <span className="goal-badge">Combo</span>
                    ) : null}
                    {item.kind === 'wind' ? (
                      <span className="goal-badge">Wind</span>
                    ) : null}
                    {item.headline}
                  </p>
                  <p className="goal-advice-detail">{item.detail}</p>
                  <p className="goal-advice-tradeoff">{item.tradeoff}</p>
                </div>
                <button
                  type="button"
                  className="goal-apply"
                  onClick={() => onApplyPatch(item.patch)}
                >
                  Apply
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  )
}
