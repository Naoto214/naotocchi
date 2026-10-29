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
originals = Path(__file__).resolve().parents[1] / 'assets/home-art-recovered-20261029'
relative = Path('assets/home-art-recovered-20261029')
derivatives = {}
for source in sorted(originals.glob('*.png')):
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
for filename in ['home-recovered-manifest.mjs', 'home-c-comparison-data.json']:
    p = out / filename
    content = p.read_text()
    if filename.endswith('.mjs'):
        content = content.replace('${id}.png', '${id}.webp')
    else:
        content = content.replace('home-art-recovered-20261029/home-interior-a.png', 'home-art-recovered-20261029/home-interior-a.webp')
    p.write_text(content)
for source in originals.glob('*.png'):
    (out / relative / source.name).unlink(missing_ok=True)
manifest = out / 'release-v6.json'
release = json.loads(manifest.read_text())
release['losslessPackagingDerivatives'] = derivatives
for filename in ['home-recovered-manifest.mjs', 'home-c-comparison-data.json']:
    release['files'][filename] = hashlib.sha256((out / filename).read_bytes()).hexdigest()
manifest.write_text(json.dumps(release, indent=2) + '\n')
total = sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
assert total < 256 * 1024 * 1024, f'Expanded artifact too large: {total}'
print(json.dumps({'pixelIdenticalDerivatives': len(derivatives), 'expandedBytes': total}))
