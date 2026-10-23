import { drawSprite } from "../naopoyo-rescue/sprites.mjs";
import { conditionLabel } from "../naopoyo-rescue/conditions.mjs";
import { phase } from "./session.mjs";
const images = new Map();
export async function loadGuests(stages) {
  await Promise.all(
    [...new Set(stages.flatMap((s) => s.guests.map((g) => g.asset)))].map(
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
    if (p === "off") continue;
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
    } else
      for (const y of e.rows) {
        c.fillStyle = p === "warn" ? "#f8ed9b77" : "#e7ffff99";
        c.fillRect(0, y * cell, w, cell);
        for (let x = 0; x < 8; x++)
          text(
            c,
            "›",
            (x + 0.5) * cell,
            (y + 0.5) * cell,
            cell * 0.45,
            p === "warn" ? "#fff0b0" : "#fff",
            "#4f8f9a",
          );
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
    text(
      c,
      conditionLabel(g),
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
    const img = images.get(g.asset);
    if (img)
      c.drawImage(
        img,
        (g.x + 0.02) * cell,
        g.y * cell,
        cell * 0.96,
        cell * 0.96,
      );
    text(
      c,
      g.role === "guide" ? "案内" : "試練",
      (g.x + 0.5) * cell,
      (g.y + 0.96) * cell,
      cell * 0.18,
    );
  }
  const ordered = [...s.actors].sort(
    (a, b) => (a.id === q.active?.id) - (b.id === q.active?.id),
  );
  for (const a of ordered) {
    const held = a.id === q.active?.id;
    const cy = held ? Math.max(0.6, a.y - 0.45) : a.y + 0.56;
    const scale = held ? 1.4 : 1;
    c.beginPath();
    c.ellipse(
      (a.x + 0.5) * cell,
      (a.y + 0.65) * cell,
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
    const bw = cell * 0.72 * scale,
      bh = cell * 0.7 * scale,
      bx = Math.max(1, Math.min(w - bw - 1, (a.x + 0.5) * cell - bw / 2)),
      by = Math.max(2, Math.min(h - bh, cy * cell - bh / 2));
    if (!drawSprite(c, a.species, a.level, { x: bx, y: by, w: bw, h: bh }))
      text(
        c,
        { dog: "犬", fish: "魚", frog: "蛙", penguin: "ペ" }[a.species],
        (a.x + 0.5) * cell,
        cy * cell,
        cell * 0.4,
      );
    text(
      c,
      a.level,
      (a.x + 0.5) * cell,
      Math.max(cell * 0.19, by - cell * 0.11),
      cell * (held ? 0.5 : 0.32),
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
