"""Registered source-local normal target/cost expansion, not whole legality.

Reuses121/132 template expansion and current source-checked mechanism helpers.
Derives alternatives from entry state, independently of which rows survived in
an inventory. Disposition predicates and strategic operands are not certified.
"""
import copy,hashlib
from collections import Counter
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_population_paid_draw as paid
import proxy_population_cost_alternatives as cost_alternatives
import proxy_population_activation_legality as activation
from proxy_mandatory_policy_contract import ROOT,canonical
TABLE_PATH='data/proxy-normal-decision-candidate-table-114-20260918.json'
TABLE_SHA='7e1df8fbedb74413c407497fff6f285f77f72907d7e544095e8bb34b348ed737'


def signature(row,cost=None):
 result={k:copy.deepcopy(row[k]) for k in ('source_family','source_id','source_instance_id','card_id','action_type','candidate_variant','target_instance_ids')}
 result['cost_instance_ids']=copy.deepcopy(row.get('cost_instance_ids'))
 result['item_payment_option']=cost
 return canonical(result)


def _hand_target_pools(envelope,table,units):
 """Derive the registered target sets without calling the shared expander.

 This certifies source/variant target membership, not payment-option coverage,
 disposition, selection or the future success of an activated effect.
 """
 g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];owner=g['players'][actor];board=owner['board'];other='B' if actor=='A' else 'A';rt=envelope['runtime'];cards={r['card_id']:r for r in table['cards']}
 targetless={'birth','time_skip','transform','start_relationship_stage_zero','single_no_target','single_no_card_target','set_face_down','empty_slot','empty_world_slot','seven_or_eight_cards','nine_or_more_cards','main','companion','partner','world','play','item','event','power','wisdom'}
 expected={};actual={}
 for source in owner['hand']:
  card=g['cards'][source]['card_id']
  for action in cards[card]['actions']:
   for variant in action['candidate_variants']:
    targets=[]
    if card in ('G-archery-3d','G-asteroids-classic') and action['action_type']=='use_play':
     #79: opponent face-up equipment with printed cost<=2, requires world.
     #83: own face-up equipment with printed cost>=3; no world requirement.
     payments.capability(card)
     controller=other if card=='G-archery-3d' else actor
     if card!='G-archery-3d' or board['world'] is not None:
      for target in g['players'][controller]['board']['prepared']:
       if rt['public_prepared'][target]['face_up'] is not True:continue
       if target not in rt['attachments']:raise ValueError('target pool public attachment absent')
       costs=[a['base_time_cost'] for a in cards[g['cards'][target]['card_id']]['actions'] if a['action_type']=='attach_item']
       if any(type(cost) is not int for cost in costs):raise ValueError('target pool printed item cost unproved')
       if any(cost<=2 if card=='G-archery-3d' else cost>=3 for cost in costs):targets.append(target)
    elif variant in targetless:pass
    elif variant in ('single_own_main','single_own_participant','each_threatened_own_main'):targets=[board['main']] if board['main'] is not None else []
    elif variant=='each_legal_own_person':targets=[s for s in [board['main'],*board['companions'],board['partner']] if s is not None]
    elif variant in ('each_legal_own_companion','replace_each_legal_companion'):targets=list(board['companions'])
    elif variant=='replace_current_world':targets=[board['world']] if board['world'] is not None else []
    elif variant=='each_legal_stage_zero_partner':
     if card!='E-first-date':raise ValueError('target pool partner mechanism unproved')
     #91 current activation allows any stage; resolution has its own condition.
     targets=[board['partner']] if board['partner'] is not None else []
    elif variant in ('each_legal_discard_non_main','each_legal_discard_companion'):
     targets=[s for s in owner['discard'] if (not g['cards'][s]['card_id'].startswith('M-') if variant=='each_legal_discard_non_main' else g['cards'][s]['card_id'].startswith('C-'))]
    elif variant=='each_legal_opponent_main':
     target=g['players'][other]['board']['main'];targets=[target] if target is not None else []
    else:raise ValueError('target pool variant unproved: '+variant)
    expected[(source,action['action_type'],variant)]={tuple([target]) for target in targets} or {()}
 for row in units:
  if row['source_family']=='hand_card_action':actual.setdefault((row['source_instance_id'],row['action_type'],row['candidate_variant']),set()).add(tuple(row['target_instance_ids']))
 if expected!=actual:raise ValueError('normal hand target pools differ from actual zones')
 return len(expected)


