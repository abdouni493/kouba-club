import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { ConvexGeometry } from 'three-stdlib';

/* Lazy-loaded WebGL hero backdrop: slowly spinning wireframe footballs (true truncated
   icosahedrons — the classic hexagon/pentagon ball) inside an orange particle field.
   Colors come from the live CSS variables so dark/light theme and any future rebranding
   retint the scene automatically. `lite` trims counts and sizes for phones. */

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

/* Unit-radius truncated icosahedron seams: the 60 vertices are the cyclic permutations of
   (0, ±1, ±3φ), (±1, ±(2+φ), ±2φ), (±2, ±(1+2φ), ±φ); the convex hull's hard edges are
   exactly the hexagon/pentagon panel seams of a football. Built once and shared. */
let footballSeams: THREE.EdgesGeometry | null = null;
function getFootballSeams() {
  if (footballSeams) return footballSeams;
  const PHI = (1 + Math.sqrt(5)) / 2;
  const base = [
    [0, 1, 3 * PHI],
    [1, 2 + PHI, 2 * PHI],
    [2, 1 + 2 * PHI, PHI],
  ];
  const seen = new Set<string>();
  const points: THREE.Vector3[] = [];
  for (const [a, b, c] of base) {
    for (const [x, y, z] of [[a, b, c], [b, c, a], [c, a, b]]) {
      for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
        const v = new THREE.Vector3(x * sx, y * sy, z * sz);
        const key = v.toArray().map((n) => n.toFixed(3)).join(',');
        if (!seen.has(key)) {
          seen.add(key);
          points.push(v);
        }
      }
    }
  }
  const scale = 1 / points[0].length();
  for (const p of points) p.multiplyScalar(scale);
  footballSeams = new THREE.EdgesGeometry(new ConvexGeometry(points), 10);
  return footballSeams;
}

function Football({
  radius,
  position,
  spin,
  seamColor,
  theme,
  animate,
}: {
  radius: number;
  position: [number, number, number];
  spin: number;
  seamColor: THREE.Color;
  theme: Theme;
  animate: boolean;
}) {
  const ball = useRef<THREE.Group>(null);
  const seams = useMemo(getFootballSeams, []);

  useFrame((_, delta) => {
    if (!animate || !ball.current) return;
    ball.current.rotation.y += delta * spin;
    ball.current.rotation.x += delta * spin * 0.35;
  });

  return (
    <Float speed={animate ? 1.3 : 0} rotationIntensity={0.25} floatIntensity={0.7}>
      <group position={position}>
        <group ref={ball} scale={radius}>
          {/* solid body occludes the rear seams so it reads as a ball, not a cage */}
          <mesh>
            <sphereGeometry args={[0.985, 28, 20]} />
            <meshBasicMaterial color={theme.isLight ? '#ffffff' : '#151517'} />
          </mesh>
          <lineSegments geometry={seams}>
            <lineBasicMaterial
              color={seamColor}
              transparent
              opacity={theme.isLight ? 0.8 : 0.9}
              blending={theme.isLight ? THREE.NormalBlending : THREE.AdditiveBlending}
            />
          </lineSegments>
        </group>
      </group>
    </Float>
  );
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

function EnergyField({ theme, animate, lite }: { theme: Theme; animate: boolean; lite: boolean }) {
  const group = useRef<THREE.Group>(null);
  const blending = theme.isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
  const count = lite ? 220 : 380;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // hollow, vertically squashed sphere shell around the footballs
      const radius = 2.1 + Math.random() * 1.4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = radius * Math.cos(phi) * 0.55;
      arr[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) * 0.8;
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += delta * 0.06;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
  });

  return (
    <group ref={group}>
      <points key={count}>
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
      <Sparkles
        count={lite ? 40 : 70}
        scale={lite ? [4, 3.2, 4] : [7, 3.2, 4]}
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

export default function HeroScene({ lite = false }: { lite?: boolean }) {
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
          dpr={lite ? [1, 1.25] : [1, 1.5]}
          camera={{ position: [0, 0, 6], fov: 45 }}
          gl={{ alpha: true, antialias: false, powerPreference: 'default' }}
          style={{ background: 'transparent' }}
        >
          <ParallaxRig animate={animate} />
          <EnergyField theme={theme} animate={animate} lite={lite} />
          <Football radius={1.25} position={[0, 0.15, 0]} spin={0.15} seamColor={theme.accent} theme={theme} animate={animate} />
          {/* side balls hug the center column on phones so they stay in frame */}
          <Football
            radius={0.55}
            position={lite ? [-1.35, 1.7, -1] : [-2.5, 0.6, -0.9]}
            spin={0.3}
            seamColor={theme.strong}
            theme={theme}
            animate={animate}
          />
          <Football
            radius={0.45}
            position={lite ? [1.4, -1.8, -0.9] : [2.5, -0.5, -1.1]}
            spin={0.25}
            seamColor={theme.accent}
            theme={theme}
            animate={animate}
          />
        </Canvas>
      </SceneErrorBoundary>
    </div>
  );
}
