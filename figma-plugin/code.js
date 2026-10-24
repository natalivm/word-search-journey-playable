/**
 * Word Search Journey — build the design file.
 *
 * Run once in a Figma file. It creates:
 *   - a "WSJ" variable collection with Light and Dark modes, one colour
 *     variable per semantic token, taken straight from app/src/styles/tokens.css
 *   - text styles for the Nunito scale the app actually uses
 *   - effect styles for the four elevations plus the accent glow
 *   - a component library (buttons, chips, bars, stars, switch, segment,
 *     level nodes, word pills, tiles)
 *   - the screen frames, as auto-layout, built from those components
 *
 * Everything is data below and a small renderer above it, so adding a screen
 * is a spec entry rather than new drawing code.
 */

/* --------------------------------------------------------------------- */
/* Tokens                                                                  */
/* --------------------------------------------------------------------- */

// Semantic tokens, light and dark. Keys match the CSS custom properties.
var LIGHT = {
  'bg': '#9de7ec',
  'surface': '#fffaf0',
  'surface-2': '#ffffff',
  'surface-sunk': '#f1efe6',
  'ink': '#19243a',
  'ink-soft': '#404b63',
  'ink-muted': '#6b7590',
  'ink-invert': '#ffffff',
  'line': '#dce4e2',
  'line-strong': '#c3cfcc',
  'accent': '#ff6b6b',
  'accent-ink': '#ffffff',
  'good': '#18a999',
  'warn': '#e8911c',
  'lock': '#9aa4b8',
  'tile': '#ffffff',
  'tile-line': '#dce4e2',
  'tile-ink': '#19243a'
};

var DARK = {
  'bg': '#141c2e',
  'surface': '#1e293f',
  'surface-2': '#26324c',
  'surface-sunk': '#172033',
  'ink': '#f2f6ff',
  'ink-soft': '#c6d0e6',
  'ink-muted': '#8e9ab6',
  'ink-invert': '#0f1726',
  'line': '#35425f',
  'line-strong': '#46557a',
  'accent': '#ff7b7b',
  'accent-ink': '#0f1726',
  'good': '#2fc9b6',
  'warn': '#e8911c',
  'lock': '#5c6782',
  'tile': '#2b3752',
  'tile-line': '#3c4a6b',
  'tile-ink': '#f4f7ff'
};

// The brand ramp is mode-independent: one value in both modes.
var BRAND = {
  'sky-100': '#eafafb', 'sky-200': '#c6f0f3', 'sky-300': '#9de7ec', 'sky-500': '#4fc3cd',
  'sand-100': '#fff6dd', 'sand-300': '#ffe08a', 'sand-500': '#f6c453',
  'coral-400': '#ff8a8a', 'coral-500': '#ff6b6b', 'coral-600': '#e24d4d',
  'teal-500': '#18a999', 'teal-600': '#0d8676',
  'blue-500': '#2364aa', 'blue-600': '#1a4d85',
  'leaf-500': '#2f8f6f', 'violet-500': '#7c5cde'
};

// The nine word-highlight colours, in all three palettes.
var WORDS = {
  light: ['#ff6b6b', '#2364aa', '#18a999', '#f6a800', '#7c5cde', '#e8559a', '#2f8f6f', '#ef7a2b', '#3aa0d8'],
  dark: ['#ff7f7f', '#5b9be0', '#2fc9b6', '#ffc14d', '#a98cf5', '#ff7fbe', '#52c396', '#ff9a57', '#62bdf0'],
  cvd: ['#d55e00', '#0072b2', '#009e73', '#e69f00', '#cc79a7', '#56b4e9', '#6a4c93', '#b04a1f', '#00707a']
};

var RADIUS = { xs: 8, sm: 12, md: 16, lg: 22, xl: 30, pill: 999 };
var SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 22, 6: 30, 7: 40 };

// name -> [fontStyle, size, lineHeightPx|null, letterSpacingPx]
var TYPE = {
  'Display/Home title': ['Black', 35, 33, -0.5],
  'Heading/Overlay': ['Black', 27, null, 0],
  'Heading/Sheet': ['Black', 22, null, 0],
  'Label/CTA': ['Black', 20, null, 0],
  'Heading/Screen': ['Black', 19, null, -0.2],
  'Numeric/Stat': ['Black', 19, null, 0],
  'Heading/Play title': ['Black', 17, null, 0],
  'Label/Button': ['Black', 16, null, 0],
  'Label/Row title': ['Black', 15, null, 0],
  'Body/Sheet': ['ExtraBold', 15, 21, 0],
  'Label/Word pill': ['Black', 15, null, 0.4],
  'Body/Sub': ['ExtraBold', 14, null, 0],
  'Numeric/Timer': ['Black', 14, null, 0],
  'Label/Section': ['Black', 13, null, 0.9],
  'Label/Chip': ['Black', 13, null, 0],
  'Body/Meta': ['ExtraBold', 12, null, 0],
  'Body/Row hint': ['ExtraBold', 11.5, 15, 0],
  'Body/Caption': ['ExtraBold', 11, null, 0],
  'Label/Stat': ['ExtraBold', 10, null, 0.5],
  'Label/Micro': ['Black', 9, null, 0.8]
};

var SHADOWS = {
  'Elevation/sm': { x: 0, y: 2, blur: 6, color: '#19243a', alpha: 0.08 },
  'Elevation/md': { x: 0, y: 8, blur: 18, color: '#19243a', alpha: 0.12 },
  'Elevation/lg': { x: 0, y: 16, blur: 32, color: '#19243a', alpha: 0.18 },
  'Elevation/xl': { x: 0, y: 24, blur: 54, color: '#19243a', alpha: 0.26 },
  'Elevation/accent glow': { x: 0, y: 8, blur: 18, color: '#ff6b6b', alpha: 0.34 }
};

var FONT = 'Nunito';
var W600 = 'SemiBold', W800 = 'ExtraBold', W900 = 'Black';

/* --------------------------------------------------------------------- */
/* Small helpers                                                           */
/* --------------------------------------------------------------------- */

function hex(h) {
  var s = h.replace('#', '');
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  return {
    r: parseInt(s.slice(0, 2), 16) / 255,
    g: parseInt(s.slice(2, 4), 16) / 255,
    b: parseInt(s.slice(4, 6), 16) / 255
  };
}

function solid(h, a) {
  return { type: 'SOLID', color: hex(h), opacity: a === undefined ? 1 : a };
}

/**
 * A linear gradient paint. `cssDeg` is the CSS angle (180 = top to bottom),
 * converted here to Figma's gradient transform.
 */
function grad(cssDeg, stops) {
  var r = (cssDeg - 90) * Math.PI / 180;
  var c = Math.cos(r), s = Math.sin(r);
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[c, s, (1 - c - s) / 2], [-s, c, (1 + s - c) / 2]],
    gradientStops: stops.map(function (st) {
      var col = hex(st[0]);
      col.a = st.length > 2 ? st[2] : 1;
      return { position: st[1], color: col };
    })
  };
}

var VARS = {};
var TEXTSTYLE = {};
var EFFECTSTYLE = {};

/** A solid paint bound to the named colour variable, if that variable exists. */
function tok(name, fallback) {
  var base = { type: 'SOLID', color: hex(LIGHT[name] || BRAND[name] || fallback || '#000000') };
  var v = VARS[name];
  if (!v) return base;
  try {
    return figma.variables.setBoundVariableForPaint(base, 'color', v);
  } catch (e) {
    return base;
  }
}

function applyShadow(node, name) {
  var st = EFFECTSTYLE[name];
  if (st) { node.effectStyleId = st.id; return; }
  var s = SHADOWS[name];
  if (!s) return;
  var col = hex(s.color); col.a = s.alpha;
  node.effects = [{ type: 'DROP_SHADOW', color: col, offset: { x: s.x, y: s.y }, radius: s.blur, spread: 0, visible: true, blendMode: 'NORMAL' }];
}

/* --------------------------------------------------------------------- */
/* Node builders                                                           */
/* --------------------------------------------------------------------- */

/**
 * An auto-layout frame.
 * o: { name, dir, gap, pad, w, h, fill, radius, shadow, align, justify,
 *      wrap, grow, stretch, clip }
 */
