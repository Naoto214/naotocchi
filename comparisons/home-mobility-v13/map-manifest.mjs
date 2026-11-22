import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const game = process.argv[2];
const { ART_SCENES } = await import(
  pathToFileURL(join(game, 'home-production-manifest.mjs'))
);
const { VISIBLE_GROUND_RULES } = await import(
  pathToFileURL(join(game, 'home-ground-expansion.mjs'))
);
const { DAYPARTS } = await import(
  pathToFileURL(join(game, 'home-dayparts.mjs'))
);
const result = {};
for (const [region, spec] of Object.entries(ART_SCENES))
  result[region] = {
    ground: spec.ground,
    exclude: spec.exclude,
    foreground: spec.foreground,
    minZ: VISIBLE_GROUND_RULES[region].minZ,
    image: DAYPARTS[region].day,
    paintings: DAYPARTS[region],
  };
console.log(JSON.stringify(result));
