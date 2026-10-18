"""Conditional source obligations for non-designated effect choices.

Reuse existing116 choice encoding/derivation. This does not authorize these
families under463, and unhandled mechanisms are explicitly not verified.
"""
import proxy_continuation_state as state
import proxy_continuation_payments as payments
import proxy_continuation_choices as choices
import proxy_population_discard_recovery as recovery
from proxy_mandatory_policy_contract import canonical


def audit(envelope,initial,records):
 errors=[];applicable=False;family=None;expected=[];reason=None
 try:
  c=state.current(envelope);g=c['game_state']
  if c['response_context']['chain_status']!='resolving' or not c['activation_zone']:raise ValueError('not a top-link resolution entry')
  link=c['activation_zone'][-1];card=link['card_id'];actor=link['actor'];p=g['players'][actor];source=link['source_instance_id'];options=None
  descriptor=payments.STAT_CARDS.get(card,{})
  if link.get('source_zone')=='board' and descriptor.get('choose_parameter') is True and descriptor.get('timing')=='this_main_this_turn':
   applicable=True;family='board_turn_stat_parameter';payments.capability(card)
   if p['board']['main']==source:options=[dict(parameter='power'),dict(parameter='wisdom')]
   else:reason='source_no_longer_current_main'
  elif card in recovery.DESCRIPTORS and recovery.descriptor(card)['top_order_after_return']:
   applicable=True;family='ability_topdeck_order'
   if len(link['target_instance_ids'])!=1:raise ValueError('recovery target cardinality differs')
   if link['target_instance_ids'][0] not in recovery.targets(g,actor,card):reason='target_no_longer_legal'
   elif not p['deck']:reason='empty_deck'
   else:options=[dict(position='top'),dict(position='bottom')]
  elif 'reveal_count' in payments.TARGETED_CARDS.get(card,{}):
   applicable=True;family='revealed_item_search';d=payments.capability(card)
   if len(link['target_instance_ids'])!=1:raise ValueError('search target cardinality differs')
   if link['target_instance_ids'][0] not in payments.equipment_targets(g,envelope['runtime'],actor,card):reason='target_no_longer_legal'
   else:
    owner=actor if d.get('target_owner')=='own' else 'B' if actor=='A' else 'A';revealed=g['players'][owner]['deck'][:d['reveal_count']];table=payments.old.start.load_candidate_rows()
    eligible=[s for s in revealed if table[g['cards'][s]['card_id']]['card_type']=='item' and any(a['base_time_cost']<=d['search_item_cost_max'] for a in table[g['cards'][s]['card_id']]['actions'])]
    options=choices.revealed_search_options(revealed,eligible,d['search_maximum'])
  if applicable:
   if options is not None:expected=[choices.resolve(initial,c,actor,options,family,link['link_id'])]
   if canonical(records)!=canonical(expected):raise ValueError('legacy effect choice obligation/record differs')
 except (ValueError,KeyError,TypeError) as error:errors.append(str(error))
 return dict(schema='legacy_effect_choice_obligation.v1',applicable=applicable,
  legacy_choice_coverage_verified=applicable and not errors,errors=errors,choice_family=family,
  required_choice_count=len(expected),no_choice_reason=reason,old_116_excluded=bool(expected) if applicable and not errors else None,
  strategic_solution_proven=False,policy_eligible=False if expected else None,balance_admitted=None,
  all_rule_opportunities_proven=False,origin_authenticated=False)
