// Matched real-pointer regression check: one V4/V5 cardinal drag per region.
// This is not a search for each region's global extreme reachable position.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const qa = require('./measure.cjs');

const regions = [
  'city', 'home', 'forest', 'river_lake', 'countryside', 'mountain', 'snow',
  'sea', 'jungle', 'desert', 'deepsea', 'star_stop', 'memory_lake',
];
const versions = ['d', 'e'];
const key = 'pet:hermit_crab';
const toleranceCss = 0.8;

function close(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
}

function samePresentation(before, after, region) {
  for (const field of ['x', 'y', 'scaleX', 'scaleY', 'bodyScale']) {
    close(before.presentation[field], after.presentation[field], 1e-5, `${region} camera ${field}`);
  }
  for (const field of ['left', 'top', 'width', 'height']) {
    close(before.stage[field], after.stage[field], 1e-4, `${region} stage ${field}`);
    close(before.frame[field], after.frame[field], 1e-4, `${region} protected frame ${field}`);
  }
}

function forwardProjection(start, end, target) {
  if (!start || !end || !target) return null;
  const dx = target.x - start.x, dy = target.y - start.y;
  const length = Math.hypot(dx, dy);
  return length > 1e-9 ? ((end.x - start.x) * dx + (end.y - start.y) * dy) / length : 0;
}

function summarize(sample, edge, frame) {
  const raw = sample.input?.args?.[1];
  const acceptedOrMoved = !!(sample.input?.result || sample.movementObserved);
  const ink = sample.withItems;
  return {
    acceptedOrMoved,
    inputAccepted: sample.input?.result ?? null,
    movementObserved: !!sample.movementObserved,
    foot: sample.actor?.foot ?? null,
    body: sample.body ?? null,
    withItems: ink ?? null,
    axisProgressCss: sample.actor ? qa.sign(edge) * (qa.metric(sample, edge) -
      sample.start.foot[['left', 'right'].includes(edge) ? 'x' : 'y']) : null,
    // Both use the actual post-input displacement. The native target comes
    // from the production gesture controller, not from a model.move call.
    forwardDotCss: forwardProjection(sample.start?.foot, sample.actor?.foot, sample.goal),
    forwardDotNative: forwardProjection(sample.start, sample.actor, raw),
    inkFrameOverflowCss: ink ? Math.max(0,
      frame.left - ink.left, ink.right - frame.right,
      frame.top - ink.top, ink.bottom - frame.bottom) : null,
  };
}

function comparison(samples, summaries, edge) {
  const d = samples.d, e = samples.e, before = summaries.d, after = summaries.e;
  const matched = !!(d.origin && e.origin && d.start && e.start &&
    Math.hypot(d.origin.x - e.origin.x, d.origin.y - e.origin.y) < 0.01 &&
    d.origin.mode === e.origin.mode && d.goal.x === e.goal.x && d.goal.y === e.goal.y &&
    Math.hypot(d.start.x - e.start.x, d.start.y - e.start.y) < 0.001 &&
    Math.hypot(d.start.foot.x - e.start.foot.x, d.start.foot.y - e.start.foot.y) < 0.01);
  const directionalGainCss = d.actor && e.actor ?
    qa.sign(edge) * (qa.metric(e, edge) - qa.metric(d, edge)) : null;
  const acceptanceLost = matched && before.acceptedOrMoved && !after.acceptedOrMoved;
  // V5 explicitly rejects an old destination that moved against the drag.
  // Keep the raw acceptance loss, but distinguish this intended stationary
  // outcome from losing a previously reachable point in the requested direction.
  const intentionalHold = acceptanceLost && before.forwardDotCss < -toleranceCss &&
    before.forwardDotNative < 0 && Math.abs(after.forwardDotCss) <= toleranceCss &&
    !after.movementObserved && directionalGainCss >= -toleranceCss;
  return {
    matched,
    directionalGainCss,
    directionalRetreat: matched && before.acceptedOrMoved &&
      (directionalGainCss === null || directionalGainCss < -toleranceCss),
    acceptanceLost,
    intentionalHold,
    forwardDirectionReversed: matched && before.forwardDotCss >= -toleranceCss &&
      after.forwardDotCss < -toleranceCss,
    newInkOverflow: before.inkFrameOverflowCss !== null && after.inkFrameOverflowCss !== null &&
      before.inkFrameOverflowCss <= 1.2 && after.inkFrameOverflowCss > 1.2,
  };
}

