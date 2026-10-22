import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { towerVisualMuzzle } from "../../src/data/towers.js";

// POST-FIX STILLS for the projectile-origin fix (2026-10-21).
// Companion to projectile-origin.spec.js (which asserts the same
// behavior numerically). These captures use the audit's method —
// canvas.toDataURL snapshots from a rAF loop registered after
// Phaser's, with the model state sampled on the same tick — and
// land in ~/workspace/ts-proof-art/qa/ as fix-*.png, with a
// fix-meta.json carrying each frame's declared muzzle and rendered
// shot position for the annotation pass (green cross = declared
// muzzle, red cross = rendered shot, the audit's convention).
const QA = `${process.env.HOME}/workspace/ts-proof-art/qa`;
mkdirSync(QA, { recursive: true });

async function ready(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
}
async function createProfile(page) {
  await page.locator("#new-profile").click();
  await page.locator("#nickname").fill("Origin Stills");
  await page.locator("#profile-form button").click();
}
async function enterFreePlay(page) {
  await page.locator("#play").click();
  await page.locator('[data-freeplay="classic"]').click();
}

async function setup(page) {
  await page.evaluate(() => {
    const { model: g } = window.__tinySiege;
    g.reset();
    g.gold = 1000000;
    const e = g.spawn("basic");
    e.speed = 0;
    e.health = 1e12;
    e.armor = 0;
    window.__proof = { enemyId: e.id, towerId: null };
    g.startWave();
    g.queue = [];
    const scan = (t) => {
      const trail = g.trails[0];
      const range = g.effectiveStats(t).range;
      const out = { park: null, left: null, right: null, any: null, close: null, closeD: Infinity, raised: null };
      for (let p = 40; p < 2400; p += 5) {
        const pos = trail.onPath(p);
        if (!pos || !Number.isFinite(pos.x)) continue;
        const d = Math.hypot(pos.x - t.x, pos.y - t.y);
        if (d > range + 40) { if (out.park === null) out.park = p; continue; }
        if (d < 55 || d > range - 10) continue;
        if (out.any === null) out.any = p;
        if (d < out.closeD) { out.closeD = d; out.close = p; }
        if (pos.x < t.x - 30 && out.left === null) out.left = p;
        if (pos.x > t.x + 30 && out.right === null) out.right = p;
        if (t.y - pos.y >= 90 && Math.abs(pos.x - t.x) <= 140 && out.raised === null) out.raised = p;
      }
      if (out.park !== null) {
        const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
        enemy.progress = out.park;
        Object.assign(enemy, trail.onPath(out.park));
      }
      return out;
    };
    window.__proof.build = (type, paths, upgrades, mustHave = ["left", "right"]) => {
      if (window.__proof.towerId != null) {
        g.sell(window.__proof.towerId);
        window.__proof.towerId = null;
      }
      let best = null;
      for (let y = 150; y <= 570 && !best; y += 12)
        for (let x = 70; x <= 1010 && !best; x += 12) {
          const t = g.place(type, x, y);
          if (!t) continue;
          const s = scan(t);
          if (mustHave.every((k) => s[k] !== null)) best = { t, s };
          else g.sell(t.id);
        }
      if (!best) throw new Error(`no placement found for ${type}`);
      const t = best.t;
      for (const p of upgrades) g.upgrade(t.id, p);
      if (t.paths.join("-") !== paths)
        throw new Error(`${type} ended at ${t.paths}, wanted ${paths}`);
      window.__proof.towerId = t.id;
      return { id: t.id, x: t.x, y: t.y, spots: scan(t) };
    };
    window.__proof.moveEnemy = (p) => {
      const enemy = g.enemies.find((e) => e.id === window.__proof.enemyId);
      enemy.progress = p;
      Object.assign(enemy, g.trails[0].onPath(p));
    };
  });
}

