"""Reproduce 449, then audit residual evidence without changing any comparator."""
import argparse,collections,gzip,hashlib,importlib.util,itertools,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools'))
from proxy_public_main_prefix import refine_outcomes
from proxy_residual_witness_audit import audit_pair
from proxy_equivalence_proofs import _compare_derived
from proxy_resource_value_selection import canonical_sha256 as sha
GROUPS=('legacy_time_unique','legacy_safe_free_unique','already_seeded')

def canonical(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def read_saved(directory,filename):
 m=json.loads((directory/'manifest.json').read_text());blob=(directory/filename).read_bytes();raw=gzip.decompress(blob)
 assert hashlib.sha256(blob).hexdigest()==m['compressed_sha256'] and hashlib.sha256(raw).hexdigest()==m['raw_sha256']
 for name,digest in m.get('sources_sha256',{}).items():assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest,name
 return json.loads(raw)

def build():
 old=read_saved(ROOT/'data/proxy-equivalence-pilot-447','shadow.json.gz');prior=read_saved(ROOT/'data/proxy-main-prefix-449','audit.json.gz')
 spec=importlib.util.spec_from_file_location('audit449',ROOT/'data/proxy-main-prefix-449/reproduce.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 regenerated=module.build();assert canonical(regenerated)==canonical(prior),'449 complete regeneration differs'
 assert len(old['rows'])==len(prior['rows'])==313 and old['planned_ids']==prior['planned_ids']==[r['shadow_id'] for r in old['rows']]
 prior_by_id={r['shadow_id']:r for r in prior['rows']};records=[];groups={};types=collections.Counter();states=collections.Counter();unknowns=collections.Counter();zones=collections.Counter()
 for r in old['rows']:
  if r['group'] not in GROUPS:continue
  saved=prior_by_id[r['shadow_id']];x=r['input'];out={o['candidate_id']:o for o in refine_outcomes(x)};actions={a['candidate_id']:a for a in x['actions']};front=saved['frontier_ids']
  assert front==r['selection']['frontier_report']['frontier_ids'] and len(front)==len(set(front))
  proofs={(p['left_id'],p['right_id']):p for p in saved['pair_proofs']};group=groups.setdefault(r['group'],dict(decisions=0,pairs=0,categories=collections.Counter()));group['decisions']+=1
  v=x['view'];p=v['public'];state_shape=dict(main_present=p['own_board']['main'] is not None,partner_stage=p['own_board']['partner_stage'],prepared_count=len(p['own_board']['prepared']),world_present=p['own_board']['world'] is not None,runtime_effect_count=sum(len(v['runtime'][k]) for k in ('payment_effects','stat_effects','conditional_effects')))
  for left,right in itertools.combinations(front,2):
   l=out[left];rr=out[right];proof=_compare_derived(l,rr);saved_proof=proofs.get((left,right))
   if saved_proof is not None:assert proof==saved_proof
   else:assert _compare_derived(rr,l)==proofs[(right,left)]
   witness=audit_pair(l,rr,actions[left],actions[right]);record=dict(shadow_id=r['shadow_id'],group=r['group'],input_sha256=sha(x),state_shape=state_shape,action_types=sorted([actions[left]['action_type'],actions[right]['action_type']]),source_refs=sorted(set(l['certain_prefix_proofs']+rr['certain_prefix_proofs'])),left_outcome_sha256=sha(l),right_outcome_sha256=sha(rr),existing_proof_status=proof['status'],existing_global_blockers=proof['global_blockers'],witness=witness)
   records.append(record);group['pairs']+=1;group['categories'][witness['category']]+=1;types[(r['group'],witness['category'],*record['action_types'])]+=1;states[(r['group'],witness['category'],canonical(state_shape).decode())]+=1;unknowns.update(witness['unknowns']);zones.update(witness['different_zones'])
 assert sum(g['decisions'] for g in groups.values())==182 and len(records)==1457
 summary=dict(inputs_verified=313,target_decisions=182,target_frontier_pairs=len(records),groups=groups,categories=dict(collections.Counter(r['witness']['category'] for r in records)),pairs_with_non_time_difference=sum(bool(r['witness']['non_time_differences']) for r in records),pairs_with_card_atom_presence_difference=sum(any(d['atom_id'] in r['witness']['physical_differences'] and d['left_present']!=d['right_present'] for d in r['witness']['differences']) for r in records),pairs_with_time_difference=sum('time' in r['witness']['different_zones'] for r in records),pairs_with_boundary_difference=sum(not r['witness']['boundary_equal'] for r in records),pairs_with_unknowns=sum(bool(r['witness']['unknowns']) for r in records),pairs_with_generator_unsupported=sum('generator_unsupported' in r['witness']['unknowns'] for r in records),pairs_with_raw_equal_atoms=sum(bool(r['witness']['raw_equal_atom_ids']) for r in records),raw_equal_atoms_are_proven_cancellations=False,unknowns=dict(unknowns),different_zones=dict(zones),frontier_changes=prior['summary']['frontier_changes'],choice_changes=prior['summary']['choice_changes'],decision_record_changes=prior['summary']['decision_record_changes'],fallback_supported=sum(prior['summary']['groups'][g]['fallback'] for g in GROUPS),supported_denominator=241,legacy_unsupported=72,diagnostic_only=True,policy_changes=0,new_runs=0,independent_balance_sample_count=0,policy_promoted=False)
 return dict(schema='naotocchi.card_game.residual_witness_audit.v1',scope='Current public prefixes and retained obligations, not final-state inequivalence or impossibility of future source-bound proofs',summary=summary,pairs=records,by_action_types=[dict(group=g,category=c,action_types=[a,b],count=n) for (g,c,a,b),n in sorted(types.items())],by_state_shape=[dict(group=g,category=c,state_shape=json.loads(s),count=n) for (g,c,s),n in sorted(states.items())])

def write(output):
 if output.exists() and any(output.iterdir()):raise ValueError('output must be empty')
 output.mkdir(parents=True,exist_ok=True);result=build();raw=canonical(result);blob=gzip.compress(raw,mtime=0)
 (output/'audit.json.gz').write_bytes(blob);(output/'summary.json').write_bytes(canonical(result['summary']))
 sources=[Path(__file__),ROOT/'tools/proxy_residual_witness_audit.py',ROOT/'tools/proxy_public_main_prefix.py',ROOT/'tools/proxy_public_relationship_prefix.py',ROOT/'tools/proxy_equivalence_proofs.py',ROOT/'data/proxy-main-prefix-449/manifest.json',ROOT/'data/proxy-equivalence-pilot-447/manifest.json',ROOT/'plans/2026-10-03-public-result-equivalence-design-445.md']
 (output/'manifest.json').write_bytes(canonical(dict(sources_sha256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources},raw_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256(blob).hexdigest())))
 print(json.dumps(result['summary'],ensure_ascii=False,sort_keys=True))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);write(p.parse_args().output)
