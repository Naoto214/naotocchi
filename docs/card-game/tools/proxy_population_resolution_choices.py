"""Closed current resolver routes for resolution-time choice obligations.

An empty decision list does not establish no-choice. Source-checked descriptors
and existing handler routes do. Designated465 choices are delegated to their
actual-frame journal audit; unknown routes are unproved, never silently empty.
This does not validate activation, target legality or effect execution.
"""
import copy
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_payments as payments
import proxy_continuation_triggers as triggers
import proxy_population_discard_recovery as recovery
import proxy_population_trigger_latching as latching
import proxy_population_legacy_choice_obligations as legacy
from proxy_mandatory_choice_boundary import REGISTRY,source_catalog
from proxy_mandatory_policy_contract import canonical


def no_choice_route(link):
 card=link['card_id'];board=link.get('source_zone')=='board'
 cap=batch.classification(card)
 if not board and card in payments.QUICK_CARDS:
  descriptor=payments.capability(card)
  if card in payments.PAYMENT_CARDS|payments.BOARD_COUNT_CARDS|payments.IMMEDIATE_CARDS|payments.CONDITIONAL_CARDS:
   return 'proxy_continuation_payments.resolve',descriptor
  if card in payments.TARGETED_CARDS and 'reveal_count' not in descriptor:
   return 'proxy_continuation_payments.resolve:fixed_activation_target',descriptor
  if card in payments.STAT_CARDS:
   return 'proxy_continuation_payments.resolve:activation_parameter_and_target',descriptor
 if not board and cap['kind']=='quick' and cap['timing'] in ('quick_draw','declared_top_reveal','targeted_relationship_growth'):
  # Existing bounded top-link resolver accepts exactly these source-checked
  # semantic routes; this does not add a handler for future cards.
  if card in ('I-c_coin2','G-hit-blow','E-first-date'):
   return 'proxy_population_chain_resolution.resolve_top',cap
 if board:
  if card in triggers.DRAW_EFFECTS:return 'proxy_continuation_triggers.resolve:draw_only',cap
  if card in recovery.DESCRIPTORS and not recovery.descriptor(card)['top_order_after_return']:
   return 'proxy_population_discard_recovery.resolve:fixed_activation_target',recovery.descriptor(card)
  if card in latching.CARDS and cap['timing'] in ('after_own_quick_effect_applied','after_own_quick_on_opponent_turn','different_name_world_change'):
   return 'proxy_population_trigger_effects.resolve:fixed_activation_target_or_modifier',cap
  if card in payments.BOARD_STATS:return 'proxy_continuation_payments.resolve_board_stat:activation_parameter',payments.capability(card)
  if card in triggers.SUPPORTED_EFFECTS and cap['timing'] in ('main_arrival','own_turn_end') and card not in triggers.LOOK_EFFECTS and card not in triggers.CYCLE_EFFECTS and card!='I-sleepboost1':
   return 'proxy_continuation_triggers.resolve:fixed_target_or_growth',cap
  if card=='C-chicken':return 'proxy_population_start_effects.resolve_chicken:deterministic_reveal',cap
 return None,None


def audit(envelope,initial,records):
 errors=[];route='unproved';verified=False;count=None;kind=None;proof=None;handler=None;descriptor=None
 try:
  state.validate(envelope);c=state.current(envelope)
  if c['response_context']['chain_status']!='resolving' or not c['activation_zone']:raise ValueError('not a resolution entry')
  link=c['activation_zone'][-1];card=link['card_id'];physical=c['game_state']['cards'][link['source_instance_id']]
  if physical['card_id']!=card or physical['card_copy_id']!=link['card_copy_id']:raise ValueError('resolution source identity differs')
  if type(records) is not list:raise ValueError('resolution decision list differs')
  proof=legacy.audit(envelope,initial,records)
  if proof['errors']:raise ValueError('legacy resolution obligation differs: '+str(proof['errors']))
  if proof['applicable']:
   route='existing_116_resolution_choice';verified=proof['legacy_choice_coverage_verified'];count=proof['required_choice_count']
  else:
   bycard={card:kind for kind,cards in REGISTRY.items() for card in cards}
   if card in bycard:
    source_catalog();route='designated_465_journal_required';kind=bycard[card]
   else:
    handler,descriptor=no_choice_route(link)
    if handler is not None:
     route='source_proven_no_resolution_choice';count=0
     if canonical(records)!=canonical([]):raise ValueError('extra resolution choice on source-proven no-choice route')
     verified=True
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error));verified=False
 return dict(schema='resolution_choice_route_audit.v1',route=route,resolution_choice_obligation_verified=verified,
  required_choice_count=count,choice_contract_id=kind,handler=handler,descriptor=copy.deepcopy(descriptor),legacy=proof,
  errors=errors,activation_legality_proven=False,effect_semantics_proven=False,all_rule_opportunities_proven=False,
  origin_authenticated=False,policy_eligible=None,balance_admitted=None)
