// Gateway Arch Generator, stage 4. All dimensions are in feet; Y is up.
export const meta = {
  name: 'Gateway Arch Generator',
  description: 'A 44 ft-wide gateway with independent floors and individually editable arch openings through its full depth.',
  units: 'feet',
};

export const parameters = {
  floors: { label: 'Number of floors', value: 2, min: 1, max: 3, step: 1 },
  depth: { label: 'Gateway depth', value: 16, min: 8, max: 30, step: 0.5, type: 'length' },
  roofType: { label: 'Roof Type', value: 'Flat', options: ['Flat', 'Gable'] },
  roofPitch: { label: 'Roof Pitch', value: 25, min: 10, max: 35, step: 1, type: 'angle', help: 'Used for Gable only; ridge runs from street to courtyard.' },
  roofOverhang: { label: 'Roof Overhang', value: 2, min: 1, max: 4, step: 0.5, type: 'length', help: 'Horizontal extension past each of the four exterior walls.' },
  upperRailing: { label: 'Upper-floor Railing', value: false, help: 'Simple study railings on both faces of valid upper openings; not a verified guardrail design.' },
  groundHeight: { label: 'Ground floor height', value: 20, min: 10, max: 24, step: 0.5, type: 'length' },
  groundFloorLock: { label: 'Lock Floor Proportions', value: true, help: 'ON: changing floor height scales this floor\'s arch heights and rises; widths stay fixed. OFF: arch sizes stay unchanged. Warnings flag openings that no longer fit.' },
  groundArches: { label: 'Ground floor arches', value: 1, min: 1, max: 5, step: 1 },
  secondHeight: { label: 'Second floor height', value: 12, min: 10, max: 24, step: 0.5, type: 'length', help: 'Used when there are at least two floors.' },
  secondFloorLock: { label: 'Lock Floor Proportions', value: true, help: 'ON: changing floor height scales this floor\'s arch heights and rises; widths stay fixed. OFF: arch sizes stay unchanged. Warnings flag openings that no longer fit.' },
  secondArches: { label: 'Second floor arches', value: 3, min: 1, max: 5, step: 1, help: 'Used when there are at least two floors.' },
  thirdHeight: { label: 'Third floor height', value: 12, min: 10, max: 24, step: 0.5, type: 'length', help: 'Used only when there are three floors.' },
  thirdFloorLock: { label: 'Lock Floor Proportions', value: true, help: 'ON: changing floor height scales this floor\'s arch heights and rises; widths stay fixed. OFF: arch sizes stay unchanged. Warnings flag openings that no longer fit.' },
  thirdArches: { label: 'Third floor arches', value: 3, min: 1, max: 5, step: 1, help: 'Used only when there are three floors.' },
};

// Every arch has ordinary named parameters, so the starter saves even inactive
// arches in variations. Selection only changes which controls are shown.
parameters.selectedFloor = { label: 'Selected Floor', value: 'Ground floor', options: ['Ground floor', 'Second floor', 'Third floor'] };
parameters.selectedArch = { label: 'Selected Arch', value: 'Arch 1', options: ['Arch 1', 'Arch 2', 'Arch 3', 'Arch 4', 'Arch 5'] };
const FLOOR_KEYS = ['ground', 'second', 'third'];
const FLOOR_NAMES = ['Ground floor', 'Second floor', 'Third floor'];
for (const key of FLOOR_KEYS) {
  parameters[`${key}AutoFit`] = { label: 'Auto Fit Arch Count', value: true, help: 'ON fits widths when count changes. OFF keeps individual sizes. Existing heights and rises stay unchanged; new arches inherit their nearest neighbor.' };
}
for (let f = 0; f < 3; f++) {
  for (let a = 1; a <= 5; a++) {
    const original = f === 0 ? a === 1 : a <= 3;
    const values = original ? (f === 0 ? [26, 19, 8] : [12, 11, 5.5]) : [4, f === 0 ? 10 : 9, 2];
    parameters[`${FLOOR_KEYS[f]}Arch${a}Lock`] = { label: 'Lock Arch Proportions', value: false, help: 'ON: changing width, clear height or rise scales all three together for this arch. OFF: edit each dimension independently. Other arches stay unchanged.' };
    ['Width', 'Height', 'Rise'].forEach((field, i) => {
      parameters[`${FLOOR_KEYS[f]}Arch${a}${field}`] = {
        label: ['Clear Width', 'Clear Height', 'Arch Rise'][i],
        value: values[i], min: [4, 7, 1][i], max: [26, 21, 8][i], step: 0.5, type: 'length', preserveDerived: true,
      };
    });
  }
}

// Serialized with ordinary variations/JSON, never kept in a module-global cache.
parameters.proportionState = { label: 'Proportion state', value: '', internal: true };

