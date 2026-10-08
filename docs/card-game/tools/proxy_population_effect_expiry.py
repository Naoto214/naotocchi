"""64 typed turn-end expiration over supplied actual transitions.

Existing handlers still consume and expire effects. This certifies only the
explicit expiration boundary and prohibits carrying those effects across a turn
or terminal boundary. Creation/consumption and legacy reservations are separate.
"""
import copy,hashlib
import proxy_continuation_payments as payments
import proxy_continuation_state as state
from proxy_population_victory_history import SOURCES
from proxy_mandatory_policy_contract import ROOT,canonical

FAMILIES=('payment_effects','stat_effects','conditional_effects')
REFERENCE='64-turn-boundaries-and-victory-timing.md'


def audit(before,after,event):
 errors=[];count=0;applicable=event.get('action_type')=='expire_payment_modifiers'
 try:
  if hashlib.sha256((ROOT/REFERENCE).read_bytes()).hexdigest()!=SOURCES[REFERENCE]:raise ValueError('typed expiry source changed')
  b=before['legacy_continuation'];a=after['legacy_continuation'];g=b['game_state'];next_g=a['game_state']
  rows=[r for family in FAMILIES for r in before['runtime'][family]]
  if next_g['turn_player']!=g['turn_player'] or next_g['round']!=g['round'] or next_g['phase']=='completed':
   if rows or any(after['runtime'][family] for family in FAMILIES):raise ValueError('turn or terminal boundary bypasses typed expiry')
  if applicable:
   payments.validate_effects(before);ids=[r['effect_id'] for r in rows];count=len(ids)
   if not ids or len(ids)!=len(set(ids)):raise ValueError('typed expiry collection empty or duplicated')
   if g['phase']!='turn_end' or b['return_target']!='turn_end' or b['activation_zone'] or b['pending_triggers'] or b['response_context']['chain_links']!=[] or b['response_context']['chain_status']!='empty' or b['response_context']['consecutive_passes']!=2 or 'challenge' in g or any(p['reservations'] for p in g['players'].values()):raise ValueError('typed expiry requires closed turn end')
   if event['actor']!=g['turn_player'] or event['source_reference']!=REFERENCE or event['expired_effect_ids']!=sorted(ids):raise ValueError('typed expiry event source/actor/receipt differs')
   if type(event['seq']) is not int or event['seq']!=before['event_seq']+1 or after['event_seq']!=event['seq']:raise ValueError('typed expiry sequence differs')
   expected=copy.deepcopy(before);expected['event_seq']=event['seq']
   for family in FAMILIES:expected['runtime'][family]=[]
   if canonical(after)!=canonical(expected):raise ValueError('typed expiry state differs or changes unrelated state')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='typed_turn_end_expiry.v1',applicable=applicable,typed_expiry_verified=applicable and not errors,errors=errors,
  expired_effect_count=count,source_reference=REFERENCE,before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  effect_creation_proven=False,effect_consumption_proven=False,legacy_reservation_closure_proven=False,
  all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
