import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';

/* Lazy-loaded WebGL hero backdrop: an abstract orange "energy" cluster (particle shell +
   wireframe icosahedrons) behind the club name. Colors come from the live CSS variables so
   dark/light theme and future rebranding retint the scene automatically. */

function cssRgb(name: string, fallback: [number, number, number]) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/\s+/).map(Number);
  const [r, g, b] = parts.length === 3 && parts.every((n) => !Number.isNaN(n)) ? parts : fallback;
  return new THREE.Color(`rgb(${r}, ${g}, ${b})`);
}

function readTheme() {
  return {
    accent: cssRgb('--accent', [255, 90, 0]),
    soft: cssRgb('--accent-soft', [255, 160, 60]),
    strong: cssRgb('--accent-strong', [194, 65, 12]),
    isLight: document.documentElement.classList.contains('light'),
  };
}

type Theme = ReturnType<typeof readTheme>;

function useTheme() {
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

function ParallaxRig({ animate }: { animate: boolean }) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!animate) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [animate]);

  useFrame(({ camera }) => {
    if (!animate) return;
    const tx = THREE.MathUtils.clamp(pointer.current.x, -1, 1) * 0.55;
    const ty = THREE.MathUtils.clamp(-pointer.current.y, -1, 1) * 0.3;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

const PARTICLE_COUNT = 380;

function EnergyCluster({ theme, animate }: { theme: Theme; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  /* Additive glow reads well on black; on the light theme it washes toward white, so fall back to normal blending. */
  const blending = theme.isLight ? THREE.NormalBlending : THREE.AdditiveBlending;

  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // hollow, vertically squashed sphere shell — abstract energy cloud, not a literal ball
      const radius = 2.1 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.cos(phi) * 0.55;
      arr[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) * 0.8;
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += delta * 0.06;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
  });

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={theme.accent}
          size={0.035}
          sizeAttenuation
          transparent
          opacity={theme.isLight ? 0.55 : 0.85}
          depthWrite={false}
          blending={blending}
        />
      </points>

      <Float speed={animate ? 1.2 : 0} rotationIntensity={0.5} floatIntensity={0.6}>
        <mesh position={[0, 0.1, 0]}>
          <icosahedronGeometry args={[1.15, 0]} />
          <meshBasicMaterial color={theme.accent} wireframe transparent opacity={theme.isLight ? 0.35 : 0.5} depthWrite={false} blending={blending} />
        </mesh>
      </Float>
      <Float speed={animate ? 1.6 : 0} rotationIntensity={0.7} floatIntensity={0.8}>
        <mesh position={[-2.3, 0.5, -0.7]}>
          <icosahedronGeometry args={[0.55, 0]} />
          <meshBasicMaterial color={theme.strong} wireframe transparent opacity={theme.isLight ? 0.4 : 0.55} depthWrite={false} blending={blending} />
        </mesh>
      </Float>
      <Float speed={animate ? 1.4 : 0} rotationIntensity={0.6} floatIntensity={0.7}>
        <mesh position={[2.4, -0.45, -0.9]}>
          <icosahedronGeometry args={[0.4, 0]} />
          <meshBasicMaterial color={theme.soft} wireframe transparent opacity={theme.isLight ? 0.4 : 0.55} depthWrite={false} blending={blending} />
        </mesh>
      </Float>

      <Sparkles
        count={70}
        scale={[7, 3.2, 4]}
        size={2.2}
        speed={animate ? 0.35 : 0}
        color={theme.isLight ? theme.strong : theme.soft}
        opacity={theme.isLight ? 0.5 : 0.65}
      />
    </group>
  );
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function HeroScene() {
  const wrapper = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);
  const [reduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const theme = useTheme();
  // reduced motion → 'demand' renders one static frame; out of view → stop rendering entirely
  const animate = inView && !reduce;

  useEffect(() => {
    const el = wrapper.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapper} aria-hidden className="absolute inset-0 pointer-events-none animate-fade-up">
      <SceneErrorBoundary>
        <Canvas
          frameloop={animate ? 'always' : 'demand'}
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{ alpha: true, antialias: false, powerPreference: 'default' }}
          style={{ background: 'transparent' }}
        >
          <ParallaxRig animate={animate} />
          <EnergyCluster theme={theme} animate={animate} />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
