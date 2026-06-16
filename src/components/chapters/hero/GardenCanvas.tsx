"use client";

import { useEffect, useRef } from "react";
import { FlowField } from "@/lib/gen/flowField";
import { useMotion, tierBudget } from "@/lib/motion/MotionProvider";

/**
 * The hero's living garden. Mounts the flow-field engine sized to its parent,
 * scaled by motion tier, paused when offscreen or backgrounded.
 */
export function GardenCanvas({
  momentum,
  palette,
}: {
  momentum: number;
  palette: string[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<FlowField | null>(null);
  const { tier, reducedMotion, ready } = useMotion();

  // (Re)build the engine when the tier resolves.
  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const dpr = Math.min(
      window.devicePixelRatio || 1,
      tier === "full" ? 2 : tier === "lite" ? 1.5 : 1,
    );
    const count =
      tier === "static" ? 900 : tierBudget(tier, 1500, 650);

    const field = new FlowField(canvas, {
      particleCount: count,
      momentum,
      palette,
      animate: !reducedMotion,
      dpr,
    });
    fieldRef.current = field;

    const ro = new ResizeObserver(() => {
      const { clientWidth, clientHeight } = parent;
      field.resize(clientWidth, clientHeight);
    });
    ro.observe(parent);
    field.resize(parent.clientWidth, parent.clientHeight);
    field.start();

    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? field.resume() : field.pause()),
      { threshold: 0 },
    );
    io.observe(canvas);

    const onVis = () =>
      document.visibilityState === "hidden" ? field.pause() : field.resume();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      field.destroy();
      fieldRef.current = null;
    };
    // momentum handled separately so we don't rebuild on every data tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tier, reducedMotion, palette]);

  useEffect(() => {
    fieldRef.current?.setMomentum(momentum);
  }, [momentum]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}
