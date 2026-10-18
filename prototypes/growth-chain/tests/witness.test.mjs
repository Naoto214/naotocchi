import { test } from "node:test";
import assert from "node:assert/strict";
import { naturalFixtures } from "../natural-fixtures.mjs";
import { applyAction } from "../session.mjs";
import { groups } from "../engine.mjs";
for (const n of [3, 5])
  test(`legal natural ${n}-chain fixture starts stable and fires exactly`, () => {
    let f = naturalFixtures[n];
    assert.equal(groups(f.state.board, f.state.rules).length, 0);
    assert.equal(applyAction(f.state, f.action).last.waves.length, n);
  });
