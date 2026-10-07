"""Current normal board-source activation and alternative coverage.

Checks source-bound paid draw, self-cost recovery and passive/triggered sources.
Uses existing cost, public target, classification and incarnation-usage helpers.
No effect execution, new comparison or claim of actual information isolation.
Legacy reservation sources remain explicitly unproved, not zero obligations.
"""
import hashlib
from collections import Counter
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_population_paid_draw as paid
import proxy_population_discard_recovery as recovery
from proxy_population_candidate_expansions import TABLE_PATH,TABLE_SHA
from proxy_mandatory_policy_contract import ROOT,canonical

SOURCES={TABLE_PATH:TABLE_SHA,**{'01-core-rules.md': 'd95ee407ec1fb853a8da1102bf933a5e972e3bc6ecc0b78cfb20831e8c45ec71', '02-main-system.md': '6a0d04606f066f9078e88422394d3d0c5f5c6d927806bb0be99366f503af5127', '06-action-chain-checkpoint.md': '7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67', '55-insect-three-lines-card-text-draft.md': '8108f781d2e02b45139fdf7d1d573c7ac839f14cd2b8361983ecb891320f8c28', '72-companion-26-card-text-draft.md': '941d17e157d77badfaaab0e1f04539eb602c05b893241ff3024ecd7ae0c97117'}}
SOURCES['132-board-active-restart.md']='b431565b6a8de777b9745f3d2c8816d71b1e64753e537b5aa593efb6a7acc58f'
PASSIVE_KINDS={'none','continuous','past_trigger','passive','triggered','response_triggered','cost_modifier'}


def _signature(row):
 value={k:row.get(k) for k in ('action_type','target_instance_ids','cost_instance_ids')}
 # Existing normal inventory distinguishes passive and response-only grammar.
 # Both have no ordinary activation; exact grammar is checked by expansion.
 if value['action_type']=='board_response_trigger':value['action_type']='board_passive'
 return canonical(value)


def _expected(envelope,source):
 g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor];card=g['cards'][source]['card_id']
 if card in paid.DESCRIPTORS:
  cap=paid.batch.classification(card)
  if source!=p['board']['main'] or cap['kind']!='activated' or cap['timing']!='own_turn':raise ValueError('paid ability current source differs')
  used=rules.used(envelope,source,'activated_normal_action')
  costs=[] if used else paid.cost_options(g,actor,card,envelope['runtime'])
  rows=[dict(action_type='activate_main_ability',target_instance_ids=[],cost_instance_ids=c,allowed=True) for c in costs]
  if not rows:rows=[dict(action_type='board_passive',target_instance_ids=[],cost_instance_ids=None,allowed=False)]
  return rows,cap['reference']
 if card=='C-cat_friend':
  cap=recovery.descriptor(card)
  if cap['source_cost']!='self_board_to_bottom' or source not in p['board']['companions']:raise ValueError('recovery current source differs')
  targets=recovery.targets(g,actor,card);used=rules.used(envelope,source,'activated_normal_action')
  rows=[dict(action_type='activate_companion_ability',target_instance_ids=t,cost_instance_ids=None,allowed=bool(t) and not used) for t in ([[s] for s in targets] or [[]])]
  return rows,cap['reference']
 cap=rules.classification(card)
 if cap['kind'] not in PASSIVE_KINDS:return None,cap['reference']
 return [dict(action_type='board_passive',target_instance_ids=[],cost_instance_ids=None,allowed=False)],cap['reference']