function report(result) {
  result.method.backwardsBaselinePolicy = 'Retain raw acceptanceLost, but an old negative-forward move replaced by staying put is classified intentionalHold.';
  const failures = result.records.filter(r => !r.comparison.matched ||
    r.comparison.directionalRetreat || (r.comparison.acceptanceLost && !r.comparison.intentionalHold) ||
    r.comparison.forwardDirectionReversed || r.comparison.newInkOverflow);
  result.summary = {
    regionCount: result.regions.length,
    rows: result.records.length,
    gestures: result.records.length * versions.length,
    matchedRows: result.records.filter(r => r.comparison.matched).length,
    directionalRetreats: result.records.filter(r => r.comparison.directionalRetreat).length,
    acceptanceLosses: result.records.filter(r => r.comparison.acceptanceLost).length,
    intentionalHolds: result.records.filter(r => r.comparison.intentionalHold).length,
    directionReversals: result.records.filter(r => r.comparison.forwardDirectionReversed).length,
    newInkOverflows: result.records.filter(r => r.comparison.newInkOverflow).length,
    minimumDirectionalGainCss: Math.min(...result.records.map(r =>
      r.comparison.directionalGainCss).filter(value => value !== null)),
    jsErrors: Object.values(result.jsErrors).reduce((n, errors) => n + errors.length, 0),
    failedRows: failures.map(r => ({region: r.region, edge: r.edge, ...r.comparison})),
  };
  qa.save('regions-compare.json', result);
  return failures;
}