function F(o) {
  var f = figma.createFrame();
  var horizontal = o.dir === 'h';
  f.name = o.name || 'Frame';
  f.layoutMode = horizontal ? 'HORIZONTAL' : 'VERTICAL';
  f.itemSpacing = o.gap || 0;

  var p = o.pad || [0, 0, 0, 0];
  if (typeof p === 'number') p = [p, p, p, p];
  f.paddingTop = p[0]; f.paddingRight = p[1]; f.paddingBottom = p[2]; f.paddingLeft = p[3];

  if (o.align) f.counterAxisAlignItems = o.align;      // CENTER | MIN | MAX
  if (o.justify) f.primaryAxisAlignItems = o.justify;  // CENTER | MIN | MAX | SPACE_BETWEEN

  f.fills = o.fill ? (Array.isArray(o.fill) ? o.fill : [o.fill]) : [];
  if (o.radius !== undefined) f.cornerRadius = o.radius;
  if (o.stroke) { f.strokes = [o.stroke]; f.strokeWeight = o.strokeW || 1; f.strokeAlign = 'INSIDE'; }
  if (o.shadow) applyShadow(f, o.shadow);
  if (o.clip !== undefined) f.clipsContent = o.clip;
  if (o.opacity !== undefined) f.opacity = o.opacity;

  // Children before sizing: an auto-layout frame resolves its hug size from
  // its contents, so resizing an empty frame and then filling it throws the
  // explicit size away.
  (o.children || []).forEach(function (c) { if (c) f.appendChild(c); });

  f.primaryAxisSizingMode = 'AUTO';
  f.counterAxisSizingMode = 'AUTO';
  if (horizontal) {
    if (o.w) f.primaryAxisSizingMode = 'FIXED';
    if (o.h) f.counterAxisSizingMode = 'FIXED';
  } else {
    if (o.h) f.primaryAxisSizingMode = 'FIXED';
    if (o.w) f.counterAxisSizingMode = 'FIXED';
  }
  if (o.w || o.h) f.resize(o.w || f.width, o.h || f.height);

  // Wrap needs a fixed primary axis to wrap against and a hugging counter
  // axis to grow into, so it has to come after the sizing modes above.
  if (o.wrap && horizontal) {
    f.layoutWrap = 'WRAP';
    f.counterAxisSizingMode = 'AUTO';
    f.counterAxisSpacing = o.wrapGap === undefined ? (o.gap || 0) : o.wrapGap;
  }

  if (o.grow) f.layoutGrow = 1;
  if (o.stretch) f.layoutAlign = 'STRETCH';
  return f;
}

/** A text node using one of the named text styles. */
function T(chars, styleName, colorToken, o) {
  o = o || {};
  var t = figma.createText();
  var st = TEXTSTYLE[styleName];
  var spec = TYPE[styleName] || ['ExtraBold', 14, null, 0];
  t.fontName = { family: FONT, style: spec[0] };
  t.characters = String(chars);
  if (st) {
    t.textStyleId = st.id;
  } else {
    t.fontSize = spec[1];
    if (spec[2]) t.lineHeight = { value: spec[2], unit: 'PIXELS' };
    t.letterSpacing = { value: spec[3], unit: 'PIXELS' };
  }
  if (o.upper) t.textCase = 'UPPER';
  t.fills = [typeof colorToken === 'string' && colorToken[0] === '#' ? solid(colorToken) : tok(colorToken || 'ink')];
  t.textAlignHorizontal = o.align || 'LEFT';
  t.name = o.name || String(chars).slice(0, 24);
  if (o.w) { t.resize(o.w, t.height); t.textAutoResize = 'HEIGHT'; }
  else t.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (o.grow) t.layoutGrow = 1;
  if (o.stretch) t.layoutAlign = 'STRETCH';
  return t;
}

/** A plain rectangle — used for bars, swatches and tiles. */
function R(o) {
  var r = figma.createRectangle();
  r.name = o.name || 'Rect';
  r.resize(o.w || 10, o.h || 10);
  r.fills = o.fill ? (Array.isArray(o.fill) ? o.fill : [o.fill]) : [];
  if (o.radius !== undefined) r.cornerRadius = o.radius;
  if (o.stroke) { r.strokes = [o.stroke]; r.strokeWeight = o.strokeW || 1; r.strokeAlign = 'INSIDE'; }
  if (o.shadow) applyShadow(r, o.shadow);
  if (o.opacity !== undefined) r.opacity = o.opacity;
  if (o.grow) r.layoutGrow = 1;
  if (o.stretch) r.layoutAlign = 'STRETCH';
  return r;
}

/** An icon from the app's own Icon.jsx path set. */
var ICON = {
  back: ['M15 5l-7 7 7 7'],
  gear: ['M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z', 'M19.4 13a7.9 7.9 0 000-2l2-1.5-2-3.4-2.4 1a8 8 0 00-1.7-1L15 3.5h-4l-.3 2.6a8 8 0 00-1.7 1l-2.4-1-2 3.4L6.6 11a7.9 7.9 0 000 2l-2 1.5 2 3.4 2.4-1a8 8 0 001.7 1l.3 2.6h4l.3-2.6a8 8 0 001.7-1l2.4 1 2-3.4z'],
  user: ['M12 12a4 4 0 100-8 4 4 0 000 8z', 'M4.5 20a7.5 7.5 0 0115 0'],
  map: ['M9 4L3 7v13l6-3 6 3 6-3V4l-6 3-6-3z', 'M9 4v13', 'M15 7v13'],
  pause: ['M9 5v14', 'M15 5v14'],
  bulb: ['M9.5 18h5', 'M10 21h4', 'M12 3a6 6 0 00-3.5 10.9c.6.5.9 1.1 1 1.6h5c.1-.5.4-1.1 1-1.6A6 6 0 0012 3z'],
  check: ['M4 12.5l5.5 5.5L20 7'],
  trophy: ['M8 4h8v5a4 4 0 11-8 0V4z', 'M8 6H5v1a3 3 0 003 3', 'M16 6h3v1a3 3 0 01-3 3', 'M10 17h4', 'M12 13v4', 'M9 20h6'],
  calendar: ['M4 8h16', 'M8 3v4', 'M16 3v4', 'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z'],
  star: null // filled, handled separately
};

var STAR_D = 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z';

function icon(name, size, color) {
  var paths = ICON[name];
  if (!paths) return null;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" ' +
    'stroke="' + color + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
    paths.map(function (d) { return '<path d="' + d + '"/>'; }).join('') + '</svg>';
  var n = figma.createNodeFromSvg(svg);
  n.name = 'icon / ' + name;
  n.resize(size, size);
  return n;
}

function star(size, filled) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24">' +
    '<path d="' + STAR_D + '" fill="' + (filled || '#c3cfcc') + '"/></svg>';
  var n = figma.createNodeFromSvg(svg);
  n.name = 'star';
  n.resize(size, size);
  return n;
}

function stars(filledCount, size, onColor, offColor) {
  var kids = [];
  for (var i = 0; i < 3; i++) kids.push(star(size || 14, i < filledCount ? (onColor || '#f6c453') : (offColor || '#c3cfcc')));
  return F({ name: 'Stars / ' + filledCount + ' of 3', dir: 'h', gap: 2, align: 'CENTER', children: kids });
}

/* --------------------------------------------------------------------- */
/* Foundations                                                             */
/* --------------------------------------------------------------------- */

function buildVariables() {
  var col;
  try {
    col = figma.variables.createVariableCollection('WSJ');
  } catch (e) {
    return; // Variables unavailable on this plan — literals still apply.
  }
  var lightMode = col.modes[0].modeId;
  col.renameMode(lightMode, 'Light');
  var darkMode = col.addMode('Dark');

  // The current API takes the collection; older builds took its id.
  function newVar(name, collection, type) {
    try {
      return figma.variables.createVariable(name, collection, type);
    } catch (e) {
      return figma.variables.createVariable(name, collection.id, type);
    }
  }

  function mk(group, name, lightHex, darkHex) {
    var v = newVar(group + '/' + name, col, 'COLOR');
    v.setValueForMode(lightMode, hex(lightHex));
    v.setValueForMode(darkMode, hex(darkHex));
    VARS[name] = v;
    return v;
  }

  Object.keys(LIGHT).forEach(function (k) { mk('semantic', k, LIGHT[k], DARK[k] || LIGHT[k]); });
  Object.keys(BRAND).forEach(function (k) { mk('brand', k, BRAND[k], BRAND[k]); });
  for (var i = 0; i < 9; i++) mk('word', 'w' + (i + 1), WORDS.light[i], WORDS.dark[i]);

  // Spacing and radius as number variables, so Figma's spacing fields can bind.
  var nums = figma.variables.createVariableCollection('WSJ scale');
  var nm = nums.modes[0].modeId;
  Object.keys(SPACE).forEach(function (k) {
    var v = newVar('space/sp-' + k, nums, 'FLOAT');
    v.setValueForMode(nm, SPACE[k]);
  });
  Object.keys(RADIUS).forEach(function (k) {
    var v = newVar('radius/' + k, nums, 'FLOAT');
    v.setValueForMode(nm, RADIUS[k]);
  });
}

function buildTextStyles() {
  Object.keys(TYPE).forEach(function (name) {
    var spec = TYPE[name];
    var st = figma.createTextStyle();
    st.name = name;
    st.fontName = { family: FONT, style: spec[0] };
    st.fontSize = spec[1];
    if (spec[2]) st.lineHeight = { value: spec[2], unit: 'PIXELS' };
    st.letterSpacing = { value: spec[3], unit: 'PIXELS' };
    TEXTSTYLE[name] = st;
  });
}

function buildEffectStyles() {
  Object.keys(SHADOWS).forEach(function (name) {
    var s = SHADOWS[name];
    var col = hex(s.color); col.a = s.alpha;
    var st = figma.createEffectStyle();
    st.name = name;
    st.effects = [{ type: 'DROP_SHADOW', color: col, offset: { x: s.x, y: s.y }, radius: s.blur, spread: 0, visible: true, blendMode: 'NORMAL' }];
    EFFECTSTYLE[name] = st;
  });
}

