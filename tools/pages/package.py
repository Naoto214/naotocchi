#!/usr/bin/env python3
"""Build a byte-preserving Pages artifact from an exact reviewed allowlist."""
import argparse
import hashlib
from html.parser import HTMLParser
import json
import pathlib
import posixpath
import re
import shutil
import subprocess
import tarfile
from urllib.parse import unquote, urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[2]
TEXT = {'.html', '.css', '.js', '.mjs'}
ASSET = re.compile(r'''["'`]((?:\.{1,2}/)*(?:assets/|art-delivery/|ui-assets/)[^"'`\s<>]+?\.(?:png|jpe?g|webp|svg|gif|woff2?|mp3|ogg|wav)(?:\?[^"'`\s<>]*)?)["'`]''')
IMPORT = re.compile(r'''\b(?:from\s*|import\s*\(\s*|import\s*)(["'])((?:\.{1,2}/|/|node:|https?:)[^"'\s]+)\1''')
CSS_URL = re.compile(r'''url\(\s*["']?([^\s)'";]+)''')


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {'src', 'href', 'data-src', 'poster'} and value:
                self.urls.append(value)
            elif name == 'srcset' and value and not value.startswith('data:'):
                self.urls.extend(x.strip().split()[0] for x in value.split(','))


def references(file, text):
    """Static HTML/CSS/module URLs and the project's literal asset maps.

    Runtime-generated paths are verified separately through reviewed family/list
    contracts. Catalog provenance strings and downloadable save names are data,
    not fetch requests, and deliberately are not treated as local links.
    """
    urls = []
    if file.endswith('.html'):
        parser = Links()
        parser.feed(text)
        urls += parser.urls
    if file.endswith(('.js', '.mjs', '.html')):
        urls += [m[1] for m in IMPORT.findall(text)]
        urls += ASSET.findall(text)
        urls += re.findall(r'''\b(?:fetch|Worker|URL)\(\s*["']([^"']+)["']\s*(?=[,)])''', text)
    if file.endswith(('.css', '.html')):
        urls += CSS_URL.findall(text)
    return sorted(set(urls))


def resolve(file, url):
    if not url or url.startswith(('#', '?')) or re.match(r'^(?:[a-zA-Z][\w+.-]*:|//)', url):
        return None
    if '${' in url or '<' in url or '\\' in url or not urlsplit(url).path:
        return None
    path = unquote(urlsplit(url).path)
    # Root-level assets/ literals in the main game; prototype literals carry ../.
    path = posixpath.normpath(path if path.startswith('assets/') else posixpath.join(posixpath.dirname(file), path))
    if path.startswith('../') or path.startswith('/'):
        raise ValueError(f'root-escaping reference: {file}: {url}')
    if urlsplit(url).path.endswith('/') or path == '.':
        path = posixpath.join('' if path == '.' else path, 'index.html')
    return path