def audit_normal(envelope,inventory):
 errors=[];verified=[];unproved=[]
 try:
  for name,digest in SOURCES.items():
   if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('board predicate source changed')
  state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];b=g['players'][actor]['board']
  if g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or g.get('challenge'):raise ValueError('not a normal board entry')
  sources=[s for s in (b['main'],*b['companions'],b['partner'],b['world'],*b['prepared']) if s is not None]
  rows=[r for r in inventory['enumeration_units'] if r['source_family']=='board_card_action']
  if {r['source_instance_id'] for r in rows}!=set(sources):raise ValueError('current board source coverage differs')
  for source in sources:
   actual=[r for r in rows if r['source_instance_id']==source];card=g['cards'][source]['card_id']
   if any(r['source_id']!=source or r['source_zone']!='board' or r['card_id']!=card for r in actual):raise ValueError('board source identity differs')
   expected,reference=_expected(envelope,source)
   if expected is None:
    unproved.append(dict(source_instance_id=source,card_id=card,reason='normal_board_mechanism_not_certified'));continue
   if Counter(_signature(r) for r in actual)!=Counter(_signature(r) for r in expected):raise ValueError('board target/cost alternatives differ: '+source)
   allowed={_signature(r):r['allowed'] for r in expected}
   for row in actual:
    met=allowed[_signature(row)]
    if row['disposition']!=('admitted' if met else 'excluded') or (row['candidate_id'] is not None)!=met or bool(row['reason_codes'])==met:raise ValueError('board activation disposition differs: '+source)
    verified.append(dict(enumeration_unit_id=row['enumeration_unit_id'],source_instance_id=source,card_id=card,activation_allowed=met,source_reference=reference))
  for row in inventory['enumeration_units']:
   if row['source_family']=='hand_card_action' and row['action_type']=='activate_companion_ability':
    source=row['source_instance_id'];card=row['card_id'];cap=recovery.descriptor(card)
    if source not in g['players'][actor]['hand'] or row['source_zone']!='hand' or row['source_id']!=source or g['cards'][source]['card_id']!=card or cap['source_cost']!='self_board_to_bottom':raise ValueError('hand board-ability source differs')
    if row['disposition']!='excluded' or row['candidate_id'] is not None or not row['reason_codes']:raise ValueError('hand cannot pay companion board-source cost')
    verified.append(dict(enumeration_unit_id=row['enumeration_unit_id'],source_instance_id=source,card_id=card,activation_allowed=False,source_reference=cap['reference']))
   if row['source_family']=='reservation_action':unproved.append(dict(source_id=row['source_id'],reason='legacy_reservation_predicate_not_certified'))
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='normal_board_activation_predicates.v1',board_predicates_verified=not errors,errors=errors,verified_units=verified,unproved_units=unproved,source_sha256=dict(SOURCES),
  exclusion_reason_semantics_proven=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)


def compose(inventory,proofs):
 """Account for supplied normal rows; no authentication of caller proofs.

 The connected entry invokes this only on its freshly computed three audits.
 Source/target expansion and allowed-information/comparison gates are separate.
 """
 errors=[];covered=[];missing=[]
 statuses={'core_normal_disposition_predicates.v1':'core_predicates_verified',
  'normal_hand_activation_predicates.v1':'hand_predicates_verified',
  'normal_board_activation_predicates.v1':'board_predicates_verified'}
 try:
  wanted=[r['enumeration_unit_id'] for r in inventory['enumeration_units']]
  if len(wanted)!=len(set(wanted)):raise ValueError('duplicate normal unit')
  for proof in proofs:
   key=statuses[proof['schema']]
   if proof[key] is not True or proof['errors']:raise ValueError('normal predicate audit failed')
   covered.extend(r['enumeration_unit_id'] for r in proof['verified_units'])
  if len(covered)!=len(set(covered)) or set(covered)-set(wanted):raise ValueError('overlapping or foreign predicate unit')
  missing=sorted(set(wanted)-set(covered))
 except (ValueError,KeyError,TypeError) as error:errors.append(str(error))
 return dict(schema='normal_unit_predicate_coverage.v1',supplied_normal_unit_predicates_covered=not errors and not missing,
  errors=errors,verified_unit_count=len(covered),unproved_enumeration_unit_ids=missing,
  caller_proofs_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,
  selection_operand_provenance_verified=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
