"""01/06/64 supplied next-turn or R10 terminal full delta.

First-seat metadata and completed end obligations remain independently bound.
Early-maintained100 completion is a separate history-dependent operation.
"""
import copy,hashlib
import proxy_continuation_state as state
import proxy_population_victory_history as victory
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical
KINDS=('turn_end_completed','r10_final_comparison')

def audit(before,after,event,first_player=None):
 errors=[];applicable=event.get('action_type') in KINDS
 try:
  if applicable:
   for name,digest in victory.SOURCES.items():
    if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('turn finish source changed')
   state.validate(before);c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];seq=event['seq'];ctx=c['response_context'];victory._game(g)
   if first_player not in ('A','B') or g['phase']!='turn_end' or c['return_target']!='turn_end' or c['activation_zone'] or c['pending_triggers'] or ctx['chain_status']!='empty' or ctx['chain_links'] or ctx['consecutive_passes']!=2 or g.get('challenge') is not None or any(p['reservations'] for p in g['players'].values()) or any(before['runtime'][k] for k in ('payment_effects','stat_effects','conditional_effects')):raise ValueError('turn finish closed boundary or first seat differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['actor']!=actor or event['selected_candidate'] is not None:raise ValueError('turn finish receipt differs')
   terminal=g['round']==10 and actor!=first_player
   if event['action_type']!=KINDS[int(terminal)]:raise ValueError('turn finish must respect final second turn')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ec['return_target']=None
   if terminal:
    growth={a:g['players'][a]['growth'] for a in 'AB'};winner='A' if growth['A']>growth['B'] else 'B' if growth['B']>growth['A'] else 'draw'
    result=dict(winner=winner,final_growth=growth,rounds_completed=10,completion_reason='r10_final_comparison',source_references=list(victory.SOURCES))
    if canonical(event['result'])!=canonical(result):raise ValueError('turn finish R10 public result differs')
    ec['game_state']['phase']='completed'
   else:
    if event.get('result') is not None:raise ValueError('turn switch cannot award a result')
    ec['game_state'].update(turn_player='B' if actor=='A' else 'A',phase='turn_start',round=g['round']+int(actor!=first_player))
   if canonical(after)!=canonical(expected):raise ValueError('turn finish full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_turn_finish_delta.v1',applicable=applicable,errors=errors,supplied_turn_finish_verified=applicable and not errors,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),first_seat_origin_authenticated=False,end_obligation_closure_proven=False,early_victory_history_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
