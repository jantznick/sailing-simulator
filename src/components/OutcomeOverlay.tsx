import { useMemo, useState } from 'react'
import { predictDialOutcomes } from '../sail/coaching'
import { MOBILE_QUERY, useMediaQuery } from '../hooks/useMediaQuery'
import type { ControlKey, SailControls } from '../sail/types'

type OutcomeOverlayProps = {
  activeControl: ControlKey | null
  controls: SailControls
}

/** Corner card: live predicted ease vs tighten outcomes for the selected dial. */
export function OutcomeOverlay({ activeControl, controls }: OutcomeOverlayProps) {
  const isMobile = useMediaQuery(MOBILE_QUERY)
  // Remounted with a new key when the dial changes, so mobile starts collapsed.
  const [expanded, setExpanded] = useState(false)

  const prediction = useMemo(
    () => (activeControl ? predictDialOutcomes(activeControl, controls) : null),
    [activeControl, controls],
  )

  if (!activeControl || !prediction) return null

  if (isMobile && !expanded) {
    return (
      <aside className="outcome-overlay outcome-overlay-mobile is-collapsed" aria-live="polite">
        <button
          type="button"
          className="overlay-chip"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
        >
          <span className="overlay-chip-kicker">Dial tip</span>
          <span className="overlay-chip-label">{prediction.title}</span>
          <span className="expandable-chevron" aria-hidden="true" />
        </button>
      </aside>
    )
  }

  return (
    <aside
      className={`outcome-overlay ${isMobile ? 'outcome-overlay-mobile' : ''}`}
      aria-live="polite"
    >
      <div className="outcome-head-row">
        <div>
          <p className="outcome-kicker">If you move this dial</p>
          <h2 className="outcome-title">{prediction.title}</h2>
        </div>
        {isMobile ? (
          <button
            type="button"
            className="overlay-collapse"
            aria-expanded={true}
            aria-label="Collapse dial tip"
            onClick={() => setExpanded(false)}
          >
            Hide
          </button>
        ) : null}
      </div>
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
