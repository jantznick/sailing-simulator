import { useMemo } from 'react'
import { predictDialOutcomes } from '../sail/coaching'
import type { ControlKey, SailControls } from '../sail/types'

type OutcomeOverlayProps = {
  activeControl: ControlKey | null
  controls: SailControls
}

/** Corner card: live predicted ease vs tighten outcomes for the selected dial. */
export function OutcomeOverlay({ activeControl, controls }: OutcomeOverlayProps) {
  const prediction = useMemo(
    () => (activeControl ? predictDialOutcomes(activeControl, controls) : null),
    [activeControl, controls],
  )

  if (!activeControl || !prediction) return null

  return (
    <aside className="outcome-overlay" aria-live="polite">
      <p className="outcome-kicker">If you move this dial</p>
      <h2 className="outcome-title">{prediction.title}</h2>
      <p className="outcome-plain">{prediction.plain}</p>
      <div className="outcome-cols">
        <div className="outcome-col">
          <p className="outcome-col-label">→ {prediction.easeLabel}</p>
          <p className="outcome-pred">{prediction.easeSummary}</p>
        </div>
        <div className="outcome-col">
          <p className="outcome-col-label">→ {prediction.tightLabel}</p>
          <p className="outcome-pred">{prediction.tightSummary}</p>
        </div>
      </div>
      {prediction.note ? <p className="outcome-bias">{prediction.note}</p> : null}
    </aside>
  )
}
