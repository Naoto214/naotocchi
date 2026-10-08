import proxy_population_cat_activation_effect as cat_activation
import proxy_population_paid_activation_effect as paid_activation
import proxy_population_hand_activation_effect as hand_activation
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
import proxy_population_draw_effects as draws
import proxy_population_zone_effects as zones
import proxy_population_quick_recovery_effect as quick_recovery
import proxy_population_main_movement_effect as main_movement
import proxy_population_world_placement_effect as world_placement
import proxy_population_person_placement_effect as person_placement
import proxy_population_prepared_placement_effect as prepared_placement
import proxy_population_challenge_declaration_effect as declaration
import proxy_population_normal_pass_effect as normal_pass
import proxy_population_response_pass_effect as response_pass
import proxy_population_trigger_closure_effect as closure
import proxy_population_end_window_effect as end_window
import proxy_population_start_draw_effect as start_draw
import proxy_population_turn_finish_effect as turn_finish
import proxy_population_early_finish_effect as early_finish
import proxy_continuation_end as end
import proxy_population_reveal_effects as reveals
import proxy_population_immediate_growth as immediate_growth
import proxy_population_partner_draw as partner_suppression
import proxy_population_quick_reveal as quick_reveal
import proxy_population_first_date_effect as first_date
import proxy_population_equipment_effects as equipment
import proxy_population_typed_resolution as typed_resolution
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