function readProportionState(p) {
  try {
    const s = JSON.parse(p.proportionState || '{}');
    if (!s || typeof s !== 'object' || Array.isArray(s)) throw Error('Invalid state');
    // Migrate older saves: discard their stale fallback geometry, retain locks/references.
    const record = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    return { floorAnchors: record(s.floorAnchors), archAnchors: record(s.archAnchors), linked: record(s.linked), widthLayouts: record(s.widthLayouts) };
  } catch {
    return { floorAnchors: {}, archAnchors: {}, linked: {}, widthLayouts: {} };
  }
}
const showNumber = v => Number.isFinite(v) ? String(Number(v.toFixed(2))) : 'not a finite number';
const renderable = v => Number.isFinite(v) && Number.isFinite(Math.fround(v));
function nominalIssues(p, keys) {
  const linked = readProportionState(p).linked;
  return keys.flatMap(key => {
    const def = parameters[key];
    const v = p[key] ?? def.value;
    const match = key.match(/^(ground|second|third)Arch(\d+)(Width|Height|Rise)$/);
    const label = match ? `${FLOOR_NAMES[FLOOR_KEYS.indexOf(match[1])]}, Arch ${match[2]} ${def.label}` : def.label;
    if (!Number.isFinite(v)) return [`${label}: enter a finite number.`];
    if (v < def.min - 1e-9 || v > def.max + 1e-9) return [`${label}: ${showNumber(v)} is outside the nominal ${def.min}–${def.max}${def.type === 'length' ? ' ft' : ''} range${linked[key] ? ' (from linked scaling)' : ''}. Requested value is retained.`];
    return [];
  });
}
function floorIssues(p, floor) {
  const issues = [];
  {
    const key = FLOOR_KEYS[floor.floor];
    const label = FLOOR_NAMES[floor.floor];
    if (!Number.isInteger(p[`${key}Arches`]) || p[`${key}Arches`] < 1 || p[`${key}Arches`] > 5) issues.push(`${label}: arch count must be a whole number from 1 to 5.`);
    const requestedCount = p[`${key}Arches`];
    const minimumRequired = requestedCount * MIN_CLEAR_WIDTH + MIN_PIER * (requestedCount + 1);
    if (Number.isSafeInteger(requestedCount) && requestedCount > 0 && minimumRequired > WIDTH) issues.push(`${label}: ${requestedCount} arches need at least ${showNumber(minimumRequired)} ft with 4 ft openings and 2 ft piers; only 44 ft is available.`);
    if (!renderable(floor.height) || floor.height <= BAND) issues.push(`${label}: floor height must be representable and greater than the 1 ft floor band.`);
    if (floor.required > WIDTH + 1e-9) issues.push(`${label}: widths plus 2 ft piers need ${showNumber(floor.required)} ft; facade is 44 ft.`);
    floor.arches.forEach((a, i) => {
      const name = `${label}, Arch ${i + 1}`;
      if (![a.width, a.clearHeight, a.rise].every(v => renderable(v) && v > 0)) issues.push(`${name}: dimensions must be positive, finite, representable numbers.`);
      if (a.width < MIN_CLEAR_WIDTH - 1e-9) issues.push(`${name}: clear width ${showNumber(a.width)} ft is below the 4 ft minimum.`);
      if (a.clearHeight > floor.height - BAND + 1e-9) issues.push(`${name}: clear height ${showNumber(a.clearHeight)} ft exceeds ${showNumber(floor.height - BAND)} ft (floor height minus 1 ft).`);
      if (a.rise >= a.clearHeight) issues.push(`${name}: rise ${showNumber(a.rise)} ft must be smaller than clear height ${showNumber(a.clearHeight)} ft.`);
    });
  }
  return issues;
}
export function validation(p) {
  const globals = [];
  if (![1, 2, 3].includes(p.floors)) globals.push('Number of floors must be 1, 2, or 3.');
  if (!renderable(p.depth) || p.depth <= 0) globals.push('Gateway Depth must be a positive, finite, representable distance.');
  if (!renderable(p.roofOverhang) || p.roofOverhang < 0) globals.push('Roof Overhang must be a finite, representable distance at or above zero.');
  if (!['Flat', 'Gable'].includes(p.roofType)) globals.push('Roof Type must be Flat or Gable.');
  if (p.roofType === 'Gable' && (!Number.isFinite(p.roofPitch) || p.roofPitch <= 0 || p.roofPitch >= 90)) globals.push('Gable Roof Pitch must be greater than 0 and less than 90 degrees.');
  const safe = previewParameters(p);
  if (!renderable(roofDimensions(safe).top)) globals.push('Combined building and roof height cannot be represented by the viewer.');
  const invalidFloors = levels(safe).map(f => floorIssues(p, { ...f, height: p[`${FLOOR_KEYS[f.floor]}Height`] ?? f.height,
    arches: f.arches.map((a, i) => ({ width: p[`${FLOOR_KEYS[f.floor]}Arch${i + 1}Width`] ?? a.width, clearHeight: p[`${FLOOR_KEYS[f.floor]}Arch${i + 1}Height`] ?? a.clearHeight, rise: p[`${FLOOR_KEYS[f.floor]}Arch${i + 1}Rise`] ?? a.rise })),
    required: f.arches.reduce((s, a, i) => s + (p[`${FLOOR_KEYS[f.floor]}Arch${i + 1}Width`] ?? a.width), 0) + MIN_PIER * (f.arches.length + 1) }));
  const errors = [...globals, ...invalidFloors.flat()];
  const rangeKeys = ['depth', 'roofOverhang', ...(p.roofType === 'Gable' ? ['roofPitch'] : []), ...FLOOR_KEYS.slice(0, safe.floors).flatMap(key => [
    `${key}Height`, ...Array.from({ length: safe[`${key}Arches`] }, (_, i) => ['Width', 'Height', 'Rise'].map(f => `${key}Arch${i + 1}${f}`)).flat(),
  ])];
  const warnings = nominalIssues(p, rangeKeys);
  return { valid: errors.length === 0, errors, warnings, invalidFloors: invalidFloors.map(e => e.length > 0) };
}
function previewParameters(p) {
  const safe = { ...p };
  // Only malformed/nonpositive numbers need a safe diagnostic substitute.
  // Finite requested dimensions, including conflicts, remain unchanged.
  for (const [key, def] of Object.entries(parameters)) if (typeof def.value === 'number') {
    if (!Number.isFinite(safe[key]) || !Number.isFinite(Math.fround(safe[key])) || safe[key] < 0 || (safe[key] === 0 && key !== 'roofOverhang')) safe[key] = def.value;
  }
  safe.floors = Math.min(3, Math.max(1, Math.round(safe.floors)));
  for (const key of FLOOR_KEYS) safe[`${key}Arches`] = Math.min(5, Math.max(1, Math.round(safe[`${key}Arches`])));
  if (safe.roofPitch >= 90) safe.roofPitch = parameters.roofPitch.value;
  return safe;
}

