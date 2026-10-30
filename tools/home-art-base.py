"""Extract only the reviewed v22 runtime from Git; never change the original checkout."""
import json, pathlib, subprocess, tarfile, sys
root=pathlib.Path(__file__).resolve().parents[1];out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
files=json.loads((root/'tools/pages/allowlist.json').read_text())['files']
p=subprocess.Popen(['git','archive','8ba4ef1cb2030979664589d2e36423f58c4dedbd','--',*files],cwd=root,stdout=subprocess.PIPE)
with tarfile.open(fileobj=p.stdout,mode='r|') as t:
 for m in t:
  if m.isfile() and m.name in files:
   target=out/m.name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(t.extractfile(m).read())
if p.wait():raise RuntimeError('baseline archive failed')
print('Extracted',len(files),'reviewed v22 runtime files')
