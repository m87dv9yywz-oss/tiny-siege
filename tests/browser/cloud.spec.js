import { test, expect } from "@playwright/test";
test.skip(
  !process.env.FIREBASE_EMULATORS,
  "Requires Auth/Firestore emulator suite",
);
async function login(page, sub) {
  await page.goto("./?emulators");
  await page.waitForFunction(() => window.__tinySiege?.ui.scene);
  await page.evaluate(async (sub) => {
    const k = window.__tinySiege.kingdom;
    await k.loadCloud();
    await k.cloud.adapter.credential(
      JSON.stringify({
        sub,
        email: sub + "@example.test",
        email_verified: true,
      }),
    );
  }, sub);
  await page.waitForFunction(() => window.__tinySiege.kingdom.cloud?.uid);
}
test("Google emulator credential, guest migration, two browser sessions, offline/reconnect and safe cloud account isolation", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const p = await a.newPage(),
    q = await b.newPage();
  await login(p, "parent-one");
  const guestId = await p.evaluate(async () => {
    const { profiles, kingdom } = window.__tinySiege;
    const id = profiles.create("Cloud Dragon");
    profiles.commit({
      id: "first-clear",
      type: "reward",
      map: "emerald",
      win: true,
      stars: 3,
      xp: { archer: 350 },
      stats: {},
    });
    await kingdom.cloud.importGuest(id);
    return id;
  });
  await login(q, "parent-one");
  await q.evaluate(async () => {
    const { profiles, kingdom } = window.__tinySiege;
    await kingdom.cloud.refresh();
    const id = Object.keys(profiles.data.profiles).find(
      (id) => profiles.data.profiles[id].owner === kingdom.cloud.uid,
    );
    profiles.select(id);
  });
  expect(
    await q.evaluate(() => window.__tinySiege.profiles.current.crowns),
  ).toBe(100);
  await a.setOffline(true);
  await p.evaluate(() =>
    window.__tinySiege.profiles.commit({
      id: "fire-offline",
      type: "tower",
      tower: "fire",
    }),
  );
  await p.evaluate(() => window.__tinySiege.kingdom.cloud.sync());
  expect(
    await p.evaluate(() => window.__tinySiege.profiles.current.crowns),
  ).toBe(25);
  expect(
    await q.evaluate(() => window.__tinySiege.profiles.current.crowns),
  ).toBe(100);
  await a.setOffline(false);
  await p.evaluate(() => window.__tinySiege.kingdom.cloud.sync());
  await expect
    .poll(() => p.evaluate(() => window.__tinySiege.kingdom.cloud.status))
    .toContain("Cloud saved");
  await q.evaluate(() => window.__tinySiege.kingdom.cloud.refresh());
  expect(
    await q.evaluate(() => window.__tinySiege.profiles.current.crowns),
  ).toBe(25);
  await q.evaluate(() =>
    window.__tinySiege.profiles.commit({
      id: "fire-repeat-device",
      type: "tower",
      tower: "fire",
    }),
  );
  await q.evaluate(() => window.__tinySiege.kingdom.cloud.sync());
  await p.evaluate(() => window.__tinySiege.kingdom.cloud.refresh());
  expect(
    await p.evaluate(() => window.__tinySiege.profiles.current.crowns),
  ).toBe(25);
  await p.evaluate(async (id) => {
    const { kingdom, profiles } = window.__tinySiege;
    const revision =
      profiles.data.profiles[profiles.data.selected].remoteRevision;
    await kingdom.cloud.importGuest(id, id, "merge", revision);
  }, guestId);
  expect(
    await p.evaluate(() => window.__tinySiege.profiles.current.crowns),
  ).toBe(25);
  await p.locator(".brand").click();
  await p.locator("#new-profile").click();
  await p.locator("#nickname").fill("Cloud Fox");
  await expect(p.locator("#profile-cloud")).toBeChecked();
  await p.locator("#profile-form button").click();
  await expect(p.locator(".profile-choice.chosen")).toContainText("Cloud Fox");
  expect(
    await p.evaluate(() => window.__tinySiege.profiles.current.crowns),
  ).toBe(0);
  await q.evaluate(() => window.__tinySiege.kingdom.cloud.refresh());
  expect(
    await q.evaluate(
      () =>
        window.__tinySiege.kingdom.visibleProfiles().filter(([, e]) => e.owner)
          .length,
    ),
  ).toBe(2);
  await login(q, "parent-two");
  await q.evaluate(() => window.__tinySiege.kingdom.cloud.refresh());
  expect(
    await q.evaluate(
      () =>
        window.__tinySiege.kingdom.visibleProfiles().filter(([, e]) => e.owner)
          .length,
    ),
  ).toBe(0);
  await a.close();
  await b.close();
});
