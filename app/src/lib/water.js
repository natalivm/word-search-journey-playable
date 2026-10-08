/**
 * The pool surface, as a WebGL fragment shader.
 *
 * The CSS version of this water is two crossing meshes of gradient bands —
 * cheap, and it reads as water from a distance, but it repeats and it cannot
 * refract anything. This draws the real thing: a tiled floor seen through a
 * moving surface, with the caustic net that forms where the surface focuses
 * sunlight onto it.
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

/* The surface: four crossing swells, two of them bent by noise so the set
   never settles into a plaid. Returns roughly -1..1. */
float surface(vec2 p, float t) {
  float v = 0.0;
  v += sin(p.x * 3.1 + t * 0.85 + noise(p * 1.7) * 2.2);
  v += sin(p.y * 2.6 - t * 0.73 + noise(p * 2.3 + 11.0) * 2.0);
  v += sin((p.x + p.y) * 2.05 + t * 1.21);
  v += sin((p.x - p.y) * 3.65 - t * 0.97);
  return v * 0.25;
}

void main() {
  /* Normalised on height, so the pattern keeps its proportions whatever the
     screen is. The scale sets how much water you are looking at: about seven
     wave-widths from top to bottom, which is a pool rather than a bathtub. */
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 p = uv * 7.0;
  float t = uTime;

  /* Slope of the surface, as a displacement. Everything below the water is
     looked up through it, which is what refraction is. */
  vec2 warp = vec2(
    surface(p + vec2(0.0, 1.3), t),
    surface(p.yx + vec2(2.7, 0.0), t * 1.09)
  );

  /* Pool floor: square tiles with a slightly darker grout, wobbling because
     we are reading them through the water rather than straight on. */
  vec2 tile = (p + warp * 0.16) * 2.6;
  vec2 cell = abs(fract(tile) - 0.5);
  float grout = smoothstep(0.40, 0.5, max(cell.x, cell.y));
  float shade = hash(floor(tile)) * 0.05;

  /* Caustics focus where the surface is flat, so the bright net is the ridge
     line of the wave field: thin where the power is high, two scales so it
     has both a big cell structure and a fine sparkle. */
  float h1 = surface(p * 1.1 + warp * 0.5, t * 0.8);
  float h2 = surface(p * 2.1 - warp * 0.34, t * 1.15 + 4.0);
  float net =
    0.40 * pow(max(0.0, 1.0 - abs(h1)), 9.0) +
    0.20 * pow(max(0.0, 1.0 - abs(h2)), 13.0);

  /* Shallow at the top of the screen, deep at the bottom — the same reading
     as the gradient this replaces. */
  float depth = clamp(gl_FragCoord.y / uRes.y, 0.0, 1.0);
  vec3 col = mix(uDeep, uShallow, depth);

  col *= 1.0 - shade;
  col *= mix(1.0, 0.93, grout);
  col += uGlow * net * uStrength * (0.55 + 0.45 * depth);

  /* A wide sheen where the sun hits the far end of the pool. */
  col += uGlow * smoothstep(0.78, 1.0, depth) * 0.03 * uStrength;

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
