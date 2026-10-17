export const MAP = { width: 960, height: 640, pathWidth: 44, towerRadius: 23 };
// Rounded corners use a sampled Catmull-Rom spline, shared by movement and placement.
const knots = [
  [-30, 170],
  [140, 170],
  [230, 170],
  [278, 216],
  [278, 310],
  [246, 352],
  [157, 352],
  [115, 393],
  [115, 466],
  [164, 503],
  [352, 503],
  [411, 452],
  [411, 238],
  [467, 173],
  [575, 173],
  [626, 222],
  [626, 411],
  [678, 460],
  [798, 460],
  [837, 412],
  [837, 315],
  [920, 270],
  [990, 270],
];
export function createTrail(points = knots) {
  const PATH = [];
  const knots = points;
  for (let i = 0; i < knots.length - 1; i++) {
    const p0 = knots[Math.max(0, i - 1)],
      p1 = knots[i],
      p2 = knots[i + 1],
      p3 = knots[Math.min(knots.length - 1, i + 2)];
    for (let j = 0; j < 12; j++) {
      const t = j / 12;
      const coordinate = (k) =>
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
      PATH.push({ x: coordinate(0), y: coordinate(1) });
    }
  }
  PATH.push({ x: points.at(-1)[0], y: points.at(-1)[1] });
  const SEGMENTS = PATH.slice(1).map((b, i) => ({
    a: PATH[i],
    b,
    length: Math.hypot(b.x - PATH[i].x, b.y - PATH[i].y),
  }));
  const PATH_LENGTH = SEGMENTS.reduce((n, s) => n + s.length, 0);
  const ends = [];
  let total = 0;
  for (const segment of SEGMENTS) {
    total += segment.length;
    ends.push(total);
  }
  function onPath(distance) {
    const d = Math.max(0, distance);
    if (d > PATH_LENGTH) return { ...PATH.at(-1), angle: 0 };
    let lo = 0,
      hi = SEGMENTS.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ends[mid] < d) lo = mid + 1;
      else hi = mid;
    }
    const s = SEGMENTS[lo],
      t = (d - (lo ? ends[lo - 1] : 0)) / s.length;
    return {
      x: s.a.x + (s.b.x - s.a.x) * t,
      y: s.a.y + (s.b.y - s.a.y) * t,
      angle: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x),
    };
  }
  function distanceToPath(x, y) {
    return Math.min(
      ...SEGMENTS.map(({ a, b, length }) => {
        const t = Math.max(
          0,
          Math.min(
            1,
            ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) /
              (length * length),
          ),
        );
        return Math.hypot(x - a.x - t * (b.x - a.x), y - a.y - t * (b.y - a.y));
      }),
    );
  }

  return { PATH, SEGMENTS, PATH_LENGTH, onPath, distanceToPath };
}
export const TRAILS = {
  crystal: createTrail([
    [-30, 100],
    [120, 100],
    [180, 150],
    [180, 460],
    [260, 490],
    [340, 430],
    [340, 170],
    [420, 120],
    [500, 180],
    [540, 410],
    [620, 480],
    [730, 430],
    [760, 180],
    [850, 120],
    [910, 190],
    [910, 500],
    [990, 560],
  ]),
  coast: createTrail([
    [100, -30],
    [100, 160],
    [190, 240],
    [700, 240],
    [790, 320],
    [700, 400],
    [280, 400],
    [180, 470],
    [280, 550],
    [990, 550],
  ]),
  classic: createTrail(),
  emerald: createTrail(),
  amber: createTrail(knots.map(([x, y]) => [x, y + Math.sin(x / 140) * 32])),
  moon: createTrail(knots.map(([x, y]) => [x, 640 - y])),
  garden: createTrail(knots.map(([x, y]) => [x, y + Math.sin(x / 185) * 48])),
  // Expansion maps (2026-10): geometry shared with the painted
  // backgrounds; see NEW_MAPS_GEOMETRY.json in the art set.
  twinponds: createTrail([[-30, 110], [110, 110], [200, 116], [285, 123], [379, 158], [418, 235], [379, 312], [285, 347], [191, 312], [150, 360], [240, 430], [400, 428], [532, 415], [574, 327], [665, 303], [756, 327], [798, 415], [756, 503], [665, 527], [800, 545], [990, 552]]),
  roundabout: createTrail([[-30, 330], [150, 330], [310, 330], [352, 208], [480, 160], [608, 208], [650, 330], [608, 458], [480, 498], [356, 456], [338, 352], [368, 268], [452, 204], [562, 224], [600, 318], [556, 424], [668, 492], [820, 540], [990, 556]]),
  switchbacks: createTrail([[-30, 90], [820, 90], [850, 103], [866, 142], [850, 182], [820, 195], [140, 195], [110, 208], [94, 247], [110, 287], [140, 300], [820, 300], [850, 313], [866, 352], [850, 392], [820, 405], [140, 405], [110, 418], [94, 457], [110, 497], [140, 510], [700, 510], [820, 548], [990, 556]]),
  twofronts: createTrail([[140, -30], [140, 92], [298, 160], [298, 332], [428, 424], [452, 520], [452, 670]]),
  spiral: createTrail([[-30, 60], [900, 60], [900, 580], [60, 580], [60, 175], [785, 175], [785, 465], [175, 465], [175, 290], [560, 290], [560, 352], [472, 322]]),
  riverbend: createTrail([[-30, 104], [168, 100], [272, 238], [392, 296], [470, 150], [566, 296], [688, 244], [762, 116], [990, 108]]),
};
export const { PATH, SEGMENTS, PATH_LENGTH, onPath, distanceToPath } =
  TRAILS.classic;

