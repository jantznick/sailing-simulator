import { Line, RoundedBox } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Quaternion,
  Vector3,
  type Mesh,
  type MeshStandardMaterial,
} from 'three'
import {
  boomPoint,
  boomTip,
  boomYawRad,
  travelerCarX,
} from '../sail/model'
import type { ControlKey, SailShape } from '../sail/types'

type BoatProps = {
  shape: SailShape
  traveler: number
  boomVang: number
  toppingLift: number
  speed: number
  activeControl: ControlKey | null
}

const TRACK_Z = -1.2
const TRACK_Y = 0.56
const TRACK_HALF = 0.46
const HULL_COLOR = '#2c566c'
const DECK_COLOR = '#d2c4a8'
const TRIM_COLOR = '#a89070'
const ACCENT = '#3db8a0'
const HIGHLIGHT = '#ffe08a'

/** Rounded daysailer with hardware highlights for the active control. */
export function Boat({
  shape,
  traveler,
  boomVang,
  toppingLift,
  speed,
  activeControl,
}: BoatProps) {
  const boomLen = shape.boomLength
  const yaw = boomYawRad(shape.boomAngleDeg)
  const tip = boomTip(shape)
  const sheetBlock = boomPoint(shape, 0.88)
  const outhaulPoint = boomPoint(shape, 0.96)

  const vang01 = boomVang / 100
  const lift01 = toppingLift / 100
  const vangAttachT = 0.52 - vang01 * 0.26
  const vangBoom = boomPoint(shape, vangAttachT)
  const vangBase: [number, number, number] = [0.04, 0.48, 0.1]

  const carX = travelerCarX(traveler / 100, TRACK_HALF)
  const carPos: [number, number, number] = [carX, TRACK_Y + 0.035, TRACK_Z]

  const sheetOn = activeControl === 'mainsheet'
  const travelerOn = activeControl === 'traveler'
  const vangOn = activeControl === 'boomVang'
  const liftOn = activeControl === 'toppingLift'
  const outhaulOn = activeControl === 'outhaul'
  const halyardOn = activeControl === 'halyard'

  const trackMat = useRef<MeshStandardMaterial>(null)
  const carMat = useRef<MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 5)
    if (trackMat.current) {
      trackMat.current.emissiveIntensity = travelerOn ? 0.35 + pulse * 0.35 : 0
      trackMat.current.color.set(travelerOn ? HIGHLIGHT : '#3a4550')
      trackMat.current.emissive.set(travelerOn ? HIGHLIGHT : '#000000')
    }
    if (carMat.current) {
      carMat.current.emissiveIntensity = travelerOn ? 0.45 + pulse * 0.4 : 0
      carMat.current.color.set(travelerOn ? HIGHLIGHT : '#c45c3e')
      carMat.current.emissive.set(travelerOn ? HIGHLIGHT : '#000000')
    }
  })

  return (
    <group>
      <DaysailerHull />
      <DeckAndCuddy />
      <RudderAndTiller />
      <HeadingMark />
      <Wake speed={speed} />

      <mesh position={[0, shape.mastHeight * 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.038, 0.048, shape.mastHeight, 16]} />
        <meshStandardMaterial color="#e2dccf" roughness={0.32} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.09, 0.09, 12]} />
        <meshStandardMaterial color="#5c4a36" roughness={0.75} />
      </mesh>

      <GlowSphere position={[0, shape.mastHeight - 0.02, 0]} radius={0.07} active={halyardOn} />

      <group position={[0, shape.boomElevation, 0]} rotation={[0, yaw, 0]}>
        <mesh position={[boomLen * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.028, 0.034, boomLen, 12]} />
          <meshStandardMaterial color="#e2dccf" roughness={0.38} metalness={0.12} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial color="#6a6358" metalness={0.45} roughness={0.35} />
        </mesh>
        <mesh position={[boomLen, 0, 0]}>
          <sphereGeometry args={[0.032, 10, 10]} />
          <meshStandardMaterial color="#6a6358" metalness={0.35} roughness={0.4} />
        </mesh>
      </group>

      <GlowSphere position={outhaulPoint} radius={0.08} active={outhaulOn} />
      <GlowSphere
        position={[sheetBlock[0], sheetBlock[1] - 0.02, sheetBlock[2]]}
        radius={0.065}
        active={sheetOn}
      />

      <group>
        <mesh position={[0, TRACK_Y, TRACK_Z]} castShadow>
          <boxGeometry args={[TRACK_HALF * 2 + 0.06, 0.025, 0.055]} />
          <meshStandardMaterial
            ref={trackMat}
            color="#3a4550"
            metalness={0.45}
            roughness={0.4}
            emissive="#000000"
            emissiveIntensity={0}
          />
        </mesh>
        <mesh position={carPos} castShadow>
          <RoundedBox args={[0.11, 0.05, 0.09]} radius={0.015} smoothness={3}>
            <meshStandardMaterial
              ref={carMat}
              color="#c45c3e"
              metalness={0.25}
              roughness={0.45}
              emissive="#000000"
              emissiveIntensity={0}
            />
          </RoundedBox>
        </mesh>
      </group>

      <Line
        points={[carPos, [sheetBlock[0], sheetBlock[1] - 0.02, sheetBlock[2]]]}
        color={sheetOn ? HIGHLIGHT : '#e8dcc8'}
        lineWidth={sheetOn ? 3.5 : 2}
      />

      <VangStrut
        from={vangBase}
        to={[vangBoom[0], vangBoom[1] - 0.03, vangBoom[2]]}
        tension={vang01}
        active={vangOn}
      />
      <Line
        points={[vangBase, [vangBoom[0], vangBoom[1] - 0.03, vangBoom[2]]]}
        color={vangOn ? HIGHLIGHT : vang01 > 0.6 ? '#6e5640' : '#b8a88c'}
        lineWidth={(vangOn ? 3 : 1.5) + vang01 * 1.5}
      />

      <Line
        points={[
          [0, shape.mastHeight - 0.05, 0],
          [tip[0], tip[1] + 0.02, tip[2]],
        ]}
        color={liftOn ? HIGHLIGHT : '#c5b9a0'}
        lineWidth={(liftOn ? 3 : 1) + lift01}
        opacity={liftOn ? 0.95 : 0.35 + lift01 * 0.55}
        transparent
      />
    </group>
  )
}