async function installCapture(page) {
  await page.evaluate(() => {
    const g = window.__tinySiege.model;
    const canvas = [...document.querySelectorAll("canvas")].sort(
      (a, b) => b.width * b.height - a.width * a.height,
    )[0];
    const A = (window.__fix = {
      canvasW: canvas.width,
      canvasH: canvas.height,
      watchId: null,
      group: null,
      seenProj: new Set(),
    });
    const snap = () => {
      const t = g.towers.find((tw) => tw.id === A.watchId);
      return {
        t: t
          ? { x: t.x, y: t.y, paths: [...t.paths], flip: !!t._mirrorFlip, pose: t._aimPose ?? null, aimFlip: !!t._aimFlip }
          : null,
        projs: g.projectiles
          .filter((p) => p.towerId === A.watchId)
          .map((p) => ({ id: p.id, draw: { x: p.draw?.x ?? p.x, y: p.draw?.y ?? p.y }, x: p.x, y: p.y })),
      };
    };
    const loop = () => {
      requestAnimationFrame(loop);
      if (A.watchId == null || A.done) return;
      if (!A.group) {
        const np = g.projectiles.find(
          (p) => p.towerId === A.watchId && !A.seenProj.has(p.id),
        );
        if (np) {
          A.seenProj.add(np.id);
          A.group = { projId: np.id, frames: [] };
        }
      }
      if (A.group) {
        A.group.frames.push({ img: canvas.toDataURL("image/png"), state: snap() });
        if (A.group.frames.length >= 5) A.done = true;
      }
    };
    requestAnimationFrame(loop);
  });
}

// Capture one firing sequence and write the wanted frames as
// fix-<label>-f<i>.png; returns metadata records for annotation.
async function capture(page, meta, opts) {
  const { label, type, state, upgrades = [], speed, side, frames, mustHave } = opts;
  const built = await page.evaluate(
    ({ type, state, upgrades, speed, side, mustHave }) => {
      const g = window.__tinySiege.model;
      g.speed = speed;
      const b = window.__proof.build(type, state, upgrades, mustHave);
      window.__fix.watchId = b.id;
      window.__fix.group = null;
      window.__fix.done = false;
      window.__proof.moveEnemy(b.spots[side] ?? b.spots.any);
      return b;
    },
    { type, state, upgrades, speed, side, mustHave },
  );
  await page.waitForFunction(() => window.__fix.done, null, { timeout: 45000 });
  const group = await page.evaluate((park) => {
    window.__proof.moveEnemy(park);
    window.__fix.watchId = null;
    return window.__fix.group;
  }, built.spots.park);
  const paths = state.split("-").map(Number);
  for (const i of frames) {
    const f = group.frames[i];
    if (!f) continue;
    const file = `fix-${label}-f${i}.png`;
    writeFileSync(`${QA}/${file}`, Buffer.from(f.img.replace(/^data:image\/png;base64,/, ""), "base64"));
    const st = f.state;
    const fake = st.t
      ? { type, paths, x: st.t.x, y: st.t.y, _mirrorFlip: st.t.flip, _aimPose: st.t.pose ?? undefined, _aimFlip: st.t.aimFlip }
      : null;
    const muzzle = fake ? towerVisualMuzzle(fake) : null;
    const proj = st.projs.find((p) => p.id === group.projId) ?? null;
    meta.push({
      file,
      label,
      type,
      state,
      tower: st.t,
      muzzle,
      proj: proj ? { draw: proj.draw, x: proj.x, y: proj.y } : null,
      distDrawToMuzzle:
        muzzle && proj
          ? +Math.hypot(proj.draw.x - muzzle.x, proj.draw.y - muzzle.y).toFixed(1)
          : null,
    });
  }
}

test("post-fix origin stills — archer, point-blank, cannon raised, frost", async ({ page }) => {
  test.setTimeout(300000);
  await page.setViewportSize({ width: 1600, height: 1050 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await createProfile(page);
  await enterFreePlay(page);
  await setup(page);
  await installCapture(page);
  const meta = [];
  await capture(page, meta, {
    label: "archer-0-0-0-right-1x",
    type: "archer", state: "0-0-0", speed: 1, side: "right", frames: [0, 1, 2],
  });
  await capture(page, meta, {
    label: "archer-0-0-0-right-4x",
    type: "archer", state: "0-0-0", speed: 4, side: "right", frames: [0],
  });
  await capture(page, meta, {
    label: "archer-0-0-0-pointblank-1x",
    type: "archer", state: "0-0-0", speed: 1, side: "close", frames: [0, 1, 2],
  });
  await capture(page, meta, {
    label: "cannon-0-0-0-raised-1x",
    type: "cannon", state: "0-0-0", speed: 1, side: "raised", frames: [0],
    mustHave: ["left", "right", "raised"],
  });
  await capture(page, meta, {
    label: "frost-0-0-3-right-1x",
    type: "frost", state: "0-0-3", upgrades: [2, 2, 2], speed: 1, side: "right", frames: [0],
  });
  writeFileSync(`${QA}/fix-meta.json`, JSON.stringify({ captures: meta, pageErrors: errors }, null, 2));
  expect(errors).toEqual([]);
});
