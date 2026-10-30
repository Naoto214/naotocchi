"""Lossless packaging derivatives; GitHub PNG originals remain untouched.

Run after home-v6-build.cjs: python tools/home-v6-package.py SITE/dist
Requires Pillow. Only the build output is transformed.
"""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

out = Path(sys.argv[1]).resolve()
assert (out / 'release-v6.json').is_file(), 'Build version 6 first'
repo = Path(__file__).resolve().parents[1]
sources = sorted((repo / 'assets/home-art-recovered-20261029').glob('*.png')) + [repo / 'assets/home-b-20261029/home-interior-b.png', repo / 'assets/home-c-20261029/home-interior-c.png']
derivatives = {}
for source in sources:
    relative = source.parent.relative_to(repo)
    target = out / relative / source.with_suffix('.webp').name
    with Image.open(source) as image:
        image.save(target, format='WEBP', lossless=True, method=6)
        with Image.open(target) as decoded:
            assert image.convert('RGBA').tobytes() == decoded.convert('RGBA').tobytes(), source
    derivatives[str(relative / target.name)] = {
        'source': str(relative / source.name),
        'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
        'pixelIdentical': True,
    }
changed = ['home-recovered-manifest.mjs', 'home-c-comparison-data.json', 'home-ab-manifest.mjs', 'home-v6-manifest.mjs']
for filename in changed:
    p = out / filename
    content = p.read_text()
    if filename == 'home-recovered-manifest.mjs':
        content = content.replace('${id}.png', '${id}.webp')
    for source in sources:
        old = str(source.relative_to(repo))
        content = content.replace(old, str(Path(old).with_suffix('.webp')))
    p.write_text(content)
for source in sources:
    (out / source.relative_to(repo)).unlink(missing_ok=True)
manifest = out / 'release-v6.json'
release = json.loads(manifest.read_text())
release['losslessPackagingDerivatives'] = derivatives
for filename in changed:
    release['files'][filename] = hashlib.sha256((out / filename).read_bytes()).hexdigest()
manifest.write_text(json.dumps(release, indent=2) + '\n')
total = sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
# Reserve space for tar headers, long names, and block padding as well as files.
assert total < 256 * 1024 * 1024 - 3500000, f'Expanded artifact too large: {total}'
print(json.dumps({'pixelIdenticalDerivatives': len(derivatives), 'expandedBytes': total}))
