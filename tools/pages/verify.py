#!/usr/bin/env python3
"""Serve the built artifact at the project prefix and check every delivered byte."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from urllib.error import HTTPError
from urllib.parse import quote, unquote, urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]


def verify(artifact, report):
    artifact = Path(artifact).resolve()
    expected = report['sha256']
    actual = {p.relative_to(artifact).as_posix() for p in artifact.rglob('*') if p.is_file()}
    if actual != set(expected):
        raise ValueError('artifact inventory differs from package report')

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(artifact), **kwargs)

        def translate_path(self, path):
            path = unquote(urlsplit(path).path)
            if not path.startswith('/naotocchi/'):
                return str(artifact / '__not_a_published_path__')
            return super().translate_path(path[len('/naotocchi'):])

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    base = f'http://127.0.0.1:{server.server_port}/naotocchi/'

    def check(file):
        with urlopen(base + quote(file) + '?v=verification', timeout=30) as response:
            body = response.read()
            if response.status != 200 or hashlib.sha256(body).hexdigest() != expected[file]:
                raise ValueError(f'HTTP byte mismatch: {file}')
        return len(body)

    try:
        with ThreadPoolExecutor(max_workers=8) as pool:
            delivered = sum(pool.map(check, sorted(actual)))
        manifest = json.loads((ROOT / 'tools/pages/allowlist.json').read_text())
        entries = ['index.html', *manifest['entrypoints']]
        for entry in entries:
            url = entry.removesuffix('index.html') if entry.endswith('index.html') else entry
            with urlopen(base + quote(url), timeout=30) as response:
                if hashlib.sha256(response.read()).hexdigest() != expected[entry]:
                    raise ValueError(f'entry point mismatch: {entry}')
        excluded = ['prototypes/growth-chain/player.html', 'prototypes/growth-clear/player.html', 'prototypes/slide08/player.html', 'prototypes/naopoyo/legacy.html', 'docs/pages-capacity-20261019/PLAN.md', 'prototypes/card-game/art-pilot/illustrations/C-bat.png', 'tools/pages/allowlist.json']
        for path in excluded:
            try:
                urlopen(base + path, timeout=30)
            except HTTPError as error:
                if error.code == 404:
                    continue
                raise
            raise ValueError(f'excluded development path was served: {path}')
    finally:
        server.shutdown()
        server.server_close()
        worker.join()

    art = json.loads((ROOT / 'prototypes/card-game/art-delivery/manifest.json').read_text())
    if len(art['cards']) != 452 or len({c['id'] for c in art['cards']}) != 452:
        raise ValueError('expected 452 unique card IDs')
    images = 0
    for card in art['cards']:
        for profile in ['small', 'large']:
            item = card[profile]
            path = 'prototypes/card-game/' + item['path']
            if expected.get(path) != item['sha256'] or (artifact / path).stat().st_size != item['bytes']:
                raise ValueError(f'card delivery mismatch: {card["id"]} / {profile}')
            images += 1
    return {'http_files': len(actual), 'http_bytes': delivered, 'entrypoints': len(entries),
            'card_ids': 452, 'card_images': images, 'excluded_paths_return_404': len(excluded),
            'missing_files': 0, 'hash_mismatches': 0, 'prefix': '/naotocchi/'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact', type=Path, required=True)
    parser.add_argument('--package-report', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    result = verify(args.artifact, json.loads(args.package_report.read_text()))
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
