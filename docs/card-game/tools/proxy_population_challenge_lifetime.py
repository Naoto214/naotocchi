"""81 next-main-win consumption and65 typed challenge finish on supplied events.

The existing challenge/payment handlers execute. Numeric operands, creation
provenance, participant incarnation history and all timing remain separate gates.
"""
import copy,hashlib
import proxy_continuation_payments as payments
import proxy_continuation_state as state
import proxy_population_effective_application as application
import proxy_population_challenge_operands as operands
from proxy_mandatory_policy_contract import ROOT,canonical

REFERENCE='65-challenge-participants-and-resolution.md'
SOURCE_SHA='65a8dfef2f97aa982173f1e767215a9da557e29e5adedbc4173250a4de1441a0'


def audit(before,after,event):
 errors=[];used=[];expired=[];kind=event.get('action_type');applicable=kind in ('challenge_compared','challenge_finished');reference=None;operand_binding=None
 try:
  if applicable:
   if hashlib.sha256((ROOT/REFERENCE).read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('challenge lifetime source changed')
   cap=payments.capability('G-basketball-3d');reference=cap['reference']
   if cap['timing']!='next_main_win_this_turn':raise ValueError('next win timing differs')
   payments.validate_effects(before)
   c=before['legacy_continuation'];g=c['game_state'];battle=g['challenge'];ctx=c['response_context'];a=after['legacy_continuation'];ag=a['game_state']
   phase='challenge_comparison' if kind=='challenge_compared' else 'challenge_end'
   if g['phase']!=phase or c['return_target']!=phase or c['activation_zone'] or c['pending_triggers'] or ctx['chain_status']!='empty' or ctx['chain_links']!=[] or ctx['consecutive_passes']!=2:raise ValueError('challenge lifetime boundary not closed')
   if type(event['seq']) is not int or event['seq']!=before['event_seq']+1 or after['event_seq']!=event['seq'] or event['source_reference']!=REFERENCE:raise ValueError('challenge lifetime sequence/source differs')
   if set(battle['participants'])!={'A','B'} or any(s is None for s in battle['participants'].values()) or battle['declaring_actor'] not in ('A','B') or battle['parameter'] not in ('power','wisdom'):raise ValueError('challenge participant descriptor differs')
   receipt=event['result']
   if kind=='challenge_compared':
    if battle['status']!='comparing' or battle['result'] is not None:raise ValueError('challenge comparison already resolved')
    current=battle['participants']=={o:g['players'][o]['board']['main'] for o in ('A','B')}
    values=receipt['values']
    if current:
     if not isinstance(values,dict) or set(values)!={'A','B'} or any(type(v) is not int for v in values.values()):raise ValueError('comparison values malformed')
     operand_binding={o:operands.values(before,o) for o in ('A','B')}
     expected_values={o:operand_binding[o]['values'][battle['parameter']] for o in ('A','B')}
     if values!=expected_values:raise ValueError('challenge comparison numeric operands differ')
     winner=None if values['A']==values['B'] else max(values,key=values.get)
    else:
     if values is not None:raise ValueError('aborted challenge has comparison values')
     winner=None
    loser=('B' if winner=='A' else 'A') if winner else None
    fields=dict(challenge_id=battle['challenge_id'],declaring_actor=battle['declaring_actor'],participants=battle['participants'],parameter=battle['parameter'],outcome='aborted' if not current else 'draw' if winner is None else 'win_loss',winner=winner,loser=loser)
    if any(canonical(receipt[k])!=canonical(v) for k,v in fields.items()) or event['actor']!=(winner or g['turn_player']):raise ValueError('challenge result identity/outcome differs')
    rows=before['runtime']['conditional_effects']
    used=[r for r in rows if winner and r['controller']==winner and r['target_instance_id']==battle['participants'][winner]]
    if canonical(after['runtime']['conditional_effects'])!=canonical([r for r in rows if r not in used]):raise ValueError('next win consumption or retained effects differ')
    requested=5+sum(r['amount'] for r in used if values[winner]-values[loser]==r['difference']) if winner else 0
    actual=application.growth(g['players'][winner]['growth'],requested)['actual_delta'] if winner else 0
    if receipt['growth_added']!=actual or winner and receipt.get('growth_requested')!=requested:raise ValueError('next win reward differs')
    for owner in ('A','B'):
     if ag['players'][owner]['growth']!=g['players'][owner]['growth']+(actual if owner==winner else 0):raise ValueError('challenge growth state differs')
    expected_battle=copy.deepcopy(battle);expected_battle.update(status='resolved',result=receipt)
    if canonical(ag['challenge'])!=canonical(expected_battle) or ag['phase']!='response_window' or a['return_target']!='challenge_end':raise ValueError('challenge result continuation differs')
    expected=copy.deepcopy(before);expected['event_seq']=event['seq'];ec=expected['legacy_continuation'];eg=ec['game_state']
    expected['runtime']['conditional_effects']=[r for r in rows if r not in used]
    if winner:eg['players'][winner]['growth']+=actual
    eg['challenge']=expected_battle;eg['phase']='response_window';ec['return_target']='challenge_end'
    ec['response_context']=dict(source_phase='challenge_result',phase='response_window',window_kind='after_normal_action',origin_event_seq=event['seq'],turn_player=g['turn_player'],priority_actor=g['turn_player'],chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
    if canonical(after)!=canonical(expected):raise ValueError('challenge comparison changed unrelated state or result window')
   else:
    if battle['status']!='resolved' or canonical(receipt)!=canonical(battle['result']) or event['actor']!=g['turn_player']:raise ValueError('challenge finish result differs')
    expired=[r for r in before['runtime']['stat_effects'] if r.get('challenge_id')==battle['challenge_id']]
    expected=copy.deepcopy(before);expected['event_seq']=event['seq'];expected['runtime']['stat_effects']=[r for r in expected['runtime']['stat_effects'] if r.get('challenge_id')!=battle['challenge_id']]
    expected['legacy_continuation']['game_state'].pop('challenge');expected['legacy_continuation']['game_state']['phase']='normal_action';expected['legacy_continuation']['return_target']='normal_action_opportunity'
    if canonical(after)!=canonical(expected):raise ValueError('challenge finish expiry or unrelated state differs')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='typed_challenge_lifetime.v1',applicable=applicable,next_win_consumption_verified=kind=='challenge_compared' and not errors,challenge_finish_verified=kind=='challenge_finished' and not errors,
  consumed_effect_count=len(used),consumed_effect_ids=sorted(r['effect_id'] for r in used),expired_stat_count=len(expired),errors=errors,source_reference=reference,challenge_source_sha256=SOURCE_SHA,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),comparison_operand_binding=operand_binding,supplied_comparison_arithmetic_verified=operand_binding is not None and not errors,comparison_operands_proven=False,participant_incarnation_proven=False,
  effect_creation_proven=False,legacy_reservation_closure_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
