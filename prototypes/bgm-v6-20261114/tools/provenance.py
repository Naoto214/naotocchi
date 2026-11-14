"""Bind cached output to score, full renderer dependency chain and sample manifest."""
import hashlib,json,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def fingerprint(score):
 h=hashlib.sha256(json.dumps(score,sort_keys=True,ensure_ascii=False).encode())
 for folder in ['bgm-v2-20261112','bgm-v3-20261113','bgm-v4-20261114','bgm-v5-20261115',ROOT.name]:
  for p in sorted((ROOT.parent/folder/'tools').glob('*.py')):
   if p.name.startswith(('render','library','provenance')):
    h.update(str(p.relative_to(ROOT.parent)).encode());h.update(p.read_bytes())
 h.update((ROOT.parent/'bgm-v2-20261112/samples-manifest.json').read_bytes())
 return h.hexdigest()