function GlowSphere({
  position,
  radius,
  active,
}: {
  position: [number, number, number]
  radius: number
  active: boolean
}) {
  const matRef = useRef<MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (!matRef.current) return
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 5)
    matRef.current.emissiveIntensity = active ? 0.4 + pulse * 0.55 : 0
    matRef.current.opacity = active ? 0.55 + pulse * 0.35 : 0
  })
  return (
    <mesh position={position} visible={active}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color={HIGHLIGHT}
        emissive={HIGHLIGHT}
        emissiveIntensity={0.5}
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </mesh>
  )
}

function DaysailerHull() {
  const geometry = useMemo(() => createHullGeometry(), [])
  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={HULL_COLOR}
          roughness={0.42}
          metalness={0.08}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.12, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.045, 1.55, 8]} />
        <meshStandardMaterial color="#1a303c" roughness={0.65} />
      </mesh>
      <mesh position={[0, -0.28, 0.2]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[0.1, 0.06, 0.5]} />
        <meshStandardMaterial color="#152830" roughness={0.6} />
      </mesh>
    </group>
  )
}

type Station = {
  z: number
  halfWl: number
  halfSheer: number
  sheerY: number
  keelY: number
}

/** Shared hull stations — deck plan follows these sheer points. */
const HULL_STATIONS: Station[] = [
  { z: -1.9, halfWl: 0.34, halfSheer: 0.42, sheerY: 0.58, keelY: 0.1 },
  { z: -1.55, halfWl: 0.42, halfSheer: 0.5, sheerY: 0.52, keelY: 0.02 },
  { z: -1.1, halfWl: 0.48, halfSheer: 0.55, sheerY: 0.48, keelY: -0.04 },
  { z: -0.55, halfWl: 0.52, halfSheer: 0.58, sheerY: 0.45, keelY: -0.09 },
  { z: 0.0, halfWl: 0.51, halfSheer: 0.57, sheerY: 0.44, keelY: -0.11 },
  { z: 0.5, halfWl: 0.47, halfSheer: 0.53, sheerY: 0.46, keelY: -0.08 },
  { z: 0.95, halfWl: 0.38, halfSheer: 0.46, sheerY: 0.5, keelY: -0.03 },
  { z: 1.35, halfWl: 0.26, halfSheer: 0.36, sheerY: 0.57, keelY: 0.04 },
  { z: 1.7, halfWl: 0.12, halfSheer: 0.22, sheerY: 0.66, keelY: 0.14 },
  { z: 1.95, halfWl: 0.04, halfSheer: 0.1, sheerY: 0.72, keelY: 0.22 },
  { z: 2.15, halfWl: 0.008, halfSheer: 0.02, sheerY: 0.78, keelY: 0.32 },
]

