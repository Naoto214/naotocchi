"""Hash-checked receipts. A mismatch is an error, never permission to overwrite."""
import hashlib,json,os

def digest(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()

def valid(root,state,recipe):
 if state['recipe']!=recipe:raise ValueError('Recipe changed; preserve completed audio and review explicitly')
 for name,want in state['files'].items():
  p=root/name
  if not p.is_file() or digest(p)!=want:raise ValueError('Missing or changed completed file: '+name)
 return True

def atomic_json(path,value):
 path.parent.mkdir(parents=True,exist_ok=True)
 temp=path.with_suffix(path.suffix+'.tmp')
 with temp.open('w') as f:
  json.dump(value,f,ensure_ascii=False,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
 os.replace(temp,path)
