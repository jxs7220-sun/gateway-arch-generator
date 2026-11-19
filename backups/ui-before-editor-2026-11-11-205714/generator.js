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
  groundFloorLock: { label: 'Lock Floor Proportions', value: true, help: 'ON scales arch heights and rises by available floor height; widths stay unchanged.' },
  groundArches: { label: 'Ground floor arches', value: 1, min: 1, max: 5, step: 1 },
  secondHeight: { label: 'Second floor height', value: 12, min: 10, max: 24, step: 0.5, type: 'length', help: 'Used when there are at least two floors.' },
  secondFloorLock: { label: 'Lock Floor Proportions', value: true, help: 'ON scales arch heights and rises by available floor height; widths stay unchanged.' },
  secondArches: { label: 'Second floor arches', value: 3, min: 1, max: 5, step: 1, help: 'Used when there are at least two floors.' },
  thirdHeight: { label: 'Third floor height', value: 12, min: 10, max: 24, step: 0.5, type: 'length', help: 'Used only when there are three floors.' },
  thirdFloorLock: { label: 'Lock Floor Proportions', value: true, help: 'ON scales arch heights and rises by available floor height; widths stay unchanged.' },
  thirdArches: { label: 'Third floor arches', value: 3, min: 1, max: 5, step: 1, help: 'Used only when there are three floors.' },
};

// Every arch has ordinary named parameters, so the starter saves even inactive
// arches in variations. Selection only changes which controls are shown.
parameters.selectedFloor = { label: 'Selected Floor', value: 'Ground floor', options: ['Ground floor', 'Second floor', 'Third floor'] };
parameters.selectedArch = { label: 'Selected Arch', value: 'Arch 1', options: ['Arch 1', 'Arch 2', 'Arch 3', 'Arch 4', 'Arch 5'] };
const FLOOR_KEYS = ['ground', 'second', 'third'];
const FLOOR_NAMES = ['Ground floor', 'Second floor', 'Third floor'];
for (let f = 0; f < 3; f++) {
  for (let a = 1; a <= 5; a++) {
    const original = f === 0 ? a === 1 : a <= 3;
    const values = original ? (f === 0 ? [26, 19, 8] : [12, 11, 5.5]) : [4, f === 0 ? 10 : 9, 2];
    parameters[`${FLOOR_KEYS[f]}Arch${a}Lock`] = { label: 'Lock Arch Proportions', value: false, help: 'ON links width, clear height and rise when width or height changes. Editing rise sets a new proportion.' };
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
    return { floorAnchors: record(s.floorAnchors), archAnchors: record(s.archAnchors), linked: record(s.linked) };
  } catch {
    return { floorAnchors: {}, archAnchors: {}, linked: {} };
  }
}
const showNumber = v => Number.isFinite(v) ? String(Number(v.toFixed(2))) : 'not a finite number';
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
    issues.push(...nominalIssues(p, [`${key}Height`, `${key}Arches`, ...floor.arches.flatMap((a, i) => ['Width', 'Height', 'Rise'].map(field => `${key}Arch${i + 1}${field}`))]));
    const label = FLOOR_NAMES[floor.floor];
    if (!Number.isInteger(p[`${key}Arches`])) issues.push(`${label}: arch count must be a whole number from 1 to 5.`);
    if (floor.required > WIDTH + 1e-9) issues.push(`${label}: widths plus 2 ft piers need ${showNumber(floor.required)} ft; facade is 44 ft.`);
    floor.arches.forEach((a, i) => {
      const name = `${label}, Arch ${i + 1}`;
      if (![a.width, a.clearHeight, a.rise].every(v => Number.isFinite(v) && v > 0)) issues.push(`${name}: dimensions must be positive finite numbers.`);
      if (a.clearHeight > floor.height - BAND + 1e-9) issues.push(`${name}: clear height ${showNumber(a.clearHeight)} ft exceeds ${showNumber(floor.height - BAND)} ft (floor height minus 1 ft).`);
      if (a.rise >= a.clearHeight) issues.push(`${name}: rise ${showNumber(a.rise)} ft must be smaller than clear height ${showNumber(a.clearHeight)} ft.`);
    });
  }
  return issues;
}
export function validation(p) {
  const globals = nominalIssues(p, ['floors', 'depth', 'roofOverhang', ...(p.roofType === 'Gable' ? ['roofPitch'] : [])]);
  if (![1, 2, 3].includes(p.floors)) globals.push('Number of floors must be 1, 2, or 3.');
  const safe = previewParameters(p);
  const invalidFloors = levels(safe).map(f => floorIssues(p, { ...f, height: p[`${FLOOR_KEYS[f.floor]}Height`] ?? f.height,
    arches: f.arches.map((a, i) => ({ width: p[`${FLOOR_KEYS[f.floor]}Arch${i + 1}Width`] ?? a.width, clearHeight: p[`${FLOOR_KEYS[f.floor]}Arch${i + 1}Height`] ?? a.clearHeight, rise: p[`${FLOOR_KEYS[f.floor]}Arch${i + 1}Rise`] ?? a.rise })),
    required: f.arches.reduce((s, a, i) => s + (p[`${FLOOR_KEYS[f.floor]}Arch${i + 1}Width`] ?? a.width), 0) + MIN_PIER * (f.arches.length + 1) }));
  const errors = [...globals, ...invalidFloors.flat()];
  return { valid: errors.length === 0, errors, invalidFloors: invalidFloors.map(e => e.length > 0) };
}
function previewParameters(p) {
  const safe = { ...p };
  // Only malformed/nonpositive numbers need a safe diagnostic substitute.
  // Finite requested dimensions, including conflicts, remain unchanged.
  for (const [key, def] of Object.entries(parameters)) if (typeof def.value === 'number') {
    if (!Number.isFinite(safe[key]) || !Number.isFinite(Math.fround(safe[key])) || safe[key] <= 0) safe[key] = def.value;
  }
  safe.floors = Math.min(3, Math.max(1, Math.round(safe.floors)));
  for (const key of FLOOR_KEYS) safe[`${key}Arches`] = Math.min(5, Math.max(1, Math.round(safe[`${key}Arches`])));
  if (safe.roofPitch >= 90) safe.roofPitch = parameters.roofPitch.value;
  return safe;
}

