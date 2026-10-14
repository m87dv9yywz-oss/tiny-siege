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
  function onPath(distance) {
    let d = Math.max(0, distance);
    for (const s of SEGMENTS) {
      if (d <= s.length) {
        const t = d / s.length;
        return {
          x: s.a.x + (s.b.x - s.a.x) * t,
          y: s.a.y + (s.b.y - s.a.y) * t,
          angle: Math.atan2(s.b.y - s.a.y, s.b.x - s.a.x),
        };
      }
      d -= s.length;
    }
    return { ...PATH.at(-1), angle: 0 };
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
  classic: createTrail(),
  emerald: createTrail(),
  amber: createTrail(knots.map(([x, y]) => [x, y + Math.sin(x / 140) * 32])),
  moon: createTrail(knots.map(([x, y]) => [x, 640 - y])),
  garden: createTrail(knots.map(([x, y]) => [x, y + Math.sin(x / 185) * 48])),
};
export const { PATH, SEGMENTS, PATH_LENGTH, onPath, distanceToPath } =
  TRAILS.classic;