/* --------------------------------------------------------------------- */
/* Components                                                              */
/* --------------------------------------------------------------------- */

var COMP = {};

function button(label, variant) {
  var isPrimary = variant === 'primary';
  var isGhost = variant === 'ghost';
  var isLarge = variant === 'primary-lg';
  var big = isLarge;
  var f = F({
    name: 'Button / ' + variant,
    dir: 'h', gap: 8, align: 'CENTER', justify: 'CENTER',
    pad: [0, 22, 0, 22],
    h: big ? 60 : 44,
    radius: big ? RADIUS.lg : RADIUS.md,
    fill: (isPrimary || isLarge) ? tok('accent') : isGhost ? solid('#ffffff', 0.82) : tok('surface-2'),
    shadow: (isPrimary || isLarge) ? 'Elevation/accent glow' : isGhost ? null : 'Elevation/sm',
    children: [T(label, big ? 'Label/CTA' : 'Label/Button', (isPrimary || isLarge) ? 'accent-ink' : 'ink')]
  });
  return f;
}

function chip(text, colorHex) {
  return F({
    name: 'Chip', dir: 'h', gap: 6, align: 'CENTER', justify: 'CENTER',
    pad: [0, 12, 0, 12], h: 32, radius: RADIUS.pill,
    fill: solid('#ffffff', 0.82), shadow: 'Elevation/sm',
    children: [T(text, 'Label/Chip', colorHex || 'ink')]
  });
}

function bar(pct, thin, width) {
  var h = thin ? 6 : 10;
  var track = F({
    name: 'Progress bar', dir: 'h', w: width || 200, h: h, radius: RADIUS.pill,
    fill: tok('surface-sunk'), clip: true,
    children: [R({
      name: 'Fill', w: Math.max(1, Math.round((width || 200) * pct)), h: h, radius: RADIUS.pill,
      fill: grad(90, [['#18a999', 0], ['#f6c453', 1]])
    })]
  });
  return track;
}

function toggle(on) {
  var knob = R({ name: 'Knob', w: 24, h: 24, radius: 12, fill: solid('#ffffff'), shadow: 'Elevation/sm' });
  return F({
    name: 'Switch / ' + (on ? 'on' : 'off'),
    dir: 'h', w: 50, h: 30, radius: RADIUS.pill, align: 'CENTER',
    pad: [0, 3, 0, 3], justify: on ? 'MAX' : 'MIN',
    fill: on ? tok('good') : tok('line-strong'),
    children: [knob]
  });
}

function segment(options, activeIndex) {
  return F({
    name: 'Segmented control', dir: 'h', gap: 2, pad: 3, radius: RADIUS.sm,
    fill: tok('surface-sunk'), align: 'CENTER',
    children: options.map(function (o, i) {
      return F({
        name: 'Option', dir: 'h', h: 34, pad: [0, 12, 0, 12], radius: 9, align: 'CENTER', justify: 'CENTER',
        fill: i === activeIndex ? tok('surface-2') : null,
        shadow: i === activeIndex ? 'Elevation/sm' : null,
        children: [T(o, 'Label/Chip', i === activeIndex ? 'ink' : 'ink-muted')]
      });
    })
  });
}

function levelNode(n, state, filledStars) {
  var fill, textColor, shadow = 'Elevation/md', stroke = null;
  if (state === 'done') { fill = grad(160, [['#18a999', 0], ['#2f8f6f', 1]]); textColor = '#ffffff'; }
  else if (state === 'next') { fill = tok('accent'); textColor = '#ffffff'; shadow = 'Elevation/accent glow'; }
  else if (state === 'locked') { fill = tok('surface-sunk'); textColor = '#9aa4b8'; shadow = null; stroke = tok('line'); }
  else { fill = tok('surface-2'); textColor = 'ink'; }

  var kids = [];
  if (state === 'locked') {
    kids.push(T('🔒', 'Body/Sub', '#9aa4b8'));
  } else {
    kids.push(T(String(n), 'Numeric/Stat', textColor));
    var on = (state === 'done' || state === 'next') ? '#ffffff' : '#f6c453';
    var off = (state === 'done' || state === 'next') ? '#ffffff' : '#c3cfcc';
    var s = stars(filledStars || 0, 11, on, off);
    if (state === 'done' || state === 'next') s.opacity = 1;
    kids.push(s);
  }

  return F({
    name: 'Level node / ' + state, dir: 'v', gap: 2, w: 62, h: 62, radius: RADIUS.md,
    align: 'CENTER', justify: 'CENTER', fill: fill, shadow: shadow,
    stroke: stroke, strokeW: stroke ? 2 : 0,
    children: kids
  });
}

function wordPill(word, colorHex, found) {
  return F({
    name: 'Word pill / ' + (found ? 'found' : 'to find'),
    dir: 'h', h: 30, pad: [0, 12, 0, 12], radius: RADIUS.pill, align: 'CENTER', justify: 'CENTER',
    fill: found ? solid(colorHex) : solid('#ffffff', 0.82),
    shadow: found ? null : 'Elevation/sm',
    children: [T(word, 'Label/Word pill', found ? '#ffffff' : colorHex)]
  });
}

function boardTile(letter, state) {
  // state: '' | 'found' | 'active'
  var bg = state === 'found' ? '#18a999' : state === 'active' ? '#2364aa' : null;
  return F({
    name: 'Cell' + (state ? ' / ' + state : ''),
    dir: 'h', w: 39, h: 39, radius: RADIUS.xs, align: 'CENTER', justify: 'CENTER',
    fill: bg ? solid(bg) : tok('tile'),
    stroke: bg ? null : tok('tile-line'), strokeW: bg ? 0 : 1.5,
    children: letter ? [T(letter, 'Numeric/Stat', bg ? '#ffffff' : 'tile-ink')] : []
  });
}

function buildComponentLibrary(originX, originY) {
  var items = [];

  function group(title, nodes) {
    return F({
      name: title, dir: 'v', gap: 12, align: 'MIN',
      children: [T(title, 'Label/Section', 'ink-muted', { upper: true })].concat(nodes)
    });
  }

  items.push(group('Buttons', [
    F({ dir: 'v', gap: 8, align: 'MIN', children: [
      button('Start journey', 'primary-lg'),
      button('Resume', 'primary'),
      button('Replay', 'secondary'),
      button('Quit to map', 'ghost')
    ] })
  ]));

  items.push(group('Chips', [
    F({ dir: 'h', gap: 8, align: 'CENTER', children: [
      chip('⭐ 51', 'ink'), chip('🪙 420', '#a6700a'), chip('🔥 3', '#c23c3c'), chip('🛟 8/10', 'ink')
    ] })
  ]));

  items.push(group('Progress and stars', [
    F({ dir: 'v', gap: 10, align: 'MIN', children: [
      bar(0.62, false, 240), bar(0.3, true, 240),
      F({ dir: 'h', gap: 16, align: 'CENTER', children: [stars(0), stars(1), stars(2), stars(3)] })
    ] })
  ]));

  items.push(group('Controls', [
    F({ dir: 'h', gap: 14, align: 'CENTER', children: [
      toggle(false), toggle(true), segment(['Auto', 'Light', 'Dark'], 0)
    ] })
  ]));

  items.push(group('Level nodes', [
    F({ dir: 'h', gap: 14, align: 'CENTER', children: [
      levelNode(25, 'unplayed', 0), levelNode(23, 'done', 3), levelNode(24, 'next', 0), levelNode(0, 'locked', 0)
    ] })
  ]));

  items.push(group('Word pills', [
    F({ dir: 'h', gap: 6, align: 'CENTER', wrap: true, w: 360, children: [
      wordPill('PEAK', WORDS.light[0], false),
      wordPill('RIDGE', WORDS.light[3], false),
      wordPill('ALPINE', WORDS.light[4], false),
      wordPill('SUMMIT', WORDS.light[1], true),
      wordPill('GLACIER', WORDS.light[2], true),
      wordPill('CAIRN', WORDS.light[5], true)
    ] })
  ]));

  items.push(group('Board cells', [
    F({ dir: 'h', gap: 4, align: 'CENTER', children: [
      boardTile('', ''), boardTile('M', ''), boardTile('M', 'active'), boardTile('M', 'found')
    ] })
  ]));

  var sheet = F({
    name: 'Component library', dir: 'v', gap: 36, pad: 40, align: 'MIN',
    fill: tok('sky-100'), children: items
  });
  sheet.x = originX; sheet.y = originY;
  return sheet;
}

/* --------------------------------------------------------------------- */
/* Screens                                                                 */
/* --------------------------------------------------------------------- */

/** The sand-and-pine horizon painted on the app shell, as one vector. */
function horizon(w, h) {
  var ow = w * 1.16, ox = -w * 0.08;
  var pts = [[0, 0.32], [0.15, 0.10], [0.31, 0.32], [0.48, 0.06], [0.66, 0.34], [0.83, 0.14], [1, 0.36], [1, 1], [0, 1]]
    .map(function (p) { return (p[0] * ow).toFixed(1) + ',' + (p[1] * h).toFixed(1); }).join(' ');
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + ow + '" height="' + h + '" viewBox="0 0 ' + ow + ' ' + h + '">' +
    '<polygon points="' + pts + '" fill="#ffe08a"/></svg>';
  var n = figma.createNodeFromSvg(svg);
  n.name = 'Horizon (decorative)';
  n.x = ox; n.y = 0;
  n.opacity = 0.85;
  return n;
}

