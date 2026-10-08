"""91 next-transform effect consumption, not payment amount or creation proof."""
import proxy_continuation_payments as payments
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical


def audit(before,after,event):
 errors=[];count=0;applicable=event.get('action_type')=='main_movement';reference=None
 try:
  cap=payments.capability('E-fateful-transform');reference=cap['reference']
  if cap['timing']!='next_transform_this_turn' or cap['payment_kind']!='transform':raise ValueError('payment consumption source timing differs')
  ids=event.get('payment_effect_ids',[])
  if not applicable:
   if ids:raise ValueError('payment consumption claimed outside main movement')
  else:
   payments.validate_effects(before)
   c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];variant=event['candidate_variant']
   if event['actor']!=actor or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links']!=[]:raise ValueError('payment consumption movement boundary differs')
   if variant not in ('birth','time_skip','transform'):raise ValueError('payment consumption movement variant unknown')
   source=event['source_instance_id']
   if source not in g['players'][actor]['hand'] or after['legacy_continuation']['game_state']['players'][actor]['board']['main']!=source:raise ValueError('payment consumption movement source differs')
   if type(event['seq']) is not int or event['seq']!=before['event_seq']+1 or after['event_seq']!=event['seq']:raise ValueError('payment consumption sequence differs')
   rows=before['runtime']['payment_effects'];used=[r for r in rows if variant=='transform' and r['controller']==actor and r['payment_kind']=='transform'];count=len(used)
   if ids!=sorted(r['effect_id'] for r in used):raise ValueError('payment consumption receipt differs')
   expected=[r for r in rows if r not in used]
   if canonical(after['runtime']['payment_effects'])!=canonical(expected):raise ValueError('payment consumption retained effects differ')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='next_transform_payment_consumption.v1',applicable=applicable,payment_consumption_verified=applicable and not errors,errors=errors,
  consumed_effect_count=count,source_reference=reference,before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  payment_amount_proven=False,effect_creation_proven=False,legacy_reservation_closure_proven=False,
  all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