def audit(result,initial_history,initial_proof,initial=None,initial_snapshots=None):
    """Call inside the native scopes which own the execution's source handlers."""
    expected=copy.deepcopy(initial_proof['occurrences']);history=copy.deepcopy(initial_history)
    previous=result['source_envelope'];examined=[];start_origins=[];expiry_audits=[];payment_audits=[];challenge_audits=[];creation_audits=[];return_audits=[];draw_audits=[];zone_audits=[];typed_resolution_audits=[];reveal_audits=[];immediate_growth_audits=[];partner_suppression_audits=[];quick_reveal_audits=[];first_date_audits=[];equipment_audits=[];quick_recovery_audits=[];main_movement_audits=[];world_placement_audits=[];person_placement_audits=[];prepared_placement_audits=[];declaration_audits=[];normal_pass_audits=[];response_pass_audits=[];closure_audits=[];end_window_audits=[];start_draw_audits=[];turn_finish_audits=[];early_finish_audits=[];hand_activation_audits=[];paid_activation_audits=[];cat_activation_audits=[]
    history_shots=copy.deepcopy(initial_snapshots) if initial_snapshots is not None else []
    boundaries={previous['event_seq']:previous};actual_events=[]
    for step in result['steps']:
        if canonical(previous)!=canonical(step['source_envelope']):raise ValueError('coverage step source differs')
        if len(step['events'])!=len(step['envelopes']):raise ValueError('coverage event/envelope count differs')
        for bound,after in zip(step['events'],step['envelopes']):
            event={k:v for k,v in bound.items() if k not in runtime.BIND_KEYS}
            cat=cat_activation.audit(previous,after,event,history)
            if cat['errors']:raise ValueError('cat activation full delta differs: '+str(cat['errors']))
            cat_activation_audits.append(cat)
            paid=paid_activation.audit(previous,after,event)
            if paid['errors']:raise ValueError('paid activation full delta differs: '+str(paid['errors']))
            paid_activation_audits.append(paid)
            activated=hand_activation.audit(previous,after,event)
            if activated['errors']:raise ValueError('hand activation full delta differs: '+str(activated['errors']))
            hand_activation_audits.append(activated)
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
            resolved=typed_resolution.audit(previous,after,event,step.get('mandatory_decisions',[]))
            if resolved['errors']:raise ValueError('typed resolution semantics differ: '+str(resolved['errors']))
            typed_resolution_audits.append(resolved)
            returned=returns.audit(previous,after,event)
            if returned['errors']:raise ValueError('return effect semantics differ: '+str(returned['errors']))
            return_audits.append(returned)
            drawn=draws.audit(previous,after,event)
            if drawn['errors']:raise ValueError('draw effect semantics differ: '+str(drawn['errors']))
            draw_audits.append(drawn)
            moved=zones.audit(previous,after,event)
            if moved['errors']:raise ValueError('zone effect semantics differ: '+str(moved['errors']))
            zone_audits.append(moved)
            revealed=reveals.audit(previous,after,event)
            if revealed['errors']:raise ValueError('reveal effect semantics differ: '+str(revealed['errors']))
            reveal_audits.append(revealed)
            grown=immediate_growth.audit(previous,after,event)
            if grown['errors']:raise ValueError('immediate growth semantics differ: '+str(grown['errors']))
            immediate_growth_audits.append(grown)
            suppressed=partner_suppression.audit_cycle(previous,after,event,step.get('mandatory_decisions',[]))
            if suppressed['errors']:raise ValueError('partner suppression semantics differ: '+str(suppressed['errors']))
            partner_suppression_audits.append(suppressed)
            quick=quick_reveal.audit(previous,after,event)
            if quick['errors']:raise ValueError('quick reveal semantics differ: '+str(quick['errors']))
            quick_reveal_audits.append(quick)
            dated=first_date.audit(previous,after,event)
            if dated['errors']:raise ValueError('first-date semantics differ: '+str(dated['errors']))
            first_date_audits.append(dated)
            removed=equipment.audit(previous,after,event)
            if removed['errors']:raise ValueError('equipment effect semantics differ: '+str(removed['errors']))
            equipment_audits.append(removed)
            recovered=quick_recovery.audit(previous,after,event,step.get('mandatory_decisions',[]))
            if recovered['errors']:raise ValueError('quick recovery semantics differ: '+str(recovered['errors']))
            quick_recovery_audits.append(recovered)
            movement=main_movement.audit(previous,after,event)
            if movement['errors']:raise ValueError('main movement full delta differs: '+str(movement['errors']))
            main_movement_audits.append(movement)
            world=world_placement.audit(previous,after,event)
            if world['errors']:raise ValueError('world placement full delta differs: '+str(world['errors']))
            world_placement_audits.append(world)
            person=person_placement.audit(previous,after,event)
            if person['errors']:raise ValueError('person placement full delta differs: '+str(person['errors']))
            person_placement_audits.append(person)
            prepared=prepared_placement.audit(previous,after,event)
            if prepared['errors']:raise ValueError('prepared placement full delta differs: '+str(prepared['errors']))
            prepared_placement_audits.append(prepared)
            declared=declaration.audit(previous,after,event)
            if declared['errors']:raise ValueError('challenge declaration full delta differs: '+str(declared['errors']))
            declaration_audits.append(declared)
            passed=normal_pass.audit(previous,after,event)
            if passed['errors']:raise ValueError('normal pass full delta differs: '+str(passed['errors']))
            normal_pass_audits.append(passed)
            response_passed=response_pass.audit(previous,after,event)
            if response_passed['errors']:raise ValueError('response pass full delta differs: '+str(response_passed['errors']))
            response_pass_audits.append(response_passed)
            matched=[]
            if event.get('action_type') in closure.KINDS:
                matched=[r for r in result.get('trigger_records',[]) if r['before_envelope']['event_seq']==previous['event_seq']]
                if len(matched)!=1:raise ValueError('trigger closure full delta record absent or ambiguous')
            closed=closure.audit(previous,after,event,matched[0] if matched else None)
            if closed['errors']:raise ValueError('trigger closure full delta differs: '+str(closed['errors']))
            closure_audits.append(closed)
            opened=end_window.audit(previous,after,event,history)
            if opened['errors']:raise ValueError('end window full delta differs: '+str(opened['errors']))
            end_window_audits.append(opened)
            started=start_draw.audit(previous,after,event)
            if started['errors']:raise ValueError('start draw full delta differs: '+str(started['errors']))
            start_draw_audits.append(started)
            finished=turn_finish.audit(previous,after,event,initial.get('first_player') if type(initial) is dict else None)
            if finished['errors']:raise ValueError('turn finish full delta differs: '+str(finished['errors']))
            turn_finish_audits.append(finished)
            terminal=early_finish.audit(previous,after,event,history,history_shots,initial.get('first_player') if type(initial) is dict else None)
            if terminal['errors']:raise ValueError('early finish full delta differs: '+str(terminal['errors']))
            early_finish_audits.append(terminal)
            history_shots.append(end.old._snapshot(state.current(after)))
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
    proof.update(transitions=examined,start_origins=start_origins,typed_effect_expiry_audits=expiry_audits,payment_consumption_audits=payment_audits,challenge_lifetime_audits=challenge_audits,typed_effect_creation_audits=creation_audits,return_effect_audits=return_audits,draw_effect_audits=draw_audits,zone_effect_audits=zone_audits,typed_resolution_audits=typed_resolution_audits,reveal_effect_audits=reveal_audits,immediate_growth_audits=immediate_growth_audits,partner_suppression_audits=partner_suppression_audits,quick_reveal_audits=quick_reveal_audits,first_date_audits=first_date_audits,equipment_effect_audits=equipment_audits,quick_recovery_effect_audits=quick_recovery_audits,main_movement_delta_audits=main_movement_audits,world_placement_delta_audits=world_placement_audits,person_placement_delta_audits=person_placement_audits,prepared_placement_delta_audits=prepared_placement_audits,challenge_declaration_delta_audits=declaration_audits,normal_pass_delta_audits=normal_pass_audits,response_pass_delta_audits=response_pass_audits,trigger_closure_delta_audits=closure_audits,end_window_delta_audits=end_window_audits,start_draw_delta_audits=start_draw_audits,turn_finish_delta_audits=turn_finish_audits,early_finish_delta_audits=early_finish_audits,hand_activation_delta_audits=hand_activation_audits,paid_activation_delta_audits=paid_activation_audits,cat_activation_delta_audits=cat_activation_audits,
                 source_scope=dict(native=sorted(existing.SUPPORTED),latched=sorted(latching.CARDS),hand_optional=sorted(hand_timing.DESCRIPTORS),start_catalog_sha256=starts.CATALOG_SHA),
                 initial_occurrences_conditionally_supplied=True)
    return proof
