"""448 diagnostic-only public relationship prefix;447 selectors stay unchanged."""
import copy,hashlib
import proxy_continuation_batch as contract
from proxy_equivalence_inputs import validate_input,ROOT
from proxy_equivalence_outcomes import derive_outcomes,_ledger
from proxy_resource_value_selection import canonical_sha256 as sha

def refine_outcomes(equivalence_input):
 errors=validate_input(equivalence_input)
 if errors:raise ValueError('; '.join(errors))
 x=equivalence_input;rows=derive_outcomes(x);actions={a['candidate_id']:a for a in x['actions']};scores={c['candidate_id']:c for c in x['baseline_problem']['candidates']}
 for i,old in enumerate(rows):
  action=actions[old['candidate_id']]
  if action['action_type']!='relationship':continue
  if hashlib.sha256((ROOT/'01-core-rules.md').read_bytes()).hexdigest()!=contract.RELATIONSHIP_SOURCE_SHA:raise ValueError('relationship canonical source changed')
  v=copy.deepcopy(x['view']);actor=v['actor'];p=v['public'];board=p['own_board'];stage=board['partner_stage'];partner=board['partner'];control=v['control']
  if control['phase']!='normal_action' or control['activation_zone'] or control['pending_triggers'] or any(p['growth'][o]>=100 or p['reservations'][o] for o in ('A','B')):continue
  if not board['main'] or not partner or v['rights'][actor]['relationship_progressed'] or type(stage) is not int or stage not in (0,1,2,3) or p['time'][actor]<1:raise ValueError('relationship public precondition differs')
  if action['candidate_variant']!=('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage]:raise ValueError('relationship declared stage differs')
  # Existing capability classifier verifies the complete canonical partner text.
  # It does not execute a candidate or inspect any hidden region.
  capability=contract.classification(partner['card_id'])
  growth=10 if stage==3 else 0;score=scores[old['candidate_id']]
  if score['payment_time']!=1 or score['certain_growth_difference']!=growth or p['growth'][actor]+growth>=100:raise ValueError('relationship existing priority evidence differs')
  board['partner_stage']='married' if stage==3 else stage+1;p['time'][actor]-=1;p['growth'][actor]+=growth;v['rights'][actor]['relationship_progressed']=True
  control['phase']='post_placement_response';control['return_target']='normal_action_opportunity'
  control['response_context']=dict(source_phase='post_placement_response',phase='response_window',window_kind='after_normal_action',origin_event_seq=v['event_seq']+1,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
  v['history'].append(dict(seq=v['event_seq']+1,actor=actor,action_type='relationship_marriage' if stage==3 else 'relationship_progress',source_instance_id=partner['instance_id'],target_instance_ids=[]))
  atoms=_ledger(v,x['source_manifest']);ids=[a['atom_id'] for a in atoms];assert len(ids)==len(set(ids))
  rows[i]=dict(candidate_id=old['candidate_id'],source_view_sha256=sha(x['view']),boundary=control,atoms=atoms,dependencies=[dict(dependency_id='context',members=sorted(ids),complete=True,rule='same_physical_public_context_and_unchanged_opaque_regions')],unknowns=sorted(set(v['coverage']['unknowns']+['unresolved_response'])),coverage=copy.deepcopy(old['coverage']),certain_prefix_proofs=['01-core-rules.md',capability['reference'],'119-response-window-contract.md','tools/proxy_continuation_batch.py'],opaque_unchanged=True)
 return rows
