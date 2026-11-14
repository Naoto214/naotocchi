"""Fetch pinned CC0 source files and verify SHA256 before use; no credentials needed."""
import hashlib,json,pathlib,os,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1]
for f in json.loads((ROOT/'samples.json').read_text())['files']:
 base=pathlib.Path(os.environ['VSCO_DIR'] if f['library']=='vsco' else os.environ['KARORYFER_DIR']);p=base/f['path']
 if p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256']:continue
 data=urllib.request.urlopen(f['url'],timeout=90).read()
 if hashlib.sha256(data).hexdigest()!=f['sha256']:raise ValueError('Source mismatch '+f['path'])
 p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);print(f['path'])
