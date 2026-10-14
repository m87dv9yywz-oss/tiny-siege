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
};
export const { PATH, SEGMENTS, PATH_LENGTH, onPath, distanceToPath } =
  TRAILS.classic;

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
  ],
};
