import { createNoise3D } from "simplex-noise";

/**
 * A flow-field particle garden. Thousands of low-alpha trails drift along a
 * 3D-noise vector field and accumulate into organic, vine-like growth that
 * slowly fades — a living canvas, not a chart.
 *
 * `momentum` (0..1) is the live signal: it scales particle energy, flow speed
 * and colour temperature, so a more active world grows faster and warmer.
 */
export interface FlowOptions {
  particleCount: number;
  momentum: number;
  /** Accent hexes, sampled per particle. */
  palette: string[];
  /** false → render one rich static composition and stop (reduced motion). */
  animate: boolean;
  dpr: number;
}

interface Particle {
  x: number;
  y: number;
  px: number;
  py: number;
  age: number;
  life: number;
  color: string;
}

const TAU = Math.PI * 2;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export class FlowField {
  private ctx: CanvasRenderingContext2D;
  private noise = createNoise3D();
  private particles: Particle[] = [];
  private raf = 0;
  private z = 0;
  private w = 0;
  private h = 0;
  private running = false;
  private opts: FlowOptions;
  private rgbPalette: string[];

  constructor(
    private canvas: HTMLCanvasElement,
    opts: FlowOptions,
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.opts = opts;
    this.rgbPalette = opts.palette.map((hex) => {
      const [r, g, b] = hexToRgb(hex);
      return `${r},${g},${b}`;
    });
  }

  resize(cssW: number, cssH: number) {
    const { dpr } = this.opts;
    this.w = cssW;
    this.h = cssH;
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed();
    this.clear();
  }

  setMomentum(m: number) {
    this.opts.momentum = Math.max(0, Math.min(1, m));
  }

  private seed() {
    const n = this.opts.particleCount;
    this.particles = Array.from({ length: n }, () => this.spawn());
  }

  private spawn(): Particle {
    const x = Math.random() * this.w;
    const y = Math.random() * this.h;
    return {
      x,
      y,
      px: x,
      py: y,
      age: Math.random() * 120,
      life: 80 + Math.random() * 200,
      color: this.rgbPalette[(Math.random() * this.rgbPalette.length) | 0],
    };
  }

  private clear() {
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.fillStyle = "#0a120e";
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  /** One simulation+draw step for every particle. */
  private step() {
    const { ctx, w, h } = this;
    const m = this.opts.momentum;

    // Gentle fade leaves lingering growth before it decays.
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(10,18,14,0.045)";
    ctx.fillRect(0, 0, w, h);

    // Additive trails glow against the dark ground.
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.1;

    const fieldScale = 0.0016;
    const speed = 0.6 + m * 1.7;
    const swirl = 1.7 + m * 1.2;

    for (const p of this.particles) {
      const angle =
        this.noise(p.x * fieldScale, p.y * fieldScale, this.z) * TAU * swirl;
      p.px = p.x;
      p.py = p.y;
      p.x += Math.cos(angle) * speed;
      p.y += Math.sin(angle) * speed;
      p.age++;

      const fade = 1 - p.age / p.life;
      const alpha = (0.065 + m * 0.06) * Math.max(0, fade);
      ctx.strokeStyle = `rgba(${p.color},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      if (
        p.age > p.life ||
        p.x < -20 ||
        p.x > w + 20 ||
        p.y < -20 ||
        p.y > h + 20
      ) {
        Object.assign(p, this.spawn(), { age: 0 });
      }
    }

    this.z += 0.0009 + m * 0.0016;
  }

  // Single rAF loop; `play()` guards against stacking duplicate loops.
  private loop = () => {
    if (!this.running) return;
    this.step();
    this.raf = requestAnimationFrame(this.loop);
  };

  private play() {
    if (this.running) return;
    this.running = true;
    this.raf = requestAnimationFrame(this.loop);
  }

  start() {
    if (!this.opts.animate) {
      // Reduced motion: bake a rich still in one synchronous pass.
      this.clear();
      for (let i = 0; i < 480; i++) this.step();
      return;
    }
    this.play();
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resume() {
    if (this.opts.animate) this.play();
  }

  destroy() {
    this.pause();
  }
}
