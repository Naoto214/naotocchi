"""Additive public-prefix diagnostic over the fixed 447 planned input manifest."""
import argparse,collections,copy,gzip,hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from proxy_public_main_prefix import refine_outcomes
from proxy_public_relationship_prefix import refine_outcomes as previous
from proxy_equivalence_proofs import _compare_derived
from proxy_resource_value_selection import select_problem

def canonical(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def build():
 source=ROOT/'data/proxy-equivalence-pilot-447';m=json.loads((source/'manifest.json').read_text());blob=(source/'shadow.json.gz').read_bytes();raw=gzip.decompress(blob)
 assert hashlib.sha256(blob).hexdigest()==m['compressed_sha256'] and hashlib.sha256(raw).hexdigest()==m['raw_sha256']
 saved=json.loads(raw);assert len(saved['rows'])==313 and saved['planned_ids']==m['planned_ids']==[r['shadow_id'] for r in saved['rows']]
 rows=[];groups={};remaining=collections.Counter()
 for r in saved['rows']:
  x=r['input'];w=r['selection'];before=previous(x);after=refine_outcomes(x);byid={o['candidate_id']:o for o in after};effective=copy.deepcopy(w['effective_problem']);proofs=[]
  for pair in effective['pairs']:
   proof=_compare_derived(byid[pair['left_id']],byid[pair['right_id']]);proofs.append(proof)
   if pair['kind']=='certified_safe_free_development':continue
   if proof['status']=='proved_equal':pair['relations']=proof['relations'];pair['source_refs']=proof['source_refs']
   elif proof['global_blockers']:pair['relations']={k:'incomparable' for k in ('hand','board','reservations')}
  selection=select_problem(effective);changed=[a for a,b in zip(after,before) if a!=b];group=r['group'];g=groups.setdefault(group,dict(inputs=0,refined_main_candidates=0,frontier_refined_candidates=0,fallback=0));g['inputs']+=1;g['refined_main_candidates']+=len(changed);g['frontier_refined_candidates']+=sum(o['candidate_id'] in w['frontier_report']['frontier_ids'] for o in changed);g['fallback']+=selection['selection_basis']=='seeded_frontier'
  actions={a['candidate_id']:a for a in x['actions']}
  for o in after:
   if 'generator_unsupported' in o['unknowns']:remaining[(group,actions[o['candidate_id']]['action_type'])]+=1
  rows.append(dict(shadow_id=r['shadow_id'],group=group,refined_outcomes=changed,pair_proofs=proofs,selection_basis=selection['selection_basis'],selected_candidate=selection['selected_candidate'],decision_record=selection['decision_record'],frontier_ids=selection['frontier_report']['frontier_ids'],frontier_changed=selection['frontier_report']['frontier_ids']!=w['frontier_report']['frontier_ids'],choice_changed=selection['selected_candidate']!=w['selected_candidate'],decision_record_changed=selection['decision_record']!=w['decision_record'],remaining_generator_unsupported=sum('generator_unsupported' in o['unknowns'] for o in after)))
 summary=dict(inputs=len(rows),groups=groups,main_prefixes=sum(len(r['refined_outcomes']) for r in rows),remaining_generator_unsupported=sum(remaining.values()),remaining_by_group_action=[dict(group=g,action_type=a,count=n) for (g,a),n in sorted(remaining.items())],frontier_changes=sum(r['frontier_changed'] for r in rows),choice_changes=sum(r['choice_changed'] for r in rows),decision_record_changes=sum(r['decision_record_changed'] for r in rows),proved_equal_pairs=sum(p['status']=='proved_equal' for r in rows for p in r['pair_proofs']),new_runs=0,diagnostic_only=True,policy_promoted=False,independent_balance_sample_count=0)
 return dict(schema='naotocchi.card_game.public_main_prefix_diagnostic.v1',planned_ids=saved['planned_ids'],rows=rows,summary=summary)

def write(output):
 if output.exists() and any(output.iterdir()):raise ValueError('output must be empty')
 output.mkdir(parents=True,exist_ok=True);result=build();raw=canonical(result);blob=gzip.compress(raw,mtime=0)
 (output/'audit.json.gz').write_bytes(blob);(output/'summary.json').write_bytes(canonical(result['summary']))
 files=[Path(__file__),ROOT/'tools/proxy_public_main_prefix.py',ROOT/'tools/proxy_public_relationship_prefix.py',ROOT/'tools/proxy_continuation_batch.py',ROOT/'tools/proxy_continuation_state.py',ROOT/'tools/proxy_continuation_payments.py',ROOT/'data/proxy-equivalence-pilot-447/manifest.json']
 manifest=dict(sources_sha256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files},raw_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256(blob).hexdigest())
 (output/'manifest.json').write_bytes(canonical(manifest));print(json.dumps(result['summary'],ensure_ascii=False,sort_keys=True))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);write(p.parse_args().output)
