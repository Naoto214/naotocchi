const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness } = require('./helpers/runtime-harness.cjs');

test('the life timeline groups log entries by age and the data screen shows it', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing';
  state.lifeLog = [{age: 0, icon: '🥚', text: 'たまごからうまれた'}, {age: 3, icon: '🎂', text: '3さい'}, {age: 3, icon: '🎣', text: 'つりをした'}];
  const html = h.api.buildLifeTimelineHTML(state.lifeLog);
  assert.equal((html.match(/life-timeline-row/g) || []).length, 3);
  assert.equal((html.match(/3さい/g) || []).length, 2, 'the age label appears once per age group plus in text');
  h.api.openExclusiveMenu('profile'); h.api.renderProfile();
  assert.match(h.get('profileTimeline').innerHTML, /たまごからうまれた/);
  assert.match(h.get('profilePastLives').innerHTML, /まだ おわかれした子は いない/);
});

test('a life card code round-trips and past lives keep their timeline and code', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing'; state.lifeLog = [{age: 1, icon: '🍚', text: 'ごはん'}];
  const code = h.api.encodeLifeCode();
  assert.match(code, /^NTL1\./);
  const card = h.api.decodeLifeCode(code);
  assert.equal(typeof card.species, 'string');
  assert.equal(card.log.length, 1);
  assert.match(h.api.lifeCodeCardHTML(card), /life-code-card/);
  assert.throws(() => h.api.decodeLifeCode('NTS1.abc'), /コードでは ない/);
  h.api.archiveLifeAndReset();
  const past = state.lifetime.pastLives.slice(-1)[0];
  assert.equal(past.log.length, 1);
  assert.match(past.code, /^NTL1\./);
  h.api.openExclusiveMenu('profile'); h.api.renderProfile();
  assert.match(h.get('profilePastLives').innerHTML, /past-life-code-btn/);
});

test('the life card lists the whole timeline and a code button', () => {
  const h = harness(), state = h.api.state();
  state.stage = 'growing';
  state.lifeLog = Array.from({length: 12}, (_, i) => ({age: i, icon: '✨', text: 'できごと' + i}));
  const html = h.api.buildLifeCard();
  assert.equal((html.match(/life-timeline-row/g) || []).length, 12, 'all entries, not only the last 8');
  assert.match(html, /lifeCardCodeBtn/);
});

test('recorded runtime errors appear in the data screen', () => {
  const h = harness();
  h.api.reportRuntimeError(new Error('probe failure'), 'test');
  h.api.openExclusiveMenu('profile'); h.api.renderProfile();
  assert.match(h.get('errorLogList').innerHTML, /probe failure/);
  assert.match(h.get('errorLogSummary').textContent, /1けん/);
});