function storedWidth(p, key, id) {
  const width = p[`${key}Arch${id}Width`] ?? parameters[`${key}Arch${id}Width`].value;
  return renderable(width) && width > 0 ? width : MIN_CLEAR_WIDTH;
}
function rememberShownWidths(p, key, layout) {
  layout.count = activeArchCount(p, key);
  layout.shown = Array.from({ length: layout.count }, (_, i) => p[`${key}Arch${i + 1}Width`] ?? parameters[`${key}Arch${i + 1}Width`].value);
}
function rebaseWidthWeights(p, key, layout) {
  const count = activeArchCount(p, key);
  // Rebase to visible widths only after a manual edit or Keep Sizes operation.
  // Calibrate hidden weights to the same units so restoring an ID is coherent.
  const ratios = (layout.shown || []).flatMap((w, i) => w > MIN_CLEAR_WIDTH + 1e-9 && layout.weights[i + 1] > 0 ? [w / layout.weights[i + 1]] : []);
  const scale = ratios.find(v => Number.isFinite(v) && v > 0) || 1;
  for (const id of Object.keys(layout.weights)) if (Number(id) > count) layout.weights[id] *= scale;
  for (let id = 1; id <= count; id++) layout.weights[id] = storedWidth(p, key, id);
  rememberShownWidths(p, key, layout);
}
function widthLayout(p, key, state) {
  let layout = state.widthLayouts[key];
  if (!layout || typeof layout.weights !== 'object' || !Array.isArray(layout.shown)) {
    layout = { weights: {} };
    const count = activeArchCount(p, key);
    for (let id = 1; id <= 5; id++) {
      const prefix = `${key}Arch${id}`;
      const customized = ['Width', 'Height', 'Rise', 'Lock'].some(f => p[`${prefix}${f}`] !== undefined && p[`${prefix}${f}`] !== parameters[`${prefix}${f}`].value);
      if (id <= count || customized) layout.weights[id] = storedWidth(p, key, id);
    }
    rememberShownWidths(p, key, layout);
    state.widthLayouts[key] = layout;
  } else {
    for (const id of Object.keys(layout.weights)) if (!renderable(layout.weights[id]) || layout.weights[id] <= 0) layout.weights[id] = storedWidth(p, key, id);
    const count = activeArchCount(p, key);
    if (layout.count !== count || layout.shown.length !== count || layout.shown.some((w, i) => !sameRatio(w, p[`${key}Arch${i + 1}Width`]))) rebaseWidthWeights(p, key, layout);
  }
  // Migrate old layouts: known weights identify arches already used/customized.
  if (!layout.initialized || typeof layout.initialized !== 'object') layout.initialized = Object.fromEntries(Object.keys(layout.weights).map(id => [id, true]));
  return layout;
}
function distributeWidths(weights, available) {
  if (available < weights.length * MIN_CLEAR_WIDTH - 1e-9) return null;
  const maximum = Math.max(...weights);
  const normalized = weights.map(w => w / maximum);
  const widths = weights.map(() => 0);
  let free = weights.map((w, i) => i), remaining = available;
  // Bound the smallest openings, then preserve ratios among unconstrained ones.
  for (let pass = 0; pass <= weights.length && free.length; pass++) {
    const total = free.reduce((sum, i) => sum + normalized[i], 0);
    const constrained = free.filter(i => remaining * normalized[i] / total < MIN_CLEAR_WIDTH);
    if (!constrained.length) {
      for (const i of free) widths[i] = remaining * normalized[i] / total;
      const largest = free.reduce((a, b) => widths[a] >= widths[b] ? a : b);
      widths[largest] += available - widths.reduce((sum, w) => sum + w, 0);
      return widths;
    }
    for (const i of constrained) { widths[i] = MIN_CLEAR_WIDTH; remaining -= MIN_CLEAR_WIDTH; }
    free = free.filter(i => !constrained.includes(i));
  }
  return widths;
}
function fitFloorWidths(previous, next, key, state, layout) {
  const count = next[`${key}Arches`];
  if (!Number.isInteger(count) || count < 1 || count > 5) return;
  const oldCount = activeArchCount(previous, key);
  const average = Array.from({ length: oldCount }, (_, i) => layout.weights[i + 1]).reduce((s, w) => s + w, 0) / oldCount;
  for (let id = 1; id <= count; id++) if (!(layout.weights[id] > 0)) layout.weights[id] = average;
  const widths = distributeWidths(Array.from({ length: count }, (_, i) => layout.weights[i + 1]), WIDTH - MIN_PIER * (count + 1));
  if (!widths) return;
  widths.forEach((width, i) => {
    const prefix = `${key}Arch${i + 1}`;
    next[`${prefix}Width`] = width;
    state.linked[`${prefix}Width`] = 'auto-fit';
    delete state.archAnchors[prefix];
  });
  // Never derive the reference weights from fitted (possibly 4 ft-bound) sizes.
  rememberShownWidths(next, key, layout);
}

