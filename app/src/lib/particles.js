/**
 * Canvas particle system.
 *
 * CSS can animate a few dozen elements before the compositor starts to show
 * it; a canvas draws hundreds with real physics for far less. One canvas is
 * shared by every effect, and the render loop only runs while something is
 * alive — an idle game costs nothing.
 *
 * Coordinates are in CSS pixels relative to the canvas, which covers the app
 * frame. `toLocal()` converts a viewport point (from getBoundingClientRect)
 * into that space.
 */

import { state } from "./store.js";

let canvas = null;
let ctx = null;
let raf = 0;
let last = 0;
// celebrate() spreads its emission over time; these let stop() cancel the
// tail so a celebration cannot keep spawning onto whatever screen follows.
let pending = [];

/** @type {{x:number,y:number,vx:number,vy:number,size:number,color:string,rot:number,vrot:number,age:number,life:number,gravity:number,drag:number,shape:string,fade:number}[]} */
let live = [];

// Hard ceiling: a burst during an existing burst should never stack into a
// frame budget problem on a mid-range phone.
const MAX = 420;

export function attach(node) {
  canvas = node;
  ctx = node?.getContext("2d", { alpha: true }) || null;
  resize();
}

export function detach() {
  stop();
  canvas = null;
  ctx = null;
}

export function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** Viewport point -> canvas-local point. */
export function toLocal(clientX, clientY) {
  if (!canvas) return { x: clientX, y: clientY };
  const r = canvas.getBoundingClientRect();
  return { x: clientX - r.left, y: clientY - r.top };
}

export const enabled = () =>
  Boolean(canvas) &&
  !state.settings.reduceMotion &&
  !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function ensureLoop() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  pending.forEach(clearTimeout);
  pending = [];
  live = [];
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

function tick(now) {
  // Clamp dt so a backgrounded tab doesn't teleport everything on return.
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const height = canvas.clientHeight;
  const next = [];

  for (const p of live) {
    p.age += dt;
    if (p.age >= p.life) continue;

    p.vy += p.gravity * dt;
    p.vx *= 1 - p.drag * dt;
    p.vy *= 1 - p.drag * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;

    if (p.y > height + 40) continue;

    const t = p.age / p.life;
    const alpha = t > p.fade ? 1 - (t - p.fade) / (1 - p.fade) : 1;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;

    if (p.shape === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === "star") {
      drawStar(ctx, p.size / 2);
    } else {
      // Scaling height by |cos(rot)| fakes a card tumbling through 3D.
      const h = p.size * 1.6 * Math.abs(Math.cos(p.rot * 1.6));
      ctx.fillRect(-p.size / 2, -h / 2, p.size, Math.max(1, h));
    }

    ctx.restore();
    next.push(p);
  }

  live = next;

  if (live.length) raf = requestAnimationFrame(tick);
  else stop();
}

function drawStar(c, r) {
  c.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 ? r * 0.45 : r;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.fill();
}

const rand = (min, max) => min + Math.random() * (max - min);

/**
 * Emit particles from a point.
 *
 * @param {object} o
 * @param {number} o.x canvas-local x
 * @param {number} o.y canvas-local y
 * @param {number} [o.count]
 * @param {string[]} [o.colors]
 * @param {number} [o.angle] centre direction, radians (−PI/2 is straight up)
 * @param {number} [o.spread] half-width of the emission arc, radians
 * @param {number} [o.speed] base speed, px/s
 * @param {number} [o.gravity] px/s²
 * @param {string} [o.shape] "rect" | "circle" | "star"
 */
export function emit({
  x, y,
  count = 24,
  colors = ["#ff6b6b", "#ffd166", "#18a999", "#2364aa"],
  angle = -Math.PI / 2,
  spread = Math.PI / 3,
  speed = 320,
  speedVariance = 0.55,
  gravity = 900,
  drag = 0.9,
  size = [5, 10],
  life = [0.6, 1.2],
  shape = "rect",
  fade = 0.55
}) {
  if (!enabled()) return;

  const room = MAX - live.length;
  if (room <= 0) return;

  for (let i = 0; i < Math.min(count, room); i += 1) {
    const a = angle + rand(-spread, spread);
    const v = speed * rand(1 - speedVariance, 1 + speedVariance);

    live.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      size: rand(size[0], size[1]),
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: rand(0, Math.PI * 2),
      vrot: rand(-9, 9),
      age: 0,
      life: rand(life[0], life[1]),
      gravity,
      drag,
      shape,
      fade
    });
  }

  ensureLoop();
}

/** A small pop at a found word — short-lived, tight, in the word's colour. */
export function sparkle(x, y, color) {
  emit({
    x, y,
    count: 14,
    colors: [color, "#ffffff"],
    spread: Math.PI,
    speed: 180,
    gravity: 520,
    size: [3, 6],
    life: [0.35, 0.7],
    shape: "circle",
    fade: 0.3
  });
}

/** Celebration rain from above the frame. */
export function celebrate(count = 90) {
  if (!enabled()) return;
  const w = canvas.clientWidth;

  for (let i = 0; i < count; i += 1) {
    pending.push(setTimeout(() => {
      emit({
        x: rand(0, w),
        y: rand(-40, -6),
        count: 1,
        colors: ["#ff6b6b", "#ffd166", "#18a999", "#2364aa", "#7c5cde", "#ffffff"],
        angle: Math.PI / 2,
        spread: 0.5,
        speed: 120,
        speedVariance: 0.8,
        gravity: 420,
        drag: 0.35,
        size: [6, 11],
        life: [1.6, 2.6],
        shape: Math.random() > 0.78 ? "star" : "rect",
        fade: 0.75
      });
    }, (i / count) * 650));
  }
}

/** A burst fired outward from a point, for stars landing. */
export function pop(x, y, colors = ["#f6c453", "#ffe08a", "#ffffff"]) {
  emit({
    x, y,
    count: 22,
    colors,
    spread: Math.PI,
    speed: 260,
    gravity: 700,
    size: [4, 9],
    life: [0.5, 0.95],
    shape: "star",
    fade: 0.4
  });
}

export { stop as clearParticles };