/** A 390x844 phone frame with the app background and the horizon behind. */
function phone(name, children, bgFill) {
  var f = F({
    name: name, dir: 'v', gap: 0, pad: [16, 16, 12, 16], w: 390, h: 844,
    fill: bgFill || grad(180, [['#9de7ec', 0], ['#d9f6eb', 0.46], ['#fff1c7', 1]]),
    clip: true, children: children
  });
  var hz = horizon(390, 219);
  f.appendChild(hz);
  hz.layoutPositioning = 'ABSOLUTE';
  hz.x = -31; hz.y = 844 - 219;
  return f;
}

function iconButton(name, size, iconName) {
  var s = size || 44;
  return F({
    name: 'Icon button' + (s === 34 ? ' / small' : ''), dir: 'h', w: s, h: s, radius: RADIUS.sm,
    align: 'CENTER', justify: 'CENTER', fill: solid('#ffffff', 0.82), shadow: 'Elevation/sm',
    children: [icon(iconName, s === 34 ? 18 : 22, '#19243a')]
  });
}

function screenHome() {
  var avatar = F({
    name: 'Avatar', dir: 'h', w: 44, h: 44, radius: RADIUS.md, align: 'CENTER', justify: 'CENTER',
    fill: tok('surface-2'), shadow: 'Elevation/sm', children: [T('🧭', 'Heading/Sheet', 'ink')]
  });

  var strip = F({
    name: 'Player strip', dir: 'h', gap: 12, pad: [8, 12, 8, 12], w: 358, h: 60, radius: RADIUS.lg,
    align: 'CENTER', fill: solid('#ffffff', 0.82), shadow: 'Elevation/sm',
    children: [
      avatar,
      F({ name: 'Meta', dir: 'v', gap: 4, grow: true, children: [
        F({ dir: 'h', gap: 8, align: 'CENTER', children: [
          T('Traveller', 'Label/Row title', 'ink'),
          T('Lv 6 · Pathfinder', 'Body/Caption', 'ink-muted')
        ] }),
        bar(0.58, false, 240),
        T('41 / 70 XP', 'Label/Stat', 'ink-muted')
      ] }),
      icon('user', 20, '#6b7590')
    ]
  });

  var wallet = F({
    name: 'Wallet', dir: 'h', gap: 8, w: 358, align: 'CENTER',
    children: [
      chip('🪙 420', '#a6700a'),
      chip('🔥 3', '#c23c3c'),
      F({ name: 'Spacer', dir: 'h', grow: true, children: [] }),
      iconButton('Profile', 34, 'trophy'),
      iconButton('Settings', 34, 'gear')
    ]
  });

  var hero = F({
    name: 'Hero', dir: 'v', gap: 8, w: 358, align: 'CENTER',
    children: [
      F({ name: 'App mark', dir: 'h', w: 76, h: 76, radius: RADIUS.lg, align: 'CENTER', justify: 'CENTER',
        fill: grad(135, [['#2364aa', 0], ['#2364aa', 0.36], ['#18a999', 0.36], ['#18a999', 0.64], ['#ffe08a', 0.64]]),
        shadow: 'Elevation/lg', children: [T('W', 'Heading/Overlay', '#ffffff')] }),
      T('Word Search Journey', 'Display/Home title', 'ink', { w: 160, align: 'CENTER' }),
      T('23 of 80 levels explored', 'Body/Sub', 'ink-soft', { align: 'CENTER' })
    ]
  });

  var cta = button('Continue · Mountain Pass 7', 'primary-lg');
  cta.resize(358, 60);
  cta.layoutAlign = 'STRETCH';

  var pool = F({
    name: 'Pool Party widget', dir: 'h', gap: 12, pad: 12, w: 358, radius: RADIUS.lg, align: 'CENTER',
    fill: grad(135, [['#5ec9e8', 0], ['#3aa9d8', 0.55], ['#2b8fc4', 1]]), shadow: 'Elevation/md', clip: true,
    children: [
      F({ name: 'Rings', dir: 'h', w: 76, h: 58, children: [] }),
      F({ name: 'Meta', dir: 'v', gap: 4, grow: true, children: [
        F({ dir: 'h', gap: 6, align: 'CENTER', children: [
          T('Pool Party', 'Label/Button', '#ffffff'),
          F({ name: 'Event tag', dir: 'h', pad: [1, 6, 1, 6], radius: RADIUS.pill, fill: solid('#ff6b6b'),
            children: [T('EVENT', 'Label/Micro', '#ffffff')] })
        ] }),
        T('10 very hard puzzles', 'Body/Row hint', '#ffffff'),
        bar(0.3, true, 180),
        T('3 / 10 rings cleared', 'Body/Row hint', '#ffffff')
      ] }),
      F({ name: 'Prize', dir: 'v', gap: 2, align: 'CENTER', children: [
        T('🪙', 'Heading/Sheet', '#ffffff'), T('1,000', 'Body/Caption', '#ffffff')
      ] })
    ]
  });

  function tileButton(iconName, iconColor, title, hint, daily) {
    return F({
      name: 'Tile button / ' + title, dir: 'v', gap: 2, pad: 12, w: 175, h: 84, radius: RADIUS.lg,
      justify: 'CENTER',
      fill: daily ? grad(135, [['#ffe08a', 0], ['#f6c453', 1]]) : solid('#ffffff', 0.82),
      shadow: 'Elevation/sm',
      children: [
        icon(iconName, 24, iconColor),
        T(title, 'Label/Row title', daily ? '#4a3100' : 'ink'),
        T(hint, 'Body/Caption', daily ? '#6b4a06' : 'ink-muted')
      ]
    });
  }

  var tiles = F({
    name: 'Tiles', dir: 'h', gap: 8, w: 358,
    children: [
      tileButton('calendar', '#6b4a06', 'Daily', 'Fresh puzzle', true),
      tileButton('map', '#2364aa', 'Journey', 'Pick a level', false)
    ]
  });

  var footnote = F({
    name: 'Footnote', dir: 'h', gap: 6, w: 358, align: 'CENTER', justify: 'CENTER',
    children: [icon('trophy', 14, '#6b7590'), T('51 / 240 stars collected', 'Body/Meta', 'ink-muted')]
  });

  var body = F({
    name: 'Body', dir: 'v', gap: 16, w: 358, grow: true, align: 'CENTER',
    children: [
      F({ name: 'Spacer', dir: 'v', grow: true, children: [] }),
      hero, cta, pool, tiles,
      F({ name: 'Spacer', dir: 'v', grow: true, children: [] }),
      footnote
    ]
  });

  return phone('Home — returning player', [
    F({ name: 'HUD', dir: 'v', gap: 8, pad: [0, 0, 12, 0], w: 358, children: [strip, wallet] }),
    body
  ]);
}

/* -- shared screen parts ------------------------------------------------ */

/** Back button, centred title, optional trailing slot. */
function topBar(title, subtitle, trailing) {
  var mid = F({
    name: 'Title', dir: 'v', gap: 0, grow: true, align: 'CENTER',
    children: [T(title, 'Heading/Screen', 'ink', { align: 'CENTER' })]
        .concat(subtitle ? [T(subtitle, 'Body/Meta', 'ink-muted', { align: 'CENTER' })] : [])
  });
  return F({
    name: 'Top bar', dir: 'h', gap: 8, w: 358, align: 'CENTER', pad: [0, 0, 12, 0],
    children: [
      iconButton('Back', 44, 'back'),
      mid,
      trailing || F({ name: 'Spacer', dir: 'h', w: 44, h: 44, children: [] })
    ]
  });
}

function sectionTitle(text) {
  return T(text, 'Label/Section', 'ink-muted', { upper: true });
}

/** A settings row. kind: 'toggle-on' | 'toggle-off' | 'chevron' | 'static' | 'segment' */
function settingsRow(label, hint, kind, danger) {
  var trailing;
  if (kind === 'toggle-on') trailing = toggle(true);
  else if (kind === 'toggle-off') trailing = toggle(false);
  else if (kind === 'chevron') trailing = T('›', 'Heading/Sheet', 'ink-muted');
  else if (kind === 'segment') trailing = segment(['Auto', 'Light', 'Dark'], 0);
  else trailing = F({ name: 'Spacer', dir: 'h', w: 1, h: 1, children: [] });

  return F({
    name: 'Settings row / ' + label, dir: 'h', gap: 12, pad: [12, 16, 12, 16], w: 358, align: 'CENTER',
    fill: tok('surface'),
    children: [
      F({ name: 'Text', dir: 'v', gap: 2, grow: true, children: [
        T(label, 'Label/Row title', danger ? '#c23c3c' : 'ink'),
        T(hint, 'Body/Row hint', 'ink-muted', { w: 230 })
      ] }),
      trailing
    ]
  });
}

