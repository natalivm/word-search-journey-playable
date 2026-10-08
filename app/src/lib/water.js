/**
 * The pool surface, as a WebGL fragment shader.
 *
 * The CSS version of this water is two crossing meshes of gradient bands —
 * cheap, and it reads as water from a distance, but it repeats and it cannot
 * hold a shape. This paints the pool instead: flat poured tones, foam drawn
 * as contour strokes along the swell, glints added by hand, and the whole
 * surface held on twos the way painted animation is. It is deliberately not
 * a simulation — a photoreal pool would sit oddly under a map of cartoon
 * floats.
 *
 * No library. The whole renderer is one full-screen triangle and one shader,
 * in the same spirit as `particles.js` — which hand-rolls its own canvas
 * engine rather than pulling in a dependency the game would carry forever.
 *
 * It is an enhancement, never a requirement: `create()` returns null when
 * WebGL is unavailable or the context is lost, and the CSS water underneath
 * is left showing. Reduced motion still gets the shader, rendered once and
 * frozen — the picture is the point, the movement is the part that has to go.
 *
 * Colours come from CSS custom properties rather than being baked in here,
 * so the pool flips with the app's theme like every other surface.
 */

import { state } from "./store.js";

const VERTEX = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uGlow;
uniform float uStrength;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

/* The swell. Each wave is bent by another wave rather than added to one, so
   the contours curve and meander the way a brush draws them, instead of
   crossing into the plaid that plain summed sines give you. Roughly -1..1. */
float swell(vec2 p, float t) {
  float v = sin(p.x * 1.55 + t * 0.55 + sin(p.y * 0.85 - t * 0.37) * 1.25);
  v += 0.72 * sin(p.y * 1.25 - t * 0.47 + sin(p.x * 1.05 + t * 0.29) * 1.35);
  v += 0.42 * sin((p.x + p.y) * 2.05 + t * 0.81);
  return v / 2.14;
}

/* A four-point glint, the kind that is drawn on rather than simulated. They
   sit on a sparse grid, one per cell, and blink in and out. */
float glints(vec2 p, float t) {
  vec2 cell = floor(p);
  vec2 f = fract(p) - 0.5;

  float seed = hash(cell);
  // Each one has its own offset inside its cell and its own blink phase, so
  // the grid never shows through as a grid.
  f -= (vec2(hash(cell + 7.3), hash(cell + 19.1)) - 0.5) * 0.6;

  float blink = smoothstep(0.55, 0.95, sin(t * 1.7 + seed * 42.0) * 0.5 + 0.5);
  if (blink <= 0.0) return 0.0;

  float arm = 0.19 * blink;
  float bar = (1.0 - smoothstep(0.0, 0.016, abs(f.x))) * (1.0 - smoothstep(0.0, arm, abs(f.y)));
  float bar2 = (1.0 - smoothstep(0.0, 0.016, abs(f.y))) * (1.0 - smoothstep(0.0, arm, abs(f.x)));
  return max(bar, bar2) * blink;
}

