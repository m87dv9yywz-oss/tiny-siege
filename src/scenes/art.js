import { TOWERS } from "../data/towers.js";
import { ENEMIES } from "../data/enemies.js";
import { PATH, distanceToPath } from "../data/map.js";
const polygon = (g, points, color) => {
  g.fillStyle(color);
  g.fillPoints(
    points.map(([x, y]) => ({ x, y })),
    true,
  );
};
export function textures(scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  for (const [type, def] of Object.entries(TOWERS))
    for (let level = 1; level <= 3; level++) {
      g.clear();
      g.fillStyle(0x1c3e32, 0.28);
      g.fillEllipse(42, 68, 65, 19);
      g.fillStyle(0x506767);
      g.fillRoundedRect(18, 46, 48, 23, 6);
      g.fillStyle(0xa1b0a0);
      g.fillRoundedRect(18, 43, 48, 15, 5);
      g.fillStyle(0x718881);
      g.fillRect(22, 52, 40, 10);
      g.lineStyle(1, 0x3c5555, 0.7);
      g.strokeRect(31, 54, 13, 8);
      g.strokeRect(46, 54, 13, 8);
      if (type === "archer") {
        g.fillStyle(0x634d39);
        g.fillRect(25, 23, 34, 27);
        g.fillStyle(0x947849);
        g.fillRect(28, 23, 7, 26);
        g.fillStyle(0xcbb477);
        g.fillRect(48, 23, 6, 26);
        polygon(
          g,
          [
            [19, 27],
            [42, 6],
            [65, 27],
          ],
          0x304d38,
        );
        polygon(
          g,
          [
            [20, 24],
            [42, 3],
            [64, 24],
          ],
          0x6dab64,
        );
        polygon(
          g,
          [
            [42, 3],
            [64, 24],
            [44, 24],
          ],
          0x4e8950,
        );
        g.lineStyle(2, 0xeacb7b);
        g.lineBetween(20, 25, 65, 25);
        g.fillStyle(0x253e37);
        g.fillRoundedRect(35, 30, 14, 16, 4);
        g.lineStyle(3, 0xd7b77b);
        g.beginPath();
        g.arc(42, 37, 12, -1.2, 1.2);
        g.strokePath();
        g.lineStyle(1, 0xf6dfab);
        g.lineBetween(46, 26, 46, 48);
        g.lineStyle(2, 0xf8e6b3);
        g.lineBetween(34, 36, 59, 36);
      } else if (type === "cannon") {
        g.fillStyle(0x686e7d);
        g.fillRoundedRect(26, 27, 32, 26, 5);
        g.fillStyle(0xc1ba94);
        g.fillCircle(30, 48, 8);
        g.fillCircle(54, 48, 8);
        g.fillStyle(0x434954);
        g.fillCircle(30, 48, 4);
        g.fillCircle(54, 48, 4);
        polygon(
          g,
          [
            [29, 32],
            [48, 14],
            [64, 27],
            [46, 45],
          ],
          0x313a48,
        );
        polygon(
          g,
          [
            [32, 31],
            [48, 17],
            [59, 27],
            [44, 41],
          ],
          0x74858d,
        );
        g.lineStyle(5, 0xa2aaa0);
        g.lineBetween(47, 17, 62, 28);
        g.lineStyle(3, 0x28363f);
        g.lineBetween(49, 17, 62, 26);
        g.fillStyle(0xf4ba69);
        g.fillCircle(39, 34, 3);
      } else {
        g.fillStyle(0x7c8190);
        g.fillRect(30, 24, 24, 25);
        g.fillStyle(0xadb0a3);
        g.fillRect(32, 22, 6, 26);
        g.fillStyle(0xd9bb7d);
        g.fillRect(27, 42, 30, 5);
        if (type === "frost") {
          polygon(
            g,
            [
              [42, 2],
              [58, 22],
              [42, 39],
              [26, 22],
            ],
            0x4086a3,
          );
          polygon(
            g,
            [
              [42, 2],
              [42, 39],
              [26, 22],
            ],
            0x9de8ed,
          );
          polygon(
            g,
            [
              [42, 2],
              [58, 22],
              [45, 21],
            ],
            0xd8ffff,
          );
          g.lineStyle(1, 0xecffff);
          g.lineBetween(42, 6, 31, 22);
        } else if (type === "fire") {
          polygon(
            g,
            [
              [42, 2],
              [46, 18],
              [57, 12],
              [55, 33],
              [44, 39],
              [28, 32],
              [25, 17],
              [36, 24],
            ],
            0xd96543,
          );
          polygon(
            g,
            [
              [42, 9],
              [46, 28],
              [50, 23],
              [49, 34],
              [40, 37],
              [32, 30],
              [36, 18],
              [38, 28],
            ],
            0xffae56,
          );
          polygon(
            g,
            [
              [42, 21],
              [46, 33],
              [39, 34],
            ],
            0xffe1a0,
          );
        } else {
          g.lineStyle(3, 0xd2b684);
          g.strokeCircle(42, 22, 17);
          g.fillStyle(0x665b9a);
          g.fillCircle(42, 22, 12);
          g.fillStyle(0xb391e9, 0.8);
          g.fillCircle(42, 22, 8);
          polygon(
            g,
            [
              [46, 5],
              [34, 24],
              [43, 23],
              [37, 39],
              [53, 18],
              [43, 19],
            ],
            0xe5d4ff,
          );
        }
      }
      if (level > 1) {
        g.lineStyle(2, 0xe9c878);
        g.strokeRoundedRect(18, 44, 48, 15, 5);
        g.fillStyle(0xe9c878);
        for (let i = 0; i < level; i++) g.fillCircle(36 + i * 7, 60, 2);
      }
      if (level === 3) {
        g.fillStyle(def.color, 0.25);
        g.fillCircle(42, 25, 24);
        g.fillStyle(0xffe7a5);
        g.fillTriangle(15, 48, 11, 32, 23, 39);
        g.fillTriangle(69, 48, 72, 32, 62, 39);
      }
      g.generateTexture(`tower-${type}-${level}`, 84, 82);
    }
  for (const [type, def] of Object.entries(ENEMIES)) {
    g.clear();
    const r = def.radius,
      x = 40,
      y = 40;
    g.fillStyle(0x183d31, 0.3);
    g.fillEllipse(x, y + r + 5, r * 2.5, r * 0.7);
    g.fillStyle(0x334947);
    g.fillRoundedRect(x - r * 0.7, y + r * 0.4, 7, r, 3);
    g.fillRoundedRect(x + r * 0.2, y + r * 0.4, 7, r, 3);
    g.fillStyle(type === "boss" ? 0x654580 : 0x405d3c);
    g.fillEllipse(x, y + 4, r * 2, r * 2);
    g.fillStyle(def.color);
    g.fillRoundedRect(x - r, y - r, r * 2, r * 1.8, Math.max(5, r * 0.5));
    g.fillStyle(0xffffff, 0.17);
    g.fillEllipse(x - r * 0.3, y - r * 0.4, r, r * 0.65);
    if (type === "basic") {
      polygon(
        g,
        [
          [x - r, y - 3],
          [x - r - 7, y - 10],
          [x - r + 2, y - 9],
        ],
        0x709c48,
      );
      polygon(
        g,
        [
          [x + r, y - 3],
          [x + r + 7, y - 10],
          [x + r - 2, y - 9],
        ],
        0x709c48,
      );
    }
    if (type === "runner") {
      polygon(
        g,
        [
          [x - 13, y - 9],
          [x - 1, y - 19],
          [x + 6, y - 9],
        ],
        0xd3a844,
      );
      g.lineStyle(3, 0x985749);
      g.lineBetween(x - 13, y + 5, x + 9, y + 5);
    }
    if (type === "armored") {
      g.fillStyle(0x667b8b);
      g.fillRoundedRect(x - r - 2, y - r - 3, r * 2 + 4, 11, 4);
      g.fillStyle(0xd3dbd6);
      g.fillRect(x - 3, y - r - 3, 6, 19);
      g.fillStyle(0x819799);
      g.fillRoundedRect(x - 20, y, 11, 20, 4);
      g.lineStyle(2, 0xc8d4cc);
      g.strokeRoundedRect(x - 20, y, 11, 20, 4);
    }
    if (type === "brute") {
      polygon(
        g,
        [
          [x - r, y - r + 6],
          [x - r - 5, y - r - 9],
          [x - 7, y - r + 1],
        ],
        0xf0c78e,
      );
      polygon(
        g,
        [
          [x + r, y - r + 6],
          [x + r + 5, y - r - 9],
          [x + 7, y - r + 1],
        ],
        0xf0c78e,
      );
      g.fillStyle(0x9f574b);
      g.fillRect(x - r, y + 7, r * 2, 6);
    }
    if (type === "boss") {
      polygon(
        g,
        [
          [15, 17],
          [11, 0],
          [30, 10],
          [40, 0],
          [48, 10],
          [69, 0],
          [65, 20],
        ],
        0xcdb071,
      );
      g.fillStyle(0x765597);
      g.fillRect(15, 15, 50, 6);
      g.fillStyle(0xe8cb87);
      g.fillCircle(40, 15, 4);
      g.lineStyle(4, 0x413850);
      g.lineBetween(10, 40, 5, 70);
      g.fillStyle(0xb1d68c);
      g.fillCircle(8, 38, 6);
    }
    g.fillStyle(0x213b38);
    g.fillEllipse(x - r * 0.4, y - 2, 4, 6);
    g.fillEllipse(x + r * 0.4, y - 2, 4, 6);
    g.fillStyle(0xfff4d0);
    g.fillCircle(x - r * 0.4, y - 3, 1);
    g.fillCircle(x + r * 0.4, y - 3, 1);
    g.lineStyle(2, 0x37443a);
    g.lineBetween(x - 4, y + 6, x + 4, y + 6);
    g.generateTexture(`enemy-${type}`, 80, 85);
  }
  g.clear();
  g.fillStyle(0xffffff);
  g.fillCircle(4, 4, 3);
  g.generateTexture("spark", 8, 8);
  g.destroy();
}
export function battlefield(scene) {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(0x76a77a);
  g.fillRect(0, 0, 960, 640);
  let seed = 722;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 120; i++) {
    g.fillStyle(i % 2 ? 0x6b9c70 : 0x8ab787, 0.18);
    g.fillEllipse(
      random() * 960,
      random() * 640,
      70 + random() * 110,
      30 + random() * 70,
    );
  }
  for (let i = 0; i < 1600; i++) {
    const x = random() * 960,
      y = random() * 640;
    g.lineStyle(1, i % 2 ? 0x4e8a59 : 0xa6c58d, 0.35);
    g.lineBetween(x, y, x + 2, y - 3);
  }
  const line = (width, color, offset = 0) => {
    g.lineStyle(width, color, 1);
    g.beginPath();
    g.moveTo(PATH[0].x, PATH[0].y + offset);
    PATH.slice(1).forEach((p) => g.lineTo(p.x, p.y + offset));
    g.strokePath();
  };
  line(56, 0x4e8057, 4);
  line(51, 0xa99b69);
  line(43, 0xd6bf87);
  line(33, 0xe0c892);
  for (let i = 5; i < PATH.length; i += 4) {
    const p = PATH[i];
    g.fillStyle(0xb2a078, 0.4);
    g.fillEllipse(
      p.x + (random() - 0.5) * 22,
      p.y + (random() - 0.5) * 22,
      4 + random() * 6,
      3,
    );
  }
  const tree = (x, y, s = 1) => {
    g.fillStyle(0x426a47, 0.25);
    g.fillEllipse(x + 5, y + 9, 48 * s, 20 * s);
    g.fillStyle(0x806646);
    g.fillRoundedRect(x - 5 * s, y - 30 * s, 10 * s, 38 * s, 3);
    g.fillStyle(0x355e45);
    g.fillCircle(x, y - 36 * s, 26 * s);
    g.fillStyle(0x477d52);
    g.fillCircle(x - 10 * s, y - 44 * s, 20 * s);
    g.fillCircle(x + 14 * s, y - 44 * s, 21 * s);
    g.fillStyle(0x619558);
    g.fillCircle(x - 2 * s, y - 57 * s, 22 * s);
    g.fillStyle(0x89b46c, 0.7);
    g.fillEllipse(x - 8 * s, y - 64 * s, 20 * s, 13 * s);
  };
  [
    [20, 110, 1.2],
    [83, 94, 1],
    [180, 97, 0.8],
    [332, 114, 1.1],
    [366, 76, 0.75],
    [545, 87, 0.8],
    [693, 138, 1.1],
    [746, 96, 0.9],
    [908, 116, 1.1],
    [949, 163, 0.85],
    [29, 336, 0.85],
    [53, 289, 1],
    [191, 287, 0.65],
    [511, 324, 0.7],
    [525, 386, 0.8],
    [944, 488, 1.2],
    [891, 560, 0.8],
    [762, 584, 1],
    [709, 605, 0.85],
    [505, 602, 1.1],
    [358, 612, 0.8],
    [282, 582, 0.8],
    [32, 570, 1],
    [73, 620, 0.8],
  ].forEach(([x, y, s]) => tree(x, y, s));
  for (let i = 0; i < 100; i++) {
    const x = 30 + random() * 900,
      y = 65 + random() * 530;
    if (distanceToPath(x, y) < 48) continue;
    if (i % 5 === 0) {
      g.fillStyle(0x496e4f, 0.25);
      g.fillEllipse(x, y + 4, 25, 10);
      g.fillStyle(0x80998b);
      g.fillRoundedRect(x - 11, y - 5, 22, 13, 5);
      g.fillStyle(0xa9b8a0);
      g.fillEllipse(x - 2, y - 4, 16, 7);
    } else if (i % 5 === 1) {
      g.fillStyle(0xdacf9e);
      g.fillRect(x - 1, y, 3, 7);
      g.fillStyle(0xd7836a);
      g.fillEllipse(x, y, 12, 7);
      g.fillStyle(0xf5e5bd);
      g.fillCircle(x - 3, y - 1, 1.5);
      g.fillCircle(x + 3, y, 1);
    } else if (i % 5 === 2) {
      g.fillStyle(0x548450);
      g.fillCircle(x, y, 9);
      g.fillCircle(x + 7, y + 3, 7);
      g.fillStyle(0x82ad65);
      g.fillCircle(x - 3, y - 3, 5);
    } else {
      g.lineStyle(1, 0x548459);
      g.lineBetween(x, y, x, y + 5);
      g.fillStyle(i % 2 ? 0xe8d47e : 0xedd5c6);
      g.fillCircle(x, y, 2);
      g.fillCircle(x - 3, y - 1, 2);
      g.fillCircle(x + 2, y - 2, 2);
    }
  }
  // Pond, stepping stones, and tiny magical crystals.
  g.fillStyle(0x558a72);
  g.fillEllipse(732, 298, 96, 75);
  g.fillStyle(0x72b6b0);
  g.fillEllipse(732, 294, 84, 61);
  g.fillStyle(0x9ed0bd, 0.5);
  g.fillEllipse(725, 285, 55, 23);
  g.lineStyle(2, 0xb8e0c1, 0.5);
  g.lineBetween(709, 297, 731, 297);
  g.lineBetween(736, 280, 751, 280);
  [
    [338, 344],
    [578, 531],
    [772, 205],
    [66, 437],
  ].forEach(([x, y]) => {
    g.fillStyle(0x2f795e, 0.22);
    g.fillEllipse(x, y + 6, 35, 17);
    polygon(
      g,
      [
        [x - 8, y + 3],
        [x - 4, y - 19],
        [x + 3, y - 8],
        [x + 3, y + 6],
      ],
      0x9bcbd0,
    );
    polygon(
      g,
      [
        [x + 3, y + 6],
        [x + 3, y - 8],
        [x + 9, y - 22],
        [x + 15, y + 2],
      ],
      0x72b4c0,
    );
  });
  // Entrance banner and the kingdom's gate.
  g.fillStyle(0x715f45);
  g.fillRect(33, 112, 5, 45);
  polygon(
    g,
    [
      [38, 113],
      [70, 113],
      [62, 123],
      [70, 132],
      [38, 132],
    ],
    0xa2584e,
  );
  g.fillStyle(0xede0ab);
  g.fillCircle(49, 122, 3);
  g.fillStyle(0x647a72);
  g.fillRoundedRect(910, 209, 35, 33, 4);
  g.fillStyle(0xa1afa0);
  g.fillRect(904, 203, 14, 39);
  g.fillRect(941, 203, 14, 39);
  g.fillStyle(0xc4c5ab);
  g.fillRect(904, 201, 14, 8);
  g.fillRect(941, 201, 14, 8);
  polygon(
    g,
    [
      [901, 201],
      [911, 186],
      [921, 201],
    ],
    0x426d64,
  );
  polygon(
    g,
    [
      [938, 201],
      [948, 186],
      [958, 201],
    ],
    0x426d64,
  );
  scene.add
    .text(19, 195, "IN", {
      fontFamily: "sans-serif",
      fontSize: "10px",
      color: "#486443",
      fontStyle: "bold",
    })
    .setDepth(1);
  scene.add
    .text(912, 299, "HOME", {
      fontFamily: "sans-serif",
      fontSize: "10px",
      color: "#486443",
      fontStyle: "bold",
    })
    .setDepth(1);
}