def audit_normal(envelope,inventory):
 errors=[];expected=[];actual=[]
 try:
  if hashlib.sha256((ROOT/TABLE_PATH).read_bytes()).hexdigest()!=TABLE_SHA:raise ValueError('114 candidate table source changed')
  state.validate(envelope);g=envelope['legacy_continuation']['game_state'];actor=g['turn_player']
  if g['phase']!='normal_action':raise ValueError('not a normal expansion entry')
  projected=candidates.NORMAL_PROJECTION(envelope) if candidates.NORMAL_PROJECTION else envelope
  view=candidates.old.candidates.project_normal_action_information(dict(game_state=projected['legacy_continuation']['game_state'],actor=actor),{})
  table=candidates.rules.table();_hand_target_pools(envelope,table,inventory['enumeration_units']);view['_candidate_table']=table
  view['_verified_ability_uses']={s:[1] if candidates.rules.used(envelope,s,'activated_normal_action') else [] for s in g['players'][actor]['board']['companions']}
  with candidates.classification_scope(projected,table):baseline=candidates.old.normal_audit.board.expand_units(view,table)
  transformed=set()
  for unit in baseline:
   row=copy.deepcopy(unit);card=row['card_id'];targets=[row['target_instance_ids']]
   if row['source_family']=='board_card_action' and card in paid.DESCRIPTORS:
    options=cost_alternatives.paid_costs(envelope,row['source_instance_id'])
    if options:
     for option in options:
      expanded=dict(row,action_type='activate_main_ability',candidate_variant=None,cost_instance_ids=option)
      expected.append(signature(expanded))
     continue
   if row['source_family']=='hand_card_action' and card=='E-first-date':
    #91 allows activation at any current partner stage; its effect condition
    #must not silently restore114's historical stage-zero-only expansion.
    activation.hand_candidates(state.current(envelope),[],actor,row['source_instance_id'],next(r for r in table['cards'] if r['card_id']==card))
    partner=g['players'][actor]['board']['partner'];targets=[[partner] if partner else []]
   if card in payments.TARGETED_CARDS and row['action_type']=='use_play':
    key=(row['source_instance_id'],row['action_type'])
    if key in transformed:continue
    transformed.add(key);descriptor=payments.capability(card)
    target_ids=payments.equipment_targets(g,envelope['runtime'],actor,card) if not descriptor.get('requires_world',True) or g['players'][actor]['board']['world'] else []
    targets=[[s] for s in target_ids] or [[]]
   for target in targets:
    expanded=dict(row,target_instance_ids=target)
    options=cost_alternatives.item_options(envelope,expanded,row['template']['base_time_cost']) if row['action_type'] in ('attach_item','set_item') else [None]
    expected.extend(signature(expanded,cost) for cost in options)
  for row in inventory['enumeration_units']:
   cost={k:row['evidence'][k] for k in ('payment_time','cost_modifiers')} if row['action_type'] in ('attach_item','set_item') else None
   actual.append(signature(row,cost))
  if Counter(expected)!=Counter(actual):raise ValueError('registered target/cost alternatives differ')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='normal_registered_candidate_expansions.v1',registered_expansions_verified=not errors,errors=errors,
  expected_unit_count=len(expected),actual_unit_count=len(actual),table_sha256=TABLE_SHA,cost_alternatives_source_sha256=dict(cost_alternatives.SOURCES),
  complete_legal_set_proven=False,disposition_predicates_proven=False,information_use_proven=False,
  all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
