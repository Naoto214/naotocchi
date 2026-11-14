"""Supported entry: validate recordings/stems before rendering OR cache hits."""
import sys,json,hashlib,pathlib
from strings import Strings,ROOT
from piano_stems import WORK,build
if __name__=='__main__':
 lib=Strings()
 for inst in ('violin_solo','cello_chamber'):lib.load(inst)
 if '--prepare-piano' in sys.argv:
  sys.path.insert(0,str(ROOT.parent/'bgm-v6-20261114/tools'))
  from check_samples import check
  check();build()
 for i,rec in json.loads((ROOT/'piano-preservation.json').read_text()).items():
  p=WORK/(i+'-piano.wav')
  if hashlib.sha256(p.read_bytes()).hexdigest()!=rec['stemSha256']:raise ValueError('Changed piano stem '+i)
 from render_v7 import render
 for v in ('a','b'):
  for s in json.loads((ROOT/f'scores-{v}.json').read_text())[:4]:render(s,v)
