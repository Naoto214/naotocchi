"""Reuse the current sequential driver, native challenge and approved474 scope."""
from contextlib import contextmanager
from threading import Lock
import proxy_population_incarnation_window as incarnation
import proxy_population_trigger_window as window
import proxy_population_trigger_existing as existing
import proxy_population_normal_frontier as normal
import proxy_population_effect_application_runtime as application
import proxy_population_chain_resolution as chain
import proxy_population_growth_runtime as growth
import proxy_population_runtime as runtime
import proxy_population_end_victory as victory
import proxy_population_unproved_priority as unresolved
import proxy_population_activation_legality as legality
import proxy_population_loss_reward as loss_reward
import proxy_population_hand_predicates as hand_predicates
import proxy_population_public_application as public_application
import proxy_population_legacy_choice_obligations as legacy_choices
import proxy_population_source_inventory as source_inventory
import proxy_population_decision_binding as decision_binding
import proxy_population_automatic_binding as automatic_binding
import proxy_population_public_turn as public_turn
import proxy_population_response_context as response_context
import proxy_population_resolution_choices as resolution_choices
import proxy_population_resolution_order as resolution_order
import proxy_population_core_predicates as core_predicates
import proxy_population_candidate_expansions as candidate_expansions
import proxy_population_response_expansions as response_expansions
from proxy_mandatory_policy_contract import canonical

_LOCK=Lock()

@contextmanager
def contract_scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('challenge connection concurrency/reentry forbidden')
 supported=existing.SUPPORTED;observed=window.OBSERVED_EVENTS;prior_operation=runtime.operation;prior_step=runtime._step
 def step(envelope,initial,events,shots,runtime_history,forced,session=None):
  with unresolved.scope(),public_application.scope(events,shots):
   result=prior_step(envelope,initial,events,shots,runtime_history,forced,session)
   current=result['source_envelope']['legacy_continuation']
   decision=result['decision']
   if decision is not None:
    if decision.get('context',{}).get('decision_kind')=='normal_action':
     coverage=source_inventory.audit_normal(result['source_envelope'],decision['inventory'])
     expansion=candidate_expansions.audit_normal(result['source_envelope'],decision['inventory'])
     if expansion['errors']:raise ValueError('normal candidate expansions differ: '+str(expansion['errors']))
     result['normal_candidate_expansions']=expansion
     predicates=core_predicates.audit_normal(result['source_envelope'],decision['inventory'])
     if predicates['errors']:raise ValueError('normal core predicates differ: '+str(predicates['errors']))
     result['normal_core_predicates']=predicates
     hand_proof=hand_predicates.audit_normal(result['source_envelope'],events,decision['inventory'])
     if hand_proof['errors']:raise ValueError('normal hand predicates differ: '+str(hand_proof['errors']))
     result['normal_hand_predicates']=hand_proof
    elif decision.get('decision_kind')=='response_action':
     coverage=source_inventory.audit_response(result['source_envelope'],decision['candidate_set_evidence'])
     expansion=response_expansions.audit(result['source_envelope'],events,decision['candidate_set_evidence'])
     if expansion['errors']:raise ValueError('response candidate expansions differ: '+str(expansion['errors']))
     result['response_candidate_expansions']=expansion
    else:raise ValueError('ordinary decision source coverage kind unsupported')
    if coverage['errors']:raise ValueError('ordinary source inventory differs: '+str(coverage['errors']))
    result['decision_source_inventory']=coverage
    binding=decision_binding.audit_step(result,initial['order_id'])
    if binding['errors']:raise ValueError('ordinary entry binding differs: '+str(binding['errors']))
    result['ordinary_entry_binding']=binding
   else:
    binding=automatic_binding.audit_step(result)
    if binding['errors']:raise ValueError('automatic output binding differs: '+str(binding['errors']))
    result['automatic_output_binding']=binding
   if current['response_context']['chain_status']=='resolving':
    order=resolution_order.audit(result)
    if not order['resolution_order_verified']:raise ValueError('source resolution order differs: '+str(order['errors']))
    result['resolution_order_audit']=order
   if current['response_context']['chain_status']=='resolving' and current['activation_zone']:
    proof=legacy_choices.audit(result['source_envelope'],initial,result['mandatory_decisions'])
    if proof['errors'] or proof['applicable'] and not proof['legacy_choice_coverage_verified']:raise ValueError('legacy effect choice obligations differ: '+str(proof['errors']))
    result['legacy_effect_choice_obligations']=proof
    obligation=resolution_choices.audit(result['source_envelope'],initial,result['mandatory_decisions'])
    if obligation['errors'] or obligation['route']=='unproved':raise ValueError('resolution choice obligation unproved: '+str(obligation['errors']))
    result['resolution_choice_obligation']=obligation
   return result
 def operation(initial,callback):
  def connected(forced):
   # Install after native scopes so verified actual deltas replace their
   # historical constant-growth provenance, never the opposite order.
   with growth.scope(),victory.scope(),legality.scope(),public_turn.scope(),response_context.scope(),loss_reward.scope():return callback(forced)
  return prior_operation(initial,connected)
 try:
  runtime.operation=operation;runtime._step=step
  existing.SUPPORTED=supported|{'M-antlion-07','P-anglerfish'};window.OBSERVED_EVENTS=observed|{'challenge_declared'}
  with normal.scope(),application.scope(),chain.scope():yield
 finally:runtime.operation=prior_operation;runtime._step=prior_step;existing.SUPPORTED=supported;window.OBSERVED_EVENTS=observed;_LOCK.release()


def segment(envelope,initial,events,shots,envelopes,limit,proof,session=None,connection=None):
 with contract_scope():
  result=incarnation.segment(envelope,initial,events,shots,envelopes,limit,proof,session,connection)
  result['connection_revision']='conditional_challenge_and_effect_application_474';return result


def validate(record,envelope,initial,events,shots,envelopes,limit,proof):
 try:return [] if canonical(record)==canonical(segment(envelope,initial,events,shots,envelopes,limit,proof)) else ['challenge connection reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['challenge connection reconstruction failed']
