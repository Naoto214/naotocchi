#!/usr/bin/env python3
"""Refresh only reviewed BGM runtime paths/pins, or check approved-only Pages scope."""
import argparse,json,pathlib,sys
from library import Library,sha,atomic,read_json
ROOT=pathlib.Path(__file__).resolve().parents[2]
ENTRY=['index.html','audio.js','script.js','bgm-v2.js','bgm-subapps.js','prototypes/card-game/index.html','prototypes/life-sugoroku/index.html','prototypes/naopoyo-time-hand-chapter1/index.html','prototypes/naopoyo-chapter1/index.html','prototypes/naopoyo-chapter2/index.html','prototypes/naopoyo-rescue/index.html']
def sync(root,write=False):
 root=pathlib.Path(root);runtime=Library(root).build(check=not write);p=root/'tools/pages/allowlist.json';current=read_json(p);expected=json.loads(json.dumps(current))
 expected['files']=sorted((set(current['files'])-{f for f in current['files'] if f.startswith('assets/bgm/')})|set(runtime['runtimeFiles'])|{'bgm-v2.js','bgm-subapps.js'})
 pins=expected['reviewed_runtime_sources']
 for f in ENTRY+runtime['runtimeFiles']:
  if f.endswith('.m4a'):continue
  if not (root/f).is_file():raise ValueError('missing runtime path '+f)
  pins[f]=sha(root/f)
 for f in list(pins):
  if f.startswith('assets/bgm/') and f not in runtime['runtimeFiles']:del pins[f]
 if any(f.startswith('music/') or '/candidates/' in f for f in expected['files']):raise ValueError('music production archive/candidate leaked into Pages')
 if write:atomic(p,expected)
 elif expected!=current:raise ValueError('Pages BGM allowlist/pins differ; review then run --write')
 return {'approvedTracks':len(runtime['approvedIds']),'bgmRuntimeFiles':len(runtime['runtimeFiles']),'totalFiles':len(expected['files']),'mode':'write' if write else 'check'}
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--root',type=pathlib.Path,default=ROOT);p.add_argument('--write',action='store_true');a=p.parse_args()
 try:print(json.dumps(sync(a.root,a.write),indent=2))
 except ValueError as e:sys.exit(str(e))
