import { test, expect } from "@playwright/test";
const viewports = [
  [375, 812],
  [390, 844],
  [844, 390],
  [768, 1024],
  [1024, 768],
  [1280, 720],
  [1440, 900],
];
async function open(page) {
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene?.dynamic);
  await page.locator("#play").click();
}
async function point(page, x, y) {
  const b = await page.locator("canvas").boundingBox();
  return { x: b.x + (x / 960) * b.width, y: b.y + (y / 640) * b.height };
}
async function tapMap(page, x, y) {
  const p = await point(page, x, y);
  await page.touchscreen.tap(p.x, p.y);
}
for (const [width, height] of viewports)
  test(`${width}×${height}: map proportions, touch placement, upgrades and controls fit`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewportSize({ width, height });
    await open(page);
    await expect
      .poll(async () => {
        const b = await page.locator("canvas").boundingBox();
        return Math.abs(b.width / b.height - 1.5);
      })
      .toBeLessThan(0.01);
    const scroll = await page.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
    }));
    expect(scroll.w).toBeLessThanOrEqual(width);
    expect(scroll.h).toBeLessThanOrEqual(height);
    await page.locator("#battle-settings summary").tap();
    for (const q of [
      "#start-wave",
      "#pause",
      "#speed",
      "#mute",
      "#help-button",
      '[data-tower="lightning"]',
    ]) {
      const b = await page.locator(q).boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width + 0.1);
      expect(b.y + b.height).toBeLessThanOrEqual(height + 0.1);
    }
    await page.locator("#battle-settings summary").tap();
    await page.locator('[data-tower="archer"]').tap();
    expect(await page.evaluate(() => window.__tinySiege.model.gold)).toBe(300);
    // Placement panel must leave the upper trail usable in every orientation.
    await tapMap(page, 145, 105);
    await expect(page.locator("#gold")).toHaveText("225");
    const pos = await page.evaluate(() => window.__tinySiege.model.towers[0]);
    expect(Math.abs(pos.x - 145)).toBeLessThan(1);
    expect(Math.abs(pos.y - 105)).toBeLessThan(1);
    await page.locator('[data-upgrade="0"]').tap();
    await expect(page.locator("#gold")).toHaveText("125");
    const canvasOpen = await page.locator("canvas").boundingBox(),
      fieldOpen = await page.locator("#game").boundingBox();
    expect(canvasOpen.x).toBeGreaterThanOrEqual(fieldOpen.x - 0.5);
    expect(canvasOpen.y).toBeGreaterThanOrEqual(fieldOpen.y - 0.5);
    expect(canvasOpen.x + canvasOpen.width).toBeLessThanOrEqual(
      fieldOpen.x + fieldOpen.width + 0.5,
    );
    expect(canvasOpen.y + canvasOpen.height).toBeLessThanOrEqual(
      fieldOpen.y + fieldOpen.height + 0.5,
    );
    await page.locator("#targeting").selectOption("STRONG");
    expect(
      await page.evaluate(() => window.__tinySiege.model.towers[0].targeting),
    ).toBe("STRONG");
    await page.screenshot({
      path: `test-results/upgrade-${width}x${height}.png`,
    });
    await page.locator("#close-panel").tap();
    await tapMap(page, 145, 105);
    await expect(page.locator("#selection-panel")).toBeVisible();
    await page.locator('[data-upgrade="1"]').tap();
    await expect(page.locator("#gold")).toHaveText("25");
    await expect(page.locator('[data-upgrade="2"]')).toContainText(
      "Only two paths",
    );
    await page.locator("#close-panel").tap();
    await page.locator("#pause").tap();
    await expect(page.locator("#pause")).toContainText("Resume");
    await page.locator("#pause").tap();
    await page.locator("#speed").tap();
    await expect(page.locator("#speed")).toContainText("2×");
    await page.screenshot({
      path: `test-results/layout-${width}x${height}.png`,
    });
    await tapMap(page, 145, 105);
    await page.locator("#sell").tap();
    await expect(page.locator("#gold")).toHaveText("217");
    await page.locator("#leave-run").tap();
    await page.locator("#restart").tap();
    await page.locator("#confirm-restart").tap();
    await expect(page.locator("#gold")).toHaveText("300");
    expect(errors).toEqual([]);
  });
