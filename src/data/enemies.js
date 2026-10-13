const enemy = (name, health, speed, reward, radius, color, extra = {}) => ({
  name,
  health,
  speed,
  reward,
  radius,
  color,
  armor: 0,
  lives: 1,
  ...extra,
});
export const ENEMIES = {
  basic: enemy("Mossling", 32, 52, 9, 12, 0x88c65c),
  runner: enemy("Fleetfoot", 46, 100, 11, 11, 0xf3cf69),
  sprout: enemy("Sproutling", 18, 78, 4, 7, 0xb1dd71),
  armored: enemy("Ironbound", 115, 43, 22, 15, 0xa5b5c3, {
    armor: 80,
    lives: 2,
  }),
  shard: enemy("Shardling", 140, 54, 20, 15, 0x74cbb8, { split: 3 }),
  brute: enemy("Ember Brute", 340, 39, 30, 19, 0xe17b72, { lives: 3 }),
  healer: enemy("Grove Healer", 175, 48, 26, 14, 0x5cce91, {
    heal: 28,
    abilityRange: 125,
    abilityPeriod: 3,
  }),
  warden: enemy("Shield Warden", 260, 42, 40, 18, 0x74a7d2, {
    shield: 120,
    protection: 0.3,
    abilityRange: 125,
    lives: 2,
  }),
  wraith: enemy("Moon Wraith", 110, 66, 24, 14, 0xaf87dd, {
    magicResistance: 0.6,
  }),
  boss: enemy("The Thorn King", 18000, 29, 500, 30, 0x9c79be, {
    lives: 20,
    abilityPeriod: 8,
    controlResistance: 0.65,
  }),
};
