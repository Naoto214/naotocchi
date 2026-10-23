import { drawSprite } from "../naopoyo-rescue/sprites.mjs";
import { conditionLabel } from "../naopoyo-rescue/conditions.mjs";
import { phase } from "./session.mjs";
const images = new Map();
export async function loadGuests(stages) {
  await Promise.all(
    [
      ...new Set(
        stages.flatMap((s) =>
          [...s.guests, ...(s.narrator ? [s.narrator] : [])].map(
            (g) => g.asset,
          ),
        ),
      ),
    ].map(
      (path) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images.set(path, img);
            resolve();
          };
          img.onerror = resolve;
          img.src = new URL("../../" + path, import.meta.url).href;
        }),
    ),
  );
}
const text = (c, t, x, y, size, color = "#fff", stroke = "#345950") => {
  c.font = `800 ${size}px system-ui`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.lineJoin = "round";
  c.lineWidth = 3;
  c.strokeStyle = stroke;
  c.strokeText(t, x, y);
  c.fillStyle = color;
  c.fillText(t, x, y);
};
const box = (c, x, y, w, h, r, color) => {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
};
// Coordinates are in CSS pixels; the enlarged body stays in its logical row.
export function actorLayout(a, held, cell, w, h) {
  const scale = held ? 1.2 : 1,
    bw = cell * 0.72 * scale,
    bh = cell * 0.7 * scale;
  const bx = Math.max(1, Math.min(w - bw - 1, (a.x + 0.5) * cell - bw / 2));
  const by = Math.min(
    (Math.floor(a.y) + 1) * cell - bh,
    Math.max(
      held ? cell * 0.38 : cell * 0.28,
      Math.min(h - bh, (a.y + (held ? 0.54 : 0.56)) * cell - bh / 2),
    ),
  );
  const numberSize = cell * (held ? 0.44 : 0.32);
  return {
    bx,
    by,
    bw,
    bh,
    numberY: Math.max(numberSize / 2 + 1, by - cell * 0.12),
    numberSize,
    footY: (a.y + 0.72) * cell,
  };
}
export function eventCaption(e, time) {
  const p = phase(e, time),
    t = (((time - (e.offset || 0)) % e.period) + e.period) % e.period;
  const direction = e.kind === "wave" ? (e.dx < 0 ? "←" : "→") : "";
  return `${e.kind === "wave" ? "波" : "光"}${direction} ${p === "warn" ? Math.ceil((e.warn - t) / 1000) + "秒後" : p === "on" ? "発動！" : "次まで" + Math.ceil((e.period - t + e.warn) / 1000) + "秒"}`;
}
export function render(canvas, q, { rows = 8, dpr = 1, hitUntil = 0 } = {}) {
  const s = q.state,
    rect = canvas.getBoundingClientRect(),
    cell = rect.width / 8,
    w = rect.width,
    h = cell * rows;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const c = canvas.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sea = s.theme === "shore",
    night = s.theme === "cave",
    bg = night ? "#b2becd" : sea ? "#b8dcd7" : "#cddfc5";
  box(c, 0, 0, w, h, 16, bg);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < 8; x++) {
      box(
        c,
        x * cell + 1,
        y * cell + 1,
        cell - 2,
        cell - 2,
        5,
        (x + y) % 2 ? (night ? "#c2cbd7" : sea ? "#d4e9df" : "#dce8d0") : bg,
      );
      if (s.water.some((p) => p[0] === x && p[1] === y)) {
        box(c, x * cell + 1, y * cell + 1, cell - 2, cell - 2, 5, "#75bdce");
        c.strokeStyle = "#c4f2ed";
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo((x + 0.18) * cell, (y + 0.7) * cell);
        c.quadraticCurveTo(
          (x + 0.4) * cell,
          (y + 0.55) * cell,
          (x + 0.65) * cell,
          (y + 0.7) * cell,
        );
        c.stroke();
      }
    }
  for (const e of s.events) {
    const p = phase(e, q.time);
    if (p === "off") {
      if (e.kind === "wave")
        for (const y of e.rows) {
          c.strokeStyle = "#438da677";
          c.lineWidth = 1;
          c.setLineDash([3, 5]);
          c.strokeRect(2, y * cell + 2, w - 4, cell - 4);
          c.setLineDash([]);
          text(
            c,
            e.dx < 0 ? "←波の道" : "波の道→",
            e.dx < 0 ? w - cell * 0.65 : cell * 0.65,
            (y + 0.2) * cell,
            cell * 0.17,
            "#dff6fa",
            "#43818e",
          );
        }
      continue;
    }
    if (e.kind === "beam") {
      for (const [x, y] of e.cells) {
        box(
          c,
          x * cell + 1,
          y * cell + 1,
          cell - 2,
          cell - 2,
          4,
          p === "warn" ? "#ffe39a77" : "#fff0acbb",
        );
        c.fillStyle = p === "warn" ? "#d5a349" : "#fffce5";
        c.fillRect((x + 0.47) * cell, y * cell, cell * 0.06, cell);
      }
    } else {
      const elapsed =
        ((((q.time - (e.offset || 0)) % e.period) + e.period) % e.period) -
        e.warn;
      for (const y of e.rows) {
        c.fillStyle = p === "warn" ? "#f8ed9b55" : "#e7ffff55";
        c.fillRect(0, y * cell, w, cell);
        c.strokeStyle = p === "warn" ? "#dca94b" : "#ffffff";
        c.lineWidth = 2;
        c.strokeRect(2, y * cell + 2, w - 4, cell - 4);
        if (p === "warn")
          text(
            c,
            e.dx < 0 ? "← 波" : "波 →",
            e.dx < 0 ? w - cell * 0.6 : cell * 0.6,
            (y + 0.25) * cell,
            cell * 0.22,
            "#fff5bc",
            "#477f89",
          );
        else {
          // Whole strip hits at onset. Moving foam is its trailing visual wake.
          const progress = Math.min(1, elapsed / e.on),
            front = (e.dx < 0 ? 1 - progress : progress) * w;
          c.strokeStyle = "#edffff";
          c.lineWidth = cell * 0.09;
          c.beginPath();
          c.moveTo(front, y * cell + 3);
          c.quadraticCurveTo(
            front - cell * 0.25,
            (y + 0.5) * cell,
            front,
            (y + 1) * cell - 3,
          );
          c.stroke();
          text(
            c,
            e.dx < 0 ? "←" : "→",
            Math.max(cell * 0.3, Math.min(w - cell * 0.3, front)),
            (y + 0.5) * cell,
            cell * 0.4,
            "#fff",
            "#65a7b1",
          );
        }
      }
    }
  }
  for (const [x, y] of s.walls) {
    box(
      c,
      (x + 0.07) * cell,
      (y + 0.15) * cell,
      cell * 0.86,
      cell * 0.77,
      cell * 0.16,
      "#657c75",
    );
    box(
      c,
      (x + 0.1) * cell,
      (y + 0.08) * cell,
      cell * 0.8,
      cell * 0.64,
      cell * 0.15,
      "#8fa69b",
    );
    box(
      c,
      (x + 0.22) * cell,
      (y + 0.18) * cell,
      cell * 0.32,
      cell * 0.05,
      1,
      "#c7d6bf",
    );
  }
  for (const e of s.exits) {
    text(
      c,
      "★",
      (e.x + 0.5) * cell,
      (e.y + 0.45) * cell,
      cell * 0.65,
      "#ffe9a4",
      "#a8814f",
    );
    text(
      c,
      conditionLabel(e),
      (e.x + 0.5) * cell,
      (e.y + 0.88) * cell,
      cell * 0.23,
      "#fff7cd",
      "#876d4b",
    );
  }
  for (const g of s.gates) {
    box(
      c,
      (g.x + 0.08) * cell,
      (g.y + 0.15) * cell,
      cell * 0.84,
      cell * 0.8,
      cell * 0.22,
      "#74749a",
    );
    box(
      c,
      (g.x + 0.23) * cell,
      (g.y + 0.35) * cell,
      cell * 0.54,
      cell * 0.61,
      cell * 0.16,
      "#d2dce0",
    );
    if (!s.actors.some((a) => a.x === g.x && a.y === g.y))
      text(
        c,
        (g.waveOnly ? "波" : "") + conditionLabel(g),
        (g.x + 0.5) * cell,
        (g.y + 0.22) * cell,
        cell * 0.29,
      );
  }
  for (const p of s.spikes) {
    box(
      c,
      (p.x + 0.08) * cell,
      (p.y + 0.7) * cell,
      cell * 0.84,
      cell * 0.15,
      3,
      "#977785",
    );
    for (let n = 0; n < p.power; n++) {
      const x = (p.x + 0.5 + (n - (p.power - 1) / 2) * 0.25) * cell;
      c.beginPath();
      c.moveTo(x - cell * 0.14, (p.y + 0.75) * cell);
      c.lineTo(x, (p.y + 0.3) * cell);
      c.lineTo(x + cell * 0.14, (p.y + 0.75) * cell);
      c.fillStyle = "#b97891";
      c.fill();
    }
  }
  for (const g of s.guests) {
    const controlled = s.events.filter((e) => e.host === g.id),
      cue =
        controlled.find((e) => phase(e, q.time) === "on") ||
        controlled.find((e) => phase(e, q.time) === "warn");
    const lift = cue ? Math.sin(q.time / 130) * cell * 0.035 : 0;
    const img = images.get(g.asset);
    if (cue) {
      c.strokeStyle = phase(cue, q.time) === "warn" ? "#e8bd5c" : "#efffff";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(
        (g.x + 0.5) * cell,
        (g.y + 0.5) * cell,
        cell * 0.55,
        0,
        Math.PI * 2,
      );
      c.stroke();
      c.setLineDash([4, 5]);
      c.beginPath();
      c.moveTo((g.x + 0.5) * cell, (g.y + 1) * cell);
      const target =
        cue.kind === "wave"
          ? [0.5, cue.rows[0] + 0.5]
          : [cue.cells[0][0] + 0.5, 2.8];
      c.lineTo(target[0] * cell, target[1] * cell);
      c.stroke();
      c.setLineDash([]);
    }
    if (img)
      c.drawImage(
        img,
        (g.x + 0.02) * cell,
        g.y * cell - lift,
        cell * 0.96,
        cell * 0.96,
      );
    text(c, "波と光の係", (g.x + 0.5) * cell, (g.y + 1.12) * cell, cell * 0.19);
    if (cue)
      text(
        c,
        phase(cue, q.time) === "warn" ? "いくよ！" : "それっ！",
        (g.x + 0.5) * cell,
        (g.y - 0.12) * cell,
        cell * 0.23,
        "#fff2bd",
      );
  }
  const ordered = [...s.actors].sort(
    (a, b) => (a.id === q.active?.id) - (b.id === q.active?.id),
  );
  for (const a of ordered) {
    const held = a.id === q.active?.id;
    const motion = q.waveMotion?.[a.id],
      age = q.time - (motion?.at || 0);
    const progress =
      motion && age >= 0 && age < 220 ? 1 - Math.pow(1 - age / 220, 3) : 1;
    const displayed =
      progress < 1
        ? {
            x: motion.from.x + (a.x - motion.from.x) * progress,
            y: motion.from.y + (a.y - motion.from.y) * progress,
          }
        : a;
    const { bx, by, bw, bh, numberY, numberSize, footY } = actorLayout(
      displayed,
      held,
      cell,
      w,
      h,
    );
    if (held) {
      c.strokeStyle = "#e5b958";
      c.lineWidth = 2;
      c.strokeRect(a.x * cell + 2, a.y * cell + 2, cell - 4, cell - 4);
    }

    c.beginPath();
    c.ellipse(
      (a.x + 0.5) * cell,
      (a.y + 0.72) * cell,
      cell * 0.32,
      cell * 0.16,
      0,
      0,
      Math.PI * 2,
    );
    c.fillStyle = held ? "#fff7c877" : "#31594b25";
    c.fill();
    if (held) {
      c.strokeStyle = "#fff9dc";
      c.lineWidth = 2;
      c.stroke();
    }
    if (!drawSprite(c, a.species, a.level, { x: bx, y: by, w: bw, h: bh }))
      text(
        c,
        { dog: "犬", fish: "魚", frog: "蛙", penguin: "ペ" }[a.species],
        (a.x + 0.5) * cell,
        by + bh / 2,
        cell * 0.4,
      );
    text(
      c,
      a.level,
      (displayed.x + 0.5) * cell,
      numberY,
      numberSize,
      held ? "#ffefae" : "#fff",
    );
    if (held && hitUntil > q.time) {
      c.strokeStyle = "#fff5b4";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(
        (a.x + 0.5) * cell,
        (a.y + 0.5) * cell,
        cell * 0.44,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
  }
}