// Apply a direct user edit once. Anchors store full precision and are rebased only
// when another edit actually changes that floor/arch's proportion.
const sameRatio = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
export function editParameters(previous, key, value) {
  const action = ['fitSelectedArches', 'pasteSelectedArch'].includes(key);
  const next = action ? { ...previous } : { ...previous, [key]: value };
  const state = readProportionState(previous);
  const target = key === 'pasteSelectedArch' ? selectedArchPrefix(previous) : null;
  if (target) {
    if (!value || !['Width', 'Height', 'Rise'].every(f => Number.isFinite(value[f])) || typeof value.Lock !== 'boolean') throw new Error('The arch clipboard does not contain valid settings.');
    // A paste is one atomic independent edit, regardless of the target's lock.
    for (const field of ['Width', 'Height', 'Rise', 'Lock']) next[`${target}${field}`] = value[field];
    delete state.archAnchors[target];
    for (const field of ['Width', 'Height', 'Rise']) delete state.linked[`${target}${field}`];
    delete state.floorAnchors[FLOOR_KEYS.find(f => target.startsWith(f))];
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Enter a finite number; dimensions have not changed.');
  let locked = false;
  for (const floorKey of FLOOR_KEYS) {
    const layout = widthLayout(previous, floorKey, state);
    const newIds = [];
    if (key === `${floorKey}Arches` && Number.isInteger(value) && value >= 1 && value <= 5) {
      for (let id = 1; id <= value; id++) if (!layout.initialized[id]) newIds.push(id);
    }
    if (key === `${floorKey}Height`) {
      locked = previous[`${floorKey}FloorLock`] ?? true;
      if (locked) {
        let anchor = state.floorAnchors[floorKey];
        const currentRatio = anchor && (previous[key] - BAND) / (anchor.height - BAND);
        if (!anchor || !anchor.dimensions || !Object.entries(anchor.dimensions).every(([name, baseline]) => sameRatio(previous[name], baseline * currentRatio))) anchor = {
          height: previous[key],
          dimensions: Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['Height', 'Rise'].map(field => {
            const name = `${floorKey}Arch${i + 1}${field}`;
            return [name, previous[name] ?? parameters[name].value];
          })).flat()),
        };
        state.floorAnchors[floorKey] = anchor;
        const ratio = (value - BAND) / (anchor.height - BAND);
        for (const [name, baseline] of Object.entries(anchor.dimensions)) {
          next[name] = baseline * ratio;
          state.linked[name] = 'floor';
        }
      } else delete state.floorAnchors[floorKey];
      for (let a = 1; a <= 5; a++) delete state.archAnchors[`${floorKey}Arch${a}`];
    }
    if (key === `${floorKey}FloorLock`) delete state.floorAnchors[floorKey];
    for (let a = 1; a <= 5; a++) {
      const prefix = `${floorKey}Arch${a}`;
      const field = key.startsWith(prefix) ? key.slice(prefix.length) : '';
      if (['Width', 'Height', 'Rise'].includes(field)) {
        locked = Boolean(previous[`${prefix}Lock`]);
        if (locked) {
          let anchor = state.archAnchors[prefix];
          const currentRatio = anchor && previous[`${prefix}Width`] / anchor.Width;
          if (!anchor || !['Width', 'Height', 'Rise'].every(f => sameRatio(previous[`${prefix}${f}`], anchor[f] * currentRatio))) anchor = Object.fromEntries(['Width', 'Height', 'Rise'].map(f => [f, previous[`${prefix}${f}`] ?? parameters[`${prefix}${f}`].value]));
          state.archAnchors[prefix] = anchor;
          const ratio = value / anchor[field];
          for (const f of ['Width', 'Height', 'Rise']) {
            next[`${prefix}${f}`] = anchor[f] * ratio;
            state.linked[`${prefix}${f}`] = 'arch';
          }
          next[key] = value;
        } else delete state.archAnchors[prefix];
        delete state.floorAnchors[floorKey];
        delete state.linked[key];
      }
      if (key === `${prefix}Lock`) delete state.archAnchors[prefix];
    }
    const countChanged = key === `${floorKey}Arches` && value !== previous[key];
    const explicitFit = key === 'fitSelectedArches' && floorKey === FLOOR_KEYS[FLOOR_NAMES.indexOf(normalizeParameters(previous).selectedFloor)];
    if ((countChanged && (previous[`${floorKey}AutoFit`] ?? true)) || explicitFit) fitFloorWidths(previous, next, floorKey, state, layout);
    else if (countChanged || Array.from({ length: 5 }, (_, i) => `${floorKey}Arch${i + 1}Width`).some(name => next[name] !== previous[name])) rebaseWidthWeights(next, floorKey, layout);
    for (const id of newIds) {
      // Appended openings use the closest previously established ID on this floor.
      const sourceId = Object.keys(layout.initialized).map(Number).filter(n => n <= value && layout.initialized[n])
        .sort((a, b) => Math.abs(a - id) - Math.abs(b - id) || a - b)[0];
      const source = `${floorKey}Arch${sourceId}`, prefix = `${floorKey}Arch${id}`;
      next[`${prefix}Height`] = next[`${source}Height`];
      // Copy the visible neighbor's ratio AFTER width fitting. Existing rises
      // remain untouched, so equal fitted widths give the same curved profile.
      next[`${prefix}Rise`] = next[`${source}Rise`] / next[`${source}Width`] * next[`${prefix}Width`];
      layout.initialized[id] = true;
      state.linked[`${prefix}Height`] = 'inherited';
      state.linked[`${prefix}Rise`] = 'inherited';
      delete state.archAnchors[prefix];
      delete state.floorAnchors[floorKey];
    }
    if (target?.startsWith(floorKey)) layout.initialized[Number(target.match(/Arch(\d+)$/)[1])] = true;
  }
  for (const [name, v] of Object.entries(next)) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Linked scaling produced an invalid number; dimensions have not changed.');
  next.proportionState = JSON.stringify(state);
  return next;
}

