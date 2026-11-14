"""Resumable group renderer. Approved homes are never renderable."""
import pathlib,sys,json,hashlib,argparse
ROOT=pathlib.Path(__file__).resolve().parents[1];BASE=ROOT.parent
sys.path.insert(0,str(ROOT/'tools'))
from native import Library,V
from policies import POLICIES
R=V.R;R.AUDIO=ROOT/'audio';R.MIDI=ROOT/'midi';R.REC=ROOT/'receipts'
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def lock():
 for rel,f in json.loads((ROOT/'HOME-LOCK.json').read_text())['files'].items():
  assert sha(ROOT/rel)==f['sha256'],rel
  assert sha(BASE.parent/f['source'])==f['sha256'],f['source']
def permitted(ids):
 if any(i.startswith('home-') for i in ids):raise ValueError('Approved home masters cannot be rendered')
 if any(i not in POLICIES for i in ids):raise ValueError('Unknown track')
def fingerprint(s):
 files=[ROOT/'tools'/n for n in ('native.py','policies.py','render.py')]
 for d in ['bgm-v2-20261112','bgm-v3-20261113','bgm-v4-20261114','bgm-v5-20261115','bgm-v6-20261114','bgm-v7-strings-20261114']:
  files+=list((BASE/d/'tools').glob('*.py'))
 code={str(p.relative_to(BASE)):sha(p) for p in sorted(files) if not p.name.startswith('test_')}
 return hashlib.sha256(json.dumps({'score':s,'code':code,'samples':sha(BASE/'bgm-v2-20261112/samples-manifest.json'),'strings':sha(BASE/'bgm-v7-strings-20261114/samples.json')},sort_keys=True).encode()).hexdigest()
def main():
 a=argparse.ArgumentParser();a.add_argument('--group',choices=['1','2','3','4']);a.add_argument('--preflight',action='store_true');a.add_argument('ids',nargs='*');args=a.parse_args()
 scores=json.loads((ROOT/'scores-v7.json').read_text());want=json.loads((ROOT/'groups.json').read_text())[args.group] if args.group else args.ids or list(POLICIES);permitted(want);lock()
 checks=[]
 for s in scores:
  if s['id'] not in want:continue
  fp=fingerprint(s);receipt=R.REC/(s['id']+'.json')
  if not args.preflight and R.receipt_ok(s['id']) and json.loads(receipt.read_text()).get('sourceFingerprint')==fp:
   print('skip '+s['id']+' (verified hashes)',flush=True);continue
  if not args.preflight and receipt.exists():raise ValueError('Existing finished track differs; refuse regeneration '+s['id'])
  perf=V.V4.performed(s);lib=Library(perf);V.V4._soft.update(db=V.V4.SOFTEN_FAMILY.get(s['family'],0),sideScale=1.)
  if args.preflight:
   for e in lib.events:lib.note(e['instrument'],e['midi'],e['dur'],e['vel'],e.get('layer',1))
   checks.append({'id':s['id'],'notes':len(lib.uses),'maxTranspose':max(abs(u['transpose']) for u in lib.uses if u['instrument'] not in R.DRUM),'nativeBoundsPass':all(u['usedEndFrame']<=u['nativeFrames'] for u in lib.uses),'syntheticLoops':0});print(checks[-1],flush=True)
  else:
   r=R.render(perf,lib);assert lib.index==len(lib.events)
   (R.MIDI/(s['id']+'.mid')).write_bytes(R.midi_bytes(s));r.update(version=7,sourceFingerprint=fp,midiSha256=sha(R.MIDI/(s['id']+'.mid')),v6=s['v6'],policy=POLICIES[s['id']],pianoAttackSoftenDb=V.V4._soft['db'],sideScale=V.V4._soft['sideScale'],nativeSourceUses=lib.uses,syntheticLoops=0)
   receipt.write_text(json.dumps(r,ensure_ascii=False,indent=1)+'\n');print(s['id'],r['integratedLUFS'],r['truePeakDbtp'],r['monoLossDb'],r['problems'],flush=True)
   if r['problems']:raise ValueError(r['problems'])
  del lib
 if args.preflight:(ROOT/'verification/preflight.json').write_text(json.dumps(checks,indent=1)+'\n')
 lock()
if __name__=='__main__':main()
