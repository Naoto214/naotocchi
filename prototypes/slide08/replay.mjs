// Independent replay entry point: no solver or heuristic imports.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { step, validate, VERSION, create } from './engine.mjs';
export const hash = (value) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function certificate(initial, actions, { generated = false } = {}) {
  validate(initial);
  let s = structuredClone(initial);
  const hashes = [hash(s)];
  for (const a of actions) {
    const r = step(s, a);
    if (!r.valid) throw Error('Illegal witness action');
    s = r.state;
    hashes.push(hash(s));
  }
  if (!s.won) throw Error('Witness does not reach 08 death');
  return { version: VERSION, generated, initial, actions, hashes, final: s };
}
export function verify(p) {
  if (
    p.version !== VERSION ||
    !Array.isArray(p.actions) ||
    p.hashes.length !== p.actions.length + 1
  )
    throw Error('Invalid proof envelope');
  validate(p.initial);
  if (
    p.generated &&
    hash(create(p.initial.seed, p.initial.config)) !== hash(p.initial)
  )
    throw Error('Seed mismatch');
  let s = structuredClone(p.initial);
  if (hash(s) !== p.hashes[0]) throw Error('Initial hash mismatch');
  for (let i = 0; i < p.actions.length; i++) {
    const r = step(s, p.actions[i]);
    if (!r.valid) throw Error(`Illegal action ${i}`);
    s = r.state;
    if (hash(s) !== p.hashes[i + 1])
      throw Error(`Transition hash mismatch ${i}`);
  }
  if (!s.won || hash(s) !== hash(p.final))
    throw Error('Final state or victory mismatch');
  return s;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const files = process.argv.slice(2);
  if (!files.length) throw Error('Provide certificate JSON paths');
  for (const path of files) {
    const s = verify(JSON.parse(readFileSync(path, 'utf8')));
    console.log(JSON.stringify({ path, moves: s.moves, won: s.won }));
  }
}
