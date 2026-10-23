import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spriteData } from "../naopoyo-rescue/sprite-data.mjs";
import { stages } from "./stages.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url)),
  out = path.resolve(process.argv[2]);
const files = [
  "index.html",
  "style.css",
  "app.mjs",
  "render.mjs",
  "session.mjs",
  "stages.mjs",
].map((f) => "prototypes/naopoyo-world/" + f);
files.push(
  "prototypes/naopoyo-v2/engine.mjs",
  "prototypes/naopoyo-v2/input.mjs",
  ...[
    "engine.mjs",
    "input.mjs",
    "conditions.mjs",
    "sprites.mjs",
    "sprite-data.mjs",
  ].map((f) => "prototypes/naopoyo-rescue/" + f),
  ...Object.entries(spriteData)
    .filter(([k]) => !k.startsWith("owl"))
    .map(([, v]) => v.path),
  ...stages.flatMap((s) =>
    [...s.guests, ...(s.narrator ? [s.narrator] : [])].map((g) => g.asset),
  ),
);
const hashes = {};
for (const f of new Set(files)) {
  const dst = path.join(out, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  const b = fs.readFileSync(path.join(root, f));
  fs.writeFileSync(dst, b);
  hashes[f] = createHash("sha256").update(b).digest("hex");
}
const html = fs
  .readFileSync(path.join(root, files[0]), "utf8")
  .replace("<head>", '<head><base href="./prototypes/naopoyo-world/">');
fs.writeFileSync(path.join(out, "index.html"), html);
hashes["index.html"] = createHash("sha256").update(html).digest("hex");
fs.writeFileSync(
  path.join(out, "version.json"),
  JSON.stringify(
    {
      name: "NAOPOYO. World Pilot",
      build: "iphone-qa-20261023-r3",
      dependency: "f8094cd70be7eae052a84e228c4e0f9dadfef2cc",
      files: hashes,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ files: Object.keys(hashes).length, out }));