/** Rows stacked with a 1px gap, so the group's fill shows through as dividers. */
function settingsGroup(rows) {
  return F({
    name: 'Settings group', dir: 'v', gap: 1, w: 358, radius: RADIUS.lg, clip: true,
    fill: tok('line'), shadow: 'Elevation/sm', children: rows
  });
}

/** The scrim-and-card overlay used by pause, win and the champion screen. */
function overlay(cardChildren, name) {
  var card = F({
    name: 'Overlay card', dir: 'v', gap: 0, pad: 22, w: 346, radius: RADIUS.xl, align: 'CENTER',
    fill: tok('surface'), shadow: 'Elevation/xl', children: cardChildren
  });
  return F({
    name: name || 'Overlay', dir: 'v', w: 390, h: 844, pad: 22, align: 'CENTER', justify: 'CENTER',
    fill: solid('#19243a', 0.52), children: [card]
  });
}

function statTile(value, label) {
  return F({
    name: 'Stat / ' + label, dir: 'v', gap: 2, pad: 12, w: 113, radius: RADIUS.md,
    fill: solid('#ffffff', 0.82), shadow: 'Elevation/sm',
    children: [T(value, 'Numeric/Stat', 'ink'), T(label, 'Label/Stat', 'ink-muted', { upper: true })]
  });
}

function badgeRow(iconChar, name, desc, unlocked, have, need) {
  var meta = [T(name, 'Body/Sub', 'ink'), T(desc, 'Body/Caption', 'ink-muted', { w: 240 })];
  if (!unlocked) {
    meta.push(bar(have / need, true, 240));
    meta.push(T(have + ' / ' + need, 'Body/Caption', 'ink-muted'));
  }
  var f = F({
    name: 'Badge / ' + name, dir: 'h', gap: 12, pad: 12, w: 358, radius: RADIUS.md, align: 'CENTER',
    fill: unlocked ? tok('surface-2') : solid('#ffffff', 0.82), shadow: 'Elevation/sm',
    stroke: unlocked ? tok('sand-500') : null, strokeW: unlocked ? 2 : 0,
    children: [
      F({ name: 'Icon', dir: 'h', w: 44, h: 44, radius: RADIUS.sm, align: 'CENTER', justify: 'CENTER',
        fill: unlocked ? tok('sand-100') : tok('surface-sunk'),
        children: [T(unlocked ? iconChar : '🔒', 'Heading/Sheet', 'ink')] }),
      F({ name: 'Meta', dir: 'v', gap: 3, grow: true, children: meta })
    ]
  });
  if (!unlocked) f.opacity = 0.72;
  return f;
}

function chapterBanner(iconChar, name, blurb, pct, score, total, locked) {
  var f = F({
    name: 'Chapter / ' + name, dir: 'h', gap: 12, pad: 12, w: 358, radius: RADIUS.lg, align: 'CENTER',
    fill: solid('#ffffff', 0.82), shadow: 'Elevation/sm',
    children: [
      F({ name: 'Icon', dir: 'h', w: 44, h: 44, radius: RADIUS.md, align: 'CENTER', justify: 'CENTER',
        fill: tok('surface-2'), shadow: 'Elevation/sm', children: [T(iconChar, 'Heading/Sheet', 'ink')] }),
      F({ name: 'Meta', dir: 'v', gap: 4, grow: true, children: [
        T(name, 'Label/Row title', 'ink'),
        T(blurb, 'Body/Caption', 'ink-muted', { w: 210 }),
        bar(pct, false, 210)
      ] }),
      F({ name: 'Score', dir: 'v', gap: 0, align: 'CENTER', children: [
        T(String(score), 'Heading/Play title', '#b07d08'),
        T('/ ' + total, 'Label/Stat', 'ink-muted')
      ] })
    ]
  });
  if (locked) f.opacity = 0.55;
  return f;
}

/** A swim ring: a thick-stroked circle, so the pool shows through the hole. */
function ringFloat(size, colorHex, label, labelColor) {
  var s = size || 86;
  var r = s * 0.325;
  var sw = s * 0.315;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '">' +
    '<circle cx="' + (s / 2) + '" cy="' + (s / 2) + '" r="' + r + '" fill="none" stroke="' + colorHex + '" stroke-width="' + sw + '"/></svg>';
  var ring = figma.createNodeFromSvg(svg);
  ring.name = 'Float';
  return F({
    name: 'Pool ring', dir: 'v', w: s, h: s, align: 'CENTER', justify: 'CENTER',
    children: [ring].concat(label ? [T(label, 'Numeric/Stat', labelColor || '#ffffff')] : [])
  });
}

/** The 8x8 board for level 24, with the words the artboards show. */
var BOARD_LETTERS = (
  'GALPINET' + 'LSUMMITP' + 'ACAIRNSE' + 'CROTVKHA' +
  'INILBSMK' + 'ETRDYCFO' + 'RVHNGWDL' + 'BKSTREJZ'
).split('');

var BOARD_FOUND = [0, 8, 16, 24, 32, 40, 48, 9, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21];
var BOARD_ACTIVE = [15, 23, 31];
var BOARD_ALL_FOUND = [1, 2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 14, 0, 8, 16, 24, 32, 40, 48,
  17, 18, 19, 20, 21, 15, 23, 31, 39, 25, 34, 43, 52, 61];

function board(foundIdx, activeIdx) {
  var found = {}, active = {};
  (foundIdx || []).forEach(function (i) { found[i] = true; });
  (activeIdx || []).forEach(function (i) { active[i] = true; });

  var rows = [];
  for (var r = 0; r < 8; r++) {
    var cells = [];
    for (var c = 0; c < 8; c++) {
      var i = r * 8 + c;
      cells.push(boardTile(BOARD_LETTERS[i], active[i] ? 'active' : found[i] ? 'found' : ''));
    }
    rows.push(F({ name: 'Row ' + (r + 1), dir: 'h', gap: 4, children: cells }));
  }
  return F({
    name: 'Board', dir: 'v', gap: 4, pad: 8, w: 358, h: 358, radius: RADIUS.lg,
    align: 'CENTER', justify: 'CENTER', fill: tok('surface'), shadow: 'Elevation/lg',
    children: rows
  });
}

function wordList(foundWords) {
  var defs = [['PEAK', 0], ['SUMMIT', 1], ['GLACIER', 2], ['RIDGE', 3], ['ALPINE', 4], ['CAIRN', 5]];
  return F({
    name: 'Word list', dir: 'h', gap: 6, w: 358, wrap: true, justify: 'CENTER', align: 'CENTER',
    children: defs.map(function (d) {
      return wordPill(d[0], WORDS.light[d[1]], foundWords.indexOf(d[0]) !== -1);
    })
  });
}

function playFoot(pct, label, disabled) {
  var hint = F({
    name: 'Hint button', dir: 'h', gap: 7, pad: [0, 16, 0, 16], h: 44, radius: RADIUS.md, align: 'CENTER',
    fill: tok('sand-500'), shadow: 'Elevation/sm',
    children: [
      icon('bulb', 20, '#4a3100'),
      T('Hint', 'Label/Row title', '#4a3100'),
      F({ name: 'Cost', dir: 'h', pad: [2, 8, 2, 8], radius: RADIUS.pill, fill: solid('#000000', 0.14),
        children: [T('🪙25', 'Body/Meta', '#4a3100')] })
    ]
  });
  if (disabled) hint.opacity = 0.5;
  return F({
    name: 'Bottom bar', dir: 'h', gap: 12, pad: [8, 12, 8, 12], w: 358, radius: RADIUS.lg, align: 'CENTER',
    fill: solid('#ffffff', 0.82), shadow: 'Elevation/sm',
    children: [
      F({ name: 'Progress', dir: 'v', gap: 5, grow: true, children: [
        bar(pct, false, 200), T(label, 'Body/Meta', 'ink-soft')
      ] }),
      hint
    ]
  });
}

function playHud(timer) {
  return F({
    name: 'HUD', dir: 'h', gap: 8, w: 358, align: 'CENTER', pad: [0, 0, 12, 0],
    children: [
      iconButton('Pause', 44, 'pause'),
      F({ name: 'Title', dir: 'v', gap: 0, grow: true, align: 'CENTER', children: [
        T('Mountain Pass 8', 'Heading/Play title', 'ink', { align: 'CENTER' }),
        T('⛰️ Level 24 of 80', 'Body/Meta', 'ink-muted', { align: 'CENTER' })
      ] }),
      F({ name: 'Timer', dir: 'h', w: 56, h: 32, radius: RADIUS.pill, align: 'CENTER', justify: 'CENTER',
        fill: solid('#ffffff', 0.82), shadow: 'Elevation/sm',
        children: [T(timer, 'Numeric/Timer', 'ink')] })
    ]
  });
}

/**
 * One item on a winding trail. Auto-layout ignores a child's x, so the lean
 * is expressed as left padding on a full-width row instead.
 */
function leanRow(node, itemWidth, offset) {
  var left = Math.max(0, Math.round((358 - itemWidth) / 2 + offset));
  return F({
    name: 'Trail row', dir: 'h', w: 358, pad: [0, 0, 0, left], justify: 'MIN', align: 'CENTER',
    children: [node]
  });
}