test("touch drag has an above-finger preview, validates terrain and purchases exactly once", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 844, height: 390 });
  await open(page);
  const session = await page.context().newCDPSession(page);
  async function drag(x, y) {
    const b = await page.locator('[data-tower="archer"]').boundingBox(),
      end = await point(page, x, y);
    const start = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [start],
    });
    for (let i = 1; i <= 8; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * i) / 8,
            y: start.y + ((end.y + 32 - start.y) * i) / 8,
          },
        ],
      });
    await page.waitForFunction(
      ({ x, y }) => {
        const p = window.__tinySiege?.ui.drag?.point;
        return p && Math.abs(p.x - x) < 1 && Math.abs(p.y - y) < 1;
      },
      { x, y },
    );
    const preview = await page.evaluate(
      () => window.__tinySiege?.ui.drag?.point,
    );
    expect(Math.abs(preview.x - x)).toBeLessThan(1);
    expect(Math.abs(preview.y - y)).toBeLessThan(1);
    await page.screenshot({ path: `test-results/drag-${x}-${y}.png` });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  }
  await drag(150, 170);
  await expect(page.locator("#gold")).toHaveText("300");
  await expect(page.locator("#toast")).toContainText("trail clear");
  await page.locator("#cancel").tap();
  await drag(145, 105);
  await expect(page.locator("#gold")).toHaveText("225");
  expect(
    await page.evaluate(() => window.__tinySiege.model.towers.length),
  ).toBe(1);
  await page.locator("#close-panel").tap();
  await page.locator('[data-tower="cannon"]').tap();
  await page.locator("#cancel").tap();
  await tapMap(page, 342, 263);
  await expect(page.locator("#gold")).toHaveText("225");
});
test("rotation retains the campaign and accurately maps touch coordinates", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.locator('[data-tower="archer"]').tap();
  await tapMap(page, 145, 105);
  await page.locator("#close-panel").tap();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(
    () =>
      Math.abs(
        window.__tinySiege.game.scale.parentSize.width -
          document.querySelector("#game").clientWidth,
      ) < 2,
  );
  await page.locator('[data-tower="cannon"]').tap();
  await tapMap(page, 342, 263);
  await expect(page.locator("#gold")).toHaveText("65");
  const t = await page.evaluate(() => window.__tinySiege.model.towers.at(-1));
  expect(Math.abs(t.x - 342)).toBeLessThan(1);
  expect(Math.abs(t.y - 263)).toBeLessThan(1);
});
test("all eighteen ultimate silhouettes and a busy magical battlefield render with bounded effects", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  const art = await page.evaluate(async () => {
    const { model: g, ui } = window.__tinySiege,
      types = [
        "archer",
        "cannon",
        "frost",
        "fire",
        "lightning",
        "grove",
        "wind",
        "rune",
      ],
      art = [];
    g.gold = 100000;
    for (const type of types)
      for (let p = 0; p < 3; p++) {
        let t;
        for (let y = 80; y < 590 && !t; y += 55)
          for (let x = 70; x < 900 && !t; x += 55)
            if (!g.canPlace(type, x, y)) t = g.place(type, x, y);
        if (!t) throw Error("No legal test placement");
        for (let n = 0; n < 3; n++) g.upgrade(t.id, p);
        const key =
          type === "archer"
            ? `v5-archer-${t.paths.map((n) => Math.min(n, 2)).join("-")}`
            : `evolution-${type}-${p}-3`;
        art.push({
          name: ui.scene.textures.getBase64(key),
          label: type + " " + ["A", "B", "C"][p],
        });
      }
    g.wave = 19;
    g.startWave();
    for (let i = 0; i < 100; i++) {
      const e = g.spawn(
        ["warden", "healer", "armored", "shard", "wraith", "brute"][i % 6],
      );
      e.progress = 100 + i * 16;
    }
    const path = await import("/tiny-siege/src/data/map.js");
    for (const e of g.enemies) Object.assign(e, path.onPath(e.progress));
    return art;
  });
  expect(new Set(art.map((a) => a.name)).size).toBe(24);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "test-results/evolution-combat.png" });
  const samples = await page.evaluate(async () => {
    const { ui, model } = window.__tinySiege;
    const delta = [];
    let last = performance.now();
    for (let i = 0; i < 30; i++) {
      await new Promise(requestAnimationFrame);
      const now = performance.now();
      delta.push(now - last);
      last = now;
    }
    return {
      frames: delta,
      effects: ui.scene.effects.length,
      particles: Object.values(ui.scene.particles).map((p) =>
        p.getAliveParticleCount(),
      ),
      enemies: model.enemies.length,
      projectiles: model.projectiles.length,
    };
  });
  expect(samples.effects).toBeLessThanOrEqual(100);
  expect(samples.particles.every((n) => n <= 100)).toBe(true);
  expect(samples.projectiles).toBeLessThan(200);
  expect(samples.frames.every((n) => Number.isFinite(n))).toBe(true);
  await page.evaluate((art) => {
    window.__tinySiege.model.paused = true;
    const sheet = document.createElement("div");
    sheet.id = "art-sheet";
    sheet.style =
      "position:fixed;inset:0;z-index:20;background:#213f3c;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(8,1fr);gap:8px;padding:15px";
    sheet.innerHTML = art
      .map(
        (a) =>
          `<div style="display:flex;align-items:center;justify-content:center;color:#f6dfb4;font:20px Georgia;border:1px solid #597b6b"><img src="${a.name}" style="width:110px;height:115px;object-fit:contain">${a.label}</div>`,
      )
      .join("");
    document.body.append(sheet);
  }, art);
  await page.screenshot({ path: "test-results/twenty-four-evolutions.png" });
  expect(errors).toEqual([]);
  console.log(
    "Headless Canvas stress sample:",
    JSON.stringify({
      ...samples,
      frames: undefined,
      medianFrameMs: samples.frames.sort((a, b) => a - b)[15],
    }),
  );
});
test("home-screen metadata and actual PNG icon sizes load beneath the Pages base", async ({
  page,
}) => {
  await open(page);
  const info = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    const m = await fetch(link.href).then((r) => r.json());
    const sizes = [];
    for (const path of [
      "apple-touch-icon.png",
      "icon-192.png",
      "icon-512.png",
      "maskable-512.png",
      "favicon.png",
    ]) {
      const img = new Image();
      img.src = new URL("icons/" + path, location.href);
      await img.decode();
      sizes.push([img.naturalWidth, img.naturalHeight]);
    }
    return {
      m,
      sizes,
      apple: document.querySelector('link[rel="apple-touch-icon"]').href,
    };
  });
  expect(info.sizes).toEqual([
    [180, 180],
    [192, 192],
    [512, 512],
    [512, 512],
    [32, 32],
  ]);
  expect(info.m.display).toBe("standalone");
  expect(info.m.start_url).toBe("/tiny-siege/");
  expect(info.apple).toContain("/tiny-siege/icons/");
});