// Every map's full trail list. Most maps have one trail; twofronts has two
// independent entries that share the same exit.
export const TRAIL_SETS = {
  classic: [TRAILS.classic],
  emerald: [TRAILS.emerald],
  amber: [TRAILS.amber],
  moon: [TRAILS.moon],
  garden: [TRAILS.garden],
  crystal: [TRAILS.crystal],
  coast: [TRAILS.coast],
  twinponds: [
    createTrail([[-30, 110], [110, 110], [200, 116], [285, 123], [379, 158], [418, 235], [379, 312], [285, 347], [191, 312], [150, 360], [240, 430], [400, 428], [532, 415], [574, 327], [665, 303], [756, 327], [798, 415], [756, 503], [665, 527], [800, 545], [990, 552]]),
  ],
  roundabout: [
    createTrail([[-30, 330], [150, 330], [310, 330], [352, 208], [480, 160], [608, 208], [650, 330], [608, 458], [480, 498], [356, 456], [338, 352], [368, 268], [452, 204], [562, 224], [600, 318], [556, 424], [668, 492], [820, 540], [990, 556]]),
  ],
  switchbacks: [
    createTrail([[-30, 90], [820, 90], [850, 103], [866, 142], [850, 182], [820, 195], [140, 195], [110, 208], [94, 247], [110, 287], [140, 300], [820, 300], [850, 313], [866, 352], [850, 392], [820, 405], [140, 405], [110, 418], [94, 457], [110, 497], [140, 510], [700, 510], [820, 548], [990, 556]]),
  ],
  twofronts: [
    createTrail([[140, -30], [140, 92], [298, 160], [298, 332], [428, 424], [452, 520], [452, 670]]),
    createTrail([[820, -30], [820, 112], [662, 182], [662, 344], [532, 432], [508, 520], [508, 670]]),
  ],
  spiral: [
    createTrail([[-30, 60], [900, 60], [900, 580], [60, 580], [60, 175], [785, 175], [785, 465], [175, 465], [175, 290], [560, 290], [560, 352], [472, 322]]),
  ],
  riverbend: [
    createTrail([[-30, 104], [168, 100], [272, 238], [392, 296], [470, 150], [566, 296], [688, 244], [762, 116], [990, 108]]),
  ],
};

// Water regions (ellipse ponds/lakes). Only the Tidecaller boat tower may
// be placed on water; land towers are rejected inside these ellipses.
export const PONDS = {
  twinponds: [{"x": 285, "y": 235, "rx": 95, "ry": 78}, {"x": 665, "y": 415, "rx": 95, "ry": 78}],
  roundabout: [{"x": 480, "y": 330, "rx": 80, "ry": 64}],
  twofronts: [{"x": 480, "y": 290, "rx": 70, "ry": 52}],
  riverbend: [{"x": 480, "y": 478, "rx": 300, "ry": 128}],
};
export function inPond(mapId, x, y, shrink = 0) {
  return (PONDS[mapId] || []).some(
    (p) =>
      ((x - p.x) / Math.max(1, p.rx - shrink)) ** 2 +
        ((y - p.y) / Math.max(1, p.ry - shrink)) ** 2 <=
      1,
  );
}


export const OBSTACLES = {
  crystal: [
    { x: 60, y: 290, r: 34 },
    { x: 440, y: 320, r: 32 },
    { x: 840, y: 330, r: 33 },
  ],
  coast: [
    { x: 450, y: 100, r: 80 },
    { x: 470, y: 320, r: 35 },
    { x: 810, y: 475, r: 24 },
  ],  twinponds: [{"x": 480, "y": 120, "r": 26}],
  roundabout: [{"x": 90, "y": 540, "r": 24}, {"x": 880, "y": 120, "r": 24}],
  switchbacks: [{"x": 480, "y": 145, "r": 22}, {"x": 480, "y": 345, "r": 22}, {"x": 480, "y": 545, "r": 22}],
  riverbend: [{"x": 120, "y": 300, "r": 24}, {"x": 850, "y": 300, "r": 24}],
};
