"""Current107 normal hand activation predicates, not effect-success proofs.

Uses pinned adjudications/text and existing public history/identity/target
helpers. Checks every supplied quick-use row, including false exclusions.
Source/variant completeness and actual information use remain separate gates.
"""
import hashlib
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_payments as payments
import proxy_population_equipment_effects as equipment
import proxy_continuation_public_history as history_rules
import proxy_continuation_challenge as challenge
import proxy_continuation_conditions as conditions
from proxy_population_candidate_expansions import TABLE_PATH,TABLE_SHA
from proxy_mandatory_policy_contract import ROOT

SOURCES={TABLE_PATH:TABLE_SHA,**{'01-core-rules.md': 'd95ee407ec1fb853a8da1102bf933a5e972e3bc6ecc0b78cfb20831e8c45ec71', '06-action-chain-checkpoint.md': '7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67', '114-normal-decision-protocol-hardening.md': 'aa161063e4fa9e056818d00e3fe799448107b3b51f00c05e67c2c89c3a50e59a', '127-r2-candidate-extension.md': 'daa9f3f48221b0926a76f1fb2093833e9fbba3baac52c8a241e07ac504eafd35', '91-event-21-card-text-draft.md': '46d1da752ee096e95bd7af321fe2d5a2d2d4697759e3b2a34a63f41ae1e28aa8'}}
SOURCES.update({'77-current-items-card-text-draft.md': 'ec0a630c5616f6a50ca97afcebaab22fe9de13fe5e3789552d4e7d7ee93a8a02', '79-play-batch-1-card-text-draft.md': 'cc3cdf1f52581d0e58a72190aff4792da406bdfe7abc508e57849b56fc0a900a', '81-play-batch-2-card-text-draft.md': '78aad20fd869c7b46865ced0759c3b8c6768077cd3d55e27628b918719a5e3c4', '83-play-batch-3-card-text-draft.md': '09a12201ebdd0ed7e8079dc59eec283a1afc84c66fbbbc008cbf7d9317abff27', '85-play-batch-4-card-text-draft.md': 'a27d727e0254953b012edc9a47a643990640982bb7f00ecdc2b50b454701c24b', '87-play-batch-5-card-text-draft.md': 'b87a3288c053d2ddb811d6dc341de03370a014f570516d145948e978980169f4', '91-event-21-card-text-draft.md': '46d1da752ee096e95bd7af321fe2d5a2d2d4697759e3b2a34a63f41ae1e28aa8'})
QUICK={'use_play','use_item','use_event'}
SUPPORTED={'E-big-illness','E-boss','E-fateful-transform','E-final-time','E-first-date','G-air-hockey','G-animal-shogi','G-archery-3d','G-area-claim','G-asteroids-classic','G-baseball-batting','G-basketball-3d','G-beach-volley','G-hit-blow','I-c_coin2'}


