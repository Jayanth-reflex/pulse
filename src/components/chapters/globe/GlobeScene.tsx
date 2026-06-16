"use client";

import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import type { Topology } from "topojson-specification";
import { buildBorderPositions, latLngToVector3 } from "@/lib/geo/sphere";
import {
  useGlobeIndicator,
  type GlobeMarker,
} from "@/lib/geo/useGlobeIndicator";
import { intensityColor } from "@/lib/geo/metrics";
import { categoryHex } from "@/lib/taxonomy";
import { useMotion, type MotionTier } from "@/lib/motion/MotionProvider";
import { Sparkline } from "@/components/data/Sparkline";
import { fmtCompact, fmtNum } from "@/lib/format";
import type { CatalogEntry } from "@/lib/catalog/types";

const R = 1;
const fetchTopo = (u: string): Promise<Topology> => fetch(u).then((r) => r.json());

function Borders() {
  const { data } = useSWR<Topology>("/data/countries-110m.json", fetchTopo, {
    dedupingInterval: 3_600_000,
  });
  const geom = useMemo(() => {
    if (!data) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(buildBorderPositions(data, R * 1.001), 3),
    );
    return g;
  }, [data]);
  if (!geom) return null;
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color="#2a5544" transparent opacity={0.5} toneMapped={false} />
    </lineSegments>
  );
}

function Planet({ inner }: { inner: React.RefObject<THREE.Mesh | null> }) {
  return (
    <mesh ref={inner}>
      <sphereGeometry args={[R * 0.992, 64, 64]} />
      <meshStandardMaterial color="#0a1712" roughness={0.95} metalness={0.05} />
    </mesh>
  );
}

function Atmosphere() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.74 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); i = clamp(i,0.0,1.0); gl_FragColor = vec4(0.36,0.84,0.65,1.0) * i; }`,
      }),
    [],
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[R * 1.25, 48, 48]} />
    </mesh>
  );
}

function Markers({
  entry,
  active,
  onActive,
}: {
  entry: CatalogEntry;
  active: GlobeMarker | null;
  onActive: (m: GlobeMarker | null, sticky: boolean) => void;
}) {
  const { markers, domain } = useGlobeIndicator(entry);
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 14, 14), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ toneMapped: false }),
    [],
  );
  const hex = categoryHex(entry.category);
  const count = markers.length;

  const computed = useMemo(() => {
    const [d0, d1] = domain;
    const span = d1 - d0 || 1;
    return markers.map((m) => ({
      pos: latLngToVector3(m.lat, m.long, R * 1.012),
      t: Math.max(0, Math.min(1, (m.value - d0) / span)),
    }));
  }, [markers, domain]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const col = new THREE.Color();
    computed.forEach(({ pos, t }, i) => {
      const s = 0.009 * (0.5 + Math.sqrt(t) * 1.5);
      dummy.position.copy(pos);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      col.copy(intensityColor(hex, t));
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [computed, hex, dummy, count]);

  if (!count) return null;

  const hover = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId != null) onActive(markers[e.instanceId] ?? null, false);
  };
  const tap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId != null) onActive(markers[e.instanceId] ?? null, true);
  };

  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, count]}
      key={count}
      onPointerMove={hover}
      onPointerOut={() => onActive(null, false)}
      onClick={tap}
    >
      {active && <ActiveRing marker={active} hex={hex} />}
    </instancedMesh>
  );
}

function ActiveRing({ marker, hex }: { marker: GlobeMarker; hex: string }) {
  const pos = useMemo(
    () => latLngToVector3(marker.lat, marker.long, R * 1.012),
    [marker],
  );
  return (
    <mesh position={pos}>
      <ringGeometry args={[0.022, 0.03, 24]} />
      <meshBasicMaterial color={hex} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Sprig({
  marker,
  entry,
  unit,
  series,
  occludeRef,
}: {
  marker: GlobeMarker;
  entry: CatalogEntry;
  unit: string;
  series: { year: number; value: number }[];
  occludeRef: React.RefObject<THREE.Mesh | null>;
}) {
  const out = useMemo(() => {
    const surface = latLngToVector3(marker.lat, marker.long, R * 1.02);
    return surface.add(surface.clone().normalize().multiplyScalar(0.32));
  }, [marker]);
  const occlude = useMemo(() => [occludeRef], [occludeRef]) as never;
  const hex = categoryHex(entry.category);
  const big =
    Math.abs(marker.value) >= 1000 ? fmtCompact(marker.value) : fmtNum(marker.value);

  return (
    <Html
      position={out}
      center
      occlude={occlude}
      zIndexRange={[30, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="w-44 rounded-lg border border-line/80 bg-forest/90 px-3 py-2.5 backdrop-blur-sm"
        style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}
      >
        <p className="font-display text-sm text-mist">{marker.name}</p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span className="tnum text-xl" style={{ color: hex }}>
            {big}
          </span>
          <span className="text-[10px] text-faint">{unit}</span>
        </p>
        {series.length > 1 && (
          <div className="mt-2">
            <Sparkline
              values={series.map((s) => s.value)}
              color={hex}
              width={150}
              height={28}
            />
            <p className="mt-1 text-[9px] uppercase tracking-wider text-faint/80">
              World trend
            </p>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-line/60 pt-1.5 text-[10px] text-sage">
          <span>{fmtCompact(marker.cases)} <span className="text-faint">cases</span></span>
          <span>{fmtCompact(marker.deaths)} <span className="text-faint">deaths</span></span>
        </div>
      </div>
    </Html>
  );
}

function Scene({ entry, tier }: { entry: CatalogEntry; tier: MotionTier }) {
  const [hovered, setHovered] = useState<GlobeMarker | null>(null);
  const [selected, setSelected] = useState<GlobeMarker | null>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  const { globalSeries, unit } = useGlobeIndicator(entry);
  const active = hovered ?? selected;

  useLayoutEffect(() => {
    gl.domElement.style.cursor = hovered ? "pointer" : "grab";
  }, [hovered, gl]);

  const onActive = (m: GlobeMarker | null, sticky: boolean) => {
    if (sticky) setSelected(m);
    else setHovered(m);
  };

  return (
    <>
      <fog attach="fog" args={["#0a120e", 4.2, 9]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 2, 1.5]} intensity={1.1} color="#bfe8d6" />
      <Stars radius={60} depth={40} count={1100} factor={3.2} saturation={0} fade speed={0.4} />
      <Atmosphere />
      <Planet inner={planetRef} />
      <Borders />
      <Markers entry={entry} active={active} onActive={onActive} />
      {active && (
        <Sprig
          marker={active}
          entry={entry}
          unit={unit}
          series={globalSeries}
          occludeRef={planetRef}
        />
      )}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={1.8}
        maxDistance={4.2}
        rotateSpeed={0.5}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!active}
        autoRotateSpeed={0.4}
      />
      {tier === "full" && (
        <EffectComposer>
          <Bloom
            intensity={0.85}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.35}
            mipmapBlur
            radius={0.7}
          />
          <Vignette offset={0.22} darkness={0.82} />
        </EffectComposer>
      )}
    </>
  );
}

export default function GlobeScene({ entry }: { entry: CatalogEntry }) {
  const { tier } = useMotion();

  // Force r3f to (re)measure — its auto-measure can stick at 0 if it mounts in
  // a momentarily zero-sized container (lazy mount / layout settling).
  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event("resize"));
    const ids = [60, 300, 800].map((d) => window.setTimeout(fire, d));
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0.35, 2.9], fov: 34 }}
      dpr={[1, tier === "full" ? 2 : 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Scene entry={entry} tier={tier} />
    </Canvas>
  );
}
