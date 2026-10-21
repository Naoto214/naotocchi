"""Source-bound hand predicates for ordinary response priority actors.

Registered semantic alternatives, not authenticated history or whole legality.
Reaction-only and board mechanisms remain explicitly outside this proof.
"""
import hashlib
from collections import Counter
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_payments as payments
import proxy_population_equipment_effects as equipment
import proxy_normal_action_candidate_completeness as expansion
import proxy_population_hand_predicates as hand
import proxy_population_hand_timing as timing
import proxy_continuation_challenge as challenge
from proxy_mandatory_policy_contract import ROOT,canonical

SUPPORTED=hand.SUPPORTED-{'G-air-hockey','G-baseball-batting'}


def audit_reactions(envelope,inventory):
 """Current ordinary-response reaction predicates, after optional groups.

 Air hockey belongs to the existing latched group, never a second ordinary
 response offer. This negative route check does not prove that group coverage.
 Batting uses the existing source-bound current stats, not a predicted outcome.
 """
 errors=[];verified=[];count=0
 try:
  for path,digest in hand.SOURCES.items():
   if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('reaction predicate source changed')
  state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];actor=ctx['priority_actor'];other='B' if actor=='A' else 'A';p=g['players'][actor]
  if g['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['chain_status'] not in ('empty','building') or c['pending_triggers']:raise ValueError('not an ordinary reaction predicate entry')
  if inventory['actor']!=actor or canonical(inventory['response_context'])!=canonical(ctx):raise ValueError('reaction priority identity differs')
  table={r['card_id']:r for r in rules.table()['cards']}
  for source in p['hand']:
   card=g['cards'][source]['card_id']
   if card not in {'G-air-hockey','G-baseball-batting'}:continue
   expected=[]
   if card=='G-air-hockey':timing.descriptor(card)
   else:
    cap=payments.capability(card);template=next(a for a in table[card]['actions'] if a['action_type']=='use_play')
    if cap['reference']!='81-play-batch-2-card-text-draft.md#G-baseball-batting' or cap['timing']!='challenge_stat' or cap['target_owner']!='own':raise ValueError('batting descriptor differs')
    cost=template['base_time_cost']
    if type(cost) is not int or cost!=cap['base_time_cost']:raise ValueError('batting payment differs')
    battle=g.get('challenge')
    met=bool(battle and battle['status']=='comparing' and battle['declaring_actor']==actor and battle['parameter']=='power' and all(battle['participants'][a] is not None and g['players'][a]['board']['main']==battle['participants'][a] for a in 'AB'))
    if met:met=p['time']>=cost and challenge.stats(envelope,other)['power']>=challenge.stats(envelope,actor)['power']
    if met:expected=[dict(action_type='use_play',card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[battle['participants'][actor]],candidate_variant=None,base_time_cost=cost)]
   actual=[r for r in inventory['legal_candidate_details'] if r.get('source_instance_id')==source]
   if Counter(map(_signature,actual))!=Counter(map(_signature,expected)):raise ValueError('response reaction semantic alternatives differ: '+source)
   verified.append(source);count+=len(expected)
 except (ValueError,KeyError,TypeError,IndexError,StopIteration,OSError) as error:errors.append(str(error))
 return dict(schema='ordinary_response_reaction_predicates.v1',response_reaction_predicates_verified=not errors,errors=errors,verified_source_ids=sorted(verified),verified_candidate_count=count,source_sha256=dict(hand.SOURCES),
  candidate_identity_grammar_proven=False,optional_group_opportunities_proven=False,history_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)


def _signature(row):
 return canonical({k:row.get(k) for k in ('action_type','card_id','card_copy_id','source_instance_id','target_instance_ids','candidate_variant','base_time_cost')})


def audit(envelope,events,inventory):
 errors=[];verified=[];unproved=[];count=0
 try:
  for path,digest in hand.SOURCES.items():
   if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('response hand predicate source changed')
  state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];actor=ctx['priority_actor'];p=g['players'][actor]
  if g['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['chain_status'] not in ('empty','building') or c['pending_triggers']:raise ValueError('not an ordinary response predicate entry')
  if inventory['actor']!=actor or canonical(inventory['response_context'])!=canonical(ctx):raise ValueError('response predicate identity differs')
  table={r['card_id']:r for r in rules.table()['cards']};view=dict(actor=actor,players=g['players'],cards=g['cards'])
  for source in p['hand']:
   card=g['cards'][source]['card_id'];templates=[a for a in table[card]['actions'] if a['action_type'] in hand.QUICK]
   if templates and card not in SUPPORTED:
    unproved.append(dict(source_instance_id=source,reason='reaction_or_unknown_hand_predicate_unproved'));continue
   expected=[]
   for template in templates:
    for variant in template['candidate_variants']:
     if card=='E-first-date':targets=[[p['board']['partner']]] if p['board']['partner'] else [[]]
     elif card in payments.TARGETED_CARDS:
      world=card=='G-asteroids-classic' or p['board']['world'] is not None
      targets=([[s] for s in equipment.targets(envelope,actor,card)] or [[]]) if world else [[]]
     else:targets=expansion._targets(variant,view,'hand_card_action')
     for targets_one in targets:
      row=dict(source_zone='hand',source_id=source,source_instance_id=source,card_id=card,candidate_variant=variant,target_instance_ids=targets_one)
      allowed,cost=hand._allowed(envelope,events,row,template,actor=actor)
      if allowed:expected.append(dict(action_type=template['action_type'],card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=targets_one,candidate_variant=variant if len(template['candidate_variants'])>1 else None,base_time_cost=cost))
   actual=[r for r in inventory['legal_candidate_details'] if r.get('source_instance_id')==source]
   if Counter(map(_signature,actual))!=Counter(map(_signature,expected)):raise ValueError('response hand semantic alternatives differ: '+source)
   if card=='E-first-date':
    premise=dict(partner_stage=p['board']['partner_stage'],growth=p['growth'],legacy_five_growth_premises=p['board']['partner_stage']==0 and p['growth']<=95)
    for row in actual:
     if canonical(row.get('resolution_condition_evidence'))!=canonical(premise):raise ValueError('response current resolution premises differ: '+source)
   verified.append(source);count+=len(expected)
  for slot in ('main','partner','world','companions','prepared'):
   sources=p['board'][slot] if slot in ('companions','prepared') else [p['board'][slot]]
   unproved.extend(dict(source_instance_id=s,reason='board_predicate_separate') for s in sources if s is not None)
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='response_hand_activation_predicates.v1',response_hand_predicates_verified=not errors,errors=errors,verified_source_ids=sorted(verified),unproved_sources=unproved,verified_candidate_count=count,source_sha256=dict(hand.SOURCES),
  candidate_identity_grammar_proven=False,history_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
