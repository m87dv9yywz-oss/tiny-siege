import { HEROES, heroLevel } from "../data/heroes.js";
import { heroStage } from "../heroArtwork.js";
import { OBSTACLES } from "../data/map.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function heroStart(game, type, xp = 0) {
  if (!HEROES[type]) return null;
  for (let y = 105; y < 580; y += 45)
    for (let x = 100; x < 900; x += 45)
      if (validDestination(game, x, y))
        return {
          type,
          x,
          y,
          destination: null,
          route: [],
          level: heroLevel(xp),
          cooldown: 0,
          abilityLeft: 0,
          moveLeft: 0,
          attacks: 0,
          damage: 0,
        };
  return null;
}
export function validDestination(game, x, y) {
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= 30 &&
    x <= 930 &&
    y >= 55 &&
    y <= 610 &&
    Math.min(...game.trails.map((t) => t.distanceToPath(x, y))) > 32 &&
    !(OBSTACLES[game.campaign.id] || []).some(
      (o) => Math.hypot(o.x - x, o.y - y) < o.r + 14,
    )
  );
}
function navigation(game, hero, dest) {
  if (hero.type === "dragon") return [dest];
  const walk = (x, y) =>
    x >= 20 &&
    x <= 940 &&
    y >= 35 &&
    y <= 620 &&
    !(OBSTACLES[game.campaign.id] || []).some(
      (o) => Math.hypot(o.x - x, o.y - y) < o.r + 14,
    );
  const clear = (a, b) => {
    const n = Math.ceil(distance(a, b) / 12);
    for (let i = 0; i <= n; i++)
      if (!walk(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n))
        return false;
    return true;
  };
  if (clear(hero, dest)) return [dest];
  const cells = [];
  for (let y = 60; y <= 600; y += 30)
    for (let x = 30; x <= 930; x += 30) if (walk(x, y)) cells.push({ x, y });
  const nearest = (p) =>
    cells
      .filter((c) => clear(p, c))
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
  const start = nearest(hero),
    end = nearest(dest);
  if (!start || !end) return null;
  const queue = [start],
    parent = new Map([[start, null]]);
  for (let index = 0; index < queue.length && !parent.has(end); index++)
    for (const next of cells)
      if (
        !parent.has(next) &&
        distance(queue[index], next) <= 43 &&
        clear(queue[index], next)
      ) {
        parent.set(next, queue[index]);
        queue.push(next);
      }
  if (!parent.has(end)) return null;
  const result = [dest];
  for (let c = end; c; c = parent.get(c)) result.unshift({ x: c.x, y: c.y });
  return result;
}
export function moveHero(game, x, y) {
  const h = game.hero;
  if (
    !h ||
    game.paused ||
    game.ended ||
    h.moveLeft > 0 ||
    !validDestination(game, x, y)
  )
    return false;
  const route = navigation(game, h, { x, y });
  if (!route) return false;
  h.route = route;
  h.destination = { x, y };
  h.moveLeft = 0.6;
  game.emit("heroMove", { hero: h });
  return true;
}
export function heroAttack(game, ability = false) {
  const h = game.hero,
    def = HEROES[h?.type];
  if (
    !h ||
    game.paused ||
    game.ended ||
    !game.active ||
    (ability && h.abilityLeft > 0)
  )
    return false;
  // Adult heroes (level 7+) strike farther with their ability.
  const adult = heroStage(h.level) === "adult",
    range = def.range * (ability ? (adult ? 2 : 1.65) : 1);
  const targets = game.enemies
    .filter((e) => e.alive && distance(e, h) <= range)
    .sort((a, b) => b.progress - a.progress || a.id - b.id);
  if (!targets.length) return false;
  const strength =
    (1 + (h.level - 1) * 0.035) * (game.relics.includes("ember") ? 1.1 : 1);
  const amount = def.damage * strength * (ability ? 5 : 1);
  const count = ability
    ? h.type === "tiger"
      ? 7
      : 30
    : h.type === "tiger"
      ? 1
      : 4;
  for (const e of targets.slice(0, count)) {
    const before = e.health;
    const stats = {
      damage: amount,
      damageType: h.type === "dragon" ? "magic" : "physical",
      bypass: h.type === "dragon" ? 0.65 : 0,
      penetration: h.type === "tiger" ? 0.7 : 0.3,
      armorDamage: h.type === "dinosaur" ? amount * 0.8 : amount * 0.2,
    };
    game.damage(e, amount, stats);
    h.damage += Math.max(0, before - e.health);
    if (h.type === "dragon" && e.alive) {
      e.burn = Math.max(e.burn, ability ? 25 : 8);
      e.burnLeft = Math.max(e.burnLeft, 3);
      e.burnSource = "hero";
    }
    if (h.type === "dinosaur" && ability && e.alive) {
      game.chill(e, 0.45, 2, 1);
      if (e.pushCooldown <= 0) {
        e.progress = Math.max(
          0,
          e.progress - 35 * (1 - (e.controlResistance || 0)),
        );
        e.pushCooldown = 3;
        Object.assign(e, e.trail.onPath(e.progress));
      }
    }
  }
  h.attacks++;
  if (ability)
    h.abilityLeft =
      def.cooldown *
      (adult ? 0.8 : 1) *
      (game.relics.includes("crown") ? 0.9 : 1);
  game.emit("heroAttack", {
    hero: h,
    target: targets[0],
    ability,
    radius: ability ? range : 50,
  });
  return true;
}
export function stepHero(game, dt) {
  const h = game.hero;
  if (!h) return;
  h.abilityLeft = Math.max(0, h.abilityLeft - dt);
  h.moveLeft = Math.max(0, h.moveLeft - dt);
  h.cooldown = Math.max(0, h.cooldown - dt);
  if (h.route.length) {
    const next = h.route[0],
      d = distance(h, next),
      move = HEROES[h.type].speed * dt;
    if (d <= move) {
      h.x = next.x;
      h.y = next.y;
      h.route.shift();
      if (!h.route.length) h.destination = null;
    } else {
      h.x += ((next.x - h.x) * move) / d;
      h.y += ((next.y - h.y) * move) / d;
    }
  }
  if (game.active && h.cooldown <= 0 && heroAttack(game))
    h.cooldown = HEROES[h.type].rate;
}
