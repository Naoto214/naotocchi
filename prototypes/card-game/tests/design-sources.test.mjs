import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url));

test('historical design sources reject tampering and do not depend on live item arrays',()=>{
 const output=execFileSync('python',['-c',`
import sys, tempfile, shutil
from pathlib import Path
sys.path.insert(0, 'docs/card-game/tools')
from design_sources import SOURCE, verified_sources
master, items = verified_sources()
assert 'const FUN_ITEMS' in items
assert 'const FUN_ITEMS' not in Path('script.js').read_text()
for filename in ['character-world-master.v1.js', 'legacy-item-arrays.js']:
    with tempfile.TemporaryDirectory() as tmp:
        dest=Path(tmp)
        for source in SOURCE.glob('*.js'): shutil.copyfile(source, dest/source.name)
        path=dest/filename
        path.write_bytes(path.read_bytes()+b' ')
        try: verified_sources(dest)
        except ValueError: pass
        else: raise AssertionError('Changed historical input accepted: '+filename)
assert verified_sources() == (master, items)
print('immutable sources and deterministic reads PASS')
`],{cwd:root,encoding:'utf8'});
 assert.match(output,/PASS/);
});
