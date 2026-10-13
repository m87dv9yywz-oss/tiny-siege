import { TYPES } from "../progression/profiles.js";
// Flatten only the wire representation of XP. Local gameplay keeps earned/spent
// objects; primitive Firestore fields avoid expensive nested rule expansion.
export function cloudProfile(profile) {
  const towerXP = Object.fromEntries(
    TYPES.flatMap((t) => [
      [t + "Earned", profile.towerXP[t].earned],
      [t + "Spent", profile.towerXP[t].spent],
    ]),
  );
  return { ...profile, towerXP };
}
