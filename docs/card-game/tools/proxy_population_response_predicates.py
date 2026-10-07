"""Source-bound hand predicates for ordinary response priority actors.

Registered semantic alternatives, not authenticated history or whole legality.
Reaction-only and board mechanisms remain explicitly outside this proof.
"""
import hashlib
from collections import Counter
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_payments as payments
import proxy_normal_action_candidate_completeness as expansion
import proxy_population_hand_predicates as hand
from proxy_mandatory_policy_contract import ROOT,canonical

SUPPORTED=hand.SUPPORTED-{'G-air-hockey','G-baseball-batting'}


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
      cap=payments.TARGETED_CARDS[card];world=not cap.get('requires_world',True) or p['board']['world'] is not None
      targets=([[s] for s in payments.equipment_targets(g,envelope['runtime'],actor,card)] or [[]]) if world else [[]]
     else:targets=expansion._targets(variant,view,'hand_card_action')
     for targets_one in targets:
      row=dict(source_zone='hand',source_id=source,source_instance_id=source,card_id=card,candidate_variant=variant,target_instance_ids=targets_one)
      allowed,cost=hand._allowed(envelope,events,row,template,actor=actor)
      if allowed:expected.append(dict(action_type=template['action_type'],card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=targets_one,candidate_variant=variant if len(template['candidate_variants'])>1 else None,base_time_cost=cost))
   actual=[r for r in inventory['legal_candidate_details'] if r.get('source_instance_id')==source]
   if Counter(map(_signature,actual))!=Counter(map(_signature,expected)):raise ValueError('response hand semantic alternatives differ: '+source)
   verified.append(source);count+=len(expected)
  for slot in ('main','partner','world','companions','prepared'):
   sources=p['board'][slot] if slot in ('companions','prepared') else [p['board'][slot]]
   unproved.extend(dict(source_instance_id=s,reason='board_predicate_separate') for s in sources if s is not None)
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='response_hand_activation_predicates.v1',response_hand_predicates_verified=not errors,errors=errors,verified_source_ids=sorted(verified),unproved_sources=unproved,verified_candidate_count=count,source_sha256=dict(hand.SOURCES),
  candidate_identity_grammar_proven=False,history_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
