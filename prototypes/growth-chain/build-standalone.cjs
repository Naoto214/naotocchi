// Optional build-only dependency: esbuild. Runtime artifact has no external dependencies.
const fs = require("node:fs"),
  path = require("node:path"),
  esbuild = require("esbuild");
(async () => {
  const root = __dirname;
  const { INITIAL_SPECIES } = await import("./roster.mjs");
  const embedded = {};
  for (const id of INITIAL_SPECIES)
    for (let stage = 1; stage <= 8; stage++) {
      const relative = `../../assets/characters/${id}/${String(stage).padStart(2, "0")}.png`;
      embedded[relative] =
        "data:image/png;base64," +
        fs.readFileSync(path.resolve(root, relative)).toString("base64");
    }
  const result = await esbuild.build({
    entryPoints: [path.join(root, "ui.mjs")],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2022",
  });
  let html = fs
    .readFileSync(path.join(root, "index.html"), "utf8")
    .replace(
      /<link rel="stylesheet" href="style\.css"\s*\/?>/,
      "<style>" +
        fs.readFileSync(path.join(root, "style.css"), "utf8") +
        "</style>",
    )
    .replace(
      '<script type="module" src="ui.mjs"></script>',
      "<script>window.GROWTH_CHAIN_IMAGES=" +
        JSON.stringify(embedded) +
        ";</script><script>" +
        result.outputFiles[0].text.replaceAll("</script", "<\\/script") +
        "</script>",
    );
  fs.writeFileSync(path.join(root, "growth-chain-standalone.html"), html);
  console.log("standalone built");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
