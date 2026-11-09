import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import type { Group } from 'three'
import { Boat } from './Boat'
import { Sail } from './Sail'
import { WindParticles } from './WindParticles'
import type { SailForces } from '../sail/forces'
import type { ControlKey, SailControls, SailShape } from '../sail/types'

type SceneProps = {
  shape: SailShape
  controls: SailControls
  forces: SailForces
  activeControl: ControlKey | null
}

export function Scene({ shape, controls, forces, activeControl }: SceneProps) {
  return (
    <Canvas
      className="scene-canvas"
      shadows
      camera={{ position: [5.4, 3.5, 4.0], fov: 42, near: 0.1, far: 80 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#8eb8c9']} />
      <fog attach="fog" args={['#9fc0cc', 14, 42]} />
      <Sky
        distance={450}
        sunPosition={[6, 3.5, -4]}
        inclination={0.48}
        azimuth={0.22}
        turbidity={3.5}
        rayleigh={1.35}
      />

      <ambientLight intensity={0.42} />
      <directionalLight
        castShadow
        position={[6, 8, 3]}
        intensity={1.45}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={24}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <hemisphereLight args={['#d7eef7', '#3d5c4a', 0.4]} />

      <Water />

      <HeeledRig
        shape={shape}
        controls={controls}
        forces={forces}
        activeControl={activeControl}
      />

      <OrbitControls
        makeDefault
        target={[0.2, 1.6, -0.2]}
        maxPolarAngle={Math.PI * 0.49}
        minDistance={3}
        maxDistance={14}
        enablePan={false}
      />
    </Canvas>
  )
}

function HeeledRig({
  shape,
  controls,
  forces,
  activeControl,
}: {
  shape: SailShape
  controls: SailControls
  forces: SailForces
  activeControl: ControlKey | null
}) {
  const groupRef = useRef<Group>(null)
  const heelRef = useRef(0)

  useFrame((_, dt) => {
    const group = groupRef.current
    if (!group) return
    const target = (-forces.heelDeg * Math.PI) / 180
    const a = 1 - Math.exp(-6 * Math.min(dt, 0.05))
    heelRef.current += (target - heelRef.current) * a
    group.rotation.z = heelRef.current
    group.position.y = Math.abs(Math.sin(heelRef.current)) * 0.15
  })

  return (
    <group ref={groupRef}>
      <Boat
        shape={shape}
        traveler={controls.traveler}
        boomVang={controls.boomVang}
        toppingLift={controls.toppingLift}
        speed={forces.speed}
        activeControl={activeControl}
      />
      <Sail shape={shape} forces={forces} activeControl={activeControl} />
      <WindParticles
        shape={shape}
        windAngle={controls.windAngle}
        windSpeed={controls.windSpeed}
        forces={forces}
        activeControl={activeControl}
      />
    </group>
  )
}

function Water() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial
        color="#3d8496"
        roughness={0.28}
        metalness={0.22}
        transparent
        opacity={0.94}
      />
    </mesh>
  )
}
