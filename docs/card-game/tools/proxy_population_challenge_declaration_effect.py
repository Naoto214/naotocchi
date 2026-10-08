"""02/06/65 supplied declaration delta; participant origin stays unproved."""
import copy,hashlib
import proxy_population_challenge_operands as operands
import proxy_population_challenge_lifetime as lifetime
import proxy_population_resolution_order as order
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

def audit(before,after,event):
 errors=[];applicable=event.get('action_type')=='challenge_declared';participants=None
 try:
  if applicable:
   sources={'02-main-system.md':operands.SOURCES['02-main-system.md'],order.SOURCE:order.SOURCE_SHA,lifetime.REFERENCE:lifetime.SOURCE_SHA}
   if any(hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest for path,digest in sources.items()):raise ValueError('challenge declaration source changed')
   c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];p=g['players'][actor];seq=event['seq'];parameter=event['parameter']
   if event['actor']!=actor or event['declaring_actor']!=actor or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links'] or g.get('challenge') is not None or p['challenge_used'] is not False:raise ValueError('challenge declaration boundary differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or parameter not in ('power','wisdom') or event['source_reference']!='02-main-system.md':raise ValueError('challenge declaration sequence/parameter/source differs')
   participants={owner:g['players'][owner]['board']['main'] for owner in ('A','B')}
   if any(s is None or g['cards'][s]['card_id'] not in operands.PRINTED for s in participants.values()) or canonical(event['participants'])!=canonical(participants) or event['source_instance_id']!=participants[actor]:raise ValueError('challenge declaration participants differ')
   if any(player['reservations'] for player in g['players'].values()):raise ValueError('declaration-time legacy reservations unproved')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];eg=ec['game_state'];eg['players'][actor]['challenge_used']=True
   eg['challenge']=dict(challenge_id=f'challenge-{seq}',declaring_actor=actor,participants=participants,parameter=parameter,status='comparing',started_event_seq=seq,result=None)
   eg['phase']='response_window';ec['return_target']='challenge_comparison'
   ec['response_context']=dict(source_phase='challenge_declaration',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('challenge declaration full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_challenge_declaration_delta.v1',applicable=applicable,errors=errors,supplied_challenge_declaration_verified=applicable and not errors,participants=participants,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),participant_history_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