/* -- screens ------------------------------------------------------------ */

function screenMap() {
  // Highest level first, so level 17 lands at the bottom; nodes lean
  // alternately 58px off the spine, as .node does in screens.css.
  var levels = [[24, 'next', 0], [23, 'done', 3], [22, 'done', 2], [21, 'done', 3],
                [20, 'done', 2], [19, 'done', 3], [18, 'done', 1], [17, 'done', 3]];
  var trail = F({
    name: 'Chapter trail', dir: 'v', gap: 8, w: 358, pad: [16, 0, 16, 0],
    children: levels.map(function (l, i) {
      return leanRow(levelNode(l[0], l[1], l[2]), 62, i % 2 === 0 ? 58 : -58);
    })
  });

  return phone('Journey map', [
    topBar('Journey', 'Tap a level to play', chip('⭐ 51', 'ink')),
    F({ name: 'Body', dir: 'v', gap: 22, w: 358, grow: true, clip: true, children: [
      chapterBanner('🌆', 'City Lights', 'Locked — keep going to reach it', 0, 0, 24, true),
      trail,
      chapterBanner('⛰️', 'Mountain Pass', 'Thin air, wide views.', 0.71, 17, 24, false)
    ] })
  ]);
}

function screenPool() {
  var prize = F({
    name: 'Grand prize', dir: 'h', gap: 12, pad: 12, w: 358, radius: RADIUS.lg, align: 'CENTER',
    fill: grad(135, [['#ffe08a', 0], ['#f6c453', 1]]), shadow: 'Elevation/md',
    children: [
      T('🏆', 'Display/Home title', '#4a3100'),
      F({ name: 'Meta', dir: 'v', gap: 0, grow: true, children: [
        T('Grand prize', 'Label/Row title', '#4a3100'),
        T('Clear all 10 rings', 'Body/Row hint', '#6b4a06')
      ] }),
      chip('🪙 1,000', '#8a5a00')
    ]
  });

  // leanFor(index) from pool.js — round(sin(index * 1.15) * 100) / 100 — times 60px.
  var rings = [
    [106, '#ffc93c', '🔒', '#ffffff', -53],
    [106, '#9be36b', '', null, -48],
    [106, '#4fd1c5', '8', '#0d8676', 13],
    [106, '#ff6b6b', '7', '#0d8676', 39]
  ];
  var floats = F({
    name: 'Pool trail', dir: 'v', gap: 22, w: 358, pad: [12, 0, 16, 0],
    children: rings.map(function (r) {
      return leanRow(ringFloat(r[0], r[1], r[2], r[3]), r[0], r[4]);
    })
  });

  return phone('Pool Party', [
    topBar('Pool Party', '10 very hard puzzles', chip('🛟 8/10', 'ink')),
    F({ name: 'Progress', dir: 'v', gap: 5, pad: [8, 12, 8, 12], w: 358, radius: RADIUS.md,
      fill: solid('#ffffff', 0.82), shadow: 'Elevation/sm', children: [
        bar(0.8, false, 334),
        T('19 / 30 stars', 'Body/Caption', 'ink-muted', { upper: true })
      ] }),
    F({ name: 'Spacer', dir: 'v', h: 12, w: 358, children: [] }),
    F({ name: 'Body', dir: 'v', gap: 16, w: 358, grow: true, clip: true, children: [prize, floats] })
  ], grad(180, [['#63c8e4', 0], ['#4fc0e4', 0.34], ['#2e9fd0', 0.72], ['#12699c', 1]]));
}

function screenPlay() {
  return phone('Puzzle', [
    playHud('1:42'),
    F({ name: 'Body', dir: 'v', gap: 12, w: 358, grow: true, align: 'CENTER', children: [
      wordList(['SUMMIT', 'GLACIER', 'CAIRN']),
      board(BOARD_FOUND, BOARD_ACTIVE)
    ] }),
    F({ name: 'Spacer', dir: 'v', h: 12, w: 358, children: [] }),
    playFoot(0.5, '3 of 6 found', false)
  ]);
}

/** Lay a modal over a finished phone frame. */
function withOverlay(phoneFrame, overlayFrame) {
  phoneFrame.appendChild(overlayFrame);
  overlayFrame.layoutPositioning = 'ABSOLUTE';
  overlayFrame.x = 0;
  overlayFrame.y = 0;
  return phoneFrame;
}

/** Profile and Settings scroll, so their frames are drawn at content height. */
function tallPhone(name, children, height) {
  return F({
    name: name, dir: 'v', gap: 0, pad: [16, 16, 30, 16], w: 390, h: height,
    fill: grad(180, [['#9de7ec', 0], ['#d9f6eb', 0.3], ['#fff1c7', 1]]),
    clip: true, children: children
  });
}

function screenHomeNew() {
  var f = screenHome();
  f.name = 'Home — first run';
  // Same layout, first-run numbers.
  var swap = {
    'Lv 6 · Pathfinder': 'Lv 1 · Day Tripper',
    '41 / 70 XP': '0 / 20 XP',
    '🪙 420': '🪙 120',
    '🔥 3': '🔥 0',
    '23 of 80 levels explored': 'Ten chapters. Eighty puzzles. One journey.',
    'Continue · Mountain Pass 7': 'Start journey',
    '3 / 10 rings cleared': '0 / 10 rings cleared',
    '51 / 240 stars collected': '0 / 240 stars collected'
  };
  f.findAll(function (n) { return n.type === 'TEXT'; }).forEach(function (t) {
    if (swap[t.characters]) t.characters = swap[t.characters];
  });
  f.findAll(function (n) { return n.name === 'Fill'; }).forEach(function (r) {
    r.resize(1, r.height); // every bar reads empty on a fresh save
  });
  return f;
}

function screenPlayPaused() {
  var base = phone('Puzzle — paused', [
    playHud('1:42'),
    F({ name: 'Body', dir: 'v', gap: 12, w: 358, grow: true, align: 'CENTER', children: [
      wordList(['SUMMIT', 'GLACIER', 'CAIRN']), board(BOARD_FOUND, [])
    ] }),
    F({ name: 'Spacer', dir: 'v', h: 12, w: 358, children: [] }),
    playFoot(0.5, '3 of 6 found', false)
  ]);

  var resume = button('Resume', 'primary-lg'); resume.layoutAlign = 'STRETCH';
  var restart = button('Restart', 'secondary'); restart.layoutGrow = 1;
  var settings = button('Settings', 'secondary'); settings.layoutGrow = 1;
  var quit = button('Quit to map', 'ghost'); quit.layoutAlign = 'STRETCH';

  return withOverlay(base, overlay([
    T('Paused', 'Heading/Overlay', 'ink', { align: 'CENTER' }),
    T('Take your time — the clock is stopped.', 'Body/Sub', 'ink-muted', { align: 'CENTER' }),
    F({ name: 'Spacer', dir: 'v', h: 16, w: 10, children: [] }),
    F({ name: 'Actions', dir: 'v', gap: 8, w: 302, children: [
      resume,
      F({ dir: 'h', gap: 8, w: 302, children: [restart, settings] }),
      quit
    ] })
  ], 'Pause overlay'));
}

function screenPlayWin() {
  var base = phone('Puzzle — level complete', [
    playHud('1:58'),
    F({ name: 'Body', dir: 'v', gap: 12, w: 358, grow: true, align: 'CENTER', children: [
      wordList(['PEAK', 'SUMMIT', 'GLACIER', 'RIDGE', 'ALPINE', 'CAIRN']),
      board(BOARD_ALL_FOUND, [])
    ] }),
    F({ name: 'Spacer', dir: 'v', h: 12, w: 358, children: [] }),
    playFoot(1, '6 of 6 found', true)
  ]);

  // The middle star is bigger and sits a little high.
  var burst = F({ name: 'Star burst', dir: 'h', gap: 12, align: 'MIN', children: [
    star(52, '#f6c453'), star(64, '#f6c453'), star(52, '#f6c453')
  ] });

  function reward(value, label) {
    return F({ name: 'Reward / ' + label, dir: 'v', gap: 2, align: 'CENTER', children: [
      T(value, 'Heading/Sheet', 'ink'), T(label, 'Label/Stat', 'ink-muted', { upper: true })
    ] });
  }

  var next = button('Next level', 'primary-lg'); next.layoutAlign = 'STRETCH';
  var replay = button('Replay', 'secondary'); replay.layoutGrow = 1;
  var toMap = button('Map', 'secondary'); toMap.layoutGrow = 1;

  return withOverlay(base, overlay([
    T('Perfect!', 'Heading/Overlay', 'ink', { align: 'CENTER' }),
    T('Mountain Pass complete!', 'Body/Sub', 'ink-muted', { align: 'CENTER' }),
    F({ name: 'Spacer', dir: 'v', h: 12, w: 10, children: [] }),
    burst,
    F({ name: 'Spacer', dir: 'v', h: 16, w: 10, children: [] }),
    F({ name: 'Rewards', dir: 'h', gap: 22, justify: 'CENTER', children: [
      reward('+120', 'Coins'), reward('+60', 'XP'), reward('1:58', 'Time')
    ] }),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 10, children: [] }),
    F({ name: 'Actions', dir: 'v', gap: 8, w: 302, children: [
      next, F({ dir: 'h', gap: 8, w: 302, children: [replay, toMap] })
    ] })
  ], 'Win overlay'));
}

