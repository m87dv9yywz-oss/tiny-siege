// Measure the actual safe-area layout instead of depending on Safari container
// query height resolution. The world remains 960x640 in every orientation.
export function fitBattlefield(ui) {
  const column = document.querySelector(".battle-column");
  const frame = document.querySelector(".map-frame");
  let scheduled = false;
  const fit = () => {
    scheduled = false;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty(
      "--app-height",
      `${viewportHeight}px`,
    );
    const style = getComputedStyle(column);
    const chrome = [...column.children]
      .filter((e) => e !== frame && getComputedStyle(e).display !== "none")
      .reduce((n, e) => n + e.getBoundingClientRect().height, 0);
    const border = parseFloat(getComputedStyle(frame).borderLeftWidth) * 2;
    const gap = parseFloat(style.rowGap) || 0;
    const available = Math.max(80, column.clientHeight - chrome - gap * 5 - 10);
    const width = Math.min(
      column.clientWidth,
      (available - border) * 1.5 + border,
    );
    const height = (width - border) / 1.5 + border;
    if (
      Math.abs(frame.getBoundingClientRect().width - width) > 0.5 ||
      Math.abs(frame.getBoundingClientRect().height - height) > 0.5
    ) {
      frame.style.width = `${width}px`;
      frame.style.height = `${height}px`;
    }
    const panel = document.querySelector("#selection-panel");
    const portrait = matchMedia(
      "(max-width:850px) and (orientation:portrait)",
    ).matches;
    const open =
      panel.classList.contains("open") && !panel.classList.contains("placing");
    if (portrait && open) {
      const overlap = Math.min(65, (height - border) * 0.2);
      const panelHeight = Math.min(
        315,
        Math.max(210, available - height + overlap),
      );
      panel.style.setProperty(
        "--sheet-top",
        `${frame.offsetTop + height - overlap}px`,
      );
      panel.style.setProperty("--sheet-height", `${panelHeight}px`);
      column.style.setProperty("--panel-space", `${panelHeight - overlap}px`);
    } else column.style.setProperty("--panel-space", "0px");
    if (ui.scene) {
      ui.scene.scale.getParentBounds();
      ui.scene.scale.refresh();
    }
  };
  const schedule = (immediate = false) => {
    if (immediate === true) {
      fit();
      return;
    }
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(fit);
    }
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
