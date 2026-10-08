"""Source-bound typed row creation on supplied resolving transitions.

Does not authenticate activation/history, chosen parameter authority, all effect
portions or dispatch completeness. Existing resolution/order/choice audits apply.
"""
import copy
import proxy_continuation_payments as payments
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical

FAMILIES=('payment_effects','stat_effects','conditional_effects')
EVENTS={'resolve_payment_modifier','resolve_board_stat','resolve_board_ability'}
POSITIVE={'M-antlion-03','P-cliff_goat'}
# These transitions are checked by coverage's existing consumption/expiry
# audits. All other event/family combinations must preserve rows exactly.
MUTATIONS={'main_movement':FAMILIES,'expire_payment_modifiers':FAMILIES,
 'challenge_compared':('conditional_effects',),'challenge_finished':('stat_effects',),
 'relationship_progress':('payment_effects',),'relationship_marriage':('payment_effects',)}


def audit(before,after,event):
 errors=[];applicable=False;created=[];family=None;reference=None
 try:
  old={r['effect_id']:r for name in FAMILIES for r in before['runtime'][name]}
  new=[r for name in FAMILIES for r in after['runtime'][name] if r['effect_id'] not in old]
  c=before['legacy_continuation'];g=c['game_state'];links=c['activation_zone'];kind=event.get('action_type');link=links[-1] if links else None
  card=link['card_id'] if link else None;board=bool(link and link.get('source_zone')=='board')
  if kind in EVENTS and link:
   applicable=(not board and card in payments.PAYMENT_CARDS|payments.STAT_CARDS|payments.CONDITIONAL_CARDS and kind=='resolve_payment_modifier') or (board and card in payments.BOARD_STATS and kind=='resolve_board_stat') or (board and card in POSITIVE and kind=='resolve_board_ability')
  if not applicable:
   if new:raise ValueError('typed creation outside registered source route')
   for name in FAMILIES:
    if name not in MUTATIONS.get(kind,()) and canonical(after['runtime'][name])!=canonical(before['runtime'][name]):raise ValueError('typed rows changed outside registered lifetime route')
  else:
   payments.validate_effects(before);payments.validate_effects(after)
   cap=payments.capability(card);reference=cap['reference'];actor=link['actor'];source=link['source_instance_id'];seq=event['seq'];ctx=c['response_context']
   if board:
    if link['action_type']!='activate_board_ability':raise ValueError('board creation action route differs')
   elif card not in payments.QUICK_CARDS or link['action_type']!=cap.get('action_type','use_event'):raise ValueError('quick creation action route differs')
   if ctx['chain_status']!='resolving' or ctx['chain_links']!=[r['link_id'] for r in links] or ctx['consecutive_passes']!=2:raise ValueError('typed creation resolution boundary differs')
   if actor not in ('A','B') or g['cards'][source]['card_id']!=card or g['cards'][source]['card_copy_id']!=link['card_copy_id']:raise ValueError('typed creation source identity differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('typed creation sequence differs')
   if event['actor']!=actor or event['source_instance_id']!=source or event['chain_link_id']!=link['link_id'] or event['source_reference']!=reference:raise ValueError('typed creation event binding differs')
   base=dict(controller=actor,source_instance_id=source,created_event_seq=seq,turn_player=g['turn_player'],round=g['round']);target=None;met=True;parameter=link['candidate_variant']
   if card in payments.PAYMENT_CARDS:
    family='payment_effects';prefix='payment';base.update(payment_kind=cap['payment_kind'],amount=cap['amount'])
    if card=='P-cliff_goat':met=g['players'][actor]['board']['main'] is not None
    elif card=='E-fateful-transform':
     if link['target_instance_ids']:raise ValueError('untargeted payment creation has target')
    else:raise ValueError('payment creation source route unsupported')
   else:
    if card=='M-antlion-03':
     if link['target_instance_ids']:raise ValueError('implicit self stat creation has external target')
     target=source
    else:
     if len(link['target_instance_ids'])!=1:raise ValueError('typed creation target count differs')
     target=link['target_instance_ids'][0]
    if card in payments.CONDITIONAL_CARDS:
     family='conditional_effects';prefix='conditional';met=target==g['players'][actor]['board']['main'];base.update(target_instance_id=target,amount=cap['amount'],difference=cap['difference'])
    else:
     family='stat_effects';prefix='stat'
     if card=='M-antlion-03':
      met=g['players'][actor]['board']['main']==source and target==source
      if met:parameter=event['result']['parameter']
     elif board:
      battle=g.get('challenge');met=bool(battle and target==battle['participants'][actor] and target==g['players'][actor]['board']['main'])
     else:
      owner=actor if cap.get('target_owner')=='own' else 'B' if actor=='A' else 'A';met=target==g['players'][owner]['board']['main']
     base.update(target_instance_id=target,power=cap.get('power',0),wisdom=cap.get('wisdom',0))
     if cap.get('duration')=='challenge':
      if met and not g.get('challenge'):raise ValueError('challenge stat creation has no battle')
      if met:base['challenge_id']=g['challenge']['challenge_id']
     if cap.get('choose_parameter') and met:
      if parameter not in ('power','wisdom'):raise ValueError('typed creation parameter differs')
      base.update(parameter=parameter);base[parameter]=cap['amount']
   if met:
    base['effect_id']=f'{prefix}-effect-{seq}-{source}'
    if base['effect_id'] in old:raise ValueError('typed creation effect ID already exists')
    created=[base]
   for name in FAMILIES:
    expected=copy.deepcopy(before['runtime'][name])+(created if name==family else [])
    if canonical(after['runtime'][name])!=canonical(expected):raise ValueError('typed creation row or retained effects differ')
   if card in POSITIVE:
    result=event['result']
    if result['effect_applied'] is not met or result.get('effect_id')!=(created[0]['effect_id'] if met else None):raise ValueError('positive typed creation receipt differs')
   elif canonical(event['created_effect'])!=canonical(created[0] if created else None):raise ValueError('typed creation receipt differs')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='source_typed_effect_creation.v1',applicable=applicable,typed_creation_verified=applicable and not errors,created_effect_count=len(created),effect_family=family,source_reference=reference,errors=errors,
  before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),choice_proven=False,activation_proven=False,history_authenticated=False,
  whole_effect_semantics_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