void main() {
  /* Normalised on height, so the painting keeps its proportions whatever the
     screen is. */
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  /* Stretched across, so the strokes run with the length of the pool rather
     than curling into blobs. */
  vec2 p = uv * 6.9 * vec2(0.82, 1.22);

  /* Held frames. Painted animation runs on twos and threes rather than on
     every frame, and water drawn by hand moves in steps — so the whole
     surface is quantised to 12 a second. It is the single strongest cue that
     this was painted rather than simulated.

     The scales afterwards are speeds, and they are deliberately not folded
     into the divisor: quantising first keeps the 12-a-second cadence whatever
     the speed, where dividing by 6 instead would slow the cadence too and
     just read as a lower frame rate.

     Two speeds, because slow water and dead water are not the same thing.
     The swell crawls — the big shapes should barely travel under a map you
     are reading — while the glints keep their own livelier beat, which is
     what stops the surface looking frozen at this pace. */
  float held = floor(uTime * 12.0) / 12.0;
  float t = held * 0.26;
  float tSpark = held * 0.75;

  float h = swell(p, t);
  float depth = clamp(gl_FragCoord.y / uRes.y, 0.0, 1.0);

  /* Flat poured tones instead of a gradient: the swell and the depth are
     added, then quantised into four steps. Everything else is drawn on top
     of these shapes. */
  float tone = depth * 0.62 + h * 0.3 + 0.2;
  float steps = 4.0;
  float banded = floor(clamp(tone, 0.0, 0.999) * steps) / (steps - 1.0);
  vec3 col = mix(uDeep, uShallow, clamp(banded, 0.0, 1.0));

  /* Foam: contour strokes along two isolines of the same swell. The stroke
     width breathes along its length, so it tapers and swells like a loaded
     brush rather than reading as a vector outline. */
  float wob = noise(p * 1.15 + vec2(t * 0.12, -t * 0.09));
  float wob2 = noise(p * 1.7 - vec2(t * 0.1, 31.0));
  // Subtracting before scaling lets the width reach zero, which is what makes
  // a stroke taper off and break instead of running on forever like an
  // outline. The floor only keeps smoothstep's edges in order.
  float wide = max(0.004, 0.155 * (wob - 0.26));
  float thin = max(0.003, 0.075 * (wob2 - 0.3));

  float crest = 1.0 - smoothstep(wide * 0.62, wide, abs(h - 0.40));
  float trail = 1.0 - smoothstep(thin * 0.55, thin, abs(h - 0.66));
  float under = 1.0 - smoothstep(thin * 0.6, thin, abs(h + 0.34));

  /* The near-side line is the heavy one; the others are the lighter marks
     that follow a crest in a painted sea. */
  float foam = clamp(crest + trail * 0.55, 0.0, 1.0);

  col = mix(col, uGlow, foam * 0.92 * uStrength);
  col = mix(col, mix(col, uGlow, 0.55), under * 0.6 * uStrength);

  /* Glints ride the brighter water, where the light would be catching it. */
  float sparkle = glints(p * 1.45 + vec2(0.0, t * 0.05), tSpark) * smoothstep(0.25, 0.75, tone);
  col = mix(col, uGlow, clamp(sparkle, 0.0, 1.0) * 0.85 * uStrength);

  /* A trace of tooth, so the flat areas read as paint on paper rather than
     as a fill. */
  col *= 0.985 + 0.03 * noise(p * 26.0);

  gl_FragColor = vec4(col, 1.0);
}`;

/** "#8fe0f0" -> [0.56, 0.88, 0.94] */
function toRgb(hex, fallback) {
  const value = String(hex).trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(value);
  if (!match) return fallback;
  const n = parseInt(match[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const frozen = () =>
  state.settings.reduceMotion ||
  Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * Attach the renderer to a canvas.
 *
 * @returns {{start: Function, stop: Function, destroy: Function}|null} null if
 *   this device cannot run it, in which case the CSS water stays visible.
 */
export function createWater(canvas) {
  if (!canvas) return null;

  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
    // Without this the buffer is cleared once it has been composited, which
    // is fine while a frame is drawn every tick and fatal for the reduced
    // motion path, where one frame is drawn and held: the pool would show it
    // and then go blank. The cost is a copy per frame instead of a swap,
    // which for one layer this size is not worth optimising for.
    preserveDrawingBuffer: true
  });
  if (!gl) return null;

  // Note that a canvas hands back the *same* context on every getContext, so
  // a renderer built after an earlier one was destroyed reuses it rather than
  // opening a second — which is why `destroy()` below deletes its objects
  // instead of losing the context, and why the pool can be visited twice.
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;

  gl.useProgram(program);

  // One triangle big enough to cover the clip volume — cheaper than a quad,
  // and there is nothing else in the scene.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, "uRes");
  const uTime = gl.getUniformLocation(program, "uTime");
  const uShallow = gl.getUniformLocation(program, "uShallow");
  const uDeep = gl.getUniformLocation(program, "uDeep");
  const uGlow = gl.getUniformLocation(program, "uGlow");
  const uStrength = gl.getUniformLocation(program, "uStrength");

  let raf = 0;
  let startedAt = 0;
  let dead = false;
  // What *this* renderer has configured, which is not the same question as
  // what size the canvas happens to be: a freshly linked program starts with
  // every uniform at zero, so a renderer built on an already-sized canvas
  // still has to tell its own shader the resolution. Keying the early-out on
  // the canvas instead left uRes at (0,0) — and a divide by zero paints the
  // whole pool white.
  let bufferW = 0;
  let bufferH = 0;

  /** Theme colours, read from the stylesheet so this file holds no palette. */
  function readPalette() {
    const css = getComputedStyle(document.documentElement);
    const strength = parseFloat(css.getPropertyValue("--pool-caustic-strength")) || 1;
    gl.useProgram(program);
    gl.uniform3fv(uShallow, toRgb(css.getPropertyValue("--pool-shallow"), [0.56, 0.88, 0.94]));
    gl.uniform3fv(uDeep, toRgb(css.getPropertyValue("--pool-deep"), [0.12, 0.52, 0.72]));
    gl.uniform3fv(uGlow, toRgb(css.getPropertyValue("--pool-glow"), [1, 1, 1]));
    gl.uniform1f(uStrength, strength);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;

    // Water is soft, so it costs nothing to look at and plenty to render at
    // full retina density. Cap the ratio, then cap the total pixels as well,
    // so a tablet in landscape does not quietly double the fill cost.
    let scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const budget = 1300000;
    if (w * h * scale * scale > budget) scale = Math.sqrt(budget / (w * h));

    const width = Math.max(1, Math.round(w * scale));
    const height = Math.max(1, Math.round(h * scale));
    if (width === bufferW && height === bufferH) return;
    bufferW = width;
    bufferH = height;

    // Assigning either attribute reallocates the drawing buffer, so only
    // touch them when the size really moved.
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    gl.viewport(0, 0, width, height);
    gl.useProgram(program);
    gl.uniform2f(uRes, width, height);
  }

  function draw(seconds) {
    gl.useProgram(program);
    gl.uniform1f(uTime, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    if (dead) return;
    if (!startedAt) startedAt = now;
    resize();
    draw((now - startedAt) / 1000);
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function start() {
    if (dead || raf) return;
    readPalette();
    resize();

    if (frozen()) {
      // One frame, held. Time is offset so the still is a busy part of the
      // loop rather than whatever t=0 happens to look like.
      draw(6.2);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  // A lost context is not worth recovering mid-screen: stop, and let the CSS
  // water show through the canvas we blank out.
  const onLost = (e) => {
    e.preventDefault();
    stop();
    dead = true;
    canvas.classList.remove("is-live");
  };
  canvas.addEventListener("webglcontextlost", onLost);

  // The theme can flip underneath us (the OS switching to dark while the
  // screen is open), and the palette is only read when the loop starts.
  const themeWatcher = new MutationObserver(() => {
    if (!dead) readPalette();
  });
  themeWatcher.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "data-contrast"]
  });

  const observer = new ResizeObserver(() => {
    if (dead) return;
    resize();
    // A resize while frozen still has to repaint: nothing else will.
    if (!raf) start();
  });
  observer.observe(canvas);

  canvas.classList.add("is-live");

  return {
    start,
    stop,
    destroy() {
      stop();
      dead = true;
      observer.disconnect();
      themeWatcher.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.classList.remove("is-live");

      // Hand the GPU objects back now rather than at collection time. The
      // context itself is left alive on purpose: losing it would make the
      // canvas unusable for every renderer built on it afterwards.
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    }
  };
}
