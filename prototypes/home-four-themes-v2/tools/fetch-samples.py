"""Restore exact CC0 source samples; verification fails on any content change."""
import pathlib,json,urllib.request,hashlib,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1]/'samples'
def fetch(entry):
 p=root/entry['path'];data=p.read_bytes() if p.exists() else urllib.request.urlopen(entry['url'],timeout=60).read()
 if hashlib.sha256(data).hexdigest()!=entry['sha256']:raise ValueError('Hash mismatch: '+entry['path'])
 p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fetch,json.loads((root/'manifest.json').read_text())['files']))
print('All pinned sample hashes verified.')