function screenPoolChampion() {
  var base = phone('Pool Party — champion', [
    topBar('Pool Party', '10 very hard puzzles', chip('🏆 10/10', 'ink')),
    F({ name: 'Body', dir: 'v', gap: 22, w: 358, grow: true, clip: true, children: [
      leanRow(ringFloat(106, '#ffc93c', '', null), 106, -53),
      leanRow(ringFloat(106, '#9be36b', '', null), 106, -48)
    ] })
  ], grad(180, [['#63c8e4', 0], ['#4fc0e4', 0.34], ['#2e9fd0', 0.72], ['#12699c', 1]]));

  function reward(value, label) {
    return F({ name: 'Reward / ' + label, dir: 'v', gap: 2, align: 'CENTER', children: [
      T(value, 'Heading/Sheet', 'ink'), T(label, 'Label/Stat', 'ink-muted', { upper: true })
    ] });
  }
  var collect = button('Collect the prize', 'primary-lg'); collect.layoutAlign = 'STRETCH';

  return withOverlay(base, overlay([
    T('🏆', 'Display/Home title', 'ink', { align: 'CENTER' }),
    T('Pool Party Champion!', 'Heading/Overlay', 'ink', { align: 'CENTER' }),
    T('All 10 rings cleared — the hardest boards in the game.', 'Body/Sub', 'ink-muted', { w: 280, align: 'CENTER' }),
    F({ name: 'Spacer', dir: 'v', h: 16, w: 10, children: [] }),
    F({ name: 'Rewards', dir: 'h', gap: 22, justify: 'CENTER', children: [
      reward('1,000', 'Coins'), reward('400', 'XP'), reward('🏆', 'Trophy')
    ] }),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 10, children: [] }),
    F({ name: 'Actions', dir: 'v', gap: 8, w: 302, children: [collect] })
  ], 'Champion overlay'));
}

function screenProfile() {
  var avatars = ['🧭', '⛵', '🦜', '🐬', '🦊', '🌵', '🚀', '🐧', '🦉', '🐙', '🍉', '🌴', '🐢', '🦩', '🏔️', '🎒'];
  var avatarRows = [];
  for (var i = 0; i < avatars.length; i += 6) {
    avatarRows.push(F({
      name: 'Avatar row', dir: 'h', gap: 8,
      children: avatars.slice(i, i + 6).map(function (a, j) {
        var on = (i === 0 && j === 0);
        return F({
          name: 'Avatar option', dir: 'h', w: 53, h: 53, radius: RADIUS.md, align: 'CENTER', justify: 'CENTER',
          fill: on ? tok('surface-2') : solid('#ffffff', 0.82),
          shadow: on ? 'Elevation/md' : 'Elevation/sm',
          stroke: on ? tok('good') : null, strokeW: on ? 3 : 0,
          children: [T(a, 'Heading/Sheet', 'ink')]
        });
      })
    }));
  }

  var statPairs = [['23/80', 'Levels done'], ['51/240', 'Stars'], ['168', 'Words found'],
    ['11', '3-star levels'], ['0:43', 'Best level time'], ['134:12', 'Time played'],
    ['9', 'Hints used'], ['1,140', 'Coins earned'], ['3d', 'Daily streak'], ['5d', 'Best streak']];
  var statRows = [];
  for (var s = 0; s < statPairs.length; s += 3) {
    statRows.push(F({ name: 'Stat row', dir: 'h', gap: 8,
      children: statPairs.slice(s, s + 3).map(function (p) { return statTile(p[0], p[1]); }) }));
  }

  var badges = [
    ['🌱', 'First Steps', 'Finish your first level.', true, 1, 1],
    ['🥾', 'Word Wanderer', 'Finish 10 levels.', true, 10, 10],
    ['🧭', 'Trailblazer', 'Finish 25 levels.', false, 23, 25],
    ['🗺️', 'Pathfinder', 'Finish 50 levels.', false, 23, 50],
    ['👑', 'Journey Master', 'Finish all 80 levels.', false, 23, 80],
    ['⭐', 'Perfectionist', 'Earn 3 stars on 10 levels.', true, 10, 10],
    ['🌟', 'Star Collector', 'Earn 3 stars on 30 levels.', false, 11, 30],
    ['🎯', 'Dead Eye', 'Finish 5 levels with no wrong selections.', true, 5, 5],
    ['⚡', 'Speed Reader', 'Finish any level in under 45 seconds.', true, 1, 1],
    ['🦅', 'Eagle Eye', 'Find 250 words in total.', false, 168, 250],
    ['🔥', 'Daily Devotee', 'Keep a 7-day daily-puzzle streak.', false, 5, 7],
    ['🏆', 'Pool Champion', 'Clear all 10 Pool Party rings.', false, 8, 10],
    ['💰', 'Coin Hoarder', 'Earn 1,000 coins in total.', true, 1000, 1000]
  ];

  return tallPhone('Profile (full scroll)', [
    topBar('Profile', null, null),
    F({ name: 'Identity', dir: 'v', gap: 8, pad: 16, w: 358, radius: RADIUS.lg, align: 'CENTER',
      fill: tok('surface'), shadow: 'Elevation/md', children: [
        F({ name: 'Avatar', dir: 'h', w: 82, h: 82, radius: RADIUS.lg, align: 'CENTER', justify: 'CENTER',
          fill: grad(160, [['#c6f0f3', 0], ['#fff6dd', 1]]), shadow: 'Elevation/md',
          children: [T('🧭', 'Display/Home title', 'ink')] }),
        F({ name: 'Name field', dir: 'h', w: 260, h: 44, radius: RADIUS.md, align: 'CENTER', justify: 'CENTER',
          stroke: tok('line'), strokeW: 2, children: [T('Traveller', 'Label/CTA', 'ink')] }),
        T('Level 6 · Pathfinder', 'Label/Chip', 'ink-muted'),
        bar(0.58, false, 260),
        T('41 / 70 XP to level 7', 'Body/Caption', 'ink-muted')
      ] }),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 358, children: [] }),
    sectionTitle('Avatar'),
    F({ name: 'Avatar grid', dir: 'v', gap: 8, w: 358, pad: [8, 0, 0, 0], children: avatarRows }),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 358, children: [] }),
    sectionTitle('Stats'),
    F({ name: 'Stat grid', dir: 'v', gap: 8, w: 358, pad: [8, 0, 0, 0], children: statRows }),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 358, children: [] }),
    sectionTitle('Achievements  6 / 13'),
    F({ name: 'Badge list', dir: 'v', gap: 8, w: 358, pad: [8, 0, 0, 0],
      children: badges.map(function (b) { return badgeRow(b[0], b[1], b[2], b[3], b[4], b[5]); }) })
  ], 2000);
}

function screenSettings() {
  return tallPhone('Settings (full scroll)', [
    topBar('Settings', null, null),
    sectionTitle('Sound'),
    F({ name: 'Spacer', dir: 'v', h: 8, w: 358, children: [] }),
    settingsGroup([
      settingsRow('Sound effects', 'Taps, finds and fanfares', 'toggle-on'),
      settingsRow('Background music', 'A quiet generative loop', 'toggle-off'),
      settingsRow('Vibration', 'Where the device supports it', 'toggle-on')
    ]),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 358, children: [] }),
    sectionTitle('Display'),
    F({ name: 'Spacer', dir: 'v', h: 8, w: 358, children: [] }),
    settingsGroup([
      settingsRow('Theme', 'Auto follows your device', 'segment'),
      settingsRow('Colour-blind palette', 'High-separation word colours', 'toggle-off'),
      settingsRow('High contrast', 'Stronger tile outlines', 'toggle-off'),
      settingsRow('Reduce motion', 'Fewer animations and no confetti', 'toggle-off')
    ]),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 358, children: [] }),
    sectionTitle('Gameplay'),
    F({ name: 'Spacer', dir: 'v', h: 8, w: 358, children: [] }),
    settingsGroup([
      settingsRow('Show timer', 'Hide it for a relaxed run', 'toggle-on'),
      settingsRow('Idle nudges', 'Free pointer after a long pause', 'toggle-on')
    ]),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 358, children: [] }),
    sectionTitle('Data'),
    F({ name: 'Spacer', dir: 'v', h: 8, w: 358, children: [] }),
    settingsGroup([
      settingsRow('Reset progress', 'Clears levels, stars, coins and badges', 'chevron', true)
    ]),
    F({ name: 'Spacer', dir: 'v', h: 22, w: 358, children: [] }),
    sectionTitle('About'),
    F({ name: 'Spacer', dir: 'v', h: 8, w: 358, children: [] }),
    settingsGroup([
      settingsRow('Word Search Journey', 'Plays offline once loaded. Progress is stored on this device only.', 'static'),
      settingsRow('How to play', 'Controls, stars and hints', 'chevron')
    ])
  ], 1180);
}

