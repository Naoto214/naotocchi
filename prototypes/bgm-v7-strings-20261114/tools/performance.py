"""Explicit slurs over immutable B notes; written rests are not inferred from a gap threshold."""
import pathlib,json
ROOT=pathlib.Path(__file__).resolve().parents[1];V7=ROOT.parent/'bgm-v7-20261114'
GROUPS={
 'home-morning':{'violin_solo':[(0,3),(4,5),(6,12)],'cello_chamber':[(0,3),(4,7)]},
 'home-day':{'violin_solo':[(0,3),(4,7),(8,12)],'cello_chamber':[(0,3),(4,7)]},
 'home-evening':{'violin_solo':[(0,7),(8,9),(10,17),(18,21)],'cello_chamber':[(0,13),(14,28),(29,29)]},
 'home-night':{'violin_solo':[(0,2),(3,4)],'cello_chamber':[(0,2),(3,4)]}
}
def build(s):
 result=[]
 for inst,groups in GROUPS[s['id']].items():
  ev=sorted([(i,e) for i,e in enumerate(s['events']) if e['instrument']==inst],key=lambda z:z[1]['t'])
  assert [i for a,b in groups for i in range(a,b+1)]==list(range(len(ev)))
  for group,(a,b) in enumerate(groups):
   source_offset=0.
   for k in range(a,b+1):
    idx,e=ev[k];connected=k<b;previous=k>a;next_e=ev[k+1][1] if connected else None
    same_previous=previous and ev[k-1][1]['midi']==e['midi'];same_next=connected and next_e['midi']==e['midi']
    if same_previous:source_offset+=e['t']-ev[k-1][1]['t']
    else:source_offset=0.
    overlap=.12 if inst=='violin_solo' else .14
    sustain=next_e['t']-e['t'] if connected else e['dur']
    release=overlap if connected else min(.72,.24+.16*e['dur'])
    result.append({'eventIndex':idx,'instrument':inst,'phrase':group,'t':e['t'],'midi':e['midi'],'writtenDuration':e['dur'],'sustain':sustain,'release':release,'attack':overlap if previous else (.12 if inst=='violin_solo' else .16),'connectedIn':previous,'connectedOut':connected,'samePitchIn':same_previous,'samePitchOut':same_next,'sourceOffset':source_offset,'extensionSeconds':round(sustain-e['dur'],6)})
 return sorted(result,key=lambda e:(e['t'],e['eventIndex']))
if __name__=='__main__':
 scores=json.loads((V7/'scores-b.json').read_text());out={s['id']:build(s) for s in scores[:4]}
 (ROOT/'performance.json').write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n');print('events',sum(map(len,out.values())),'joins',sum(e['connectedOut'] for v in out.values() for e in v))