// Apply a direct user edit once. Anchors store full precision and are rebased only
// when another edit actually changes that floor/arch's proportion.
const sameRatio = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
export function editParameters(previous, key, value) {
  const next = { ...previous, [key]: value };
  const state = readProportionState(previous);
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Enter a finite number; dimensions have not changed.');
  let locked = false;
  for (const floorKey of FLOOR_KEYS) {
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
        locked = Boolean(previous[`${prefix}Lock`]) && field !== 'Rise';
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
  }
  for (const [name, v] of Object.entries(next)) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Linked scaling produced an invalid number; dimensions have not changed.');
  next.proportionState = JSON.stringify(state);
  return next;
}

// UI hooks initialize persistent state but never run resize rules on load.
export function normalizeParameters(p) {
  const selectedFloor = FLOOR_NAMES.slice(0, p.floors).includes(p.selectedFloor) ? p.selectedFloor : FLOOR_NAMES[0];
  const count = p[`${FLOOR_KEYS[FLOOR_NAMES.indexOf(selectedFloor)]}Arches`];
  const options = Array.from({ length: count }, (_, i) => `Arch ${i + 1}`);
  const state = readProportionState(p);
  return { selectedFloor, selectedArch: options.includes(p.selectedArch) ? p.selectedArch : 'Arch 1', proportionState: JSON.stringify(state) };
}

export function parameterLayout(p) {
  const selection = normalizeParameters(p);
  const linked = readProportionState(p).linked;
  const floor = FLOOR_NAMES.indexOf(selection.selectedFloor);
  const layout = {
    proportionState: { hidden: true },
    roofPitch: { hidden: p.roofType !== 'Gable' },
    selectedFloor: { options: FLOOR_NAMES.slice(0, p.floors) },
    selectedArch: { options: Array.from({ length: p[`${FLOOR_KEYS[floor]}Arches`] }, (_, i) => `Arch ${i + 1}`) },
  };
  for (let f = 0; f < 3; f++) {
    layout[`${FLOOR_KEYS[f]}Height`] = { hidden: f >= p.floors };
    layout[`${FLOOR_KEYS[f]}Arches`] = { hidden: f >= p.floors };
    layout[`${FLOOR_KEYS[f]}FloorLock`] = { hidden: f >= p.floors, label: `Lock Floor Proportions (${(p[`${FLOOR_KEYS[f]}FloorLock`] ?? true) ? 'ON' : 'OFF'})` };
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

// SPEC supplies the facade width, minimum pier width, and inter-floor band.
const WIDTH = 44;
const MIN_PIER = 2;
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




