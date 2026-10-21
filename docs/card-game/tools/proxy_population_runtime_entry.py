"""Bounded offline runtime reconstruction; no input generator or experiment CLI.

Only caller-supplied material is used. Structural input acceptance does not prove
independence, precommitment, opportunity completeness or balance eligibility.
"""
import copy
import hashlib
from proxy_mandatory_policy_contract import canonical,ROOT,load_json
from proxy_population_contract import source_path
from proxy_population_opening import reconstruct_opening
from proxy_population_policy_bridge import Session
import proxy_population_runtime as runtime



SOURCES='data/proxy-population-runtime-468/sources.json'
SOURCES_SHA='b71bf3a7c2f16a7cf3e06f2a8afbabc3354934ee04c245ea4a7cd097263dca8f'

def verify_sources(root=ROOT):
 try:
  manifest=source_path(root,SOURCES)
  if hashlib.sha256(manifest.read_bytes()).hexdigest()!=SOURCES_SHA:raise ValueError('runtime source anchor differs')
  sources=load_json(manifest)['sources_sha256']
  for name,digest in sources.items():
   if hashlib.sha256(source_path(root,name).read_bytes()).hexdigest()!=digest:raise ValueError('runtime source differs: '+name)
  return SOURCES_SHA
 except OSError as error:raise ValueError('runtime source unavailable') from error


def reconstruct(bundle,match_id,limit):
 if type(limit) is not int or not 1<=limit<=512:raise ValueError('invalid bounded step limit')
 fingerprint=verify_sources()
 prefix=reconstruct_opening(bundle,match_id)
 source=prefix['initial'];first=source['first_player'];gid=source['group_id']
 binding=dict(protocol_id=bundle['protocol_id'],group_id=gid,mirror_side=first+'_first')
 session=Session(binding,bundle['policy_roots'][gid]);session.turn_start(first,'initial_turn_start')
 # Bind the opening choice to the same rule occurrence journal as later turns.
 f=dict(schema='mandatory_rule_slice_input.v1',choice_contract_id='egg_exchange_bottom',actor=first,
        entry='after_normal_draw',source_instance_id=None,target_instance_id=None,game_state=prefix['normal_draw_intermediate'])
 local=prefix['mandatory_record']['local_record'];boundary=local['application']['boundary']
 opening_choice=session.choose('initial_turn_start',f,boundary['choice_game_state'],boundary['candidate_ids'])
 if canonical(opening_choice['local_policy_evidence'])!=canonical(local):raise ValueError('opening policy journal binding differs')
 session.verify_after('initial_turn_start',f,local['application']['local_after_game_state'])
 envelope=prefix['final_envelope'];cards=envelope['legacy_continuation']['game_state']['cards'];shots=[]
 for snap in prefix['snapshots'][:2]:
  game=copy.deepcopy(snap['state']);game['cards']=copy.deepcopy(cards)
  shots.append(dict(event_seq=snap['seq'],game_state=game,game_state_sha256=snap['state_sha256'],continuation_state=None,continuation_state_sha256=None))
 shots.append(runtime.engine.base.old._snapshot(runtime.engine.base.state.current(envelope)))
 initial=dict(path_id=match_id,order_id=gid,first_player=first,inputs=dict(path_id=match_id,boundaries=[],source_raw_sha256={},historical_response_inventories=[],response_seed_profiles=[],legacy_pass_boundaries=[],legacy_empty_pass_boundaries=[]))
 result=runtime.segment(envelope,initial,prefix['events'],shots,[envelope],limit,session=session)
 if verify_sources()!=fingerprint:raise ValueError('runtime source changed during operation')
 all_decisions=[opening_choice]+result['decisions']
 excluded=[i for i,d in enumerate(all_decisions) if runtime._evaluate(d)['legacy_116']=='excluded']
 return dict(schema='bound_population_runtime_468.v1',binding=dict(binding,match_id=match_id),
  source_manifest_sha256=fingerprint,supplied_bundle_sha256=hashlib.sha256(canonical(bundle)).hexdigest(),policy_input_sha256=source['policy_input_sha256'],
  opening=prefix,runtime=result,origin_journal=copy.deepcopy(session.origins),turn_counts=copy.deepcopy(session.counts),
  judgment_dispositions=dict(legacy_116_excluded_indices=excluded,remaining_status='unproved',opportunity_scope='existing_executor_only'),
  completed=result['completed'],input_lock_verified=False,policy_eligible=None,balance_admitted=None,
  ready_for_execution=False,ready_for_input_generation=False,independent_balance_samples=0,policy_promoted=False)


def audit(record,bundle,match_id,limit):
 errors=[]
 try:
  expected=reconstruct(bundle,match_id,limit)
  if canonical(record)!=canonical(expected):errors.append('full runtime reconstruction values/types differ')
 except (ValueError,KeyError,TypeError) as error:errors.append(str(error))
 return dict(schema='population_runtime_reconstruction_audit_468.v1',reconstruction_verified=not errors,
  errors=errors,opportunity_scope='existing_executor_only',input_lock_verified=False,
  policy_eligible=None,balance_admitted=None,ready_for_execution=False)
