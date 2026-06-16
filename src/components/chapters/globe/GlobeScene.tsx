"use client";

import {
  Canvas,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import type { Topology } from "topojson-specification";
import { buildBorderPositions, latLngToVector3 } from "@/lib/geo/sphere";
import { useGlobeData, type GlobeMarker } from "@/lib/geo/useGlobeData";
import { rampColor, type GlobeMetric } from "@/lib/geo/metrics";
import { useMotion } from "@/lib/motion/MotionProvider";
import { useCountryHistory } from "@/lib/swr/hooks";
import { Sparkline } from "@/components/data/Sparkline";
import { fmtCompact, fmtNum } from "@/lib/format";

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
      <lineBasicMaterial color="#356a54" transparent opacity={0.55} />
    </lineSegments>
  );
}

function Planet({ inner }: { inner: React.RefObject<THREE.Mesh | null> }) {
  return (
    <mesh ref={inner}>
      <sphereGeometry args={[R * 0.995, 64, 64]} />
      <meshStandardMaterial color="#0b1712" roughness={1} metalness={0} />
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
        fragmentShader: `varying vec3 vN; void main(){ float i = pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0); i = clamp(i,0.0,1.0); gl_FragColor = vec4(0.36,0.84,0.65,1.0) * i; }`,
      }),
    [],
  );
  return (
    <mesh material={mat}>
      <sphereGeometry args={[R * 1.22, 48, 48]} />
    </mesh>
  );
}

function Markers({
  metric,
  onHover,
}: {
  metric: GlobeMetric;
  onHover: (m: GlobeMarker | null) => void;
}) {
  const { markers, domain } = useGlobeData(metric);
  const coreRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = markers.length;

  const coreGeo = useMemo(() => new THREE.SphereGeometry(1, 12, 12), []);
  const coreMat = useMemo(
    () => new THREE.MeshBasicMaterial({ toneMapped: false }),
    [],
  );
  const haloGeo = useMemo(() => new THREE.SphereGeometry(1, 10, 10), []);
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        toneMapped: false,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  const computed = useMemo(() => {
    const [d0, d1] = domain;
    const span = d1 - d0 || 1;
    return markers.map((m) => ({
      pos: latLngToVector3(m.lat, m.long, R * 1.012),
      t: Math.max(0, Math.min(1, (m.value - d0) / span)),
    }));
  }, [markers, domain]);

  useLayoutEffect(() => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo) return;
    const col = new THREE.Color();
    computed.forEach(({ pos, t }, i) => {
      const s = 0.011 * (0.55 + t * 1.7);
      dummy.position.copy(pos);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      core.setMatrixAt(i, dummy.matrix);
      col.copy(rampColor(metric, t));
      core.setColorAt(i, col);
      dummy.scale.setScalar(s * 2.7);
      dummy.updateMatrix();
      halo.setMatrixAt(i, dummy.matrix);
      halo.setColorAt(i, col);
    });
    core.instanceMatrix.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
  }, [computed, metric, dummy, count]);

  if (!count) return null;

  const move = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId != null) onHover(markers[e.instanceId] ?? null);
  };

  return (
    <group>
      <instancedMesh
        ref={haloRef}
        args={[haloGeo, haloMat, count]}
        key={`halo-${count}`}
      />
      <instancedMesh
        ref={coreRef}
        args={[coreGeo, coreMat, count]}
        key={`core-${count}`}
        onPointerMove={move}
        onPointerOut={() => onHover(null)}
      />
    </group>
  );
}

function Sprig({
  marker,
  metric,
  occludeRef,
}: {
  marker: GlobeMarker;
  metric: GlobeMetric;
  occludeRef: React.RefObject<THREE.Mesh | null>;
}) {
  const out = useMemo(() => {
    const surface = latLngToVector3(marker.lat, marker.long, R * 1.02);
    return surface.add(surface.clone().normalize().multiplyScalar(0.3));
  }, [marker]);
  const hist = useCountryHistory(marker.iso3);
  const spark = (hist.data ?? []).slice(-60).map((d) => d.value);
  const accent = rampColor(metric, 0.85).getStyle();
  const value =
    metric.key === "lifeExpectancy"
      ? `${fmtNum(marker.value)}`
      : metric.key === "under5"
        ? fmtNum(marker.value)
        : fmtCompact(marker.value);

  return (
    <Html
      position={out}
      center
      occlude={occludeRef.current ? [occludeRef] : undefined}
      zIndexRange={[30, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div
        className="w-44 rounded-lg border border-line/80 bg-forest/90 px-3 py-2.5 backdrop-blur-sm"
        style={{ boxShadow: `0 8px 30px rgba(0,0,0,0.5)` }}
      >
        <p className="font-display text-sm text-mist">{marker.name}</p>
        <p className="mt-0.5 flex items-baseline gap-1">
          <span className="tnum text-xl" style={{ color: accent }}>
            {value}
          </span>
          <span className="text-[10px] text-faint">{metric.unit}</span>
        </p>
        <div className="mt-2">
          <Sparkline values={spark} color={accent} width={150} height={30} />
          <p className="mt-1 text-[9px] uppercase tracking-wider text-faint/80">
            New cases · trailing
          </p>
        </div>
        <div className="mt-2 flex justify-between border-t border-line/60 pt-1.5 text-[10px] text-sage">
          <span>
            {fmtCompact(marker.cases)} <span className="text-faint">cases</span>
          </span>
          <span>
            {fmtCompact(marker.deaths)} <span className="text-faint">deaths</span>
          </span>
        </div>
      </div>
    </Html>
  );
}

function Scene({ metric }: { metric: GlobeMetric }) {
  const { reducedMotion } = useMotion();
  const [hovered, setHovered] = useState<GlobeMarker | null>(null);
  const planetRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();

  // Hover cursor affordance.
  useLayoutEffect(() => {
    gl.domElement.style.cursor = hovered ? "pointer" : "grab";
  }, [hovered, gl]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 2, 1.5]} intensity={1.15} color="#bfe8d6" />
      <Atmosphere />
      <Planet inner={planetRef} />
      <Borders />
      <Markers metric={metric} onHover={setHovered} />
      {hovered && (
        <Sprig marker={hovered} metric={metric} occludeRef={planetRef} />
      )}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={2.1}
        maxDistance={4.2}
        rotateSpeed={0.5}
        enableDamping
        dampingFactor={0.08}
        autoRotate={!reducedMotion && !hovered}
        autoRotateSpeed={0.42}
      />
    </>
  );
}

export default function GlobeScene({ metric }: { metric: GlobeMetric }) {
  const { tier } = useMotion();

  // Force r3f to (re)measure — if it mounts in a momentarily zero-sized
  // container (lazy mount, layout settling), its auto-measure can stick at 0.
  useEffect(() => {
    const fire = () => window.dispatchEvent(new Event("resize"));
    const ids = [60, 300, 800].map((d) => window.setTimeout(fire, d));
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0.4, 3.0], fov: 34 }}
      dpr={[1, tier === "full" ? 2 : 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Scene metric={metric} />
    </Canvas>
  );
}