function selectedArchPrefix(p) {
  const selection = normalizeParameters(p);
  return `${FLOOR_KEYS[FLOOR_NAMES.indexOf(selection.selectedFloor)]}Arch${Number(selection.selectedArch.split(' ')[1])}`;
}
export function copySelectedArch(p) {
  const prefix = selectedArchPrefix(p);
  return Object.fromEntries(['Width', 'Height', 'Rise', 'Lock'].map(field => [field, p[`${prefix}${field}`] ?? parameters[`${prefix}${field}`].value]));
}

// UI hooks initialize persistent state but never run resize rules on load.
const activeFloors = p => Math.min(3, Math.max(1, Math.round(Number(p.floors) || parameters.floors.value)));
const activeArchCount = (p, key) => Math.min(5, Math.max(1, Math.round(Number(p[`${key}Arches`]) || parameters[`${key}Arches`].value)));
export function normalizeParameters(p) {
  const selectedFloor = FLOOR_NAMES.slice(0, activeFloors(p)).includes(p.selectedFloor) ? p.selectedFloor : FLOOR_NAMES[0];
  const count = activeArchCount(p, FLOOR_KEYS[FLOOR_NAMES.indexOf(selectedFloor)]);
  const options = Array.from({ length: count }, (_, i) => `Arch ${i + 1}`);
  const state = readProportionState(p);
  for (const key of FLOOR_KEYS) widthLayout(p, key, state);
  return { selectedFloor, selectedArch: options.includes(p.selectedArch) ? p.selectedArch : 'Arch 1', proportionState: JSON.stringify(state) };
}

export function parameterLayout(p) {
  const selection = normalizeParameters(p);
  const linked = readProportionState(p).linked;
  const floor = FLOOR_NAMES.indexOf(selection.selectedFloor);
  const layout = {
    proportionState: { hidden: true },
    roofPitch: { hidden: p.roofType !== 'Gable' },
    selectedFloor: { options: FLOOR_NAMES.slice(0, activeFloors(p)) },
    selectedArch: { options: Array.from({ length: activeArchCount(p, FLOOR_KEYS[floor]) }, (_, i) => `Arch ${i + 1}`) },
  };
  for (let f = 0; f < 3; f++) {
    layout[`${FLOOR_KEYS[f]}Height`] = { hidden: f !== floor, label: 'Floor Height' };
    layout[`${FLOOR_KEYS[f]}Arches`] = { hidden: f !== floor, label: 'Arch Count' };
    layout[`${FLOOR_KEYS[f]}FloorLock`] = { hidden: f !== floor, label: `Lock Height Proportions (${(p[`${FLOOR_KEYS[f]}FloorLock`] ?? true) ? 'ON' : 'OFF'})` };
    layout[`${FLOOR_KEYS[f]}AutoFit`] = { hidden: f !== floor, label: `Auto Fit Arch Count (${(p[`${FLOOR_KEYS[f]}AutoFit`] ?? true) ? 'ON' : 'OFF · Keep Sizes'})` };
    for (let a = 1; a <= 5; a++) for (const field of ['Lock', 'Width', 'Height', 'Rise']) {
      layout[`${FLOOR_KEYS[f]}Arch${a}${field}`] = {
        hidden: f !== floor || selection.selectedArch !== `Arch ${a}`,
        ...(field === 'Lock' ? { label: `Lock Arch Proportions (${p[`${FLOOR_KEYS[f]}Arch${a}Lock`] ? 'ON' : 'OFF'})` } : {}),
        ...(linked[`${FLOOR_KEYS[f]}Arch${a}${field}`] ? { label: `${parameters[`${FLOOR_KEYS[f]}Arch${a}${field}`].label} (linked)` } : {}),
      };
    }
  }
  return layout;
}