function createHullGeometry(): BufferGeometry {
  const stations = HULL_STATIONS
  const segs = 18
  const positions: number[] = []
  const indices: number[] = []

  for (const s of stations) {
    for (let k = 0; k <= segs; k++) {
      const t = k / segs
      const a = Math.PI * t
      const depth = Math.sin(a)
      const side = -Math.cos(a)
      const beam =
        s.halfSheer * Math.pow(1 - depth, 1.15) +
        s.halfWl * Math.sin(Math.PI * depth) * 0.95
      const x = side * Math.max(beam, 0.001 * (1 - depth))
      const y = s.sheerY + (s.keelY - s.sheerY) * (0.08 + 0.92 * depth)
      positions.push(x, y, s.z)
    }
  }

  const ptsPer = segs + 1
  for (let i = 0; i < stations.length - 1; i++) {
    const a0 = i * ptsPer
    const b0 = (i + 1) * ptsPer
    for (let k = 0; k < segs; k++) {
      const a = a0 + k
      const b = a0 + k + 1
      const c = b0 + k
      const d = b0 + k + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const mid = Math.floor(segs / 2)
  for (let k = 0; k < mid; k++) {
    indices.push(0 + k, 0 + k + 1, segs - k)
    if (k + 1 < mid) indices.push(0 + k + 1, segs - k - 1, segs - k)
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * Gunwale-to-gunwale deck cap using the same sheer X/Z as the hull stations.
 * Tiny outward lip seals the hollow hull; cockpit is an open well amidships.
 */
function createDeckGeometry(): BufferGeometry {
  const stations = HULL_STATIONS
  const positions: number[] = []
  const indices: number[] = []
  // Slightly proud of sheer so the cap visually seals the hull rim.
  const yLift = 0.004
  const lip = 0.012
  const cockpitAft = -1.22
  const cockpitFwd = 0.18

  // Per station: port outer, port inner, stbd inner, stbd outer
  for (const s of stations) {
    const outer = s.halfSheer + lip
    const y = s.sheerY + yLift
    const inCockpit = s.z > cockpitAft && s.z < cockpitFwd
    // Side decks in cockpit; full cover fore & aft (gunwale to gunwale).
    const inner = inCockpit ? Math.max(outer * 0.48, 0.2) : 0.0
    positions.push(-outer, y, s.z)
    positions.push(-inner, y, s.z)
    positions.push(inner, y, s.z)
    positions.push(outer, y, s.z)
  }

  const pts = 4
  for (let i = 0; i < stations.length - 1; i++) {
    const a = i * pts
    const b = (i + 1) * pts
    const z0 = stations[i]!.z
    const z1 = stations[i + 1]!.z
    const zMid = (z0 + z1) / 2

    // Port & starboard side strips (always — these are the gunwale caps)
    indices.push(a, b, a + 1, a + 1, b, b + 1)
    indices.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3)

    // Full center fill on foredeck and aft deck
    if (zMid >= cockpitFwd || zMid <= cockpitAft) {
      indices.push(a + 1, b + 1, a + 2, a + 2, b + 1, b + 2)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/** Vertical gunwale face from deck lip down a touch — hides any hairline seam. */
function createGunwaleBandGeometry(): BufferGeometry {
  const stations = HULL_STATIONS
  const positions: number[] = []
  const indices: number[] = []
  const lip = 0.012
  const band = 0.045

  for (const s of stations) {
    const x = s.halfSheer + lip
    const yTop = s.sheerY + 0.004
    const yBot = s.sheerY - band
    // port top/bot, stbd top/bot
    positions.push(-x, yTop, s.z, -x, yBot, s.z, x, yTop, s.z, x, yBot, s.z)
  }

  const pts = 4
  for (let i = 0; i < stations.length - 1; i++) {
    const a = i * pts
    const b = (i + 1) * pts
    // port face
    indices.push(a, a + 1, b, b, a + 1, b + 1)
    // stbd face
    indices.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3)
  }

  // Transom deck edge strip
  const t0 = 0
  indices.push(t0, t0 + 2, t0 + 1, t0 + 1, t0 + 2, t0 + 3)

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function createCuddyGeometry(): BufferGeometry {
  // Tapered cabin sitting on the deck surface (sheerY), narrower than halfSheer.
  const slices = [
    { z: 0.35, half: 0.32, y0: 0.47, y1: 0.78 },
    { z: 0.58, half: 0.34, y0: 0.47, y1: 0.86 },
    { z: 0.85, half: 0.3, y0: 0.5, y1: 0.9 },
    { z: 1.1, half: 0.22, y0: 0.54, y1: 0.84 },
    { z: 1.28, half: 0.12, y0: 0.58, y1: 0.74 },
  ]
  const positions: number[] = []
  const indices: number[] = []
  // Each slice: 6 points around a rounded rect (bottom L/R, mid L/R, top L/R)
  for (const s of slices) {
    const r = 0.06
    positions.push(-s.half, s.y0, s.z)
    positions.push(s.half, s.y0, s.z)
    positions.push(-s.half, s.y0 + (s.y1 - s.y0) * 0.55, s.z)
    positions.push(s.half, s.y0 + (s.y1 - s.y0) * 0.55, s.z)
    positions.push(-(s.half - r), s.y1, s.z)
    positions.push(s.half - r, s.y1, s.z)
  }
  const pts = 6
  for (let i = 0; i < slices.length - 1; i++) {
    const a = i * pts
    const b = (i + 1) * pts
    // sides
    indices.push(a, b, a + 2, a + 2, b, b + 2)
    indices.push(a + 1, a + 3, b + 1, b + 1, a + 3, b + 3)
    // roof
    indices.push(a + 4, b + 4, a + 5, a + 5, b + 4, b + 5)
    // lower sides to mid
    indices.push(a + 2, b + 2, a + 4, a + 4, b + 2, b + 4)
    indices.push(a + 3, a + 5, b + 3, b + 3, a + 5, b + 5)
  }
  // Front & back caps
  const last = (slices.length - 1) * pts
  indices.push(0, 1, 5, 0, 5, 4, 0, 4, 2, 1, 3, 5)
  indices.push(last, last + 4, last + 5, last, last + 5, last + 1, last, last + 2, last + 4, last + 1, last + 5, last + 3)

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function DeckAndCuddy() {
  const deckGeo = useMemo(() => createDeckGeometry(), [])
  const gunwaleGeo = useMemo(() => createGunwaleBandGeometry(), [])
  const cuddyGeo = useMemo(() => createCuddyGeometry(), [])
  useEffect(() => {
    return () => {
      deckGeo.dispose()
      gunwaleGeo.dispose()
      cuddyGeo.dispose()
    }
  }, [deckGeo, gunwaleGeo, cuddyGeo])

  // Coaming sits on fitted side decks inside the cockpit opening
  const coamZ0 = -1.15
  const coamZ1 = 0.15
  // Match side-deck inner edge (~0.48 * (halfSheer+lip) at mid-cockpit)
  const coamHalf = 0.28

  return (
    <group>
      <mesh geometry={deckGeo} castShadow receiveShadow>
        <meshStandardMaterial color={DECK_COLOR} roughness={0.68} side={DoubleSide} />
      </mesh>
      <mesh geometry={gunwaleGeo} castShadow>
        <meshStandardMaterial color={HULL_COLOR} roughness={0.45} side={DoubleSide} />
      </mesh>

      <mesh geometry={cuddyGeo} castShadow receiveShadow>
        <meshStandardMaterial color="#ddd1bc" roughness={0.55} side={DoubleSide} />
      </mesh>
      <mesh position={[0.33, 0.72, 0.78]} rotation={[0, 0.05, 0]}>
        <boxGeometry args={[0.012, 0.11, 0.42]} />
        <meshStandardMaterial color="#7aa0b4" metalness={0.35} roughness={0.2} />
      </mesh>
      <mesh position={[-0.33, 0.72, 0.78]} rotation={[0, -0.05, 0]}>
        <boxGeometry args={[0.012, 0.11, 0.42]} />
        <meshStandardMaterial color="#7aa0b4" metalness={0.35} roughness={0.2} />
      </mesh>

      <RoundedBox args={[0.16, 0.02, 0.2]} radius={0.015} position={[0, 0.58, 1.48]}>
        <meshStandardMaterial color="#6e5c48" roughness={0.7} />
      </RoundedBox>

      {/* Cockpit sole — recessed inside the opening */}
      <mesh position={[0, 0.34, -0.5]} receiveShadow>
        <boxGeometry args={[0.5, 0.05, 1.1]} />
        <meshStandardMaterial color="#4a3c2e" roughness={0.88} />
      </mesh>

      <RoundedBox
        args={[0.045, 0.12, coamZ1 - coamZ0]}
        radius={0.015}
        position={[coamHalf, 0.52, (coamZ0 + coamZ1) / 2]}
        castShadow
      >
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.65} />
      </RoundedBox>
      <RoundedBox
        args={[0.045, 0.12, coamZ1 - coamZ0]}
        radius={0.015}
        position={[-coamHalf, 0.52, (coamZ0 + coamZ1) / 2]}
        castShadow
      >
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.65} />
      </RoundedBox>
      <RoundedBox
        args={[coamHalf * 2 + 0.04, 0.1, 0.045]}
        radius={0.015}
        position={[0, 0.52, coamZ1]}
        castShadow
      >
        <meshStandardMaterial color={TRIM_COLOR} roughness={0.65} />
      </RoundedBox>

      <RoundedBox
        args={[0.62, 0.055, 0.18]}
        radius={0.018}
        position={[0, 0.5, TRACK_Z + 0.12]}
        castShadow
      >
        <meshStandardMaterial color="#b8a488" roughness={0.68} />
      </RoundedBox>
    </group>
  )
}

function RudderAndTiller() {
  return (
    <group>
      <mesh position={[0, 0.05, -1.95]} castShadow>
        <boxGeometry args={[0.03, 0.55, 0.28]} />
        <meshStandardMaterial color="#3a4a38" roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.4, -1.78]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.12, 8]} />
        <meshStandardMaterial color="#5c4a36" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.58, -1.2]} rotation={[0.04, 0, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.9, 8]} />
        <meshStandardMaterial color="#8b6914" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.58, -0.78]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.028, 0.028, 0.08, 8]} />
        <meshStandardMaterial color="#6b5020" roughness={0.55} />
      </mesh>
    </group>
  )
}

