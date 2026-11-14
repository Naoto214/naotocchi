"""Verify actual sample bytes against the pinned CC0 manifest, before any reuse."""
import os,json,pathlib,hashlib,fnmatch,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
def verify_files(root,files):
 for f in files:
  p=root/f['path']
  if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=f['sha256']:raise ValueError('Missing or changed sample: '+f['path'])
 return len(files)
def check():
 sys.path.insert(0,str(ROOT.parent/'bgm-v2-20261112/tools'))
 import library
 root=pathlib.Path(os.environ['VSCO_DIR']);scores=json.loads((ROOT/'scores-v6.json').read_text());used={e['instrument'] for s in scores for e in s['events']}
 patterns=[library.SPEC[i]['glob'] for i in used if i in library.SPEC]
 m=json.loads((ROOT.parent/'bgm-v2-20261112/samples-manifest.json').read_text())
 files=[f for f in m['files'] if f['path']=='Readme.txt' or any(fnmatch.fnmatch(f['path'],p) for p in patterns)]
 n=verify_files(root,files);print(f'PASS: {n} actual sample SHA-256 values match pinned manifest',flush=True)
 return n
if __name__=='__main__':check()
