"""451 public declarations only; no challenge result or assumed arrival choice."""
import copy
import hashlib
from proxy_equivalence_inputs import ROOT
import proxy_continuation_batch as batch
from proxy_public_main_prefix import refine_outcomes as prior_outcomes
from proxy_equivalence_outcomes import _ledger,_atom
from proxy_resource_value_selection import canonical_sha256 as sha


def challenge_declaration(view,action):
 if hashlib.sha256((ROOT/'65-challenge-participants-and-resolution.md').read_bytes()).hexdigest()!='65a8dfef2f97aa982173f1e767215a9da557e29e5adedbc4173250a4de1441a0':raise ValueError('challenge contract revision differs')
 if view['actor']!=view['control']['turn_player']:raise ValueError('declaration turn ownership differs')
 v=copy.deepcopy(view);actor=v['actor'];other='B' if actor=='A' else 'A';p=v['public'];seq=v['event_seq']+1
 if v['rights'][actor]['challenge_used'] or not p['own_board']['main'] or not p['opponent_board']['main'] or action['candidate_variant'] not in ('power','wisdom'):raise ValueError('challenge public precondition differs')
 participants={actor:p['own_board']['main']['instance_id'],other:p['opponent_board']['main']['instance_id']}
 battle=dict(challenge_id=f'challenge-{seq}',declaring_actor=actor,participants=participants,parameter=action['candidate_variant'],status='comparing',started_event_seq=seq,result=None)
 v['rights'][actor]['challenge_used']=True;v['control']['phase']='response_window';v['control']['return_target']='challenge_comparison'
 v['control']['response_context']=dict(source_phase='challenge_declaration',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
 v['history'].append(dict(seq=seq,action_type='challenge_declared',actor=actor,source_instance_id=participants[actor],declaring_actor=actor,participants=participants,parameter=action['candidate_variant']))
 return v,battle


def refine_outcomes(x):
 rows=prior_outcomes(x);actions={a['candidate_id']:a for a in x['actions']};v0=x['view'];actor=v0['actor'];control=v0['control'];p=v0['public']
 if actor!=control['turn_player']:raise ValueError('declaration turn ownership differs')
 if control['phase']!='normal_action' or control['pending_triggers'] or control['activation_zone'] or any(p['growth'][s]>=100 or p['reservations'][s] for s in ('A','B')):return rows
 for i,old in enumerate(rows):
  if 'generator_unsupported' not in old['unknowns']:continue
  a=actions[old['candidate_id']];kind=a['action_type']
  if kind not in ('challenge','place_companion','place_partner'):continue
  score=next(s for s in x['baseline_problem']['candidates'] if s['candidate_id']==a['candidate_id'])
  if score['payment_time']!=0 or score['certain_growth_difference']!=0:raise ValueError('declaration public payment/growth differs')
  refs=['01-core-rules.md','02-main-system.md','119-response-window-contract.md'];extras=[]
  if kind=='challenge':
   v,battle=challenge_declaration(v0,a);extras=[_atom('challenge',battle['challenge_id'],battle,actor)];unknown=['unresolved_response','unresolved_challenge_comparison'];refs+=['65-challenge-participants-and-resolution.md','tools/proxy_continuation_challenge.py']
  else:
   v=copy.deepcopy(v0);b=v['public']['own_board'];cap=batch.classification(a['card_id']);refs+=[cap['reference'],'tools/proxy_continuation_batch.py']
   if a['source_zone']!='hand' or a['target_instance_ids'] or v['rights'][actor]['person_placed']:raise ValueError('person placement public precondition differs')
   if (kind=='place_partner' and b['partner'] is not None) or (kind=='place_companion' and len(b['companions'])>=3):continue
   source=next(c for c in v['public']['own_hand'] if c['instance_id']==a['source_instance_id']);v['public']['own_hand'].remove(source)
   if kind=='place_partner':b['partner']=source;b['partner_stage']=0
   else:b['companions'].append(source)
   v['rights'][actor]['person_placed']=True;v['control']['prefix_stage']='atomic_public_person_placement_before_arrival'
   v['history'].append(dict(seq=v['event_seq']+1,actor=actor,action_type='relationship_start' if kind=='place_partner' else 'person_placement',source_instance_id=source['instance_id']))
   extras=[_atom('pending_action','unresolved',{k:a[k] for k in ('action_type','candidate_variant','card_id','source_instance_id','target_instance_ids','source_zone','source_references')})];unknown=['unresolved_arrival_or_departure','unresolved_response']
  atoms=_ledger(v,x['source_manifest'])+extras;ids=[z['atom_id'] for z in atoms]
  if len(ids)!=len(set(ids)):raise ValueError('duplicate residual atom')
  rows[i]=dict(candidate_id=old['candidate_id'],source_view_sha256=sha(v0),boundary=copy.deepcopy(v['control']),atoms=atoms,dependencies=[dict(dependency_id='context',members=sorted(ids),complete=True,rule='same_physical_public_context_and_unchanged_opaque_regions')],unknowns=sorted(set(v['coverage']['unknowns']+unknown)),coverage=copy.deepcopy(old['coverage']),certain_prefix_proofs=sorted(set(refs)),opaque_unchanged=True)
 return rows
