// Seed a new browser context through the shipped save loader.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { harness } = require('../helpers/runtime-harness.cjs');

function residentSave(region = 'forest', count = 28) {
  const state = harness({ deterministic: true }).api.state();
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../character-world-master.v1.js'), 'utf8'), { window });
  const master = window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
  const partner = master.partners.find(entry => entry.id === 'forest_bear');
  Object.assign(state, {
    stage: 'growing', speciesLine: 'dog', stageIndex: 3, ageTicks: 500,
    regionId: region, hunger: 95, happiness: 95, energy: 95, health: 100,
    companions: [...master.companions.normal, ...master.companions.rare]
      .slice(0, Math.max(0, count - 2)).map(({ id }) => ({ id, bond: 85 })),
    partner: count > 1 ? { ...partner, gender: 'male', orientationId: 'bi',
      label: partner.name || partner.label, affection: 80, married: true, bondCount: 3 } : null,
  });
  Object.assign(state.lifetime, { timeMode: 'day', seasonMode: 'autumn', weatherMode: 'sunny' });
  return state;
}
module.exports = { residentSave };
if (require.main === module) process.stdout.write(JSON.stringify(residentSave(process.argv[2], Number(process.argv[3] || 28))));