// Editor organization only; these sections do not add saved design parameters.
export function parameterSections(p) {
  const selection = normalizeParameters(p);
  const key = FLOOR_KEYS[FLOOR_NAMES.indexOf(selection.selectedFloor)];
  const arch = `${key}Arch${Number(selection.selectedArch.split(' ')[1])}`;
  return [
    { id: 'building', label: 'Building', keys: [
      { note: 'Control the overall building, including the number of floors and gateway depth.' },
      'floors', { label: 'Facade Width · fixed', value: WIDTH, type: 'length' }, 'depth',
    ] },
    { id: 'floor', label: 'Floors & Arches', keys: [
      { note: 'Choose a floor to adjust its height and arches. Select an individual arch to edit its dimensions.' },
      'selectedFloor', `${key}Height`, `${key}FloorLock`,
      { note: 'ON: arch heights and rises scale with floor height; widths stay fixed. OFF: arch sizes stay unchanged.' },
      `${key}Arches`, `${key}AutoFit`,
      { note: 'Auto Fit refits widths on count changes; OFF keeps sizes. Fit Widths Now runs once. The 4 ft minimum may limit ratios; heights stay independent.' },
      { action: 'fitSelectedArches', label: 'Fit Widths Now' },
      { heading: 'Arches on this floor' },
      { note: 'Each arch can be edited individually. Choose an arch below; Clear Width, Clear Height and Arch Rise affect only that arch.' },
      'selectedArch', `${arch}Width`, `${arch}Height`, `${arch}Rise`, `${arch}Lock`,
      { note: 'ON: width, clear height and rise change together. OFF: edit each dimension separately.' },
      { action: 'copySelectedArch', label: 'Copy Arch' }, { action: 'pasteSelectedArch', label: 'Paste Arch' },
    ] },
    { id: 'details', label: 'Roof & Details', keys: [
      { note: 'Customize the roof shape, pitch, overhang, and upper-floor railings.' },
      'roofType', 'roofPitch', 'roofOverhang', 'upperRailing',
    ] },
  ];
}

export function geometryParameters(p) {
  return Object.fromEntries(Object.keys(parameters)
    .filter(key => !key.endsWith('Lock') && !key.endsWith('AutoFit') && !['proportionState', 'selectedFloor', 'selectedArch'].includes(key))
    .map(key => [key, p[key] ?? parameters[key].value]));
}

// SPEC supplies the facade width, minimum pier width, and inter-floor band.
const WIDTH = 44;
const MIN_PIER = 2;
const MIN_CLEAR_WIDTH = 4;
const BAND = 1;
// Study assumptions: roof eave/base thickness and simple railing dimensions.
const ROOF_THICKNESS = 1;
const ARCH_SEGMENTS = 32;
const RAIL_HEIGHT = 3.5;
const RAIL_SIZE = 0.125;
const RAIL_MAX_POST_SPACING = 4;
const RAIL_FACE_INSET = 0.25;
const RAIL_CLEARANCE = 0.125;

function levels(p) {
  return FLOOR_KEYS.slice(0, p.floors).map((key, floor) => {
    const height = p[`${key}Height`];
    const count = p[`${key}Arches`];
    const arches = Array.from({ length: count }, (_, i) => {
      const prefix = `${key}Arch${i + 1}`;
      return {
        width: p[`${prefix}Width`] ?? parameters[`${prefix}Width`].value,
        clearHeight: p[`${prefix}Height`] ?? parameters[`${prefix}Height`].value,
        rise: p[`${prefix}Rise`] ?? parameters[`${prefix}Rise`].value,
      };
    });
    const required = arches.reduce((sum, arch) => sum + arch.width, 0) + MIN_PIER * (count + 1);
    return { floor, height, arches, required, pier: (WIDTH - arches.reduce((sum, arch) => sum + arch.width, 0)) / (count + 1) };
  });
}

function fitsHeight(arch, height) {
  return arch.clearHeight <= height - BAND + 1e-9 && arch.rise < arch.clearHeight;
}
// All roof geometry is on or above the top of the highest active floor.
// The gable is a closed study mass, including the volume under its slopes.
function roofDimensions(p, floors = levels(p)) {
  const base = floors.reduce((sum, level) => sum + level.height, 0);
  const overhang = p.roofOverhang ?? parameters.roofOverhang.value;
  const halfWidth = WIDTH / 2 + overhang;
  const depth = p.depth + 2 * overhang;
  const rise = p.roofType === 'Gable'
    ? halfWidth * Math.tan((p.roofPitch ?? parameters.roofPitch.value) * Math.PI / 180) : 0;
  return { base, halfWidth, depth, rise, top: base + ROOF_THICKNESS + rise };
}

