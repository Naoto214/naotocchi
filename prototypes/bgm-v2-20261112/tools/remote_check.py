"""GitHub 上の 一覧（name, sha=git blob SHA, size）と 手元の ファイルを 照合する。
使い方: python tools/remote_check.py remote.json audio   （remote.json は GitHub API の ディレクトリ一覧）"""
import json, sys, hashlib, pathlib
remote = {e['name']: e for e in json.loads(open(sys.argv[1]).read())}; d = pathlib.Path(sys.argv[2]); bad = []
local = sorted(p for p in d.iterdir() if p.suffix in ('.flac', '.m4a', '.mid', '.json') and not p.name.endswith('.tmp.wav'))
want = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
for p in local:
    if want and p.stem not in want: continue
    b = p.read_bytes(); blob = hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest()
    r = remote.get(p.name)
    if not r or r['sha'] != blob or r['size'] != len(b): bad.append(p.name)
    else: print(f"OK {p.name} {len(b)} bytes blob {blob[:12]} sha256 {hashlib.sha256(b).hexdigest()[:16]}")
if bad: print('NG', bad); sys.exit(1)
