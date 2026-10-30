"""Validate an additive v9 distribution without transforming any existing assets/code."""
import hashlib,json,subprocess,sys,tarfile
from pathlib import Path
root=Path(sys.argv[1]).resolve()
if not (root/'release-v9.json').is_file():raise ValueError('v9 distribution required')
files={}
for p in sorted(root.rglob('*')):
 if not p.is_file() or p.name=='release-v9-delivery.json':continue
 b=p.read_bytes();rel=str(p.relative_to(root))
 if p.suffix in ('.js','.mjs'):
  if b[:2]==b'\x1f\x8b':raise ValueError('Precompressed JS '+rel)
  subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
 files[rel]={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
prior=json.loads((root/'release-v8-delivery.json').read_text())['files']
for rel,data in prior.items():
 if rel=='index.html':continue # additive navigation only; all v7/v8 entrypoints unchanged
 if files.get(rel)!=data:raise ValueError('Preserved v8 file changed: '+rel)
record={'githubHead':json.loads((root/'release-v9.json').read_text())['githubHead'],'baselineSiteSource':'11817e1abd0092be1d4d00aaba87621fb3fd0e3e','preservedFiles':len(prior)-1,'onlyPriorChange':'index.html: v9 navigation added','files':files,'javascript':'plain source bytes; all syntax checked','adoption':'G comparison only; B2 design; no production approval'}
(root/'release-v9-delivery.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
# Match the Sites helper's GNU tar format, including long path records and padding.
# Python PAX would add fractional-mtime records to every file and overestimate it.
proc=subprocess.Popen(['tar','-cf','-','-C',str(root.parent),root.name],stdout=subprocess.PIPE)
expanded=0
while block:=proc.stdout.read(1024*1024):expanded+=len(block)
if proc.wait():raise ValueError('tar preflight failed')
if expanded>=256*1024**2:raise ValueError('Expanded tar >=256MiB: '+str(expanded))
print(json.dumps({'files':len(files)+1,'bytes':sum(p.stat().st_size for p in root.rglob('*') if p.is_file()),'expandedTarBytes':expanded,'expandedMiB':expanded/1024**2,'headroomBytes':256*1024**2-expanded,'preservedFiles':len(prior)-1}))
