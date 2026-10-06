"""Approved A: one current action, then fresh enumeration; legacy116 excluded.

Adapters prove current legal actions and comparison scope. This does not
certify occurrence production, history, or whole-match eligibility.
"""
import copy,hashlib
import proxy_population_opportunity_ledger as ledger
import proxy_population_start_obligations as starts
import proxy_population_activation_reference as references
import proxy_continuation_choices as choices
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
from proxy_mandatory_policy_contract import canonical


def _mark_ineligible(journal,rows):
    result=copy.deepcopy(journal)
    if rows:
        result['closure_contract']='current_source_ineligible.v1'
        for row in rows:
            key=row['occurrence_id']
            if result['occurrences'][key]['status']!='pending' or row['proof'].get('complete') is not True:raise ValueError('invalid ineligible occurrence proof')
            result['occurrences'][key].update(status='ineligible',ineligible_proof=copy.deepcopy(row['proof']))
        result['journal'].append(dict(operation='close_ineligible',rows=copy.deepcopy(rows)))
    return result


def audit_ledger(journal):
    expected=ledger.create(journal['turn_player'])
    for row in journal['journal']:
        if row['operation']=='observe':expected=ledger.observe(expected,row['occurrences'],row['chain_status'])
        elif row['operation']=='consume':expected=ledger.consume(expected,row['candidate_id'])
        elif row['operation']=='release':expected=ledger.release(expected,row['chain_link_ids'])
        elif row['operation']=='close_ineligible':expected=_mark_ineligible(expected,row['rows'])
        else:raise ValueError('unknown trigger journal operation')
    if canonical(expected)!=canonical(journal):raise ValueError('trigger ledger reconstruction differs')


def inventory(envelope,journal,adapter):
    state.validate(envelope);audit_ledger(journal)
    group=ledger.offer(journal)
    if group is None:raise ValueError('no pending trigger group')
    current=state.current(envelope)
    if current['response_context']['chain_status']=='resolving':raise ValueError('no activation during resolution')
    if current['game_state']['turn_player']!=journal['turn_player']:raise ValueError('group turn differs')
    rows=[];proofs=[];ineligible=[]
    for key,offered in sorted(group['actions'].items()):
        if offered['action']=='decline_group':continue
        occurrence=journal['occurrences'][key]['occurrence']
        actions,proof=adapter.enumerate(envelope,occurrence)
        if type(proof) is not dict or proof.get('complete') is not True:raise ValueError('incomplete action expansion')
        proof=copy.deepcopy(proof);proof['current_envelope_sha256']=state.canonical_sha256(envelope)
        item=dict(occurrence_id=key,proof=proof)
        if not actions:
            ineligible.append(item);continue
        proofs.append(item)
        rows.extend(dict(action='activate',occurrence_id=key,activation=copy.deepcopy(a)) for a in actions)
    effective=_mark_ineligible(journal,ineligible)
    if rows and group['category']=='optional':
        offered=ledger.offer(effective);rows.append(copy.deepcopy(offered['actions'][offered['decline_candidate_id']]))
    ids=[canonical(row).decode() for row in rows]
    if len(ids)!=len(set(ids)):raise ValueError('duplicate current legal action')
    byid=dict(zip(ids,rows));ids.sort()
    return dict(actor=group['actor'],category=group['category'],group_rank=group['group_rank'],
        legal_candidate_ids=ids,legal_candidate_details=[byid[i] for i in ids],
        occurrence_proofs=proofs,ineligible_occurrences=ineligible,effective_ledger=effective,
        enumeration_scope='current_supplied_group_only',origin_authenticated=False,opportunity_completeness_proven=False)


