"""Bounded synthetic integration, old115order and zero roots; never a sample."""
import copy,json,sys,hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from test_proxy_mandatory_population_input import bundle
from test_proxy_population_runtime import initial
from proxy_population_opening import reconstruct_opening
from proxy_population_policy_bridge import Session
import proxy_population_runtime_completion as api
import proxy_continuation_state as state
import proxy_continuation_batch_runner as engine
def sources():
 return {x.name:hashlib.sha256(x.read_bytes()).hexdigest() for x in sorted((Path(__file__).resolve().parents[2]/'tools').glob('*.py'))}
source_before=sources()
prefix=reconstruct_opening(bundle(),'test-1A');e=prefix['final_envelope'];cards=e['legacy_continuation']['game_state']['cards'];shots=[]
for snap in prefix['snapshots'][:2]:
 g=copy.deepcopy(snap['state']);g['cards']=copy.deepcopy(cards)
 shots.append(dict(event_seq=snap['seq'],game_state=g,game_state_sha256=snap['state_sha256'],continuation_state=None,continuation_state_sha256=None))
shots.append(engine.base.old._snapshot(state.current(e)));i=initial();i.update(path_id='test-1A',order_id='test-1');i['inputs']['path_id']=i['path_id']
s=Session(dict(protocol_id='policy_conditional_population.v1',group_id='test-1',mirror_side='A_first'),{'A':'00'*32,'B':'00'*32});s.turn_start('A','opening')
r=api.segment(e,i,prefix['events'],shots,[e],512,session=s)
assert sources()==source_before,'tools source changed during synthetic integration'
summary=dict(tools_source_sha256=hashlib.sha256(json.dumps(source_before,sort_keys=True,separators=(',',':')).encode()).hexdigest(),scope='historical115_order_zero_roots_synthetic_integration',events=len(r['events']),decisions=len(r['decisions']),turn_counts=s.counts,completed=r['completed'],stop=r['stop'],result=r['result'],independent_balance_samples=0,seed_generation=False,planned_400_execution=False,preflight_ready=False)
import gzip
print(json.dumps(summary,ensure_ascii=False),flush=True)
Path(__file__).with_name('unit-full-test-evidence.json.gz').write_bytes(gzip.compress(json.dumps(dict(tools_sources_sha256=source_before,prefix=prefix,initial=i,result=r,session=dict(binding=s.binding,roots=s.roots,counts=s.counts,owner=s.owner,ordinal=s.ordinal,origins=s.origins,records=[dict(identity=k.hex(),payload=v['payload'].hex(),record=v['record']) for k,v in s.records.items()])),ensure_ascii=False,sort_keys=True).encode(),mtime=0))
Path(__file__).with_name('unit-probe.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))

from proxy_mandatory_policy_contract import canonical
import proxy_population_runtime as old_runtime
import proxy_continuation_candidates as candidates
all_events=prefix['events']+[{k:v for k,v in x.items() if k not in old_runtime.BIND_KEYS} for x in r['events']]
def inspect(forced):
 if r['final_envelope']['legacy_continuation']['game_state']['phase']=='normal_action':return dict(inventory=candidates.audit(r['final_envelope'],all_events))
 return dict(inventory=None)
if r['stop']:
 evidence=dict(final_envelope=r['final_envelope'],initial=i,events=all_events,**old_runtime.operation(i,inspect))
 Path(__file__).with_name('unit-stop-evidence.json').write_bytes(canonical(evidence))
 if evidence['inventory']:print('stop action families',[(x['candidate_id'],x['action_type']) for x in evidence['inventory']['legal_candidate_details']])