async function run() {
  const config = {...qa.configFromEnv(), width: 390, height: 844, safeBottom: 34,
    count: 4, heroId: 'hermit_crab', stage: 5, itemId: 'poop1',
    time: 'night', speech: false, notice: false};
  const buildFile = path.join(qa.root, 'build.json');
  const result = {
    config,
    method: {
      versions, key, actualPointer: true, identicalNativeInitialState: 'V4 per region',
      identicalPointerOrigin: 'V4 body, or explicitly selected empty ground when body is obscured',
      cardinalGoals: 'V4 protected frame outer edges aligned to the V4 initial foot',
      arrivalStepSeconds: 30, toleranceCss,
      limitation: 'One fixed cardinal pointer operation per direction/region at 390 px; not global reach or all character/time combinations.',
    },
    runtimeBuild: fs.existsSync(buildFile) ? JSON.parse(fs.readFileSync(buildFile, 'utf8')) : null,
    regions: [], records: [], jsErrors: {d: [], e: []}, complete: false,
  };
  const browser = await qa.start();
  const pages = {};
  try {
    for (const version of versions) pages[version] = await qa.open(browser, version, {...config, region: 'city'});
    for (const region of regions) {
      const details = {};
      for (const version of versions) {
        await qa.setup(pages[version], {...config, region});
        details[version] = await pages[version].evaluate(() => MovementQA.detail());
        assert.equal(details[version].world.region, region);
        assert.equal(details[version].actors.length, 4);
      }
      samePresentation(details.d, details.e, region);
      const initial = details.d.actors;
      const actor = initial.find(a => a.key === key);
      assert.ok(actor, `${region}: hermit crab missing`);
      result.regions.push({
        region, initial,
        details: Object.fromEntries(versions.map(version => [version, {
          presentation: details[version].presentation, stage: details[version].stage,
          frame: details[version].frame,
        }])),
      });
      for (const edge of qa.edges) {
        await qa.restore(pages.d, initial, key, config);
        const origin = await qa.pointerOrigin(pages.d, key, {selectedGround: true});
        assert.ok(origin, `${region}/${edge}: no V4 pointer origin`);
        const [goal] = qa.goals(edge, details.d.frame, config, 64, actor.foot, true);
        const samples = {}, summaries = {};
        for (const version of versions) {
          await qa.restore(pages[version], initial, key, config);
          const beforeFreeze = await pages[version].evaluate(() => ({
            paused: window.__movementPaused,
            attempts: (window.__reachAttempts || []).map(attempt => attempt.key),
            movingActors: MovementQA.model().snapshot().filter(a => a.target || a.route?.length).map(a => a.key),
          }));
          assert.equal(beforeFreeze.paused, true, `${region}/${edge}/${version}: comparison freeze enabled`);
          assert.deepEqual(beforeFreeze.attempts, [], `${region}/${edge}/${version}: no ambient attempt before pointer`);
          assert.deepEqual(beforeFreeze.movingActors, [], `${region}/${edge}/${version}: no ambient route before pointer`);
          samples[version] = await qa.trial(pages[version], initial, key, goal, {
            origin, selectedGround: true, speech: false, notice: false,
          });
          const afterFreeze = await pages[version].evaluate(({initial, key}) => ({
            otherActorMoves: MovementQA.model().snapshot().filter(a => a.key !== key).map(a => {
              const before = initial.find(b => b.key === a.key);
              return {key: a.key, displacement: Math.hypot(a.x - before.x, a.y - before.y),
                pendingRoute: !!(a.target || a.route?.length)};
            }).filter(a => a.displacement > 1e-6 || a.pendingRoute),
          }), {initial, key});
          const otherAttempts = samples[version].attempts.filter(attempt => attempt.key !== key);
          samples[version].freezeCheck = {before: beforeFreeze, after: afterFreeze,
            otherAttemptKeys: otherAttempts.map(attempt => attempt.key)};
          assert.deepEqual(otherAttempts, [], `${region}/${edge}/${version}: no other-actor attempt during pointer`);
          assert.deepEqual(afterFreeze.otherActorMoves, [], `${region}/${edge}/${version}: other actors remain frozen`);
          summaries[version] = summarize(samples[version], edge, details[version].frame);
          if (process.env.V5_SCREENSHOTS === '1') {
            const filename = `region-${region}-${edge}-${version}.png`;
            await pages[version].screenshot({path: path.join(qa.out, filename)});
            samples[version].screenshot = filename;
          }
        }
        const row = {region, edge, goal, origin, samples, summaries,
          comparison: comparison(samples, summaries, edge)};
        result.records.push(row);
        for (const version of versions) result.jsErrors[version] = [...pages[version].qaErrors];
        report(result);
        console.log(JSON.stringify({region, edge,
          feet: Object.fromEntries(versions.map(v => [v, summaries[v].foot])),
          forwardDotCss: Object.fromEntries(versions.map(v => [v, summaries[v].forwardDotCss])),
          ...row.comparison}));
      }
    }
    assert.equal(result.records.length, 52);
    result.complete = true;
    const failures = report(result);
    assert.equal(result.summary.jsErrors, 0, 'browser JavaScript errors');
    assert.equal(failures.length, 0, `regional matched-pointer regressions: ${JSON.stringify(result.summary.failedRows)}`);
    console.log(`COMPLETE ${result.records.length} matched rows / ${result.summary.gestures} actual pointer gestures; no regressions`);
  } catch (error) {
    result.error = String(error.stack || error);
    for (const version of versions) result.jsErrors[version] = [...(pages[version]?.qaErrors || [])];
    report(result);
    throw error;
  } finally {
    for (const page of Object.values(pages)) await page.close();
    await browser.close();
    qa.server.close();
  }
}

if (require.main === module) run().catch(error => {
  console.error(error);
  qa.server.close();
  process.exitCode = 1;
});

module.exports = {forwardProjection, summarize, comparison, report};
