// Existing runners keep exceptions in JSON; process exit alone is insufficient.
// Keep overlap and partial visibility observations as data, never silently filter.
const fs = require('node:fs'), path = require('node:path');
function summarize(kind, results) {
  const entries = Object.entries(results), issues = [];
  const expect = (ok, message) => { if (!ok) issues.push(message); };
  const expected = kind === 'corridor'
    ? ['home|forest|home','forest|mountain|forest','city|sea|city','countryside|forest|countryside','home|forest|forest','forest|mountain|mountain','city|sea|sea','countryside|forest|forest']
    : ['home','city','countryside','forest','mountain','snow','sea','deepsea','river_lake','jungle','desert','star_stop','memory_lake'];
  expect(entries.length === expected.length && expected.every(id => Object.hasOwn(results,id)), 'incomplete audit coverage');
  let samples = 0, hidden = 0, partial = 0, maxPartyObstacleOverlap = 0;
  for (const [id, r] of entries) {
    expect(!r.exception, id + ': ' + r.exception);
    if (kind === 'visibility') {
      expect(r.samples > 0, id + ': no visibility samples');
      expect(r.errors === 0, id + ': browser errors');
      expect(r.hidden === 0, id + ': fully hidden ray samples');
      samples += r.samples || 0; hidden += r.hidden || 0; partial += r.partial || 0;
    } else {
      for (const key of ['errors', 'consoleErrors', 'fallbackWarnings']) expect(Array.isArray(r[key]) && r[key].length === 0, id + ': ' + key);
      if (kind === 'smoke') {
        for (const key of ['entry','afterWalk','atSpot']) expect(r[key]?.is3D === true && !r[key]?.failed, id + ': 3D inactive at ' + key);
        expect(r.entry?.party === 27, id + ': companion composition');
        expect(Number.isFinite(r.pen?.party) && Number.isFinite(r.pen?.player), id + ': missing obstacle-overlap readings');
        maxPartyObstacleOverlap = Math.max(maxPartyObstacleOverlap, r.pen?.party || 0);
      } else if (kind === 'corridor') {
        expect(r.started && r.arrived?.region === r.to && r.arrived?.is3D === true && r.arrived?.player?.ok === true, id + ': arrival/visibility');
        expect(r.samples?.length > 0 && r.samples.some(s => s.c), id + ': no corridor samples');
        expect(r.samples?.every(s => s.is3D === true && s.pv === true), id + ': 3D/player unavailable');
      } else throw new Error('Unknown audit kind: ' + kind);
    }
  }
  return { kind, coverage: entries.length, issues, samples, hidden, partial, maxPartyObstacleOverlap, caveat: 'ray/descriptor observations are not Human QA; overlap is x/z circular obstacles, not terrain penetration' };
}
module.exports = { summarize };
if (require.main === module) {
  const [kind, out] = process.argv.slice(2);
  const file = {smoke:'smoke/regions-smoke.json',corridor:'corridor/corridor-qa.json',visibility:'visibility/vis-audit.json'}[kind];
  if (!file) throw new Error('Unknown audit: ' + kind);
  const summary = summarize(kind, JSON.parse(fs.readFileSync(path.join(out, file), 'utf8')));
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify(summary));
  if (summary.issues.length) process.exitCode = 1;
}
