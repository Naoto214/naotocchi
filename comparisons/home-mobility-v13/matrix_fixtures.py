"""Extract shared opening and 300 s donor states from SHA-verified V12 Action artifacts."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import zipfile

HERE = Path(__file__).resolve().parent
V12 = HERE.parent / 'home-mobility-v12'
FIXTURES = HERE / 'matrix-fixtures'
BASE = 'bff63b9db6fd22334fbf776090a318bc671ce5aa'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(data):
    return (json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False) + '\n').encode()


def build(archive_dir):
    receipt = json.loads((V12 / 'evidence/matrix-receipt.json').read_bytes())
    index = {'base': BASE, 'regions': {}}
    for region, meta in receipt['regions'].items():
        run = meta['run']
        path = archive_dir / run / f'mobility-v12-{run}-{region}.zip'
        if sha(path.read_bytes()) != meta['sha256']:
            raise ValueError(f'Incorrect V12 archive {path}')
        fixtures = {}
        with zipfile.ZipFile(path) as archive:
            manifest = json.loads(archive.read('region.json'))
            assert manifest['complete'] and len(manifest['cells']) == 20
            for name, checksum in manifest['cells'].items():
                raw = archive.read(name)
                assert sha(raw) == checksum
                cell = json.loads(gzip.decompress(raw))
                original = cell['arms']['v11-foot']['naturalOpening']['state']
                shared = cell['shared']['v11-foot']
                fixtures[f"{cell['count']}-{cell['width']}"] = {
                    'original': original, 'opening': cell['arms']['v12']['opening'],
                    'snapshot': shared['snapshot'], 'frozenFeet': shared['opening'], 'input': shared['input'],
                    'agedSubject': cell['arms']['v12']['aged']['drag']['key'], 'v12RawCellSHA256': checksum,
                }
        blob = gzip.compress(encode(fixtures), mtime=0)
        (FIXTURES / f'{region}.json.gz').write_bytes(blob)
        index['regions'][region] = {'sha256': sha(blob), 'v12Archive': meta['sha256'], 'url': meta['url'], 'cells': len(fixtures)}
    (FIXTURES / 'index.json').write_text(json.dumps(index, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('v12_archives', type=Path)
    build(parser.parse_args().v12_archives)