def step(envelope,initial,journal,adapter):
    inv=inventory(envelope,journal,adapter);rows=inv['legal_candidate_details'];effective=inv['effective_ledger'];group=ledger.offer(effective)
    automatic=not rows or (inv['category']=='forced' and len(rows)==1)
    comparison=dict(status='no_executable_action' if not rows else 'no_choice_forced_rule') if automatic else adapter.compare(envelope,inv)
    if not automatic and comparison.get('status')!='unresolved_existing_contract':raise ValueError('comparison adapter has no verified selection branch')
    # The group and ordinal are public. Full game/envelope hashes are audit
    # bindings only and are never fed into the old116 seed derivation.
    pending=sorted(k for k,a in group['actions'].items() if a['action']=='activate') if group else []
    ordinal=sum(r['operation']=='consume' for r in journal['journal'])
    address=hashlib.sha256(canonical(dict(group=pending,rank=inv['group_rank'],ordinal=ordinal))).hexdigest()
    decision=None if automatic else choices.resolve(initial,state.current(envelope),inv['actor'],rows,'trigger_group_next_action_A',address)
    chosen=dict(action='close_ineligible',occurrence_ids=[r['occurrence_id'] for r in inv['ineligible_occurrences']]) if not rows else rows[0] if automatic else decision['selected_action']['option']
    after_ledger=effective if not rows else ledger.consume(effective,chosen['occurrence_id'] if chosen['action']=='activate' else group['decline_candidate_id'])
    if chosen['action']=='activate':
        after,events=adapter.activate(envelope,chosen['activation'],journal['occurrences'][chosen['occurrence_id']]['occurrence'])
    else:
        before=state.current(envelope);current=copy.deepcopy(before);current['last_event_seq']+=1
        after=state.advance(envelope,current,current['last_event_seq'])
        event=triggers._raw_event(before,state.current(after),'close_ineligible_triggers' if not rows else 'decline_trigger_group',inv['actor'],occurrence_ids=chosen['occurrence_ids'])
        events=[triggers.actions.bind_event(envelope,after,event)]
    if len(events)!=1:raise ValueError('next activation must be one atomic transition')
    triggers.old._verify_generated(state.current(envelope),state.current(after),[{k:v for k,v in events[0].items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')}])
    return dict(schema='sequential_trigger_step_A.v1',selection_unit='one_current_next_activation_or_decline',
        before_envelope=copy.deepcopy(envelope),after_envelope=after,
        before_ledger=copy.deepcopy(journal),after_ledger=after_ledger,
        before_envelope_sha256=state.canonical_sha256(envelope),after_envelope_sha256=state.canonical_sha256(after),
        before_ledger_sha256=hashlib.sha256(canonical(journal)).hexdigest(),after_ledger_sha256=hashlib.sha256(canonical(after_ledger)).hexdigest(),
        inventory=inv,comparison=copy.deepcopy(comparison),decision=decision,chosen=copy.deepcopy(chosen),
        events=events,snapshots=[triggers.old._snapshot(state.current(after))],
        strategic_unproven=None if automatic else True,selection_basis='ineligible_group_rule_operation' if not rows else 'forced_singleton_rule_operation' if automatic else 'legacy_116_seeded_fallback',
        policy_eligible=None if automatic else False,excluded_by_116=not automatic,balance_admitted=None,ready_for_execution=False)


def validate(record,initial,adapter):
    try:
        expected=step(record['before_envelope'],initial,record['before_ledger'],adapter)
        return [] if canonical(expected)==canonical(record) else ['sequential current-state replay differs']
    except (ValueError,KeyError,TypeError,IndexError):return ['invalid sequential record or adapter proof']


class StartAdapter:
    """Current107 start source actions. Origin capture authentication is external."""
    def enumerate(self,envelope,occurrence):
        c=envelope['legacy_continuation'];g=c['game_state'];source=occurrence['source_instance_id'];actor=occurrence['actor'];sources=starts.public_sources(envelope)
        if source not in sources or actor!=g['turn_player'] or sources[source]['actor']!=actor or occurrence['category']!='optional':raise ValueError('start group source/owner differs')
        row=sources[source];kind=row['classification']['start_kind'];ctx=c['response_context']
        if kind=='none' or kind!=occurrence['ability_key'] or occurrence['source_reference']!=row['classification']['reference'] or ctx['window_kind']!='turn_start' or ctx['origin_event_seq']!=occurrence['origin_event_seq']:raise ValueError('start origin/capability differs')
        if kind=='own_start_hand_at_most_two_draw':
            if row['slot']!='prepared':raise ValueError('start equipment is not attached')
            if len(g['players'][actor]['hand'])>2:return [],dict(complete=True,reason='hand_count_above_two',source_reference=occurrence['source_reference'],source_raw_sha256=row['classification']['source_raw_sha256'])
        card=g['cards'][source]
        a=dict(candidate_id='response-activate-ability-'+source,candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id=card['card_id'],card_copy_id=card['card_copy_id'],target_instance_ids=[],candidate_variant=None,base_time_cost=0,source_references=[occurrence['source_reference']])
        return [a],dict(complete=True,source_reference=occurrence['source_reference'],source_raw_sha256=row['classification']['source_raw_sha256'],condition='captured_start_source_current_public_condition',origin_authenticated=False)

    def compare(self,envelope,inv):
        # Card identities after draw/reveal and future reactions are not known
        # from permitted information. No unknown resource is assigned zero,
        # equal value, or a strategic priority. No463 policy extension.
        if any(r['action']=='activate' and r['activation']['card_id'] not in ('C-chicken','I-bowtie') for r in inv['legal_candidate_details']):raise ValueError('start comparison scope differs')
        return dict(status='unresolved_existing_contract',source_references=['114-normal-decision-protocol-hardening.md','116-normal-decision-fallback-contract.md'],reason='no_existing_proof_of_resource_or_continuation_equivalence',unknowns_preserved=True,strategic_proof=False)

    def activate(self,envelope,action,occurrence):
        if canonical(action) not in [canonical(a) for a in self.enumerate(envelope,occurrence)[0]]:raise ValueError('stale start action')
        before=state.current(envelope);after=copy.deepcopy(before);ctx=before['response_context'];actor=occurrence['actor'];source=action['source_instance_id'];seq=before['last_event_seq']+1
        link_id=f'response-link-{seq}-{source}'
        after['activation_zone'].append(dict(link_id=link_id,action_type='activate_board_ability',source_zone='board',actor=actor,card_id=action['card_id'],card_copy_id=action['card_copy_id'],source_instance_id=source,target_instance_ids=[],candidate_variant=None,payment=dict(time=0),source_references=action['source_references']))
        # Reuse119's chain transition. Initial group actor is supplied by06;
        # ordinary priority begins only after the complete initial group closes.
        transition=triggers.old.start.seeded._response_transition_context(after)
        transition.update(window_kind='after_normal_action',priority_actor=actor,chain_links=copy.deepcopy(ctx['chain_links']),chain_status=ctx['chain_status'])
        changed=triggers.old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id))
        triggers.old.start.seeded._apply_transition_result(after,changed)
        after['last_event_seq']=seq;after['game_state']['phase']='response_window'
        result=state.advance(envelope,after,seq)
        result['legacy_continuation']['activation_zone'][-1]['activation_receipt']=references.receipt(envelope,result,result['legacy_continuation']['activation_zone'][-1])
        state.validate(result)
        event=triggers._raw_event(before,state.current(result),'activate_response',actor,source_instance_id=source,source_zone='board',selected_candidate=action['candidate_id'],chain_link_id=link_id,target_instance_ids=[],payment=dict(time=0),trigger_origin_event_seq=occurrence['origin_event_seq'],mandatory=False,source_reference=occurrence['source_reference'])
        return result,[triggers.actions.bind_event(envelope,result,event)]
