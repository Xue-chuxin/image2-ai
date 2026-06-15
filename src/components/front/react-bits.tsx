"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Camera, Geometry, Mesh, Program, Renderer } from "ogl";
import { clsx } from "clsx";

type GlassSurfaceProps = {
  children: ReactNode;
  className?: string;
};

type AnimatedContentProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
};

type TextAnimationProps = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  delay?: number;
  by?: "words" | "letters";
};

type GooeyNavItem = {
  href: string;
  label: string;
  active?: boolean;
};

type MasonryItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  ratio: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  heightClass?: string;
  isFallback?: boolean;
};

type MasonryProps = {
  items: MasonryItem[];
  onSelect?: (item: MasonryItem) => void;
  emptyText?: string;
};

type StepItem = {
  label: string;
  active?: boolean;
  complete?: boolean;
};

type ShapeGridCell = {
  kind: "square" | "circle" | "diamond" | "pill";
  tone: "mist" | "sky" | "line" | "blank";
  delay: string;
  rotate: string;
  scale: number;
};

function useMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

export function GlassSurface({ children, className }: GlassSurfaceProps) {
  return (
    <div className={clsx("rb-glass-surface", className)}>
      <span className="rb-glass-surface__shine" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function ShapeGrid({ className, cellCount = 72 }: { className?: string; cellCount?: number }) {
  const cells = useMemo<ShapeGridCell[]>(
    () =>
      Array.from({ length: cellCount }, (_, index) => {
        const shapeSeed = (index * 7 + Math.floor(index / 5)) % 11;
        const toneSeed = (index * 5 + Math.floor(index / 3)) % 10;
        const kind = shapeSeed < 3 ? "square" : shapeSeed < 6 ? "circle" : shapeSeed < 9 ? "diamond" : "pill";
        const baseRotate = ((index % 9) - 4) * 7 + (kind === "diamond" ? 45 : 0);
        return {
          kind,
          tone: toneSeed < 3 ? "mist" : toneSeed < 6 ? "sky" : toneSeed < 8 ? "line" : "blank",
          delay: `${(index % 19) * 0.11}s`,
          rotate: `${baseRotate}deg`,
          scale: 0.62 + ((index * 13) % 26) / 100,
        };
      }),
    [cellCount],
  );

  return (
    <div className={clsx("rb-shape-grid", className)} aria-hidden="true">
      {cells.map((cell, index) => (
        <span
          key={index}
          className={clsx("rb-shape-grid__cell", `is-${cell.kind}`, `tone-${cell.tone}`)}
          style={
            {
              "--shape-delay": cell.delay,
              "--shape-rotate": cell.rotate,
              "--shape-scale": cell.scale,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function AnimatedContent({ children, className, delay = 0, distance = 26 }: AnimatedContentProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.72, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function FadeContent(props: AnimatedContentProps) {
  return <AnimatedContent {...props} distance={props.distance ?? 14} />;
}

export function BlurText({ text, className, as = "p", delay = 0.055, by = "words" }: TextAnimationProps) {
  const reduced = useReducedMotion();
  const Tag = as;
  const units = by === "letters" ? Array.from(text) : text.split(" ");

  if (reduced) {
    return <Tag className={className}>{text}</Tag>;
  }

  return (
    <Tag className={clsx("rb-animated-text", className)}>
      {units.map((unit, index) => (
        <motion.span
          key={`${unit}-${index}`}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.58, delay: index * delay, ease: [0.16, 1, 0.3, 1] }}
        >
          {unit === " " ? "\u00A0" : unit}
          {by === "words" && index < units.length - 1 ? "\u00A0" : null}
        </motion.span>
      ))}
    </Tag>
  );
}

export function SplitText({ text, className, as = "p", delay = 0.018 }: TextAnimationProps) {
  return <BlurText text={text} className={className} as={as} delay={delay} by="letters" />;
}

export function SpotlightCard({
  children,
  className,
  spotlightColor = "rgba(47, 114, 188, 0.24)",
}: {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  function updateSpotlight(event: PointerEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    ref.current?.style.setProperty("--spotlight-x", `${(event.clientX - rect.left).toFixed(1)}px`);
    ref.current?.style.setProperty("--spotlight-y", `${(event.clientY - rect.top).toFixed(1)}px`);
  }

  return (
    <div
      ref={ref}
      className={clsx("rb-spotlight-card", className)}
      onPointerMove={reduced ? undefined : updateSpotlight}
    >
      <span
        className="rb-spotlight-card__glow"
        aria-hidden="true"
        style={{ "--spotlight-color": spotlightColor } as CSSProperties}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

const particleVertex = `
  attribute vec3 position;
  attribute vec4 random;
  attribute vec3 color;
  uniform mat4 modelMatrix;
  uniform mat4 viewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uTime;
  uniform float uSpread;
  uniform float uBaseSize;
  varying vec4 vRandom;
  varying vec3 vColor;
  void main() {
    vRandom = random;
    vColor = color;
    vec3 pos = position * uSpread;
    vec4 mPos = modelMatrix * vec4(pos, 1.0);
    mPos.x += sin(uTime * random.z + 6.28 * random.w) * mix(0.04, 0.55, random.x);
    mPos.y += sin(uTime * random.y + 6.28 * random.x) * mix(0.04, 0.55, random.w);
    vec4 mvPos = viewMatrix * mPos;
    gl_PointSize = uBaseSize / max(0.7, length(mvPos.xyz));
    gl_Position = projectionMatrix * mvPos;
  }
`;

const particleFragment = `
  precision highp float;
  uniform float uTime;
  varying vec4 vRandom;
  varying vec3 vColor;
  void main() {
    vec2 uv = gl_PointCoord.xy;
    float d = length(uv - vec2(0.5));
    float circle = smoothstep(0.52, 0.18, d);
    gl_FragColor = vec4(vColor + 0.06 * sin(uv.yxx + uTime + vRandom.y * 6.28), circle * 0.72);
  }
`;

const defaultParticleColors = ["#dbeafe", "#7dd3fc", "#ffffff"];

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace(/^#/, "");
  const full = normalized.length === 3 ? normalized.split("").map((char) => `${char}${char}`).join("") : normalized;
  const value = Number.parseInt(full, 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

export function Particles({
  className,
  particleCount = 150,
  colors = defaultParticleColors,
}: {
  className?: string;
  particleCount?: number;
  colors?: string[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mounted = useMounted();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!mounted || reduced) return;
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, depth: false, dpr: Math.min(window.devicePixelRatio, 1.5) });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 18 });
    camera.position.set(0, 0, 18);

    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.perspective({ aspect: gl.canvas.width / Math.max(1, gl.canvas.height) });
    };

    const positions = new Float32Array(particleCount * 3);
    const randoms = new Float32Array(particleCount * 4);
    const particleColors = new Float32Array(particleCount * 3);

    for (let index = 0; index < particleCount; index += 1) {
      positions.set([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1], index * 3);
      randoms.set([Math.random(), Math.random(), Math.random(), Math.random()], index * 4);
      particleColors.set(hexToRgb(colors[index % colors.length]), index * 3);
    }

    const geometry = new Geometry(gl, {
      position: { size: 3, data: positions },
      random: { size: 4, data: randoms },
      color: { size: 3, data: particleColors },
    });
    const program = new Program(gl, {
      vertex: particleVertex,
      fragment: particleFragment,
      uniforms: {
        uTime: { value: 0 },
        uSpread: { value: 12 },
        uBaseSize: { value: 88 },
      },
      transparent: true,
      depthTest: false,
    });
    const mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program });
    let frame = 0;
    const startedAt = performance.now();

    const update = () => {
      frame = requestAnimationFrame(update);
      const elapsed = (performance.now() - startedAt) * 0.00032;
      program.uniforms.uTime.value = elapsed;
      mesh.rotation.x = Math.sin(elapsed * 0.7) * 0.18;
      mesh.rotation.y = Math.cos(elapsed * 0.9) * 0.22;
      renderer.render({ scene: mesh, camera });
    };

    resize();
    window.addEventListener("resize", resize);
    update();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
      gl.canvas.remove();
    };
  }, [colors, mounted, particleCount, reduced]);

  return <div ref={containerRef} className={clsx("rb-particles", className)} aria-hidden="true" />;
}

export function GooeyNav({ items, className }: { items: GooeyNavItem[]; className?: string }) {
  return (
    <nav className={clsx("rb-gooey-nav", className)} aria-label="主导航">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className={clsx("rb-gooey-nav__item", item.active && "is-active")} aria-current={item.active ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MasonryShowcase({ items, onSelect, emptyText = "没有找到匹配作品" }: MasonryProps) {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
  };

  if (!items.length) {
    return <div className="rb-empty-line">{emptyText}</div>;
  }

  return (
    <div className="rb-masonry">
      {items.map((item, index) => (
        <motion.button
          type="button"
          key={item.id}
          className={clsx("rb-masonry__item", item.heightClass)}
          onClick={() => onSelect?.(item)}
          initial={reduced ? false : "hidden"}
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={variants}
          transition={{ duration: 0.56, delay: Math.min(index * 0.035, 0.28), ease: [0.16, 1, 0.3, 1] }}
        >
          {item.thumbnailUrl || item.imageUrl ? (
            <img src={item.thumbnailUrl || item.imageUrl} alt={item.title} loading={index < 6 ? "eager" : "lazy"} decoding="async" />
          ) : (
            <span className="rb-masonry__placeholder" />
          )}
          <span className="rb-masonry__veil" />
          <span className="rb-masonry__content">
            <span className="rb-masonry__meta">
              {item.category} / {item.ratio}
            </span>
            <strong>{item.title}</strong>
            <small>{item.summary}</small>
          </span>
        </motion.button>
      ))}
    </div>
  );
}

export function StatusStepper({ items }: { items: StepItem[] }) {
  return (
    <div className="rb-status-stepper">
      {items.map((item, index) => (
        <div key={item.label} className={clsx("rb-status-stepper__item", item.active && "is-active", item.complete && "is-complete")}>
          <span>{index + 1}</span>
          <strong>{item.label}</strong>
        </div>
      ))}
    </div>
  );
}

export function FloatingActionBeam({ children }: { children: ReactNode }) {
  return (
    <div className="rb-action-beam">
      <span className="rb-action-beam__ring" />
      {children}
    </div>
  );
}