function screenSheets() {
  function sheet(title, bodyNodes, actions) {
    return F({
      name: 'Sheet / ' + title, dir: 'v', gap: 0, pad: 22, w: 390, radius: RADIUS.xl,
      fill: tok('surface'), shadow: 'Elevation/xl',
      children: [T(title, 'Heading/Sheet', 'ink')]
        .concat([F({ name: 'Spacer', dir: 'v', h: 8, w: 10, children: [] })])
        .concat(bodyNodes)
        .concat([F({ name: 'Spacer', dir: 'v', h: 16, w: 10, children: [] })])
        .concat([F({ name: 'Actions', dir: 'v', gap: 8, w: 346, children: actions })])
    });
  }

  function howtoRow(glyph, text) {
    return F({ name: 'How-to row', dir: 'h', gap: 12, w: 346, align: 'MIN', children: [
      F({ name: 'Glyph', dir: 'h', w: 36, h: 36, radius: RADIUS.sm, align: 'CENTER', justify: 'CENTER',
        fill: tok('surface-sunk'), children: [T(glyph, 'Label/Button', 'ink')] }),
      T(text, 'Body/Sheet', 'ink-soft', { w: 292 })
    ] });
  }

  function toast(text, kind) {
    return F({
      name: 'Toast / ' + kind, dir: 'h', pad: [10, 16, 10, 16], radius: RADIUS.pill,
      fill: kind === 'good' ? tok('teal-600') : kind === 'bad' ? tok('coral-600') : tok('ink'),
      shadow: 'Elevation/lg', children: [T(text, 'Numeric/Timer', '#ffffff')]
    });
  }

  var gotIt = button('Got it', 'primary'); gotIt.layoutAlign = 'STRETCH';
  var reset = button('Reset progress', 'secondary'); reset.layoutAlign = 'STRETCH';
  var keep = button('Keep my journey', 'primary'); keep.layoutAlign = 'STRETCH';

  var installBar = F({
    name: 'Install prompt', dir: 'h', gap: 8, pad: 12, w: 390, radius: RADIUS.lg, align: 'CENTER',
    fill: tok('surface'), shadow: 'Elevation/xl', children: [
      F({ name: 'Text', dir: 'v', gap: 0, grow: true, children: [
        T('Add to home screen', 'Body/Meta', 'ink'),
        T('Play offline, full screen', 'Body/Caption', 'ink-muted')
      ] }),
      F({ name: 'Install', dir: 'h', h: 38, pad: [0, 14, 0, 14], radius: RADIUS.sm, align: 'CENTER', justify: 'CENTER',
        fill: tok('accent'), children: [T('Install', 'Body/Meta', '#ffffff')] }),
      F({ name: 'Dismiss', dir: 'h', h: 38, pad: [0, 8, 0, 8], align: 'CENTER', justify: 'CENTER',
        children: [T('Not now', 'Body/Meta', 'ink-muted')] })
    ]
  });

  var boot = F({
    name: 'Boot splash', dir: 'v', gap: 16, w: 390, h: 260, radius: RADIUS.xl, align: 'CENTER', justify: 'CENTER',
    fill: grad(180, [['#9de7ec', 0], ['#d9f6eb', 0.46], ['#fff1c7', 1]]), children: [
      F({ name: 'App mark', dir: 'h', w: 84, h: 84, radius: RADIUS.lg, align: 'CENTER', justify: 'CENTER',
        fill: grad(135, [['#2364aa', 0], ['#2364aa', 0.36], ['#18a999', 0.36], ['#18a999', 0.64], ['#ffe08a', 0.64]]),
        shadow: 'Elevation/lg', children: [T('W', 'Display/Home title', '#ffffff')] }),
      T('Word Search Journey', 'Body/Sub', 'ink-soft')
    ]
  });

  function col(title, nodes) {
    return F({ name: title, dir: 'v', gap: 12, align: 'MIN',
      children: [sectionTitle(title)].concat(nodes) });
  }

  return F({
    name: 'Sheet, toasts, install, boot', dir: 'h', gap: 40, pad: 40, align: 'MIN',
    fill: tok('sky-100'), children: [
      F({ dir: 'v', gap: 40, align: 'MIN', children: [
        col('Modal sheet — informational', [sheet('How to play', [
          F({ dir: 'v', gap: 12, w: 346, children: [
            howtoRow('👆', 'Drag across a run of letters to pick a word. Words read in any of eight directions, forwards or backwards.'),
            howtoRow('⌨️', 'On a keyboard: arrow keys move, Enter starts and finishes a word, Escape cancels.'),
            howtoRow('⭐', 'Three stars means no hints and inside the par time. Replay any level to improve it.'),
            howtoRow('💡', 'A hint costs 25 coins and lights up the first two letters of a word you have not found.')
          ] })
        ], [gotIt])]),
        col('Modal sheet — destructive confirm', [sheet('Reset everything?', [
          T('Your levels, stars, coins, streak and badges will be erased. Your settings stay as they are. This cannot be undone.',
            'Body/Sheet', 'ink-soft', { w: 346 })
        ], [reset, keep])])
      ] }),
      F({ dir: 'v', gap: 40, align: 'MIN', children: [
        col('Toasts', [F({ dir: 'v', gap: 8, align: 'MIN', children: [
          toast("Today's puzzle is done — come back tomorrow", 'neutral'),
          toast('🏆 Pool Champion', 'good'),
          toast('That level is still locked', 'bad')
        ] })]),
        col('Install prompt', [installBar]),
        col('Boot splash', [boot])
      ] })
    ]
  });
}

/** A visible swatch sheet; the Variables panel is the authoritative one. */
function tokenSheet() {
  function swatchRow(label, hexVal) {
    return F({ name: label, dir: 'h', gap: 9, align: 'CENTER', children: [
      R({ name: 'Swatch', w: 38, h: 24, radius: 7, fill: solid(hexVal) }),
      T(label, 'Body/Meta', 'ink', { w: 110 }),
      T(hexVal, 'Body/Caption', 'ink-muted')
    ] });
  }
  function colOf(title, entries) {
    return F({ name: title, dir: 'v', gap: 6, align: 'MIN',
      children: [sectionTitle(title), F({ dir: 'v', gap: 6, children: entries })] });
  }

  var brandRows = Object.keys(BRAND).map(function (k) { return swatchRow(k, BRAND[k]); });
  var lightRows = Object.keys(LIGHT).map(function (k) { return swatchRow(k, LIGHT[k]); });
  var darkRows = Object.keys(DARK).map(function (k) { return swatchRow(k, DARK[k]); });
  var wordRows = ['light', 'dark', 'cvd'].map(function (p) {
    return F({ name: 'Word palette / ' + p, dir: 'v', gap: 5, align: 'MIN', children: [
      T(p === 'cvd' ? 'Colour-blind' : p, 'Body/Caption', 'ink-muted'),
      F({ dir: 'h', gap: 5, children: WORDS[p].map(function (h) { return R({ name: h, w: 30, h: 30, radius: 7, fill: solid(h) }); }) })
    ] });
  });

  return F({
    name: 'Design tokens', dir: 'h', gap: 28, pad: 40, align: 'MIN', fill: tok('surface'),
    children: [
      colOf('Brand ramp', brandRows),
      colOf('Semantic — light', lightRows),
      colOf('Semantic — dark', darkRows),
      colOf('Word highlight palette', wordRows)
    ]
  });
}

/* --------------------------------------------------------------------- */
/* Run                                                                     */
/* --------------------------------------------------------------------- */

async function main() {
  try {
    await figma.loadFontAsync({ family: FONT, style: W600 });
    await figma.loadFontAsync({ family: FONT, style: W800 });
    await figma.loadFontAsync({ family: FONT, style: W900 });
  } catch (e) {
    figma.closePlugin('Nunito is not available in this file. Add it from the font picker (it is a Google font) and run again.');
    return;
  }

  buildVariables();
  buildTextStyles();
  buildEffectStyles();

  var made = [];

  // Band one: the reference sheets.
  var tokens = tokenSheet();
  tokens.x = 0; tokens.y = 0;
  made.push(tokens);

  var lib = buildComponentLibrary(tokens.width + 120, 0);
  made.push(lib);

  var bandTwo = Math.max(tokens.height, lib.height) + 160;

  // Band two: the screens, in the order a player meets them.
  var screens = [
    screenHome(), screenHomeNew(), screenMap(), screenPool(), screenPlay(),
    screenPlayPaused(), screenPlayWin(), screenPoolChampion(),
    screenProfile(), screenSettings()
  ];
  var x = 0;
  screens.forEach(function (s) {
    s.x = x; s.y = bandTwo;
    x += s.width + 80;
    made.push(s);
  });

  // Band three: overlays and chrome that are not a screen of their own.
  var sheets = screenSheets();
  sheets.x = 0;
  sheets.y = bandTwo + 2000 + 160;
  made.push(sheets);

  figma.currentPage.selection = made;
  figma.viewport.scrollAndZoomIntoView(made);
  figma.closePlugin('Built ' + screens.length + ' screens, the component library, the token sheet and the overlay board.');
}

main();