def validate(root, manifest):
    if manifest.get('version') != 1:
        raise ValueError('unsupported allowlist version')
    files = manifest['files']
    if len(files) != len(set(files)):
        raise ValueError('duplicate allowlist path')
    allowed = set(files)
    hashes = {}
    size = 0
    for file in files:
        if not isinstance(file, str) or not file or file.startswith('/') or '\\' in file or posixpath.normpath(file) != file or '..' in pathlib.PurePosixPath(file).parts:
            raise ValueError(f'unsafe allowlist path: {file}')
        path = root / file
        for part in [path, *path.parents]:
            if part == root:
                break
            if part.is_symlink():
                raise ValueError(f'symlink in allowlist path: {file}')
        if not path.is_file():
            raise ValueError(f'missing allowlist file: {file}')
        for pattern in manifest.get('forbidden_patterns', []):
            if re.search(pattern, file) and file not in manifest.get('runtime_exceptions', []):
                raise ValueError(f'development/original file forbidden: {file}')
        data = path.read_bytes()
        hashes[file] = hashlib.sha256(data).hexdigest()
        size += len(data)
    if size > manifest['max_bytes']:
        raise ValueError(f'publication budget exceeded: {size} > {manifest["max_bytes"]}')
    checked = 0
    missing = []
    for file in files:
        if pathlib.PurePosixPath(file).suffix not in TEXT:
            continue
        for url in references(file, (root / file).read_text()):
            target = resolve(file, url)
            if target is None:
                continue
            checked += 1
            if target not in allowed:
                missing.append(f'{file} -> {url} -> {target}')
    if missing:
        raise ValueError('unpublished reference(s):\n' + '\n'.join(missing))
    dynamic = 0
    for contract in manifest.get('dynamic_lists', []):
        values = re.findall(contract['pattern'], (root / contract['source']).read_text())
        if not values:
            raise ValueError(f'empty dynamic list: {contract["source"]}')
        for value in values:
            target = posixpath.normpath(contract['prefix'] + value + contract.get('suffix', ''))
            if target not in allowed:
                raise ValueError(f'missing dynamic reference: {target}')
            dynamic += 1
    # These are reviewed runtime families, not copy rules. A new file in them
    # fails until explicitly reviewed into the exact allowlist.
    for family in manifest.get('dynamic_families', []):
        matches = sorted(p for p in root.glob(family) if p.is_file())
        if not matches:
            raise ValueError(f'empty dynamic family: {family}')
        for path in matches:
            target = path.relative_to(root).as_posix()
            if target not in allowed:
                raise ValueError(f'unreviewed dynamic family member: {target}')
            dynamic += 1
    # All runtime source changes require a dependency review, including new
    # computed loaders that static URL extraction cannot evaluate.
    reviewed = manifest.get('reviewed_runtime_sources')
    if reviewed is not None and set(reviewed) != {f for f in files if pathlib.PurePosixPath(f).suffix in TEXT}:
        raise ValueError('runtime source coverage changed; review dependency contracts')
    for file, digest in (reviewed or {}).items():
        if hashes.get(file) != digest:
            raise ValueError(f'runtime source changed; review dependency contract: {file}')
    return {'bytes': size, 'file_count': len(files) + 1, 'static_references': checked,
            'dynamic_references': dynamic, 'sha256': hashes, 'files': sorted(allowed | {'.nojekyll'})}


def build(root, out, manifest):
    if pathlib.Path(out).is_symlink():
        raise ValueError('output must not be a symlink')
    root, out = pathlib.Path(root).resolve(), pathlib.Path(out).resolve()
    if out == root or root.is_relative_to(out) or out.is_relative_to(root):
        raise ValueError('output must be outside source tree and not a symlink')
    if out.exists() and any(out.iterdir()):
        raise ValueError('output directory must be empty; existing data is never deleted')
    result = validate(root, manifest)
    out.mkdir(parents=True, exist_ok=True)
    for file in manifest['files']:
        dest = out / file
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(root / file, dest)
        if hashlib.sha256(dest.read_bytes()).hexdigest() != result['sha256'][file]:
            raise ValueError(f'copy verification failed: {file}')
    (out / '.nojekyll').write_bytes(b'')
    result['sha256']['.nojekyll'] = hashlib.sha256(b'').hexdigest()
    return result


def archive(out, target, files):
    target = pathlib.Path(target)
    if target.exists():
        raise ValueError('archive already exists')
    with tarfile.open(target, 'w', format=tarfile.USTAR_FORMAT) as tar:
        for file in files:
            path = out / file
            info = tarfile.TarInfo('./' + file)
            info.size, info.mode, info.mtime = path.stat().st_size, 0o644, 0
            with path.open('rb') as stream:
                tar.addfile(info, stream)
    with tarfile.open(target) as tar:
        members = tar.getmembers()
        if any(not m.isfile() for m in members) or len(members) != len(files):
            raise ValueError('invalid Pages archive')
    with target.open('rb') as stream:
        return {'bytes': target.stat().st_size, 'sha256': hashlib.file_digest(stream, 'sha256').hexdigest()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', required=True, type=pathlib.Path)
    parser.add_argument('--report', required=True, type=pathlib.Path)
    parser.add_argument('--tar', type=pathlib.Path)
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'tools/pages/allowlist.json').read_text())
    result = build(ROOT, args.out, manifest)
    result['source_head'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    result['allowlist_sha256'] = hashlib.sha256((ROOT / 'tools/pages/allowlist.json').read_bytes()).hexdigest()
    result['max_bytes'] = manifest['max_bytes']
    if args.tar:
        result['tar'] = archive(args.out, args.tar, result['files'])
        if result['tar']['bytes'] > manifest['max_bytes']:
            raise ValueError('tar exceeds publication budget')
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k not in {'files', 'sha256'}}, indent=2))


if __name__ == '__main__':
    main()