function roofGeometry(p, kit) {
  const roof = roofDimensions(p);
  if (p.roofType !== 'Gable') return kit.box({
    w: roof.halfWidth * 2, d: roof.depth, h: ROOF_THICKNESS,
    y: roof.base, color: '#b7b5af', name: 'flat_roof',
  });
  const { THREE } = kit;
  const section = new THREE.Shape();
  section.moveTo(-roof.halfWidth, 0);
  section.lineTo(roof.halfWidth, 0);
  section.lineTo(roof.halfWidth, ROOF_THICKNESS);
  section.lineTo(0, ROOF_THICKNESS + roof.rise);
  section.lineTo(-roof.halfWidth, ROOF_THICKNESS);
  section.closePath();
  const geometry = new THREE.ExtrudeGeometry(section, { depth: roof.depth, bevelEnabled: false, steps: 1 });
  geometry.translate(0, roof.base, -roof.depth / 2);
  const mesh = new THREE.Mesh(geometry, kit.material('#b7b5af'));
  mesh.name = 'gable_roof';
  mesh.userData.minThick = ROOF_THICKNESS;
  return mesh;
}

function railingWidth(arch) {
  // Keep even the full top-rail section below the curved opening boundary.
  const spring = arch.clearHeight - arch.rise;
  const t = Math.max(0, (RAIL_HEIGHT + RAIL_CLEARANCE - spring) / arch.rise);
  return Math.max(0, arch.width * Math.sqrt(Math.max(0, 1 - t * t)) - 2 * RAIL_CLEARANCE);
}

function railings(arch, center, bottom, floor, index, p, kit) {
  const width = railingWidth(arch);
  const parts = [];
  const bays = Math.max(1, Math.ceil((width - RAIL_SIZE) / RAIL_MAX_POST_SPACING));
  for (const face of [-1, 1]) {
    const z = face * (p.depth / 2 - RAIL_FACE_INSET);
    const prefix = `railing_floor_${floor + 1}_arch_${index + 1}_${face === 1 ? 'front' : 'back'}`;
    for (const [label, top] of [['top', RAIL_HEIGHT], ['mid', RAIL_HEIGHT / 2]]) {
      parts.push(kit.box({
        w: width, d: RAIL_SIZE, h: RAIL_SIZE, x: center, y: bottom + top - RAIL_SIZE, z,
        color: '#777772', name: `${prefix}_${label}_rail`,
      }));
    }
    for (let j = 0; j <= bays; j++) {
      parts.push(kit.box({
        w: RAIL_SIZE, d: RAIL_SIZE, h: RAIL_HEIGHT - RAIL_SIZE,
        x: center - (width - RAIL_SIZE) / 2 + (width - RAIL_SIZE) * j / bays, y: bottom, z,
        color: '#777772', name: `${prefix}_post_${j + 1}`,
      }));
    }
  }
  return parts;
}

function measurements(p) {
  const floors = levels(p);
  const roof = roofDimensions(p, floors);
  let bottom = 0;
  const crownGaps = [];
  for (const floor of floors) {
    for (const arch of floor.arches) crownGaps.push(roof.base - bottom - arch.clearHeight);
    bottom += floor.height;
  }
  const ground = floors[0];
  const gatewayPasses = ground.required <= WIDTH
    ? ground.arches.filter(a => fitsHeight(a, ground.height) && a.width >= 10 && a.clearHeight >= 10).length : 0;
  return { floors, roof, crownGap: Math.min(...crownGaps), gatewayPasses };
}

function invalidFloorPreview(level, bottom, p, kit) {
  const { THREE } = kit;
  const parts = [kit.box({ w: WIDTH, d: p.depth, h: level.height, y: bottom,
    material: kit.material('#b7b5af', { opacity: 0.2 }), name: `invalid_floor_${level.floor + 1}_massing` })];
  // An overfull group retains actual widths and 2 ft piers, centered on the
  // facade. Its red wireframes visibly extend beyond the fixed massing.
  const pier = Math.max(MIN_PIER, level.pier);
  const total = level.arches.reduce((sum, a) => sum + a.width, 0) + pier * (level.arches.length + 1);
  let left = -total / 2 + pier;
  for (let i = 0; i < level.arches.length; i++) {
    const a = level.arches[i];
    let geometry;
    if (a.rise < a.clearHeight) {
      const shape = new THREE.Shape();
      const spring = a.clearHeight - a.rise;
      shape.moveTo(left, 0); shape.lineTo(left, spring);
      for (let j = 1; j <= ARCH_SEGMENTS; j++) {
        const t = Math.PI * (1 - j / ARCH_SEGMENTS);
        shape.lineTo(left + a.width / 2 + a.width / 2 * Math.cos(t), spring + a.rise * Math.sin(t));
      }
      shape.lineTo(left + a.width, 0); shape.closePath();
      geometry = new THREE.ExtrudeGeometry(shape, { depth: p.depth, bevelEnabled: false, steps: 1 });
      geometry.translate(0, bottom, -p.depth / 2);
    } else {
      // A contradictory rise has no usable arch profile: show its requested box.
      geometry = new THREE.BoxGeometry(a.width, a.clearHeight, p.depth);
      geometry.translate(left + a.width / 2, bottom + a.clearHeight / 2, 0);
    }
    const ghost = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#d12727', wireframe: true, transparent: true, opacity: 0.85, depthTest: false }));
    ghost.name = `invalid_floor_${level.floor + 1}_arch_${i + 1}_requested_opening`;
    ghost.userData.invalidPreview = true;
    ghost.renderOrder = 10;
    parts.push(ghost);
    left += a.width + pier;
  }
  parts.forEach(part => { part.userData.invalidPreview = true; });
  return parts;
}

