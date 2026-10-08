"""Reconcile rule-derived supported occurrences with all retained turn ledgers.

Conditional on supplied history and the existing source-checked producers. This
is not an independent rules implementation or proof of other judgment kinds.
"""
import copy
import proxy_continuation_state as state
import proxy_population_runtime as runtime
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
import proxy_population_trigger_existing as existing
import proxy_population_trigger_latching as latching
import proxy_population_hand_timing as hand_timing
import proxy_population_start_obligations as starts
import proxy_population_effect_expiry as expiry
import proxy_population_payment_consumption as payment_use
import proxy_population_challenge_lifetime as challenge_lifetime
import proxy_population_effect_creation as creation
import proxy_population_return_effects as returns
from proxy_mandatory_policy_contract import canonical


def reconcile(expected,journals):
    wanted={ledger.identity(row):row for row in expected};actual={};pending=0
    if len(wanted)!=len(expected):raise ValueError('duplicate expected trigger occurrence')
    for journal in journals:
        sequential.audit_ledger(journal)
        for key,row in journal['occurrences'].items():
            if key in actual:raise ValueError('occurrence duplicated across turn ledgers')
            actual[key]=row['occurrence']
            pending+=row['status'] in ('pending','deferred')
    missing=sorted(set(wanted)-set(actual));extra=sorted(set(actual)-set(wanted))
    return dict(schema='supported_trigger_coverage.v1',covered=not missing and not extra,
        expected_count=len(wanted),recorded_count=len(actual),missing_occurrence_ids=missing,
        extra_occurrence_ids=extra,pending_count=pending,origin_authenticated=False,
        opportunity_scope='existing_executor_only',opportunity_completeness_proven=False,
        strategic_proof=False,policy_eligible=None,balance_admitted=None)


def audit(result,initial_history,initial_proof):
    """Call inside the native scopes which own the execution's source handlers."""
    expected=copy.deepcopy(initial_proof['occurrences']);history=copy.deepcopy(initial_history)
    previous=result['source_envelope'];examined=[];start_origins=[];expiry_audits=[];payment_audits=[];challenge_audits=[];creation_audits=[];return_audits=[]
    boundaries={previous['event_seq']:previous};actual_events=[]
    for step in result['steps']:
        if canonical(previous)!=canonical(step['source_envelope']):raise ValueError('coverage step source differs')
        if len(step['events'])!=len(step['envelopes']):raise ValueError('coverage event/envelope count differs')
        for bound,after in zip(step['events'],step['envelopes']):
            event={k:v for k,v in bound.items() if k not in runtime.BIND_KEYS}
            expiration=expiry.audit(previous,after,event)
            if expiration['errors']:raise ValueError('typed effect expiry differs: '+str(expiration['errors']))
            expiry_audits.append(expiration)
            consumption=payment_use.audit(previous,after,event)
            if consumption['errors']:raise ValueError('payment consumption differs: '+str(consumption['errors']))
            payment_audits.append(consumption)
            lifetime=challenge_lifetime.audit(previous,after,event)
            if lifetime['errors']:raise ValueError('challenge lifetime differs: '+str(lifetime['errors']))
            challenge_audits.append(lifetime)
            created=creation.audit(previous,after,event)
            if created['errors']:raise ValueError('typed effect creation differs: '+str(created['errors']))
            creation_audits.append(created)
            returned=returns.audit(previous,after,event)
            if returned['errors']:raise ValueError('return effect semantics differ: '+str(returned['errors']))
            return_audits.append(returned)
            timing=latching.capture(previous,after,event)
            history.append(event);expected.extend(timing['occurrences']);expected.extend(hand_timing.capture(previous,after,event)['occurrences'])
            # Scan every transition, not only events selected by the driver.
            # Past origins cannot be retroactively repaired at a later event.
            native=existing.ExistingAdapter(history).proof(after,event['seq'])
            expected.extend(row for row in native['occurrences'] if row['origin_event_seq']==event['seq'])
            examined.append(dict(event_seq=event['seq'],event_sha256=state.canonical_sha256(event),
                                 before_envelope_sha256=state.canonical_sha256(previous),
                                 after_envelope_sha256=state.canonical_sha256(after)))
            previous=after;boundaries[after['event_seq']]=after;actual_events.append(bound)
        final=step['final_envelope'];c=final['legacy_continuation']
        if canonical(previous)!=canonical(final):raise ValueError('coverage step final differs')
        if c['game_state']['phase']=='response_window' and c['response_context']['window_kind']=='turn_start' and any(e['action_type'] in ('turn_start_and_normal_draw','egg_exchange_bottom') for e in step['events']):
            captures=[e for e in step['envelopes'] if e['legacy_continuation']['game_state']['phase']=='turn_start']
            if len(captures)!=1:raise ValueError('coverage start capture absent or ambiguous')
            proof=starts.collect(starts.capture(captures[0]),final)
            expected.extend(proof['occurrences']);start_origins.append(proof['origin_event_seq'])
    if canonical(previous)!=canonical(result['final_envelope']):raise ValueError('coverage final envelope differs')
    if canonical(actual_events)!=canonical(result['events']):raise ValueError('coverage flattened events differ')
    journals=[]
    previous_boundary=-1
    for archive in result['closed_turn_trigger_ledgers']:
        if state.canonical_sha256(archive['ledger'])!=archive['ledger_sha256']:raise ValueError('archived ledger hash differs')
        seq=archive['boundary_event_seq']
        if type(seq) is not int or seq<=previous_boundary or seq not in boundaries:raise ValueError('archive actual boundary absent or unordered')
        if canonical(sequential.close_turn(archive['ledger'],boundaries[seq]))!=canonical(archive):raise ValueError('archive actual boundary differs')
        previous_boundary=seq
        journals.append(archive['ledger'])
    active=result['trigger_ledger']
    if not result['completed']:journals.append(active)
    elif not journals or canonical(journals[-1])!=canonical(active):raise ValueError('final closed ledger absent')
    proof=reconcile(expected,journals)
    import proxy_population_opportunity_order as order
    proof['processing_order']=order.audit(result,expected)
    proof.update(transitions=examined,start_origins=start_origins,typed_effect_expiry_audits=expiry_audits,payment_consumption_audits=payment_audits,challenge_lifetime_audits=challenge_audits,typed_effect_creation_audits=creation_audits,return_effect_audits=return_audits,
                 source_scope=dict(native=sorted(existing.SUPPORTED),latched=sorted(latching.CARDS),hand_optional=sorted(hand_timing.DESCRIPTORS),start_catalog_sha256=starts.CATALOG_SHA),
                 initial_occurrences_conditionally_supplied=True)
    return proof
