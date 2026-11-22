"""Stage the owner preview from a complete, reviewed Pages runtime."""
import argparse
import errno
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from urllib.parse import quote

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'pages'))
from package import validate
from comparison import CURRENT_MAIN, build_comparison

# Only existing public main bytes may be served remotely, all game logic stays local.
BASE_SHA = CURRENT_MAIN
BASE = f'https://raw.githubusercontent.com/Naoto214/naotocchi/{BASE_SHA}/prototypes/card-game/'
CARD = 'prototypes/card-game/'
HARD_LIMIT = 256 * 1024 * 1024
CONTENT_BUDGET = 248 * 1024 * 1024 - 256 * 1024


def stage(source, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        os.link(source, dest)
    except OSError as error:
        if error.errno != errno.EXDEV:
            raise
        shutil.copyfile(source, dest)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--runtime', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--candidate', default='HEAD', help='commit matching the runtime')
    args = parser.parse_args()
    root, out = args.runtime.resolve(), args.out.resolve()
    if root == out or root.is_relative_to(out) or out.is_relative_to(root):
        parser.error('output and runtime must be distinct trees')
    if out.exists() and any(out.iterdir()):
        parser.error('output must be empty')
    manifest = json.loads(subprocess.check_output([
        'git', 'show', f'{args.candidate}:tools/pages/allowlist.json'
    ], cwd=HERE))
    result = validate(root, manifest)
    cards = json.loads(subprocess.check_output([
        'git', 'show', f'{BASE_SHA}:{CARD}art-delivery/manifest.json'
    ], cwd=HERE))['cards']
    remaining = result['bytes']
    omitted = {}
    for card in sorted(cards, key=lambda c: (-c['large']['bytes'], c['id'])):
        if remaining <= CONTENT_BUDGET:
            break
        large = card['large']
        # The file's content-addressed name and delivery manifest guard its content.
        if result['sha256'][CARD + large['path']] != large['sha256']:
            raise ValueError(f"Card hash mismatch: {card['id']}")
        omitted[CARD + large['path']] = {
            'url': BASE + quote(large['path']), 'local_small': card['small']['path'],
            'sha256': large['sha256'], 'bytes': large['bytes']
        }
        remaining -= large['bytes']
    if remaining > CONTENT_BUDGET:
        raise ValueError('core runtime exceeds hosting capacity')
    game = out / 'game'
    for file in manifest['files']:
        if file not in omitted and file != CARD + 'ui-art.mjs':
            stage(root / file, game / file)
    catalog = (root / CARD / 'ui-art.mjs').read_text()
    for file, card in omitted.items():
        literal = json.dumps(file.removeprefix(CARD))
        if catalog.count(literal) != 1:
            raise ValueError(f'Unexpected catalog entry {file}')
        catalog = catalog.replace(literal, json.dumps(card['url']))
    # When a high-resolution image is offline, display its exact local small
    # variant first. Native card fallback still handles small-image failures.
    catalog += """
const localCopies = new Map(Object.values(CARD_ART).filter(art => art.large.startsWith('https://'))
  .map(art => [art.large, art.small]));
document.addEventListener('error', event => {
  const image = event.target;
  if (!image.classList?.contains('dedicated-art')) return;
  const small = localCopies.get(image.getAttribute('src'));
  if (small) {
    event.stopImmediatePropagation();
    image.src = small;
  }
}, true);
"""
    (game / CARD / 'ui-art.mjs').write_text(catalog)
    # Only the test entry and the three scripts that reference the native home
    # save key receive a second copy. The ordinary entry and its save stay native.
    trial = (game / 'index.html').read_text().replace('naotocchi-save-v1', 'naotocchi-v14-scenario-v1')
    for name in ['script.js', 'bgm-v2.js', 'conversation-director.js']:
        text = (game / name).read_text()
        if 'naotocchi-save-v1' not in text:
            raise ValueError(f'Expected native save reference in {name}')
        new_name = 'trial-' + name
        (game / new_name).write_text(text.replace('naotocchi-save-v1', 'naotocchi-v14-scenario-v1'))
        if trial.count(f'src="{name}?') != 1:
            raise ValueError(f'Expected script in game entry: {name}')
        trial = trial.replace(f'src="{name}?', f'src="{new_name}?')
    (game / 'trial.html').write_text(trial)
    (game / '.nojekyll').touch()
    for name in ['index.html', 'launcher.js']:
        shutil.copyfile(HERE / name, out / name)
    versions = build_comparison(game, root, manifest, args.candidate)
    paths = sorted(p for p in out.rglob('*') if p.is_file())
    # Plain ustar regular files and directory entries, rounded to record blocks.
    estimate = sum(512 + ((p.stat().st_size + 511) // 512 * 512) for p in paths)
    estimate += 512 * sum(p.is_dir() for p in out.rglob('*')) + 20480
    if estimate >= HARD_LIMIT:
        raise ValueError('archive exceeds hosting limit')
    summary = {'comparison_revisions': versions, 'runtime_files': len(manifest['files']), 'hosted_files': len(paths),
               'local_bytes': sum(p.stat().st_size for p in paths),
               'remote_card_images': len(omitted), 'static_references': result['static_references'],
               'dynamic_references': result['dynamic_references'],
               'home_index_sha256': hashlib.sha256((game / 'index.html').read_bytes()).hexdigest()}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps({**summary, 'remote': omitted}, indent=2) + '\n')
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
