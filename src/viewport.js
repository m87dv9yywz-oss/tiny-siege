// Fit the real Phaser parent; panel visibility never changes the board's budget.
// All input keeps using the current canvas DOM rectangle and the 960×640 world.
export function panelSide(x, previous = "right") {
  // Give the panel the larger side of the world; keep its side at an exact tie.
  if (x < 480) return "right";
  if (x > 480) return "left";
  return previous;
}
export function fitBattlefield(ui) {
  const column = document.querySelector(".battle-column");
  const frame = document.querySelector(".map-frame");
  const panel = document.querySelector("#selection-panel");
  let scheduled = false;
  const fit = () => {
    scheduled = false;
    document.documentElement.style.setProperty(
      "--app-height", `${window.visualViewport?.height || window.innerHeight}px`,
    );
    const portrait = matchMedia("(max-width:850px) and (orientation:portrait)").matches;
    const style = getComputedStyle(column);
    const border = parseFloat(getComputedStyle(frame).borderLeftWidth) * 2;
    const flow = [...column.children].filter(e => e !== frame &&
      getComputedStyle(e).display !== "none" &&
      !["absolute", "fixed"].includes(getComputedStyle(e).position));
    const chrome = flow.reduce((n, e) => n + e.getBoundingClientRect().height, 0);
    const gaps = (parseFloat(style.rowGap) || 0) * flow.length;
    const capacity = portrait
      ? document.querySelector("main").clientHeight - 162
      : column.clientHeight;
    const available = Math.max(80, capacity - chrome - gaps - (portrait ? 5 : 0));
    const maximumWidth = Math.min(column.clientWidth, (available - border) * 1.5 + border);
    const innerWidth = Math.max(3, Math.floor((maximumWidth - border) / 3) * 3);
    const width = innerWidth + border, height = innerWidth / 1.5 + border;
    if (Math.abs(frame.offsetWidth - width) > .5 || Math.abs(frame.offsetHeight - height) > .5) {
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
    }
    const t = ui.model.towers.find(t => t.id === ui.selected);
    panel.dataset.side = panelSide(t?.x ?? 480, panel.dataset.side);
    if (portrait) {
      const controls = document.querySelector(".battle-controls");
      const main = document.querySelector("main").getBoundingClientRect();
      const board = frame.getBoundingClientRect();
      const bottom = controls.getBoundingClientRect().top - main.top - 6;
      const top = Math.min(board.bottom - main.top - Math.min(96, innerWidth / 1.5 * .2), bottom - 280);
      panel.style.setProperty("--sheet-top", `${top}px`);
      panel.style.setProperty("--sheet-height", `${Math.max(280, bottom - top)}px`);
    }
    if (ui.scene) {
      ui.scene.scale.getParentBounds();
      ui.scene.scale.refresh();
    }
  };
  const schedule = (immediate = false) => {
    if (immediate === true) { fit(); return; }
    if (!scheduled) { scheduled = true; requestAnimationFrame(fit); }
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(column);
  observer.observe(document.querySelector("main"));
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  schedule();
  return schedule;
}
