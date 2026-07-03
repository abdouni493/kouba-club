import { useState, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  type HTMLMotionProps,
  type MotionValue,
} from 'framer-motion';

/* Pointer-driven 3D tilt + cursor spotlight primitives (public site).
   Physical pointer coordinates only — symmetric math, so RTL mirrors gracefully.
   Disabled on coarse/touch pointers and under prefers-reduced-motion. */

const finePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function useTilt(maxTilt: number) {
  const reduce = useReducedMotion();
  const [fine] = useState(finePointer);
  const enabled = !reduce && fine;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hover = useMotionValue(0);

  const sx = useSpring(px, { stiffness: 260, damping: 24 });
  const sy = useSpring(py, { stiffness: 260, damping: 24 });
  const glowOpacity = useSpring(hover, { stiffness: 180, damping: 26 });

  const rotateX = useTransform(sy, [0, 1], [maxTilt, -maxTilt]);
  const rotateY = useTransform(sx, [0, 1], [-maxTilt, maxTilt]);
  const gx = useTransform(sx, (v) => `${v * 100}%`);
  const gy = useTransform(sy, (v) => `${v * 100}%`);
  const highlight = useMotionTemplate`radial-gradient(300px circle at ${gx} ${gy}, rgb(var(--accent) / 0.16), transparent 65%)`;

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
    hover.set(1);
  };
  const onPointerLeave = () => {
    px.set(0.5);
    py.set(0.5);
    hover.set(0);
  };

  return {
    enabled,
    tiltStyle: enabled ? { rotateX, rotateY, transformPerspective: 900 } : {},
    highlight,
    glowOpacity,
    handlers: { onPointerMove, onPointerLeave },
  };
}

function SpecularHighlight({ background, opacity }: { background: MotionValue<string>; opacity: MotionValue<number> }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20"
      style={{ background, opacity }}
    />
  );
}

/* motion elements type `children` as possibly a MotionValue; narrow it so it can sit next to the highlight overlay */
type MotionProps<T extends 'div' | 'button'> = Omit<HTMLMotionProps<T>, 'children'> & { children?: ReactNode };
type TiltProps = { maxTilt?: number };

/* Host element needs `relative overflow-hidden` for the specular highlight to clip correctly. */
export function TiltCard({ maxTilt = 7, children, style, ...rest }: MotionProps<'div'> & TiltProps) {
  const { enabled, tiltStyle, highlight, glowOpacity, handlers } = useTilt(maxTilt);
  return (
    <motion.div {...rest} {...handlers} style={{ ...style, ...tiltStyle }}>
      {children}
      {enabled && <SpecularHighlight background={highlight} opacity={glowOpacity} />}
    </motion.div>
  );
}

export function TiltButton({ maxTilt = 6, children, style, ...rest }: MotionProps<'button'> & TiltProps) {
  const { enabled, tiltStyle, highlight, glowOpacity, handlers } = useTilt(maxTilt);
  return (
    <motion.button {...rest} {...handlers} style={{ ...style, ...tiltStyle }}>
      {children}
      {enabled && <SpecularHighlight background={highlight} opacity={glowOpacity} />}
    </motion.button>
  );
}

/* Soft orange radial glow that tracks the cursor inside the card, fading on enter/leave. */
export function SpotlightCard({ children, style, ...rest }: MotionProps<'div'>) {
  const reduce = useReducedMotion();
  const [fine] = useState(finePointer);
  const enabled = !reduce && fine;

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const hover = useMotionValue(0);
  const opacity = useSpring(hover, { stiffness: 120, damping: 22 });
  const spotlight = useMotionTemplate`radial-gradient(460px circle at ${mx}px ${my}px, rgb(var(--accent) / 0.1), transparent 70%)`;

  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - r.left);
    my.set(e.clientY - r.top);
    hover.set(1);
  };

  return (
    <motion.div {...rest} style={style} onPointerMove={onPointerMove} onPointerLeave={() => hover.set(0)}>
      {enabled && (
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 z-0" style={{ background: spotlight, opacity }} />
      )}
      {children}
    </motion.div>
  );
}
