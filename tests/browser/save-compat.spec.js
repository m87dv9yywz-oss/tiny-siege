import { test, expect } from "@playwright/test";
import { freshProfile } from "../../src/progression/profiles.js";

// Regression (live incident 2026-10-16): a save written before a tower
// launches — same schema 3, fewer tower entries — must still boot with
// its progress intact. Deleting the newest tower from a current profile
// reproduces exactly what the previous release stored.
test("a save written before the Tidecaller still loads", async ({ page }) => {
  const p = freshProfile("Veteran");
  p.crowns = 1234;
  p.towerXP.archer = { earned: 900, spent: 680 };
  delete p.towerXP.tidecaller;
  delete p.unlockedUpgrades.tidecaller;
  const save = JSON.stringify({
    version: 1,
    selected: "hero1",
    profiles: {
      hero1: { profile: p, pending: [], remoteRevision: null },
    },
    cloud: {},
  });
  await page.addInitScript(
    (s) => localStorage.setItem("tiny-siege-profiles-v3", s),
    save,
  );
  await page.goto("./");
  await page.waitForFunction(() => window.__tinySiege?.ui);
  await expect(page.locator("body")).not.toContainText(
    "could not be loaded",
  );
  const state = await page.evaluate(() => {
    const store = window.__tinySiege.profiles;
    return {
      warning: store.warning,
      nickname: store.current?.nickname,
      crowns: store.current?.crowns,
      tidecaller: store.current?.towerXP?.tidecaller,
    };
  });
  expect(state.warning).toBe("");
  expect(state.nickname).toBe("Veteran");
  expect(state.crowns).toBe(1234);
  expect(state.tidecaller).toEqual({ earned: 0, spent: 0 });
});
