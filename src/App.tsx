import { useMemo, useState } from 'react'
import { ControlPanel } from './components/ControlPanel'
import { GoalOverlay } from './components/GoalOverlay'
import { LearnModal } from './components/LearnModal'
import { OutcomeOverlay } from './components/OutcomeOverlay'
import { Scene } from './components/Scene'
import { useSmoothedControls } from './hooks/useSmoothedControls'
import { deriveForces } from './sail/forces'
import { deriveShape } from './sail/model'
import { type ControlKey } from './sail/types'
import './styles.css'

export default function App() {
  const { target, smoothed, setControl, applyPatch } = useSmoothedControls()
  const [active, setActive] = useState<ControlKey | null>('mainsheet')
  const [learnOpen, setLearnOpen] = useState(false)

  // Shape + forces follow smoothed values so Apply eases the whole boat.
  const shape = useMemo(() => deriveShape(smoothed), [smoothed])
  const forces = useMemo(() => deriveForces(shape, smoothed), [shape, smoothed])

  const onChange = (key: ControlKey, value: number) => {
    setControl(key, value)
    setActive(key)
  }

  const onApplyPatch = (patch: Partial<typeof target>) => {
    applyPatch(patch)
    const keys = Object.keys(patch) as ControlKey[]
    if (keys[0]) setActive(keys[0])
  }

  return (
    <div className="app">
      <div className="viewport">
        <Scene
          shape={shape}
          controls={smoothed}
          forces={forces}
          activeControl={active}
        />
        <OutcomeOverlay activeControl={active} controls={smoothed} />
        <GoalOverlay controls={target} onApplyPatch={onApplyPatch} />
      </div>
      <ControlPanel
        controls={smoothed}
        shape={shape}
        forces={forces}
        active={active}
        onChange={onChange}
        onFocus={setActive}
        onOpenLearn={() => setLearnOpen(true)}
      />
      <LearnModal open={learnOpen} onClose={() => setLearnOpen(false)} />
    </div>
  )
}
