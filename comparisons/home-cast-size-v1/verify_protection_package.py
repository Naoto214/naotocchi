"""Compare the built game's files and prior V7 assets before deploying the private site."""
import argparse
import hashlib
import json
from pathlib import Path

REF = '28628cf336a8ed92efe4e9e197ca03298b798a1e'
ADAPTERS = {'index.html','script.js','beauty/fixture.js','beauty/bridge.js','home-production-diorama.js'}
ADDITIONS = {'cast-trial.js'}
RENDERER = '68aef2849855526e94b45f3b81e138b83fc5876b0fe813183c9e8a1d853df5a3'


def sha(value):
    return hashlib.sha256(value).hexdigest()


def manifest(root):
    return {p.relative_to(root).as_posix():sha(p.read_bytes())
            for p in root.rglob('*') if p.is_file()}


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('reference', type=Path, help='Pinned, independently built #569 dist/game')
    cli.add_argument('trial', type=Path, help='Built cast comparison dist/game')
    cli.add_argument('--out', type=Path, required=True)
    args = cli.parse_args()
    old = manifest(args.reference)
    new = manifest(args.trial)
    changed = sorted(name for name in old.keys() & new.keys() if old[name] != new[name])
    added, missing = sorted(new.keys()-old.keys()), sorted(old.keys()-new.keys())
    assert not missing, missing
    assert set(changed) <= ADAPTERS, changed
    assert set(added) == ADDITIONS, added
    assert (args.reference/'script.js').read_text().replace('naotocchi-beauty-v7-fixture','naotocchi-cast-size-v1-fixture') == (args.trial/'script.js').read_text(), 'save implementation changed'
    renderers = sorted(n for n in old if n.startswith('beauty/') and n.endswith('.mjs'))
    hash_input=''.join(f'{Path(n).name} {new[n]}\n' for n in renderers)
    assert sha(hash_input.encode()) == RENDERER
    model = 'home-production-model.js'
    bindings = ('home-production-','home-route-','home-terrain-','home-occlusion','home-visible-ground-')
    binary_bgm = [n for n in old if n.startswith('assets/bgm/') and n.endswith(('.m4a','.mp3','.ogg'))]
    report = dict(reference=REF, referenceGameFiles=len(old), identicalGameFiles=len(old)-len(changed),
                  adapters=changed, added=added, missing=missing, identicalPaintModules=len(renderers),
                  rendererSHA256=RENDERER, identicalCharacterAssets=sum(n.startswith('assets/characters/') for n in old),
                  identicalBgmAssets=len(binary_bgm), unchangedModelSha256=new[model],
                  identicalResidentInfrastructure=[n for n in sorted(old)
                      if n.startswith(bindings) and n!= 'home-production-diorama.js' and n.endswith(('.mjs','.js','.css'))],
                  cardGameAssetFiles=sum(n.startswith('prototypes/card-game/') for n in old),
                  gameScriptOnlyChange='disposable save namespace')
    args.out.write_text(json.dumps(report, indent=2)+'\n')
    print(report['identicalGameFiles'],'files identical,',changed,added)


if __name__ == '__main__':
    main()
