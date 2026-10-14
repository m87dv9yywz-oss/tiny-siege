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
      if (["grove","wind","rune"].includes(type)) continue;
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
    if(type==='crystal'||type==='crystalBoss') {
      polygon(g,[[x-r,y+2],[x-r*.7,y-r*1.1],[x,y-r*1.6],[x+r*.8,y-r],[x+r,y+3]],0xa5e4ed);
      g.lineStyle(2,0xf1fdff);g.lineBetween(x,y-r*1.5,x-3,y+4);g.lineBetween(x-r*.6,y-r*.8,x+r*.6,y-r*.4);
      if(type==='crystal') {g.lineStyle(3,0x567a91);for(const side of [-1,1])for(const dy of [-3,7,15])g.lineBetween(x+side*r*.6,y+dy,x+side*(r+7),y+dy+5);}
    }
    if(type==='ember'||type==='drake') {
      polygon(g,[[x-r*.5,y-r*.7],[x-r*.8,y-r*1.2],[x-r*.1,y-r],[x+r*.2,y-r*1.6],[x+r*.4,y-r*.8]],0xffda8b);
      if(type==='drake') {
        polygon(g,[[x-r*.5,y],[2,12],[6,46],[x-r*.7,y+12]],0xe58768);
        polygon(g,[[x+r*.5,y],[78,10],[73,48],[x+r*.7,y+12]],0xe58768);
        g.lineStyle(3,0xffce91);g.lineBetween(9,23,x-r*.5,y+5);g.lineBetween(71,22,x+r*.5,y+5);
      }
    }
    if (type==='boss') {
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
  evolutionArt(g);
  specialEnemies(g);
  groveArt(g);
  g.destroy();
}
export function battlefield(
  scene,
  trail = { PATH, distanceToPath },
  biome = "emerald",
) {
  const { PATH, distanceToPath } = trail;
  const palette =
    biome === "crystal" ? {0x76a77a:0x729fae,0x6b9c70:0x577e98,0x8ab787:0xa4c4cc,0x355e45:0x3c677d,0x477d52:0x718ba5,0x619558:0x9da9cc,0x89b46c:0xafd7d9} : biome === "coast" ? {0x76a77a:0xcbb58e,0x6b9c70:0xb99b82,0x8ab787:0xe4c597,0x355e45:0x725e64,0x477d52:0x8a7470,0x619558:0xb1967d,0x89b46c:0xe3bc91} : biome === "amber"
      ? {
          0x76a77a: 0xdcb876,
          0x6b9c70: 0xb99261,
          0x8ab787: 0xe6cf8e,
          0x355e45: 0x956d42,
          0x477d52: 0xb78343,
          0x619558: 0xdca14c,
          0x89b46c: 0xf4c969,
        }
      : biome === "moon"
        ? {
            0x76a77a: 0x778aa1,
            0x6b9c70: 0x61778b,
            0x8ab787: 0x93a6ac,
            0x355e45: 0x3e526c,
            0x477d52: 0x5c7188,
            0x619558: 0x82959b,
            0x89b46c: 0xb9cbd0,
          }
        : biome === "garden"
          ? {
              0x76a77a: 0x9dbb72,
              0x6b9c70: 0x8baa68,
              0x8ab787: 0xc6d788,
              0x355e45: 0x4b7241,
              0x477d52: 0x5e964d,
              0x619558: 0x8eb65c,
              0x89b46c: 0xe4d477,
            }
          : {};
  const childrenBefore = new Set(scene.children.list);
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(palette[0x76a77a] || 0x76a77a);
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
  if (biome === "garden") {
    for (let i = 0; i < 35; i++) {
      const x = 35 + random() * 890,
        y = 40 + random() * 540;
      if (distanceToPath(x, y) < 65) continue;
      g.lineStyle(3, 0x6b8944);
      g.lineBetween(x, y, x, y + 15);
      g.fillStyle(0xffdf76);
      for (let n = 0; n < 7; n++) {
        const a = (n * Math.PI * 2) / 7;
        g.fillCircle(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 4);
      }
      g.fillStyle(0x916e36);
      g.fillCircle(x, y, 4);
    }
  }
  if(biome==='coast') {g.fillStyle(0x66bdcd);g.fillCircle(450,100,80);g.fillStyle(0xffac67);g.fillEllipse(470,320,66,55);g.fillStyle(0xffdf8a);g.fillEllipse(470,320,30,22);g.fillStyle(0xa17972);g.fillCircle(810,475,24);g.fillStyle(0xffb273);g.fillCircle(810,475,14);}
  if(biome==='crystal') for(const [x,y] of [[60,290],[440,320],[840,330]]) {g.fillStyle(0x647b92);g.fillEllipse(x,y,72,54);polygon(g,[[x-20,y],[x-12,y-46],[x+7,y-58],[x+22,y]],0xa4dfea);}
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
    g.fillStyle(palette[0xb2a078] || 0xb2a078, 0.4);
    g.fillEllipse(
      p.x + (random() - 0.5) * 22,
      p.y + (random() - 0.5) * 22,
      4 + random() * 6,
      3,
    );
  }
  const tree = (x, y, s = 1) => {
    if(distanceToPath(x,y)<62)return;
    if(biome==='crystal') {
      polygon(g,[[x-18*s,y+8*s],[x-24*s,y-25*s],[x-7*s,y-52*s],[x+9*s,y-26*s],[x+13*s,y+8*s]],0x8bcfdf);
      polygon(g,[[x+9*s,y+8*s],[x+12*s,y-32*s],[x+27*s,y-45*s],[x+33*s,y-16*s],[x+28*s,y+8*s]],0xc49eee);
      g.lineStyle(3,0xe7fbff,.8);g.lineBetween(x-7*s,y-42*s,x-6*s,y);return;
    }
    if(biome==='coast') {
      g.fillStyle(0x655c63);g.fillEllipse(x,y,42*s,23*s);
      polygon(g,[[x-22*s,y],[x-9*s,y-35*s],[x+8*s,y-43*s],[x+25*s,y]],0x94797a);
      g.lineStyle(3,0xffb879);g.lineBetween(x-9*s,y-20*s,x+6*s,y-8*s);return;
    }
    g.fillStyle(palette[0x426a47] || 0x426a47, 0.25);
    g.fillEllipse(x + 5, y + 9, 48 * s, 20 * s);
    g.fillStyle(palette[0x806646] || 0x806646);
    g.fillRoundedRect(x - 5 * s, y - 30 * s, 10 * s, 38 * s, 3);
    g.fillStyle(palette[0x355e45] || 0x355e45);
    g.fillCircle(x, y - 36 * s, 26 * s);
    g.fillStyle(palette[0x477d52] || 0x477d52);
    g.fillCircle(x - 10 * s, y - 44 * s, 20 * s);
    g.fillCircle(x + 14 * s, y - 44 * s, 21 * s);
    g.fillStyle(palette[0x619558] || 0x619558);
    g.fillCircle(x - 2 * s, y - 57 * s, 22 * s);
    g.fillStyle(palette[0x89b46c] || 0x89b46c, 0.7);
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
      g.fillStyle(palette[0x496e4f] || 0x496e4f, 0.25);
      g.fillEllipse(x, y + 4, 25, 10);
      g.fillStyle(palette[0x80998b] || 0x80998b);
      g.fillRoundedRect(x - 11, y - 5, 22, 13, 5);
      g.fillStyle(palette[0xa9b8a0] || 0xa9b8a0);
      g.fillEllipse(x - 2, y - 4, 16, 7);
    } else if (i % 5 === 1) {
      g.fillStyle(palette[0xdacf9e] || 0xdacf9e);
      g.fillRect(x - 1, y, 3, 7);
      g.fillStyle(palette[0xd7836a] || 0xd7836a);
      g.fillEllipse(x, y, 12, 7);
      g.fillStyle(palette[0xf5e5bd] || 0xf5e5bd);
      g.fillCircle(x - 3, y - 1, 1.5);
      g.fillCircle(x + 3, y, 1);
    } else if (i % 5 === 2) {
      g.fillStyle(palette[0x548450] || 0x548450);
      g.fillCircle(x, y, 9);
      g.fillCircle(x + 7, y + 3, 7);
      g.fillStyle(palette[0x82ad65] || 0x82ad65);
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
  // Existing woodland pond stays off the new routes.
  if (!["crystal","coast"].includes(biome)) {
  // Pond, stepping stones, and tiny magical crystals.
  g.fillStyle(palette[0x558a72] || 0x558a72);
  g.fillEllipse(732, 298, 96, 75);
  g.fillStyle(palette[0x72b6b0] || 0x72b6b0);
  g.fillEllipse(732, 294, 84, 61);
  g.fillStyle(palette[0x9ed0bd] || 0x9ed0bd, 0.5);
  g.fillEllipse(725, 285, 55, 23);
  g.lineStyle(2, 0xb8e0c1, 0.5);
  g.lineBetween(709, 297, 731, 297);
  }
  g.lineBetween(736, 280, 751, 280);
  [
    [338, 344],
    [578, 531],
    [772, 205],
    [66, 437],
  ].forEach(([x, y]) => {
    g.fillStyle(palette[0x2f795e] || 0x2f795e, 0.22);
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
  // Entrance and home follow each map's shared spline.
  const entranceOffset = trail.onPath ? trail.onPath(65).y - 170 : 0;
  const homeOffset = trail.onPath
    ? trail.onPath(trail.PATH_LENGTH - 65).y - 270
    : 0;
  g.save();
  g.translateCanvas(0, entranceOffset);
  g.fillStyle(palette[0x715f45] || 0x715f45);
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
  g.fillStyle(palette[0xede0ab] || 0xede0ab);
  g.fillCircle(49, 122, 3);
  g.restore();
  g.save();
  g.translateCanvas(0, homeOffset);
  g.fillStyle(palette[0x647a72] || 0x647a72);
  g.fillRoundedRect(910, 209, 35, 33, 4);
  g.fillStyle(palette[0xa1afa0] || 0xa1afa0);
  g.fillRect(904, 203, 14, 39);
  g.fillRect(941, 203, 14, 39);
  g.fillStyle(palette[0xc4c5ab] || 0xc4c5ab);
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
  // Bake static illustration once: thousands of grass strokes need not be
  // tessellated and redrawn on the GPU every frame.
  if (scene.textures.exists("emerald-trail"))
    scene.textures.remove("emerald-trail");
  g.restore();
  g.generateTexture("emerald-trail", 960, 640);
  scene.add.image(0, 0, "emerald-trail").setOrigin(0).setDepth(0);
  g.destroy();
  scene.add
    .text(19, 195, "IN", {
      fontFamily: "sans-serif",
      fontSize: "10px",
      color: "#486443",
      fontStyle: "bold",
    })
    .setDepth(1);
  scene.add
    .text(912, 299 + homeOffset, "HOME", {
      fontFamily: "sans-serif",
      fontSize: "10px",
      color: "#486443",
      fontStyle: "bold",
    })
    .setDepth(1);
  return scene.children.list.filter((child) => !childrenBefore.has(child));
}
// Original layered fantasy architecture. Each specialization has its own weapon
// silhouette, materials and construction rather than a badge on the base sprite.
function evolutionArt(g) {
  const stone = (wide = 58) => {
    g.fillStyle(0x183e32, 0.25);
    g.fillEllipse(48, 86, wide + 18, 16);
    g.fillStyle(0x4d6863);
    g.fillRoundedRect(48 - wide / 2, 62, wide, 23, 5);
    g.fillStyle(0xb8c2a5);
    g.fillRoundedRect(48 - wide / 2, 60, wide, 12, 4);
    g.lineStyle(1, 0x6b8276);
    for (let x = 24; x < 78; x += 14) g.lineBetween(x, 73, x, 82);
    g.lineStyle(3, 0xe1bd74);
    g.lineBetween(48 - wide / 2, 64, 48 + wide / 2, 64);
  };
  const crystal = (x, y, size, color) => {
    polygon(
      g,
      [
        [x, y - size],
        [x + size * 0.6, y],
        [x, y + size],
        [x - size * 0.6, y],
      ],
      color,
    );
    polygon(
      g,
      [
        [x, y - size],
        [x, y + size],
        [x - size * 0.6, y],
      ],
      0xe4ffff,
    );
    g.lineStyle(1, 0xffffff, 0.7);
    g.lineBetween(x, y - size, x + size * 0.5, y);
  };
  const barrel = (x, y, w, h) => {
    g.fillStyle(0x344456);
    g.fillRoundedRect(x, y, w, h, 5);
    g.fillStyle(0x8795a0);
    g.fillRect(x + 3, y + 3, w * 0.25, h - 6);
    g.lineStyle(3, 0xdeb97b);
    g.lineBetween(x, y + h * 0.25, x + w, y + h * 0.25);
    g.fillStyle(0x1e303a);
    g.fillEllipse(x + w / 2, y, w, 10);
  };
  const flame = (x, y, size) => {
    polygon(
      g,
      [
        [x, y - size],
        [x + size * 0.2, y - size * 0.3],
        [x + size * 0.7, y - size * 0.6],
        [x + size * 0.5, y + size * 0.5],
        [x - size * 0.5, y + size * 0.5],
        [x - size * 0.65, y - size * 0.3],
        [x - size * 0.2, y],
      ],
      0xf57c45,
    );
    polygon(
      g,
      [
        [x, y - size * 0.7],
        [x + size * 0.28, y + size * 0.3],
        [x, y + size * 0.5],
        [x - size * 0.25, y + size * 0.2],
      ],
      0xffda78,
    );
  };
  for (const [type, def] of Object.entries(TOWERS))
    for (let p = 0; p < 3; p++)
      for (const tier of [2, 3]) {
        if (["grove","wind","rune"].includes(type)) continue;
        g.clear();
        const ultimate = tier === 3;
        stone(ultimate ? 68 : 52);
        if (type === "archer") {
          if (p === 0) {
            // Ballista: broad timber arms, metal limbs and central giant bolt.
            g.fillStyle(0x845c3d);
            g.fillRoundedRect(36, 40, 24, 25, 4);
            g.lineStyle(ultimate ? 9 : 6, 0x805233);
            g.lineBetween(13, 48, 48, 32);
            g.lineBetween(48, 32, 83, 48);
            g.lineStyle(3, 0xe0c58e);
            g.lineBetween(13, 48, 48, 59);
            g.lineBetween(48, 59, 83, 48);
            g.lineStyle(ultimate ? 7 : 4, 0x526574);
            g.lineBetween(48, 62, 48, 15);
            polygon(
              g,
              [
                [48, 8],
                [40, 23],
                [56, 23],
              ],
              0xffe3a1,
            );
            g.fillStyle(0xe5bc6a);
            [17, 78].forEach((x) => g.fillCircle(x, 46, 4));
          } else if (p === 1) {
            // Arrowstorm: twin green roofs and a rotating bow rack.
            for (const x of ultimate ? [25, 48, 71] : [32, 64]) {
              g.fillStyle(0x947444);
              g.fillRect(x - 7, 28, 14, 34);
              polygon(
                g,
                [
                  [x - 15, 30],
                  [x, 12],
                  [x + 15, 30],
                ],
                x === 48 ? 0xa2c877 : 0x5b995d,
              );
              g.lineStyle(3, 0xe8c47f);
              g.beginPath();
              g.arc(x, 44, 11, -1.2, 1.2);
              g.strokePath();
              g.lineStyle(1, 0xe8edba);
              g.lineBetween(x + 4, 34, x + 4, 54);
            }
          } else {
            // Sniper: tall watchtower and long gilded telescopic weapon.
            g.fillStyle(0x758779);
            g.fillRect(32, 29, 32, 35);
            g.fillStyle(0xc5c6a4);
            g.fillRect(33, 30, 8, 30);
            polygon(
              g,
              [
                [23, 30],
                [48, 7],
                [73, 30],
              ],
              0x32765d,
            );
            g.lineStyle(4, 0xe3c06e);
            g.lineBetween(24, 29, 73, 29);
            g.fillStyle(0x293d3a);
            g.fillRoundedRect(40, 36, 15, 21, 3);
            g.lineStyle(ultimate ? 7 : 4, 0xe2bd63);
            g.lineBetween(43, 45, 82, 20);
            g.fillStyle(0x80d9d4);
            g.fillCircle(66, 30, 5);
          }
        } else if (type === "cannon") {
          g.fillStyle(0x6b5240);
          g.fillRect(23, 48, 50, 17);
          g.fillStyle(0xd2b477);
          [26, 70].forEach((x) => {
            g.fillCircle(x, 62, 10);
            g.fillStyle(0x53616a);
            g.fillCircle(x, 62, 5);
            g.fillStyle(0xd2b477);
          });
          if (p === 0) {
            barrel(29, 22, 38, 39);
            g.fillStyle(0xa2b5ae);
            g.fillTriangle(18, 55, 24, 24, 31, 55);
            g.fillTriangle(65, 55, 72, 24, 80, 55);
            if (ultimate) {
              g.lineStyle(5, 0xe9ca87);
              g.strokeRoundedRect(29, 27, 38, 23, 4);
            }
          }
          if (p === 1) {
            for (const [x, y] of ultimate
              ? [
                  [26, 29],
                  [47, 19],
                  [66, 30],
                ]
              : [
                  [34, 27],
                  [57, 25],
                ])
              barrel(x - 8, y, 17, 30);
            g.fillStyle(0xf0ae57);
            g.fillCircle(47, 47, 7);
          }
          if (p === 2) {
            barrel(31, ultimate ? 10 : 22, 34, 42);
            g.fillStyle(0xbca984);
            g.fillRect(20, 49, 8, 15);
            g.fillRect(68, 49, 8, 15);
            g.lineStyle(3, 0xf0d391);
            g.lineBetween(21, 48, 14, 60);
            g.lineBetween(76, 48, 83, 60);
          }
        } else if (type === "frost") {
          if (p === 0) {
            for (const [x, y, z] of [
              [27, 48, 17],
              [69, 48, 17],
              [48, 32, ultimate ? 30 : 23],
            ])
              crystal(x, y, z, 0x72cced);
            g.lineStyle(2, 0xa6f4f1);
            g.strokeEllipse(48, 54, 68, 22);
          }
          if (p === 1) {
            g.fillStyle(0x566e87);
            g.fillRect(35, 36, 26, 27);
            for (let i = 0; i < (ultimate ? 7 : 4); i++) {
              const a = (i * Math.PI * 2) / (ultimate ? 7 : 4);
              crystal(
                48 + Math.cos(a) * 24,
                34 + Math.sin(a) * 20,
                11,
                0x94cff4,
              );
            }
            crystal(48, 37, 13, 0x7b9fea);
          }
          if (p === 2) {
            g.fillStyle(0x739cac);
            g.fillRoundedRect(27, 32, 42, 30, 4);
            polygon(
              g,
              [
                [19, 34],
                [48, 12],
                [77, 34],
              ],
              0xd8f6ef,
            );
            g.fillStyle(0x4e709a);
            g.fillRect(41, 41, 14, 21);
            crystal(48, 22, 12, 0x8ce4dc);
            if (ultimate) {
              g.lineStyle(3, 0xb8f3ed);
              g.strokeEllipse(48, 57, 85, 30);
              g.fillStyle(0xdef7ee);
              g.fillCircle(14, 33, 5);
              g.fillCircle(82, 33, 5);
            }
          }
        } else if (type === "fire") {
          if (p === 0) {
            g.fillStyle(0x6d5260);
            g.fillRect(35, 20, 26, 43);
            g.fillStyle(0xcda16b);
            g.fillRect(37, 23, 7, 38);
            g.fillStyle(0xb4684d);
            g.fillRect(29, 39, 38, 7);
            flame(48, ultimate ? 15 : 28, ultimate ? 24 : 17);
          }
          if (p === 1) {
            g.fillStyle(0x895947);
            g.fillRoundedRect(23, 44, 50, 20, 6);
            for (const [x, y] of [
              [26, 32],
              [48, 25],
              [70, 32],
            ]) {
              g.fillStyle(0xc49466);
              g.fillRect(x - 5, y, 10, 30);
              flame(x, y, ultimate ? 18 : 12);
            }
            g.lineStyle(2, 0xffb75d);
            g.strokeEllipse(48, 49, 74, 20);
          }
          if (p === 2) {
            polygon(
              g,
              [
                [15, 64],
                [30, 23],
                [64, 23],
                [83, 64],
              ],
              0x5d4e57,
            );
            polygon(
              g,
              [
                [30, 23],
                [47, 36],
                [64, 23],
                [57, 45],
                [40, 45],
              ],
              0xee8c4e,
            );
            g.fillStyle(0xffb948);
            g.fillEllipse(47, 25, 35, 14);
            g.lineStyle(4, 0xf89847);
            g.lineBetween(46, 43, 37, 58);
            g.lineBetween(61, 42, 64, 63);
            if (ultimate) flame(48, 16, 18);
          }
        } else {
          g.fillStyle(0x66678b);
          g.fillRect(33, 36, 30, 27);
          g.fillStyle(0xd9b67b);
          g.fillRect(30, 55, 36, 6);
          if (p === 0) {
            for (const x of [21, 48, 75]) {
              g.lineStyle(4, 0xa995c6);
              g.lineBetween(x, 54, x, 21);
              g.fillStyle(0xe4bc68);
              g.fillCircle(x, 22, 7);
            }
            g.lineStyle(2, 0xc7b4ff);
            g.lineBetween(21, 22, 48, 10);
            g.lineBetween(48, 10, 75, 22);
            crystal(48, 29, ultimate ? 19 : 13, 0xad8aeb);
          }
          if (p === 1) {
            g.lineStyle(ultimate ? 6 : 4, 0xdab96e);
            g.strokeCircle(48, 27, 24);
            g.fillStyle(0x71619d);
            g.fillCircle(48, 27, 17);
            polygon(
              g,
              [
                [52, 4],
                [34, 31],
                [46, 29],
                [40, 52],
                [64, 20],
                [50, 24],
              ],
              0xffefb7,
            );
          }
          if (p === 2) {
            g.lineStyle(3, 0xaa92de);
            g.strokeEllipse(48, 32, 72, 44);
            for (let i = 0; i < (ultimate ? 5 : 3); i++) {
              const a = (i * Math.PI * 2) / (ultimate ? 5 : 3);
              crystal(
                48 + Math.cos(a) * 30,
                30 + Math.sin(a) * 20,
                9,
                0xc8a1f1,
              );
            }
            g.fillStyle(0xeee0ff);
            g.fillCircle(48, 31, 11);
            g.fillStyle(0x9b7ddd);
            g.fillCircle(48, 31, 7);
          }
        }
        if (ultimate) {
          g.fillStyle(0xffebae);
          g.fillCircle(19, 70, 3);
          g.fillCircle(77, 70, 3);
        }
        g.generateTexture(`evolution-${type}-${p}-${tier}`, 96, 100);
      }
}
function specialEnemies(g) {
  // Distinct silhouettes for every new enemy; armor states are actual textures.
  for (const type of [
    "sprout",
    "shard",
    "healer",
    "warden",
    "wraith",
    "armored",
  ])
    for (const state of ["intact", "cracked", "broken"]) {
      g.clear();
      const def = ENEMIES[type],
        x = 40,
        y = 40,
        r = def.radius;
      g.fillStyle(0x234839, 0.25);
      g.fillEllipse(x, 65, r * 2.8, 9);
      if (type === "sprout") {
        g.fillStyle(0x66994a);
        g.fillEllipse(x, 50, 12, 15);
        polygon(
          g,
          [
            [40, 41],
            [24, 28],
            [39, 31],
            [43, 18],
            [50, 32],
          ],
          0xb8df79,
        );
      } else if (type === "shard") {
        for (const [dx, dy, z] of [
          [-10, 0, 15],
          [9, 2, 17],
          [0, -12, 22],
        ]) {
          polygon(
            g,
            [
              [x + dx, y + dy - z],
              [x + dx + 11, y + dy],
              [x + dx, y + dy + 17],
              [x + dx - 10, y + dy],
            ],
            0x70c6b5,
          );
          polygon(
            g,
            [
              [x + dx, y + dy - z],
              [x + dx, y + dy + 17],
              [x + dx - 10, y + dy],
            ],
            0xd2efc3,
          );
        }
      } else if (type === "healer") {
        polygon(
          g,
          [
            [27, 30],
            [53, 30],
            [60, 63],
            [20, 63],
          ],
          0x34806c,
        );
        g.fillStyle(0xabe2a8);
        g.fillCircle(x, 30, 13);
        polygon(
          g,
          [
            [22, 27],
            [40, 9],
            [58, 27],
          ],
          0x57b278,
        );
        g.lineStyle(4, 0x947045);
        g.lineBetween(60, 32, 61, 65);
        g.fillStyle(0xd1ed9f);
        g.fillCircle(60, 27, 7);
        g.lineStyle(2, 0xe9f4c4);
        g.lineBetween(60, 22, 60, 32);
        g.lineBetween(55, 27, 65, 27);
      } else if (type === "wraith") {
        polygon(
          g,
          [
            [24, 36],
            [28, 22],
            [40, 12],
            [52, 22],
            [56, 36],
            [62, 67],
            [48, 59],
            [39, 68],
            [32, 58],
            [20, 66],
          ],
          0x9a77c3,
        );
        g.fillStyle(0xe1d3f4, 0.6);
        g.fillEllipse(36, 32, 18, 23);
      } else {
        g.fillStyle(type === "warden" ? 0x476a99 : 0x72828f);
        g.fillRoundedRect(23, 27, 34, 31, 6);
        g.fillStyle(0x78966f);
        g.fillCircle(40, 28, 13);
        g.fillStyle(0xd0d3ae);
        g.fillRoundedRect(22, 53, 12, 10, 3);
        g.fillRoundedRect(46, 53, 12, 10, 3);
        if (state !== "broken") {
          g.fillStyle(type === "warden" ? 0x83c5eb : 0xadbcc2);
          g.fillRoundedRect(21, 13, 38, 18, 5);
          polygon(
            g,
            [
              [13, 34],
              [33, 34],
              [33, 52],
              [23, 63],
              [13, 52],
            ],
            type === "warden" ? 0x7ec4ed : 0x94a8b5,
          );
          g.lineStyle(2, 0xe4efcf);
          g.lineBetween(16, 39, 30, 39);
          if (state === "cracked") {
            g.lineStyle(2, 0x34484f);
            g.lineBetween(29, 15, 35, 22);
            g.lineBetween(35, 22, 31, 29);
            g.lineBetween(22, 35, 18, 45);
            g.lineBetween(18, 45, 26, 52);
          }
        } else {
          g.fillStyle(0xa4c67d);
          g.fillCircle(40, 19, 5);
        }
      }
      g.fillStyle(0x263848);
      g.fillEllipse(x - 5, y - 3, 3, 5);
      g.fillEllipse(x + 5, y - 3, 3, 5);
      g.fillStyle(0xfff4d7);
      g.fillCircle(x - 5, y - 4, 1);
      g.fillCircle(x + 5, y - 4, 1);
      g.generateTexture(`enemy-${type}-${state}`, 80, 85);
    }
}

function groveArt(g) {
  const draw = (path, tier, key) => {
    g.clear();
    const ultimate = tier === 3;
    g.fillStyle(0x315444, 0.25);
    g.fillEllipse(48, 88, 78, 17);
    g.fillStyle(0x69805b);
    g.fillRoundedRect(17, 68, 62, 20, 7);
    g.fillStyle(0xc5c697);
    g.fillRoundedRect(17, 66, 62, 10, 5);
    g.lineStyle(ultimate ? 14 : 10, 0x805733);
    g.lineBetween(48, 72, 48, 30);
    g.lineStyle(3, 0xc09759);
    g.lineBetween(45, 67, 43, 35);
    if (path === 0) {
      g.lineStyle(ultimate ? 9 : 6, 0x537347);
      g.lineBetween(48, 52, 15, 30);
      g.lineBetween(48, 52, 81, 30);
      g.fillStyle(0xe68598);
      for (const x of [15, 48, 81]) {
        g.fillCircle(x, x === 48 ? 22 : 30, ultimate ? 10 : 7);
        g.fillStyle(0xf7bec2);
        g.fillCircle(x - 2, x === 48 ? 19 : 27, 4);
        g.fillStyle(0xe68598);
      }
      g.fillStyle(0xf7dfac);
      g.fillTriangle(48, 3, 41, 22, 55, 22);
      if (ultimate) {
        g.lineStyle(4, 0xabbb82);
        g.lineBetween(14, 62, 48, 39);
        g.lineBetween(82, 62, 48, 39);
        g.fillStyle(0xe86986);
        g.fillTriangle(13, 22, 8, 37, 21, 37);
        g.fillTriangle(83, 22, 75, 37, 90, 37);
      }
    } else if (path === 1) {
      g.fillStyle(0x649b54);
      g.fillEllipse(48, 30, ultimate ? 79 : 60, 44);
      g.fillStyle(0x91c46c);
      g.fillEllipse(36, 23, 45, 31);
      g.fillEllipse(68, 28, 36, 30);
      g.fillStyle(0xf5d36d);
      for (const [x, y] of [
        [26, 30],
        [48, 18],
        [70, 30],
      ])
        g.fillEllipse(x, y, ultimate ? 17 : 12, 20);
      g.lineStyle(3, 0xffefaa);
      g.strokeCircle(48, 18, ultimate ? 9 : 6);
      if (ultimate) {
        g.fillStyle(0x9b7141);
        g.fillRoundedRect(27, 47, 43, 16, 5);
        g.fillStyle(0xffe188);
        g.fillEllipse(48, 51, 26, 12);
      }
    } else {
      g.lineStyle(7, 0x7a5838);
      g.lineBetween(47, 61, 18, 40);
      g.lineBetween(50, 58, 78, 36);
      g.fillStyle(0x498864);
      g.fillEllipse(48, 22, ultimate ? 75 : 56, 35);
      g.fillStyle(0x79bc82);
      g.fillEllipse(33, 16, 43, 27);
      g.fillStyle(0xd2f3b0);
      g.fillEllipse(40, 45, 5, 8);
      g.fillEllipse(57, 45, 5, 8);
      g.lineStyle(2, 0x365547);
      g.lineBetween(42, 56, 55, 56);
      if (ultimate) {
        g.lineStyle(5, 0xa5c98d);
        for (const x of [14, 27, 68, 82]) g.lineBetween(48, 73, x, 85);
        g.fillStyle(0xbeefac);
        g.fillCircle(17, 30, 5);
        g.fillCircle(78, 25, 5);
      }
    }
    g.generateTexture(key, 96, 100);
  };
  for (let tier = 1; tier <= 3; tier++) draw(2, tier, `tower-grove-${tier}`);
  for (let path = 0; path < 3; path++)
    for (const tier of [2, 3])
      draw(path, tier, `evolution-grove-${path}-${tier}`);
}
