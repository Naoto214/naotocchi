import { conditionLabel } from './conditions.mjs';

function inCell(c, fixture, draw) {
  c.save();
  c.translate(fixture.x, fixture.y);
  c.beginPath();
  c.rect(.025, .025, .95, .95);
  c.clip();
  draw();
  c.restore();
}
function rounded(c, x, y, w, h, radius, color) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, radius);
  c.fill();
}
// Shape remains legible without species color.
function speciesIcon(c, species, x, y) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#314c59';
  if (species === 'fish') {
    c.beginPath(); c.ellipse(-.02, 0, .09, .055, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(.045, 0); c.lineTo(.115, -.07); c.lineTo(.115, .07); c.closePath(); c.fill();
  } else {
    c.beginPath(); c.ellipse(0, .01, .075, .065, 0, 0, Math.PI * 2); c.fill();
    for (const sign of [-1, 1]) {
      c.beginPath(); c.ellipse(sign * .07, -.04, .036, .075, sign * .4, 0, Math.PI * 2); c.fill();
    }
  }
  c.fillStyle = '#fffdf3'; c.beginPath(); c.arc(-.035, -.005, .012, 0, Math.PI * 2); c.fill();
  c.restore();
}
export function drawCondition(c, fixture) {
  inCell(c, fixture, () => {
    rounded(c, .07, .69, .86, .27, .055, '#fffdf1');
    c.strokeStyle = '#6b7e78'; c.lineWidth = .018;
    c.strokeRect(.075, .695, .85, .26);
    if (fixture.species) speciesIcon(c, fixture.species, .22, .825);
    c.fillStyle = '#243d4a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold .265px ui-monospace, monospace';
    c.fillText(conditionLabel(fixture), fixture.species ? .62 : .5, .835, fixture.species ? .54 : .78);
  });
}
export function drawExit(c, fixture) {
  inCell(c, fixture, () => {
    // A landing pad and outward arrow, deliberately unlike a doorway.
    c.fillStyle = '#315e67'; c.beginPath();
    for (const [i, p] of [[.25,.05],[.75,.05],[.94,.34],[.85,.66],[.15,.66],[.06,.34]].entries()) {
      if (i === 0) c.moveTo(...p); else c.lineTo(...p);
    }
    c.closePath(); c.fill();
    c.strokeStyle = '#f7f2d5'; c.lineWidth = .04;
    c.beginPath(); c.moveTo(.23,.18); c.lineTo(.23,.56); c.lineTo(.55,.56); c.stroke();
    c.strokeStyle = '#fff9ce'; c.lineWidth = .085; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(.37,.35); c.lineTo(.78,.35); c.moveTo(.64,.2); c.lineTo(.79,.35); c.lineTo(.64,.5); c.stroke();
  });
}
export function drawGate(c, fixture, opening = 1) {
  inCell(c, fixture, () => {
    // Guardian face above a square gate. The guardian remains after opening.
    rounded(c, .31, .06, .38, .26, .09, '#d2ab77');
    c.fillStyle = '#37454b';
    for (const x of [.42,.58]) { c.beginPath(); c.arc(x,.18,.025,0,Math.PI*2); c.fill(); }
    c.strokeStyle = '#37454b'; c.lineWidth = .018;
    c.beginPath(); c.moveTo(.45,.25); c.lineTo(.55,.25); c.stroke();
    rounded(c, .27, .035, .46, .065, .02, '#7b6854');
    rounded(c, .1, .33, .09, .34, .02, '#8d795e');
    rounded(c, .81, .33, .09, .34, .02, '#8d795e');
    rounded(c, .1, .32, .8, .07, .02, '#b69971');
    const openness = fixture.open ? opening : 0;
    c.strokeStyle = '#8d795e'; c.lineWidth = .045;
    for (const side of [-1,1]) {
      const hinge = side < 0 ? .2 : .8;
      const end = hinge - side * .28 * (1 - openness);
      c.beginPath(); c.moveTo(hinge,.41); c.lineTo(end,.41); c.lineTo(end,.64); c.lineTo(hinge,.64); c.stroke();
    }
    if (fixture.open) {
      c.strokeStyle = '#356a53'; c.lineWidth = .065; c.lineCap = 'round';
      c.beginPath(); c.moveTo(.39,.51); c.lineTo(.47,.59); c.lineTo(.63,.43); c.stroke();
    }
  });
}