def _allowed(envelope,events,row,template,actor=None):
 g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'] if actor is None else actor;p=g['players'][actor];b=p['board'];other=g['players']['B' if actor=='A' else 'A'];card=row['card_id'];target=row['target_instance_ids'];variant=row['candidate_variant']
 if row['source_zone']!='hand' or row['source_id']!=row['source_instance_id'] or row['source_instance_id'] not in p['hand'] or g['cards'][row['source_instance_id']]['card_id']!=card:raise ValueError('hand predicate source differs')
 if variant not in template['candidate_variants']:raise ValueError('hand predicate variant differs')
 cost=template['base_time_cost']
 if type(cost) is not int or cost<0:raise ValueError('hand payment unproved')
 # Source descriptors verify canonical semantic sections; neither their effect
 # handler nor an empty effect outcome establishes activation conditions.
 rules.source_section(template['source_text_reference'])
 met=p['time']>=cost
 if template['timing']!='normal_action_opportunity':return False,cost
 if card in ('I-c_coin2','G-hit-blow'):
  if target:raise ValueError('reveal declaration is not a card target')
  # Empty deck is an effect-resolution case under06, not an extra condition.
 elif card=='E-first-date':
  met=met and b['partner'] is not None and target==[b['partner']]
  if target!=([b['partner']] if b['partner'] else []):raise ValueError('current partner target differs')
 elif card=='E-boss':
  if target:raise ValueError('loss reward is untargeted')
  met=met and actor in challenge.public_history(g,events)
 elif card=='E-fateful-transform':
  if target:raise ValueError('transform reservation is untargeted')
  met=met and b['main'] is not None
 elif card in ('G-basketball-3d','G-beach-volley'):
  if target!=([b['main']] if b['main'] else []):raise ValueError('own main target differs')
  met=met and b['main'] is not None
  if card=='G-beach-volley':met=met and history_rules.companion_applied(g,events,actor)['condition_met']
 elif card=='E-big-illness':
  main=other['board']['main']
  if target!=([main] if main else []):raise ValueError('opponent main target differs')
  met=met and main is not None
 elif card in ('G-animal-shogi','E-final-time'):
  entries={r['card_id']:r for r in rules.table()['cards']}
  targets=[s for s in p['discard'] if (entries[g['cards'][s]['card_id']]['card_type']=='companion' if card=='G-animal-shogi' else entries[g['cards'][s]['card_id']]['card_type']!='main')]
  if target not in ([[s] for s in targets] or [[]]):raise ValueError('discard target differs')
  met=met and bool(target)
  if card=='E-final-time':
   met=met and conditions.prove(card,g,actor)['status']=='possible'
   starts=[e['seq'] for e in events if e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')]
   if not starts:raise ValueError('same-name current-turn boundary absent')
   used=any(e['seq']>max(starts) and e['actor']==actor and e['action_type'] in ('activate_response','use_event') and e.get('source_zone')!='board' and g['cards'].get(e.get('source_instance_id'),{}).get('card_id')==card for e in events)
   met=met and not used
 elif card in payments.TARGETED_CARDS:
  world=card=='G-asteroids-classic' or b['world'] is not None
  targets=equipment.targets(envelope,actor,card) if world else []
  if target not in ([[s] for s in targets] or [[]]):raise ValueError('public equipment target differs')
  met=met and world and bool(target)
 elif card=='G-area-claim':
  if target:raise ValueError('board count is untargeted')
  count=payments.board_count(g,actor)
  #114 and127 explicitly preserve the activation minimum.474 only changes
  #actual application after resolution, not this seven-card condition.
  met=met and (7<=count<=8 if variant=='seven_or_eight_cards' else count>=9)
 else:raise ValueError('normal hand predicate unsupported')
 return bool(met),cost


def audit_normal(envelope,events,inventory):
 errors=[];verified=[];unproved=[]
 try:
  for path,digest in SOURCES.items():
   if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('hand predicate source changed')
  state.validate(envelope);current=envelope['legacy_continuation'];g=current['game_state']
  if g['phase']!='normal_action' or current['activation_zone'] or current['pending_triggers'] or g.get('challenge'):raise ValueError('not a normal hand entry')
  table={r['card_id']:r for r in rules.table()['cards']}
  for row in inventory['enumeration_units']:
   identity=dict(enumeration_unit_id=row['enumeration_unit_id'],source_instance_id=row['source_instance_id'],card_id=row['card_id'])
   if row['source_family']!='hand_card_action' or row['action_type'] not in QUICK:continue
   if row['card_id'] not in SUPPORTED:unproved.append(dict(identity,reason='unregistered_hand_mechanism'));continue
   template=next(a for a in table[row['card_id']]['actions'] if a['action_type']==row['action_type'])
   allowed,cost=_allowed(envelope,events,row,template)
   if row['disposition']!=('admitted' if allowed else 'excluded') or (row['candidate_id'] is not None)!=allowed or bool(row['reason_codes'])==allowed:raise ValueError('hand activation disposition differs: '+row['enumeration_unit_id'])
   verified.append(dict(identity,activation_allowed=allowed,payment_time=cost,source_reference=template['source_text_reference']))
 except (ValueError,KeyError,TypeError,IndexError,StopIteration,OSError) as error:errors.append(str(error))
 return dict(schema='normal_hand_activation_predicates.v1',hand_predicates_verified=not errors,errors=errors,verified_units=verified,unproved_units=unproved,source_sha256=dict(SOURCES),
  exclusion_reason_semantics_proven=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