export function generate(p, kit) {
  const status = validation(p);
  p = previewParameters(p);
  const { THREE } = kit;
  const parts = [];
  let bottom = 0;

  levels(p).forEach(({ height, arches, required, pier }, floor) => {
    if (status.invalidFloors[floor]) {
      parts.push(...invalidFloorPreview({ height, arches, required, pier, floor }, bottom, p, kit));
      bottom += height;
      return;
    }
    // Trace the solid elevation, including upward notches for each opening.
    // Extruding this outline gives closed piers, vaults, and a top band.
    // No wall face or slab crosses the passage below its arch crown.
    const outline = new THREE.Shape();
    outline.moveTo(-WIDTH / 2, 0);
    let cursor = -WIDTH / 2 + pier;
    for (let i = 0; i < arches.length && required <= WIDTH + 1e-9; i++) {
      const arch = arches[i];
      const left = cursor;
      cursor += arch.width + pier;
      // Invalid dimensions stay saved, but are never turned into broken solids.
      if (!fitsHeight(arch, height)) continue;
      const spring = arch.clearHeight - arch.rise;
      const center = left + arch.width / 2;
      outline.lineTo(left, 0);
      outline.lineTo(left, spring);
      for (let j = 1; j <= ARCH_SEGMENTS; j++) {
        const angle = Math.PI * (1 - j / ARCH_SEGMENTS);
        outline.lineTo(center + arch.width / 2 * Math.cos(angle), spring + arch.rise * Math.sin(angle));
      }
      outline.lineTo(left + arch.width, 0);
      if (p.upperRailing && floor > 0 && arch.clearHeight > RAIL_HEIGHT + RAIL_CLEARANCE && railingWidth(arch) > RAIL_SIZE) parts.push(...railings(arch, center, bottom, floor, i, p, kit));
    }
    outline.lineTo(WIDTH / 2, 0);
    outline.lineTo(WIDTH / 2, height);
    outline.lineTo(-WIDTH / 2, height);
    outline.closePath();

    const geometry = new THREE.ExtrudeGeometry(outline, {
      depth: p.depth, bevelEnabled: false, steps: 1,
    });
    geometry.translate(0, bottom, -p.depth / 2);
    const mesh = new THREE.Mesh(geometry, kit.material('#d8d3c7'));
    mesh.name = `floor_${floor + 1}_arched_mass`;
    parts.push(mesh);
    bottom += height;
  });

  parts.push(roofGeometry(p, kit));
  return parts;
}

// Warn without resizing, overlapping, or changing any saved dimension.
export function check(p) {
  const status = validation(p);
  const warnings = [...status.errors];
  const measured = measurements(previewParameters(p));
  if (warnings.length) {
    warnings.unshift('INVALID PREVIEW — current requested massing; red wireframes show requested openings on affected floors, not buildable cut geometry. OBJ/STL export is disabled until all errors are resolved.');
  }
  warnings.push(...status.warnings);
  if (measured.gatewayPasses === 0) warnings.push('Ground floor: requested openings do not provide a 10 ft clear width and 10 ft clear height passage. This is your design target, not an accessibility or code check.');
  const roof = measured.roof;
  let bottom = 0;
  for (const level of measured.floors) {
    level.arches.forEach((arch, i) => {
      const gap = roof.base - bottom - arch.clearHeight;
      if (gap <= 0) warnings.push(`${FLOOR_NAMES[level.floor]}, Arch ${i + 1}: requested crown ${showNumber(bottom + arch.clearHeight)} ft reaches roof underside ${showNumber(roof.base)} ft (gap ${showNumber(gap)} ft). Shown as invalid wireframe.`);
      if (p.upperRailing && level.floor > 0 && (arch.clearHeight <= RAIL_HEIGHT + RAIL_CLEARANCE || railingWidth(arch) <= RAIL_SIZE)) warnings.push(`${FLOOR_NAMES[level.floor]}, Arch ${i + 1}: the requested opening is too small for the assumed 3.5 ft railing. No railing is generated for that opening.`);
    });
    bottom += level.height;
  }
  return warnings;
}

// All measurements refer to this request, never a saved fallback model.
export function stats(p) {
  const measured = measurements(previewParameters(p));
  return {
    'Measurements': 'Requested dimensions',
    'Preview': validation(p).valid ? 'Current dimensions' : 'INVALID — diagnostic massing',
    'Facade width (ft)': WIDTH,
    'Max facade required (ft)': Math.max(...measured.floors.map(f => f.required)),
    'Pier allowance, min (ft)': Math.min(...measured.floors.map(f => f.pier)),
    'Gateway target passes (count)': measured.gatewayPasses,
    'Arch/band reserve, min (ft)': Math.min(...measured.floors.flatMap(f => f.arches.map(a => f.height - BAND - a.clearHeight))),
    'Spring height, min (ft)': Math.min(...measured.floors.flatMap(f => f.arches.map(a => a.clearHeight - a.rise))),
    'Roof underside height (ft)': measured.roof.base,
    'Overall height (ft)': measured.roof.top,
    'Roof/requested crown gap (ft)': measured.crownGap,
  };
}