function HeadingMark() {
  return (
    <group position={[0, 0.56, 2.05]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.055, 0.14, 6]} />
        <meshStandardMaterial
          color={ACCENT}
          roughness={0.45}
          metalness={0.12}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}

function Wake({ speed }: { speed: number }) {
  const opacity = 0.06 + speed * 0.28
  const length = 0.7 + speed * 1.5
  return (
    <mesh position={[0, 0.02, -2.0 - length * 0.35]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.28 + speed * 0.3, length]} />
      <meshBasicMaterial color="#d8eef5" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

function VangStrut({
  from,
  to,
  tension,
  active,
}: {
  from: [number, number, number]
  to: [number, number, number]
  tension: number
  active: boolean
}) {
  const meshRef = useRef<Mesh>(null)
  const { mid, len, quat } = useMemo(() => {
    const dx = to[0] - from[0]
    const dy = to[1] - from[1]
    const dz = to[2] - from[2]
    const length = Math.hypot(dx, dy, dz) || 0.01
    const midPoint: [number, number, number] = [
      (from[0] + to[0]) / 2,
      (from[1] + to[1]) / 2,
      (from[2] + to[2]) / 2,
    ]
    const orientation = new Quaternion()
    orientation.setFromUnitVectors(
      new Vector3(0, 1, 0),
      new Vector3(dx / length, dy / length, dz / length),
    )
    return { mid: midPoint, len: length, quat: orientation }
  }, [from, to])

  const radius = 0.015 + tension * 0.012

  useFrame(({ clock }) => {
    const mat = meshRef.current?.material as MeshStandardMaterial | undefined
    if (!mat) return
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 5)
    mat.emissive.set(active ? HIGHLIGHT : '#000000')
    mat.emissiveIntensity = active ? 0.35 + pulse * 0.4 : 0
    mat.color.set(active ? HIGHLIGHT : tension > 0.55 ? '#8a7358' : '#a09078')
  })

  return (
    <mesh ref={meshRef} position={mid} quaternion={quat} castShadow>
      <cylinderGeometry args={[radius * 0.85, radius, len * 0.92, 10]} />
      <meshStandardMaterial
        color={tension > 0.55 ? '#8a7358' : '#a09078'}
        metalness={0.35 + tension * 0.25}
        roughness={0.45}
        emissive="#000000"
        emissiveIntensity={0}
      />
    </mesh>
  )
}
